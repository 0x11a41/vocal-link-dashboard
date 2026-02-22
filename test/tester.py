from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Literal, Union
import asyncio
import random
import httpx
import websockets
from datetime import datetime


VERSION = "v0.6-alpha"


# =========================================================
# ================== PRIMITIVES ============================
# =========================================================

class SessionMetadata(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=50)
    ip: str
    battery: int = -1
    device: str
    theta: float = -1
    lastRTT: float = -1
    lastSync: Optional[int] = None


class ServerInfo(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    ip: str
    version: str = VERSION
    activeSessions: int = 0


class RESTEvents(str, Enum):
    SESSION_STAGE = "session_stage"
    SESSION_STAGED = "session_staged"


class SessionStageRequestMsg(BaseModel):
    event: Literal[RESTEvents.SESSION_STAGE] = RESTEvents.SESSION_STAGE
    body: SessionMetadata


class SessionStageResponseMsg(BaseModel):
    event: Literal[RESTEvents.SESSION_STAGED] = RESTEvents.SESSION_STAGED
    body: SessionMetadata


class WSKind(str, Enum):
    ACTION = "action"
    EVENT = "event"
    ERROR = "error"


class WSErrors(str, Enum):
    INVALID_KIND = "invalid_kind"
    INVALID_EVENT = "invalid_event"
    INVALID_ACTION = "invalid_action"
    INVALID_BODY = "invalid_body"
    ACTION_NOT_ALLOWED = "action_not_allowed"
    SESSION_NOT_FOUND = "session_not_found"


class WSEvents(str, Enum):
    DASHBOARD_INIT = "dashboard_init"
    DASHBOARD_RENAME = "dashboard_rename"

    SESSION_UPDATE = "session_update"
    SESSION_ACTIVATE = "session_activate"
    SESSION_ACTIVATED = "session_activated"
    SESSION_LEFT = "session_left"
    SUCCESS = "success"
    FAIL = "failed"

    SESSION_STATE_REPORT = "session_state_report"
    STARTED = "started"
    STOPPED = "stopped"
    PAUSED = "paused"
    RESUMED = "resumed"


class WSActions(str, Enum):
    START = "start"
    STOP = "stop"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    GET_STATE = "get_state"


class WSActionTarget(BaseModel):
    id: str
    triggerTime: Optional[int] = None


class Rename(BaseModel):
    name: str


class WSEventTarget(BaseModel):
    id: str


class SessionStates(str, Enum):
    RECORDING = "recording"
    RUNNING = "running"
    PAUSED = "paused"


class StateReport(BaseModel):
    id: str
    status: SessionStates
    duration: int = 0


class WSPayload(BaseModel):
    kind: WSKind
    msgType: Union[WSActions, WSEvents, WSErrors]
    body: Optional[
        Union[
            WSEventTarget,
            StateReport,
            SessionMetadata,
            WSActionTarget,
            Rename,
        ]
    ] = None


class SyncRequest(BaseModel):
    t1: int


class SyncResponse(BaseModel):
    type: str = "SYNC_RESPONSE"
    t1: int
    t2: int
    t3: int


class SyncReport(BaseModel):
    theta: float
    rtt: float


# =========================================================
# ================= CONFIG ================================
# =========================================================

BASE = "http://localhost:6210"
WS = "ws://localhost:6210"


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# =========================================================
# ================= STAGE SESSION =========================
# =========================================================

async def stage_session(name: str) -> SessionMetadata:
    async with httpx.AsyncClient() as client:

        req = SessionStageRequestMsg(
            body=SessionMetadata(
                id="placeholder",
                name=name,
                ip="127.0.0.1",
                battery=random.randint(40, 100),
                device="pytest"
            )
        )

        r = await client.post(f"{BASE}/sessions", json=req.model_dump())
        r.raise_for_status()

        resp = SessionStageResponseMsg.model_validate(r.json())
        meta = resp.body

        log(f"[{name}] STAGED {meta.id}")
        return meta


# =========================================================
# ================= CONTROL SOCKET ========================
# =========================================================

async def control_client(meta: SessionMetadata, ready_evt: asyncio.Event):
    name = meta.name
    sid = meta.id

    try:
        async with websockets.connect(f"{WS}/ws/control") as ws:

            activate = WSPayload(
                kind=WSKind.EVENT,
                msgType=WSEvents.SESSION_ACTIVATE,
                body=WSEventTarget(id=sid)
            )

            await ws.send(activate.model_dump_json())
            log(f"[{name}] ACTIVATE SENT")

            while True:
                try:
                    raw = await ws.recv()
                except websockets.ConnectionClosed:
                    log(f"[{name}] control disconnected")
                    return

                payload = WSPayload.model_validate_json(raw)

                log(f"[{name}] GOT {payload.kind}:{payload.msgType}")

                # activation ack
                if payload.msgType == WSEvents.SESSION_ACTIVATED:
                    ready_evt.set()
                    continue

                if payload.kind != WSKind.ACTION:
                    continue

                target: WSActionTarget = payload.body

                # START
                if payload.msgType == WSActions.START:
                    reply = WSPayload(
                        kind=WSKind.EVENT,
                        msgType=WSEvents.STARTED,
                        body=WSEventTarget(id=target.id)
                    )
                    await ws.send(reply.model_dump_json())
                    log(f"[{name}] SENT started")

                # STOP
                elif payload.msgType == WSActions.STOP:
                    reply = WSPayload(
                        kind=WSKind.EVENT,
                        msgType=WSEvents.STOPPED,
                        body=WSEventTarget(id=target.id)
                    )
                    await ws.send(reply.model_dump_json())
                    log(f"[{name}] SENT stopped")

    except asyncio.CancelledError:
        log(f"[{name}] control closed")
        raise


# =========================================================
# ================= SYNC SOCKET ===========================
# =========================================================

async def sync_client(meta: SessionMetadata, ready_evt: asyncio.Event):
    await ready_evt.wait()
    await asyncio.sleep(0.3)

    name = meta.name
    sid = meta.id

    try:
        async with websockets.connect(f"{WS}/ws/sync/{sid}") as ws:
            log(f"[{name}] SYNC CONNECTED")

            while True:
                req = SyncRequest(
                    t1=int(datetime.now().timestamp() * 1000)
                )

                await ws.send(req.model_dump_json())
                log(f"[{name}] SYNC PING")

                raw = await ws.recv()
                SyncResponse.model_validate_json(raw)

                log(f"[{name}] SYNC OK")

                report = SyncReport(
                    theta=round(random.uniform(-2, 2), 3),
                    rtt=random.randint(10, 80)
                )

                await ws.send(report.model_dump_json())
                log(f"[{name}] SYNC REPORT")

                await asyncio.sleep(5 + random.random())

    except asyncio.CancelledError:
        log(f"[{name}] sync closed")
        raise


# =========================================================
# ================= SESSION INSTANCE ======================
# =========================================================

async def run_session(idx: int):
    name = f"Client-{idx}"
    meta = await stage_session(name)

    ready = asyncio.Event()

    await asyncio.gather(
        control_client(meta, ready),
        sync_client(meta, ready)
    )


# =========================================================
# ================= MAIN ==================================
# =========================================================

async def main():
    count = random.randint(1, 20)
    log(f"Starting {count} session(s)\n")

    tasks = [
        asyncio.create_task(run_session(i + 1))
        for i in range(count)
    ]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("Shutting down clients...")
