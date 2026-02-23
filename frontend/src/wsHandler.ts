import {WSKind, WSEvents, Views, WSPayload, SessionMetadata, WSEventTarget, StateReport} from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { DashboardView } from './views/dashboard.js';

interface Props {
  dashboard: DashboardView;
  payload: WSPayload;
  refresh: () => void;
}

function handleEvents({dashboard, payload, refresh: refresh}: Props) {
  console.log("event");
  switch (payload.msgType) {

    case WSEvents.SESSION_ACTIVATED: {
      const body = payload.body as SessionMetadata;
      if (!dashboard.sessions.has(body.id)) {
        dashboard.sessions.set(body.id, new SessionCard(body));
        refresh();
      }
      break;
    }

    case WSEvents.DROPPED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      dashboard.actions.render();
      session?.card.remove();
      dashboard.sessions.delete(body.id);
      refresh();
      break;
    }

    case WSEvents.SESSION_UPDATE: {
      const body = payload.body as SessionMetadata;
      dashboard.sessions.get(body.id)?.syncMeta(body);
      break;
    }

    case WSEvents.STARTED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.start();
        dashboard.actions.render();
      }
      break;
    }

    case WSEvents.STOPPED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.stop();
        dashboard.actions.render();
      }
      break;
    }

    case WSEvents.RESUMED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.resume();
        dashboard.actions.render(); 
      }
      break;
    }

    case WSEvents.PAUSED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.pause();
        dashboard.actions.render();
      }
      break;
    }

    case WSEvents.SESSION_STATE_REPORT: {
      const body = payload.body as StateReport;
      const session = dashboard.sessions.get(body.id);
      if (!session) return;

      const prev = session.state;
      session.setState(body.state, body.duration);

      if (prev !== body.state) {
        dashboard.actions.render();
      }
      break;
    }

    case WSEvents.SUCCESS: case WSEvents.FAIL:
      console.log("Session result:", payload.msgType, payload.body);
      break;
  }
}


export function wsHandler({dashboard, payload, refresh}: Props): void {
  switch (payload.kind) {
    case WSKind.ERROR: console.error("Server error:", payload.msgType); break;

    case WSKind.EVENT: handleEvents({
        dashboard: dashboard,
        payload: payload,
        refresh: refresh
      });
      break;

    default: console.warn("Unknown WS message:", payload); break;
  }
}
