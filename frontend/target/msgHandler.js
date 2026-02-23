import { WSKind, WSEvents, Views, SessionStates } from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
function handleEvents(app, payload) {
    switch (payload.msgType) {
        case WSEvents.SESSION_ACTIVATED: {
            const body = payload.body;
            if (!app.sessions.has(body.id)) {
                app.sessions.set(body.id, new SessionCard(body));
                app.setActiveView(Views.DASHBOARD);
            }
            break;
        }
        case WSEvents.DROPPED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            if (session?.isRunning()) {
                app.triggerAllBtn.updateRunning(-1);
            }
            else if (session?.isPaused()) {
                app.triggerAllBtn.updateRunning(-1);
                app.triggerAllBtn.updatePaused(-1);
            }
            session?.card.remove();
            app.sessions.delete(body.id);
            app.syncCurrentView();
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
            if (session)
                app.triggerAllBtn.updateRunning(session.start());
            break;
        }
        case WSEvents.STOPPED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            if (session)
                app.triggerAllBtn.updateRunning(session.stop());
            break;
        }
        case WSEvents.RESUMED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            if (session)
                app.triggerAllBtn.updatePaused(session.resume());
            break;
        }
        case WSEvents.PAUSED: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            if (session)
                app.triggerAllBtn.updatePaused(session.pause());
            break;
        }
        case WSEvents.SESSION_STATE_REPORT: {
            const body = payload.body;
            const session = app.sessions.get(body.id);
            if (!session)
                return;
            const prev = session.state;
            session.setState(body.state, body.duration);
            if (prev !== body.state) {
                if (prev === SessionStates.RUNNING)
                    app.triggerAllBtn.updateRunning(-1);
                if (prev === SessionStates.PAUSED)
                    app.triggerAllBtn.updatePaused(-1);
                if (body.state === SessionStates.RUNNING)
                    app.triggerAllBtn.updateRunning(1);
                if (body.state === SessionStates.PAUSED)
                    app.triggerAllBtn.updatePaused(1);
            }
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
