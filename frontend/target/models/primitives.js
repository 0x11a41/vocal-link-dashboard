export const VERSION = "v0.83-alpha";
export const PORT = 6210;
export const BROADCAST = "all";
export var WSKind;
(function (WSKind) {
    WSKind["ACTION"] = "action";
    WSKind["EVENT"] = "event";
    WSKind["ERROR"] = "error";
    WSKind["SYNC"] = "sync";
})(WSKind || (WSKind = {}));
export var WSErrors;
(function (WSErrors) {
    WSErrors["INVALID_KIND"] = "invalid_kind";
    WSErrors["INVALID_EVENT"] = "invalid_event";
    WSErrors["INVALID_ACTION"] = "invalid_action";
    WSErrors["INVALID_BODY"] = "invalid_body";
    WSErrors["ACTION_NOT_ALLOWED"] = "action_not_allowed";
    WSErrors["SESSION_NOT_FOUND"] = "session_not_found";
    WSErrors["INVALID_EXTENSION"] = "invalid_extension";
    WSErrors["ITEM_NOT_FOUND"] = "item_not_found";
})(WSErrors || (WSErrors = {}));
export var WSEvents;
(function (WSEvents) {
    WSEvents["DASHBOARD_INIT"] = "dashboard_init";
    WSEvents["DASHBOARD_RENAME"] = "dashboard_rename";
    WSEvents["SESSION_UPDATE"] = "session_update";
    WSEvents["SESSION_ACTIVATE"] = "session_activate";
    WSEvents["SESSION_ACTIVATED"] = "session_activated";
    WSEvents["SUCCESS"] = "success";
    WSEvents["FAIL"] = "failed";
    WSEvents["SESSION_STATE_REPORT"] = "session_state_report";
    WSEvents["STARTED"] = "started";
    WSEvents["STOPPED"] = "stopped";
    WSEvents["PAUSED"] = "paused";
    WSEvents["RESUMED"] = "resumed";
    WSEvents["DROPPED"] = "dropped";
    WSEvents["REC_STAGE"] = "rec_stage";
    WSEvents["REC_STAGED"] = "rec_staged";
    WSEvents["REC_AMEND"] = "rec_amend";
})(WSEvents || (WSEvents = {}));
export var WSActions;
(function (WSActions) {
    WSActions["START"] = "start";
    WSActions["STOP"] = "stop";
    WSActions["PAUSE"] = "pause";
    WSActions["RESUME"] = "resume";
    WSActions["CANCEL"] = "cancel";
    WSActions["DROP"] = "drop";
    WSActions["GET_STATE"] = "get_state";
    WSActions["START_ALL"] = "start_all";
    WSActions["STOP_ALL"] = "stop_all";
    WSActions["PAUSE_ALL"] = "pause_all";
    WSActions["RESUME_ALL"] = "resume_all";
    WSActions["CANCEL_ALL"] = "cancel_all";
})(WSActions || (WSActions = {}));
export var WSClockSync;
(function (WSClockSync) {
    WSClockSync["TIK"] = "tik";
    WSClockSync["TOK"] = "tok";
    WSClockSync["SYNC_REPORT"] = "sync_report";
})(WSClockSync || (WSClockSync = {}));
export var SessionStates;
(function (SessionStates) {
    SessionStates["STOPPED"] = "stopped";
    SessionStates["RUNNING"] = "running";
    SessionStates["PAUSED"] = "paused";
})(SessionStates || (SessionStates = {}));
export var AudioFormat;
(function (AudioFormat) {
    AudioFormat["M4A"] = ".m4a";
    AudioFormat["MP3"] = ".mp3";
    AudioFormat["OGG"] = ".ogg";
})(AudioFormat || (AudioFormat = {}));
export var AccentColor;
(function (AccentColor) {
    AccentColor["ORANGE"] = "#E7965C";
    AccentColor["BLUE"] = "#5C96E7";
    AccentColor["GREEN"] = "#5CE796";
    AccentColor["PURPLE"] = "#965CE7";
    AccentColor["GRAY"] = "#4A5568";
})(AccentColor || (AccentColor = {}));
export var RecStates;
(function (RecStates) {
    RecStates["OK"] = "ok";
    RecStates["NA"] = "na";
    RecStates["WORKING"] = "working";
})(RecStates || (RecStates = {}));
export const EnhanceProps = {
    AMPLIFY: 1,
    REDUCE_NOISE: 2,
    STUDIO_FILTER: 4,
};
export const MAX_ENH_PROPS = 3;
export const Payloads = {
    action: (type, id, triggerTime) => ({
        kind: WSKind.ACTION,
        msgType: type,
        body: { id, triggerTime: triggerTime ?? null },
    }),
    event: (type, body = null) => ({
        kind: WSKind.EVENT,
        msgType: type,
        body,
    }),
    sync: (type, body) => ({
        kind: WSKind.SYNC,
        msgType: type,
        body,
    }),
    error: (type) => ({
        kind: WSKind.ERROR,
        msgType: type,
        body: null,
    }),
};
export var Views;
(function (Views) {
    Views["DASHBOARD"] = "dashboard";
    Views["RECORDINGS"] = "recordings";
    Views["CONFIGURE"] = "configure";
})(Views || (Views = {}));
