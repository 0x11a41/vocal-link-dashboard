// ============================================
// ================ NETWORKING ================
// ============================================

export const VERSION = "v0.81-alpha";
export const PORT = 6210;
export const BROADCAST = "all";

export enum WSKind {
  ACTION = "action",
  EVENT = "event",
  ERROR = "error",
  SYNC = "sync",
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
  // Recording events
  REC_STAGE = "rec_stage",
  REC_STAGED = "rec_staged",
  REC_AMEND = "rec_amend",
}

export enum WSActions {
  START = "start",
  STOP = "stop",
  PAUSE = "pause",
  RESUME = "resume",
  CANCEL = "cancel",
  DROP = "drop",
  GET_STATE = "get_state",
  START_ALL = "start_all",
  STOP_ALL = "stop_all",
  PAUSE_ALL = "pause_all",
  RESUME_ALL = "resume_all",
  CANCEL_ALL = "cancel_all",
  REC_RENAME = "rec_rename",
}

export enum WSClockSync {
  TIK = "tik",
  TOK = "tok",
  SYNC_REPORT = "sync_report",
}

export enum SessionStates {
  STOPPED = "stopped",
  RUNNING = "running",
  PAUSED = "paused",
}

// ============================================
// ================ DATA MODELS ===============
// ============================================

export interface SessionMetadata {
  id: string;
  name: string;
  ip: string;
  battery?: number | null;
  device: string;
  lastRTT?: number | null;
  theta?: number | null;
  lastSync?: number | null;
}

export interface ServerInfo {
  name: string;
  ip: string;
  version: string;
  activeSessions: number;
}

export enum RecStates {
  OK = "ok",
  NA = "na",
  WORKING = "working",
}

export interface RecMetadata {
  rid: string;
  recName: string;
  sessionId: string;
  speaker: string;
  device: string;
  duration: number;
  sizeBytes: number;
  createdAt: number;
  original: RecStates;
  enhanced: RecStates;
  transcript: RecStates;
  merged?: string[] | null;
}

// ============================================
// ================ PAYLOAD BODIES ============
// ============================================

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
  state: SessionStates;
  duration: number;
}

export interface ClockSyncTik {
  t1: number;
}

export interface ClockSyncTok {
  t1: number;
  t2: number;
  t3: number;
}

export interface ClockSyncReport {
  theta: number;
  rtt: number;
}

export interface RecStageInfo {
  sessionId: string;
  recName: string;
  duration: number;
  sizeBytes: number;
}

// ============================================
// ================ PAYLOAD UNION =============
// ============================================

export type WSBodyTypes =
  | WSEventTarget
  | StateReport
  | SessionMetadata
  | WSActionTarget
  | Rename
  | ClockSyncTik
  | ClockSyncTok
  | ClockSyncReport
  | RecMetadata
  | RecStageInfo
  | null;

export type WSMsgTypes = WSActions | WSEvents | WSClockSync | WSErrors;

export interface WSPayload {
  kind: WSKind;
  msgType: WSMsgTypes;
  body?: WSBodyTypes;
}

// ============================================
// ============ HELPERS & UTILS ===============
// ============================================

export const EnhanceProps = {
  AMPLIFY: 1,
  REDUCE_NOISE: 2,
  STUDIO_FILTER: 4,
} as const;

export const MAX_ENH_PROPS = 3;

export interface QRData {
  type: "vocal_link_server";
  name: string;
  ip: string;
  port: number;
}

// ============================================
// ============== PAYLOAD BUILDERS ============
// ============================================

export const Payloads = {
  action: (type: WSActions, id: string, triggerTime?: number): WSPayload => ({
    kind: WSKind.ACTION,
    msgType: type,
    body: { id, triggerTime: triggerTime ?? null } as WSActionTarget,
  }),

  event: (type: WSEvents, body: WSBodyTypes = null): WSPayload => ({
    kind: WSKind.EVENT,
    msgType: type,
    body,
  }),

  sync: (type: WSClockSync, body: WSBodyTypes): WSPayload => ({
    kind: WSKind.SYNC,
    msgType: type,
    body,
  }),

  error: (type: WSErrors): WSPayload => ({
    kind: WSKind.ERROR,
    msgType: type,
    body: null,
  }),
};

// =============================================
// ==================== UI =====================
// =============================================

export enum Views {
  DASHBOARD = "dashboard",
  RECORDINGS = "recordings",
  SETTINGS = "settings",
}
