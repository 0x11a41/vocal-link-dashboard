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
  INVALID_ACTION = "invalid_action",
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
  SUCCESS = "success",
  FAIL = "failed",
  SESSION_STATE_REPORT = "session_state_report",
  STARTED = "started",
  STOPPED = "stopped",
  PAUSED = "paused",
  RESUMED = "resumed",
  DROPPED = "dropped",
}

export enum WSActions {
  START = "start",
  STOP = "stop",
  PAUSE = "pause",
  RESUME = "resume",
  CANCEL = "cancel",
  DROP = "drop",
  GET_STATE = "get_state",
}

export enum SessionStates {
  STOPPED = "stopped",
  RUNNING = "running",
  PAUSED = "paused",
}


// ============================================
// ================ REST TYPES ================
// ============================================

export enum RESTEvents {
}


// ============================================
// ================ DATA MODELS ===============
// ============================================

export interface SessionMetadata {
  id: string
  name: string
  ip: string
  battery?: number | null
  device: string
  lastRTT?: number | null
  theta?: number | null
  lastSync?: number | null
}

export interface ServerInfo {
  name: string
  ip: string
  version: string
  activeSessions: number
}


// ============================================
// ================ PAYLOAD BODIES ============
// ============================================

export interface Rename {
  name: string
}

export interface WSActionTarget {
  id: string
  triggerTime?: number | null
}

export interface WSEventTarget {
  id: string
}

export interface StateReport {
  id: string
  state: SessionStates
  duration: number
}


// ============================================
// ================ PAYLOAD UNION =============
// ============================================

export type WSBodyTypes =
  | SessionMetadata
  | WSActionTarget
  | WSEventTarget
  | StateReport
  | Rename
  | null

export type WSMsgTypes =
  | WSActions
  | WSEvents
  | WSErrors


export interface WSPayload {
  kind: WSKind
  msgType: WSMsgTypes
  body?: WSBodyTypes
}


// ============================================
// ============== PAYLOAD BUILDERS ============
// ============================================

export const Payloads = {

  action: (
    type: WSActions,
    id: string,
    triggerTime?: number
  ): WSPayload => ({
    kind: WSKind.ACTION,
    msgType: type,
    body: {
      id,
      triggerTime: triggerTime ?? null
    }
  }),

  event: (
    type: WSEvents,
    body: WSBodyTypes = null
  ): WSPayload => ({
    kind: WSKind.EVENT,
    msgType: type,
    body
  }),

  rename: (newName: string): WSPayload => ({
    kind: WSKind.EVENT,
    msgType: WSEvents.DASHBOARD_RENAME,
    body: { name: newName }
  }),

  error: (type: WSErrors): WSPayload => ({
    kind: WSKind.ERROR,
    msgType: type,
    body: null,
  }),
}


// =============================================
// ==================== UI =====================
// =============================================

export enum Views {
  DASHBOARD = "dashboard",
  RECORDINGS = "recordings",
  SETTINGS = "settings"
}
