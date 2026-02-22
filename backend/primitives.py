from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Literal, Union


VERSION = "v0.6-alpha"


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



############## REST API message models ##############
class RESTEvents(str, Enum):
    SESSION_STAGE = "session_stage" # stage request
    SESSION_STAGED = "session_staged" # staging acknoledgement

class SessionStageRequestMsg(BaseModel):
    event: Literal[RESTEvents.SESSION_STAGE] = RESTEvents.SESSION_STAGE
    body: SessionMetadata

class SessionStageResponseMsg(BaseModel): # server -> session
    event: Literal[RESTEvents.SESSION_STAGED] = RESTEvents.SESSION_STAGED
    body: SessionMetadata



############# WebSocket messages #####################
class WSKind(str, Enum):
    ACTION = "action"
    EVENT = "event"
    ERROR= "error"

class WSErrors(str, Enum):
    INVALID_KIND = "invalid_kind" # kind field is invalid inside payload
    INVALID_EVENT = "invalid_event" # event field is invalid
    INVALID_ACTION = "invalid_action" # action field is invalid
    INVALID_BODY = "invalid_body" # couldn't validate body
    ACTION_NOT_ALLOWED = "action_not_allowed"
    SESSION_NOT_FOUND = "session_not_found"

class WSEvents(str, Enum): # these are facts that should be notified
    DASHBOARD_INIT = "dashboard_init" # dashboard[None]::server 
    DASHBOARD_RENAME = "dashboard_rename" # dashboard[Rename]::server::session

    # all events listed below will contain an "id" field inside body 
    SESSION_UPDATE = "session_update" # session[SessionMetadata]::server::dashboard
    SESSION_ACTIVATE = "session_activate" # session[WSEventTarget]::server
    SESSION_ACTIVATED = "session_activated" # server[SessionMetadata]::dashboard
    SUCCESS="success" # session[SessionMetadata]::server::dashboard
    FAIL="failed" # session[SessionMetadata]::server::dashboard

    SESSION_STATE_REPORT = "session_state_report" # session[StateReport]::server::dashboard
    STARTED = "started" # session[WSEventTarget]::server::dashboard
    STOPPED = "stopped" # session[WSEventTarget]::server::dashboard
    PAUSED = "paused" # session[WSEventTarget]::server::dashboard
    RESUMED = "resumed" # session[WSEventTarget]::server::dashboard
    DROPPED = "dropped" # server[WSEventTarget]::dashboard

class WSActions(str, Enum): # these are intents of session or dashboard
    START = "start" # dashboard[WSActionTarget]::server::target_session
    STOP = "stop" # dashboard[WSActionTarget]::server::target_session
    PAUSE = "pause" # dashboard[WSActionTarget]::server::target_session
    RESUME = "resume"# dashboard[WSActionTarget]::server::target_session
    CANCEL = "cancel"# dashboard[WSActionTarget]::server::target_session
    DROP = "drop" # dashboard[WSActionTarget]::server
    GET_STATE = "get_state" # dashboard[WSActionTarget]::server::target_session


class WSActionTarget(BaseModel):
    id: str
    triggerTime: Optional[int] = None

class Rename(BaseModel):
    name: str

class WSEventTarget(BaseModel):
    id: str

class SessionStates(str, Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    PAUSED = "paused"

class StateReport(BaseModel): # session -> server -> dashboard
    id: str
    state: SessionStates
    duration: int = 0 # in seconds


class WSPayload(BaseModel):
    kind: WSKind
    msgType: Union[WSActions, WSEvents, WSErrors]
    body: Optional[Union[WSEventTarget, StateReport, SessionMetadata, WSActionTarget, Rename]] = None



# Clock Sync Models : endpoint => /ws/sync, no timestamps or versioning
class SyncRequest(BaseModel): # client -> server (The ping)
    t1: int

class SyncResponse(BaseModel): # server -> client (The pong)
    type: str = "SYNC_RESPONSE" # to distingush on client side
    t1: int
    t2: int
    t3: int

class SyncReport(BaseModel): # client -> server (The report)
    theta: float
    rtt: float


# QR code data interface
class QRData(BaseModel):
    type: str = "vocal_link_server"
    name: str
    ip: str
