from fastapi import FastAPI, WebSocket
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

from backend.handlers import AppState, send_error
import backend.primitives as P


app = AppState(port = 6210) # source of truth


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
                print(e)
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



@api.post("/sessions", response_model=P.SessionStageResponseMsg)
async def stage_session(req: P.SessionStageRequestMsg):
    req.body.id = str(uuid.uuid4())
    await app.sessions.stage(req.body)
    return P.SessionStageResponseMsg(body=req.body).model_dump()


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


api.mount("/static", StaticFiles(directory="frontend"), name="static")
@api.get("/")
async def serve_frontend():
    index_path = os.path.join("frontend", "index.html")
    return FileResponse(index_path)
    
