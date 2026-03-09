from enum import Enum 
from pydantic import BaseModel, Field
from typing import Optional, Union, List


VERSION = "v0.81-alpha"

PORT = 6210
BROADCAST = "all"


class SessionMetadata(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=50)
    ip: str
    battery: Optional[int] = None
    device: str
    lastRTT: Optional[float] = None
    theta: Optional[float] = None
    lastSync: Optional[int] = None

class ServerInfo(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    ip: str
    version: str = VERSION
    activeSessions: int = 0


############# WebSocket messages #####################
class WSKind(str, Enum):
    ACTION = "action"
    EVENT = "event"
    ERROR= "error"
    SYNC = "sync"

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

    REC_STAGE = "rec_stage" # session[RecStageInfo]::server[recMetaData]::dashboard
    REC_STAGED = "rec_staged" # server[RecMetadata]::session
    REC_AMEND = "rec_amend" # server[RecMetadata]::dashboard


class WSActions(str, Enum): # these are intents of session or dashboard
    START = "start" # dashboard[WSActionTarget]::server::target_session
    STOP = "stop" # dashboard[WSActionTarget]::server::target_session
    PAUSE = "pause" # dashboard[WSActionTarget]::server::target_session
    RESUME = "resume"# dashboard[WSActionTarget]::server::target_session
    CANCEL = "cancel"# dashboard[WSActionTarget]::server::target_session
    DROP = "drop" # dashboard[WSActionTarget]::server
    GET_STATE = "get_state" # dashboard[WSActionTarget]::server::target_session
    START_ALL = "start_all"
    STOP_ALL = "stop_all"
    PAUSE_ALL = "pause_all"
    RESUME_ALL = "resume_all"
    CANCEL_ALL = "cancel_all"

    REC_RENAME = "rec_rename" # TODO


class WSClockSync(str, Enum): # sync channel
    TIK = "tik" # session[ClockSync]::server
    TOK = "tok" # server[ClockSync]::session-> ["TOKED" >> server]
    SYNC_REPORT = "sync_report" # session[ClockSyncReport]::server


# TIK -> TOK -> TOKED -> SESSION_UPDATE
class ClockSyncTik(BaseModel):
    t1: int

class ClockSyncTok(BaseModel):
    t1: int
    t2: int
    t3: int

class ClockSyncReport(BaseModel):
    theta: float
    rtt: float

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


class RecStageInfo(BaseModel):
    sessionId: str
    recName: str
    duration: int
    sizeBytes: int

class RecStates(str, Enum):
    OK = "ok"
    NA = "na"
    WORKING = "working"
    
class RecMetadata(BaseModel):
    rid: str 
    recName: str #
    sessionId: str
    speaker: str
    device: str
    duration: int | float
    sizeBytes: int
    createdAt: int
    original: RecStates = RecStates.NA #
    enhanced: RecStates = RecStates.NA #
    transcript: RecStates = RecStates.NA #
    merged: Optional[List[str]] = None #


class WSPayload(BaseModel):
    kind: WSKind
    msgType: Union[WSActions, WSEvents, WSClockSync, WSErrors]
    body: Optional[Union[
        WSEventTarget,
        StateReport,
        SessionMetadata,
        WSActionTarget,
        Rename,
        ClockSyncTik,
        ClockSyncTok,
        ClockSyncReport,
        RecMetadata,
        RecStageInfo,
    ]] = None


# QR code data interface
class QRData(BaseModel):
    type: str = "vocal_link_server"
    name: str
    ip: str
    port: int = PORT


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str

class TranscriptResult(BaseModel):
    rid: str
    language: str
    duration: float
    segments: List[TranscriptSegment]

class MergeRequest(BaseModel):
    rids: List[str]


class EnhanceProps:
    AMPLIFY: int = 1
    REDUCE_NOISE: int = 2
    STUDIO_FILTER: int = 4
    
