// ============================================
// ================ NETWORKING ================
// ============================================
export enum WSKind {
  ACTION = "action",
  EVENT = "event",
  ERROR = "error",
}

export enum WSErrors {
  INVALID_KIND = "invalid_kind",
  INVALID_EVENT = "invalid_event",
  INVALID_BODY = "invalid_body",
  ACTION_NOT_ALLOWED = "action_not_allowed",
  SESSION_NOT_FOUND = "session_not_found",
}

export enum WSEvents {
  DASHBOARD_INIT = "dashboard_init",
  DASHBOARD_RENAME = "dashboard_rename",
  SESSION_UPDATE = "session_update",
  SESSION_ACTIVATE = "session_activate",
  SESSION_ACTIVATED = "session_activated",
  SESSION_LEFT = "session_left",
  SESSION_STATE_REPORT = "session_state_report",
  STARTED = "started",
  STOPPED = "stopped",
  PAUSED = "paused",
  RESUMED = "resumed",
  SUCCESS = "success",
  FAIL = "failed",
}

export enum WSActions {
  START = "start",
  STOP = "stop",
  PAUSE = "pause",
  RESUME = "resume",
  CANCEL = "cancel",
  GET_STATE = "get_state",
}

export enum SessionStates {
  STOPPED = "stopped",
  RUNNING = "running",
  PAUSED = "paused",
}

export interface SessionMetadata {
  id: string;
  name: string;
  ip: string;
  battery: number;
  device: string;
  theta: number; 
  lastRTT: number; 
  lastSync?: number | null;
}

export interface ServerInfo {
    name: string;
    ip: string;
    version: string;
    activeSessions: number;
}

export enum RESTEvents {
  // TODO
}

export interface Rename {
  name: string;
}

export interface WSActionTarget {
  id: string;
  triggerTime?: number | null;
}

export interface WSEventTarget {
  id: string;
}

export interface StateReport {
  id: string;
  status: SessionStates;
  duration: number
}

type WSBodyTypes = SessionMetadata |
  WSActionTarget |
  WSEventTarget |
  StateReport |
  Rename |
  null;

type WSMsgTypes = WSActions |
  WSEvents |
  WSErrors;

export interface WSPayload {
  kind: WSKind;
  msgType: WSMsgTypes;
  body: WSBodyTypes;
}

// WSPayload factory
export const Payloads = {
  action: (type: WSActions, session_id: string = "all"): WSPayload => ({
    kind: WSKind.ACTION,
    msgType: type,
    body: {
      id: session_id,
      triggerTime: null
    }
  }),

  event: (type: WSEvents, body: WSBodyTypes | null = null): WSPayload => ({
    kind: WSKind.EVENT,
    msgType: type,
    body: body
  }),

  rename: (newName: string): WSPayload => ({
    kind: WSKind.ACTION,
    msgType: WSEvents.DASHBOARD_RENAME,
    body: {
      name: newName
    }
  }),

  error: (type: WSErrors): WSPayload => ({
    kind: WSKind.ERROR,
    msgType: type,
    body: null,
  }),
};


// =============================================
// ==================== UI======================
// =============================================
export enum Views {
  DASHBOARD = "dashboard",
  RECORDINGS = "recordings",
  SETTINGS = "settings"
}

