import { WSKind, WSEvents, WSPayload, SessionMetadata, WSEventTarget, StateReport, RecMetadata, RestAuth} from '../models/primitives.js';
import { SessionCard } from '../components/SessionCard.js';
import { Dashboard } from '../views/dashboard.js';
import { Recordings } from '../views/recordings.js';
import { server } from './serverInfo.js';
import { log } from '../components/logger.js';

interface Props {
  payload: WSPayload;
  refresh: () => void;
}

async function handleEvents({payload, refresh}: Props) {
  switch (payload.msgType) {

    case WSEvents.DASHBOARD_INITTED: {
      const body = payload.body as RestAuth;
      server.assignKey(body.key);
      await server.setup();
      refresh();
      log.info(server.info && server.info.version || "");
      break;
    }

    case WSEvents.SESSION_ACTIVATED: {
      const body = payload.body as SessionMetadata;
      if (!Dashboard.sessions.has(body.id)) {
        Dashboard.sessions.set(body.id, new SessionCard(body));
        refresh();
        log.info(`${body.name} joined.`);
      }
      break;
    }

    case WSEvents.DROPPED: {
      const body = payload.body as WSEventTarget;
      const session = Dashboard.sessions.get(body.id);
      Dashboard.clusterBtns.render();
      session?.card.remove();
      Dashboard.sessions.delete(body.id);
      refresh();
      log.info(`${session?.meta.name} disconnected`)
      break;
    }

    case WSEvents.SESSION_UPDATE: {
      const body = payload.body as SessionMetadata;
      Dashboard.sessions.get(body.id)?.syncMeta(body);
      break;
    }

    case WSEvents.STARTED: {
      const body = payload.body as WSEventTarget;
      const session = Dashboard.sessions.get(body.id);
      if (session) {
        session.start();
        Dashboard.clusterBtns.render();
        log.info(`${session.meta.name} is recording...`);
      }
      break;
    }

    case WSEvents.STOPPED: {
      const body = payload.body as WSEventTarget;
      const session = Dashboard.sessions.get(body.id);
      if (session) {
        session.stop();
        Dashboard.clusterBtns.render();
        log.info(`${session.meta.name} stopped recording.`);
      }
      break;
    }

    case WSEvents.RESUMED: {
      const body = payload.body as WSEventTarget;
      const session = Dashboard.sessions.get(body.id);
      if (session) {
        session.resume();
        Dashboard.clusterBtns.render(); 
        log.info(`${session.meta.name} resumed`);
      }
      break;
    }

    case WSEvents.PAUSED: {
      const body = payload.body as WSEventTarget;
      const session = Dashboard.sessions.get(body.id);
      if (session) {
        session.pause();
        Dashboard.clusterBtns.render();
        log.info(`${session.meta.name} paused`);
      }
      break;
    }

    case WSEvents.SESSION_STATE_REPORT: {
      const body = payload.body as StateReport;
      const session = Dashboard.sessions.get(body.id);
      if (!session) return;

      const prev = session.state;
      session.setState(body.state, body.duration);

      if (prev !== body.state) {
        Dashboard.clusterBtns.render();
      }
      break;
    }

    case WSEvents.REC_STAGED: {
      const meta = payload.body as RecMetadata;      
      Recordings.append(meta);
      Recordings.setDefaultName(meta);
      log.info(`waiting for audio file...`);
      break;      
    }

    case WSEvents.REC_AMEND: {
      const meta = payload.body as RecMetadata;
      Recordings.amend(meta.rid, meta);
      log.info(`Recording amended.`);
      break;
    }


    case WSEvents.SUCCESS: case WSEvents.FAIL:
      console.log("Session result:", payload.msgType, payload.body);
      break;
  }
}


export async function wsHandler({payload, refresh: refresh}: Props): Promise<void> {
  switch (payload.kind) {
    case WSKind.ERROR: console.error("Server error:", payload.msgType); break;

    case WSKind.EVENT: await handleEvents({
        payload: payload,
        refresh: refresh
      });
      break;

    default: console.warn("Unknown WS message:", payload); break;
  }
}
