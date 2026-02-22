from enum import Enum
from typing import Optional, Union, Literal
import time
from fastapi import WebSocket
from pydantic import BaseModel, Field

VERSION = "v0.5-alpha"


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


class RecordingState(BaseModel):
    """
    Device reporting its current recording state
    Separate from SessionMetadata - single source of truth
    """
    sessionId: str
    status: str          # "stopped", "running", "paused"
    duration: int = 0    # in seconds
    timestamp: Optional[int] = None


class RecordingQuery(BaseModel):
    """Dashboard queries device recording state"""
    sessionId: str


# ============= REST API message models =============
class RESTEvents(str, Enum):
    SESSION_STAGE = "session_stage"
    SESSION_STAGED = "session_staged"


class SessionStageRequestMsg(BaseModel):
    event: Literal[RESTEvents.SESSION_STAGE] = RESTEvents.SESSION_STAGE
    body: SessionMetadata


class SessionStageResponseMsg(BaseModel):
    event: Literal[RESTEvents.SESSION_STAGED] = RESTEvents.SESSION_STAGED
    body: SessionMetadata


# ============= WebSocket messages =============
class Rename(BaseModel):
    name: str


class WSActionTarget(BaseModel):
    sessionId: str
    triggerTime: Optional[int] = None


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
    """Facts that should be notified"""
    DASHBOARD_INIT = "dashboard_init"
    DASHBOARD_RENAME = "dashboard_rename"
    SESSION_UPDATE = "session_update"
    SESSION_ACTIVATE = "session_activate"
    SESSION_ACTIVATED = "session_activated"
    SESSION_LEFT = "session_left"
    
    # Recording state changes (device -> server -> dashboard)
    RECORDING_STARTED = "recording_started"
    RECORDING_PAUSED = "recording_paused"
    RECORDING_RESUMED = "recording_resumed"
    RECORDING_STOPPED = "recording_stopped"
    
    # Status responses
    SUCCESS = "success"
    FAIL = "failed"


class WSActions(str, Enum):
    """Intents of session or dashboard"""
    START = "start"
    STOP = "stop"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    GET_STATUS = "get_status"


class WSPayload(BaseModel):
    kind: WSKind
    msgType: Union[WSActions, WSEvents, WSErrors]
    body: Optional[Union[SessionMetadata, WSActionTarget, Rename, RecordingState, RecordingQuery]] = None


# ============= Clock Sync Models =============
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


# ============= QR Code Data =============
class QRData(BaseModel):
    type: str = "vocal_link_server"
    name: str
    ip: str


# ============= Helper Functions =============
async def send_error(ws: WebSocket, error_type: WSErrors):
    msg = WSPayload(kind=WSKind.ERROR, msgType=error_type).model_dump()
    print(f"[ERROR] {error_type}")
    try:
        await ws.send_json(msg)
    except Exception:
        pass


def now_ms():
    return int(time.time() * 1000)
