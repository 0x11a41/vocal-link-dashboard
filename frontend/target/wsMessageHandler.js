import { WSKind, WSEvents, WSActions, Views } from './types.js';
import { SessionCard } from './components/SessionCard.js';
export function handleWsMessages(app, payload) {
    switch (payload.kind) {
        case WSKind.ERROR:
            console.error("Server error:", payload.msg_type);
            break;
        case WSKind.ACTION:
            handleActions(app, payload);
            break;
        case WSKind.EVENT:
            handleEvents(app, payload);
            break;
        default:
            console.warn("Unknown WS message:", payload);
            break;
    }
}
function handleEvents(app, payload) {
    switch (payload.msg_type) {
        case WSEvents.SESSION_ACTIVATED: {
            const body = payload.body;
            if (!app.sessions.has(body.id)) {
                app.sessions.set(body.id, new SessionCard(body));
                app.syncView(Views.DASHBOARD);
            }
            break;
        }
        case WSEvents.SESSION_LEFT: {
            const body = payload.body;
            app.sessions.delete(body.id);
            app.syncView(Views.DASHBOARD);
            break;
        }
        case WSEvents.SESSION_UPDATE: {
            const body = payload.body;
            app.sessions.get(body.id)?.updateMeta(body);
            break;
        }
        case "success":
        case "failed":
            console.log("Session result:", payload.msg_type, payload.body);
            break;
    }
}
function handleActions(app, payload) {
    const body = payload.body;
    const session = app.sessions.get(body.session_id);
    switch (payload.msg_type) {
        case WSActions.STARTED:
            session?.start();
            app.triggerAllBtn.update(+1);
            break;
        case WSActions.STOPPED:
            session?.stop();
            app.triggerAllBtn.update(-1);
            break;
    }
}
