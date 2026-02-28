import { WSKind, WSEvents, WSPayload, SessionMetadata, WSEventTarget, StateReport} from '../models/primitives.js';
import { SessionCard } from '../components/SessionCard.js';
import { dashboard } from '../views/dashboard.js';

interface Props {
  payload: WSPayload;
  renderView: () => void;
}

function handleEvents({payload, renderView}: Props) {
  switch (payload.msgType) {

    case WSEvents.SESSION_ACTIVATED: {
      const body = payload.body as SessionMetadata;
      if (!dashboard.sessions.has(body.id)) {
        dashboard.sessions.set(body.id, new SessionCard(body));
        renderView();
      }
      break;
    }

    case WSEvents.DROPPED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      dashboard.clusterBtns.render();
      session?.card.remove();
      dashboard.sessions.delete(body.id);
      renderView();
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
        dashboard.clusterBtns.render();
      }
      break;
    }

    case WSEvents.STOPPED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.stop();
        dashboard.clusterBtns.render();
      }
      break;
    }

    case WSEvents.RESUMED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.resume();
        dashboard.clusterBtns.render(); 
      }
      break;
    }

    case WSEvents.PAUSED: {
      const body = payload.body as WSEventTarget;
      const session = dashboard.sessions.get(body.id);
      if (session) {
        session.pause();
        dashboard.clusterBtns.render();
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
        dashboard.clusterBtns.render();
      }
      break;
    }

    case WSEvents.SUCCESS: case WSEvents.FAIL:
      console.log("Session result:", payload.msgType, payload.body);
      break;
  }
}


export function wsHandler({payload, renderView: refresh}: Props): void {
  switch (payload.kind) {
    case WSKind.ERROR: console.error("Server error:", payload.msgType); break;

    case WSKind.EVENT: handleEvents({
        payload: payload,
        renderView: refresh
      });
      break;

    default: console.warn("Unknown WS message:", payload); break;
  }
}
