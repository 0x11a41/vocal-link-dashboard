import { WSKind, WSEvents } from '../models/primitives.js';
import { SessionCard } from '../components/SessionCard.js';
import { Dashboard } from '../views/dashboard.js';
import { Recordings } from '../views/recordings.js';
import { server } from './serverInfo.js';
async function handleEvents({ payload, refresh }) {
    switch (payload.msgType) {
        case WSEvents.DASHBOARD_INITTED: {
            const body = payload.body;
            server.assignKey(body.key);
            await server.setup();
            refresh();
            break;
        }
        case WSEvents.SESSION_ACTIVATED: {
            const body = payload.body;
            if (!Dashboard.sessions.has(body.id)) {
                Dashboard.sessions.set(body.id, new SessionCard(body));
                refresh();
            }
            break;
        }
        case WSEvents.DROPPED: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            Dashboard.clusterBtns.render();
            session?.card.remove();
            Dashboard.sessions.delete(body.id);
            refresh();
            break;
        }
        case WSEvents.SESSION_UPDATE: {
            const body = payload.body;
            Dashboard.sessions.get(body.id)?.syncMeta(body);
            break;
        }
        case WSEvents.STARTED: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            if (session) {
                session.start();
                Dashboard.clusterBtns.render();
            }
            break;
        }
        case WSEvents.STOPPED: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            if (session) {
                session.stop();
                Dashboard.clusterBtns.render();
            }
            break;
        }
        case WSEvents.RESUMED: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            if (session) {
                session.resume();
                Dashboard.clusterBtns.render();
            }
            break;
        }
        case WSEvents.PAUSED: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            if (session) {
                session.pause();
                Dashboard.clusterBtns.render();
            }
            break;
        }
        case WSEvents.SESSION_STATE_REPORT: {
            const body = payload.body;
            const session = Dashboard.sessions.get(body.id);
            if (!session)
                return;
            const prev = session.state;
            session.setState(body.state, body.duration);
            if (prev !== body.state) {
                Dashboard.clusterBtns.render();
            }
            break;
        }
        case WSEvents.REC_STAGED: {
            const meta = payload.body;
            Recordings.append(meta);
            Recordings.setDefaultName(meta);
            break;
        }
        case WSEvents.REC_AMEND: {
            const meta = payload.body;
            Recordings.amend(meta.rid, meta);
            break;
        }
        case WSEvents.SUCCESS:
        case WSEvents.FAIL:
            console.log("Session result:", payload.msgType, payload.body);
            break;
    }
}
export async function wsHandler({ payload, refresh: refresh }) {
    switch (payload.kind) {
        case WSKind.ERROR:
            console.error("Server error:", payload.msgType);
            break;
        case WSKind.EVENT:
            await handleEvents({
                payload: payload,
                refresh: refresh
            });
            break;
        default:
            console.warn("Unknown WS message:", payload);
            break;
    }
}
