import { WSKind, WSEvents, Views } from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
function handleEvents(app, payload) {
    switch (payload.msgType) {
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
            app.sessions.get(body.id)?.syncMeta(body);
            break;
        }
        case WSEvents.STARTED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            session?.start();
            app.triggerAllBtn.update(+1);
            break;
        }
        case WSEvents.STOPPED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            session?.stop();
            app.triggerAllBtn.update(-1);
            break;
        }
        case WSEvents.PAUSED: {
            break;
        }
        case WSEvents.RESUMED: {
            break;
        }
        case WSEvents.PAUSED: {
            break;
        }
        case WSEvents.SESSION_STATE_REPORT: {
            break;
        }
        case WSEvents.SUCCESS:
        case WSEvents.FAIL:
            console.log("Session result:", payload.msgType, payload.body);
            break;
    }
}
export function msgHandler(app, payload) {
    switch (payload.kind) {
        case WSKind.ERROR:
            console.error("Server error:", payload.msgType);
            break;
        case WSKind.EVENT:
            handleEvents(app, payload);
            break;
        default:
            console.warn("Unknown WS message:", payload);
            break;
    }
}
