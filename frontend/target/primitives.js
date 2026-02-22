export var WSKind;
(function (WSKind) {
    WSKind["ACTION"] = "action";
    WSKind["EVENT"] = "event";
    WSKind["ERROR"] = "error";
})(WSKind || (WSKind = {}));
export var WSErrors;
(function (WSErrors) {
    WSErrors["INVALID_KIND"] = "invalid_kind";
    WSErrors["INVALID_EVENT"] = "invalid_event";
    WSErrors["INVALID_BODY"] = "invalid_body";
    WSErrors["ACTION_NOT_ALLOWED"] = "action_not_allowed";
    WSErrors["SESSION_NOT_FOUND"] = "session_not_found";
})(WSErrors || (WSErrors = {}));
export var WSEvents;
(function (WSEvents) {
    WSEvents["DASHBOARD_INIT"] = "dashboard_init";
    WSEvents["DASHBOARD_RENAME"] = "dashboard_rename";
    WSEvents["SESSION_UPDATE"] = "session_update";
    WSEvents["SESSION_ACTIVATE"] = "session_activate";
    WSEvents["SESSION_ACTIVATED"] = "session_activated";
    WSEvents["SESSION_STATE_REPORT"] = "session_state_report";
    WSEvents["STARTED"] = "started";
    WSEvents["STOPPED"] = "stopped";
    WSEvents["PAUSED"] = "paused";
    WSEvents["RESUMED"] = "resumed";
    WSEvents["SUCCESS"] = "success";
    WSEvents["FAIL"] = "failed";
    WSEvents["DROPPED"] = "dropped";
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
})(WSActions || (WSActions = {}));
export var SessionStates;
(function (SessionStates) {
    SessionStates["STOPPED"] = "stopped";
    SessionStates["RUNNING"] = "running";
    SessionStates["PAUSED"] = "paused";
})(SessionStates || (SessionStates = {}));
export var RESTEvents;
(function (RESTEvents) {
})(RESTEvents || (RESTEvents = {}));
export const Payloads = {
    action: (type, session_id = "all") => ({
        kind: WSKind.ACTION,
        msgType: type,
        body: {
            id: session_id,
            triggerTime: null
        }
    }),
    event: (type, body = null) => ({
        kind: WSKind.EVENT,
        msgType: type,
        body: body
    }),
    rename: (newName) => ({
        kind: WSKind.ACTION,
        msgType: WSEvents.DASHBOARD_RENAME,
        body: {
            name: newName
        }
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
    Views["SETTINGS"] = "settings";
})(Views || (Views = {}));
