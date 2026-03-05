from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import ValidationError
from typing import List
import uuid
import qrcode
import io
import os
import asyncio

from backend.AppState import AppState, send_error
import backend.primitives as P
from backend.logging import log


app = AppState() # source of truth


@asynccontextmanager
async def lifespan(api: FastAPI):
    await app.start_mdns()
    yield
    await app.shutdown()


api = FastAPI(lifespan=lifespan)
api.add_middleware(
    CORSMiddleware,  # ty:ignore[invalid-argument-type]
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@api.websocket("/ws/control")
async def orchistrate_messages(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            try:
                raw = P.WSPayload.model_validate(await ws.receive_json())
            except ValidationError as e:
                log.error(e)
                continue

            if raw.kind == P.WSKind.ACTION:
                await app.handle_actions(raw, ws)
            elif raw.kind == P.WSKind.EVENT:
                await app.handle_events(raw, ws)
            elif raw.kind == P.WSKind.SYNC:
                await app.handle_sync(raw, ws)
            elif raw.kind == P.WSKind.ERROR:
                pass # todo
            else:
                await send_error(ws, P.WSErrors.INVALID_KIND)
                
    except Exception:
        try:
            await ws.close()
        except Exception:
            pass
    await app.handle_disconnect(ws)



@api.post("/sessions", response_model=P.SessionMetadata)
async def stage_session(req: P.SessionMetadata):
    req.id = str(uuid.uuid4())
    await app.sessions.stage(req)
    log.info(req.model_dump())
    return req.model_dump()


@api.get("/sessions", response_model=List[P.SessionMetadata])
async def list_sessions():
    return await app.sessions.getMetaFromAllActive()



@api.get("/dashboard", response_model=P.ServerInfo)
async def getServerInfo():
    return await app.server_info()



@api.get("/dashboard/qr")
async def get_server_qr():
    payload = P.QRData(name=app.name, ip=app.ip)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=20,
        border=2
    )
    qr.add_data(payload.model_dump())
    qr.make(fit=True)
   
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


"""
POST /files/upload/{fileId} - should be followed by a FILE_UPDATE before returning
GET /files/original/{fileId}
GET /files/enhanced/{fileId}
GET /files - files metadata query

GET /files/{fileId}/stream
<audio controls src="/files/{fileId}/stream"></audio>

DELETE /files/{fileId}
"""


@api.post("/files/merge")
async def start_merge(req: P.MergeRequest):
    asyncio.create_task(merge_and_notify(req.fids))
    return {"status": "started"}


@api.post("/files/{fid}/transcribe")
async def start_transcription(fid: str):
    if not await app.recordings.exist(fid) or await app.recordings.status(fid) != P.FileStatus.READY:
        raise HTTPException(status_code=400)

    await app.recordings.set_status(fid, P.FileStatus.PROCESSING)
    await app.dashboard.notify(P.WSPayload(
                                   kind = P.WSKind.EVENT,
                                   msgType = P.WSEvents.FILE_UPDATE,
                                   body = await app.recordings.get(fid)
                               ))

    asyncio.create_task(transcribe_and_notify(fid))
    return {"status": "started"}


@api.get("/files/transcript/{fid}", response_model=P.TranscriptResult)
async def get_transcript(fid: str):
    if not await app.recordings.exist(fid):
        raise HTTPException(status_code=404, detail="File not found")

    transcript = app.recordings.resolve_transcript(fid)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not available")

    return transcript



api.mount("/static", StaticFiles(directory="frontend"), name="static")
@api.get("/")
async def serve_frontend():
    index_path = os.path.join("frontend", "index.html")
    return FileResponse(index_path)
    



# =============== Services ==================
async def transcribe_and_notify(fid: str):
    meta = await app.recordings.transcribe(fid)
    if meta:
        await app.dashboard.notify(P.WSPayload(
            kind=P.WSKind.EVENT,
            msgType=P.WSEvents.FILE_UPDATE,
            body=meta
        ))

async def merge_and_notify(fids: List[str]):
    meta = await app.recordings.merge(fids)
    if meta:
        await app.dashboard.notify(P.WSPayload(
            kind=P.WSKind.EVENT,
            msgType=P.WSEvents.FILE_STAGED,
            body=meta
        ))
