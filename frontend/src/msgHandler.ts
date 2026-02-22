import {WSKind, WSEvents, Views, WSPayload, SessionMetadata, WSEventTarget, StateReport, SessionStates} from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
import type { VLApp } from './app.js'; 


function handleEvents(app: VLApp, payload: WSPayload) {
  switch (payload.msgType) {
    case WSEvents.SESSION_ACTIVATED: {
      const body = payload.body as SessionMetadata;
      if (!app.sessions.has(body.id)) {
        app.sessions.set(body.id, new SessionCard(body));
        app.setActiveView(Views.DASHBOARD);
      }
      break;
    } case WSEvents.DROPPED: {
      const body = payload.body as WSEventTarget;
      app.sessions.delete(body.id);
      app.syncCurrentView();
      break;
    } case WSEvents.SESSION_UPDATE: {
      const body = payload.body as SessionMetadata;
      app.sessions.get(body.id)?.syncMeta(body);
      break;
    } case WSEvents.STARTED: {
      const body = payload.body as WSEventTarget;
      const session = app.sessions.get(body.id);
      if (session) app.triggerAllBtn.updateRunning(session.start());
      break;
    } case WSEvents.STOPPED: {
      const body = payload.body as WSEventTarget;
      const session = app.sessions.get(body.id);
      if (session) app.triggerAllBtn.updateRunning(session.stop());
      break;
    } case WSEvents.RESUMED: {
      const body = payload.body as WSEventTarget;
      const session = app.sessions.get(body.id);
      if (session) app.triggerAllBtn.updatePaused(session.resume());
      break;
    } case WSEvents.PAUSED: {
      const body = payload.body as WSEventTarget;
      const session = app.sessions.get(body.id);
      if (session) app.triggerAllBtn.updatePaused(session.pause());
      break;
    } case WSEvents.SESSION_STATE_REPORT: {
      const body = payload.body as StateReport;
      console.log(body);
      const session = app.sessions.get(body.id);
      if (!session) return;

      switch (body.state) {
        case SessionStates.PAUSED: {
          app.triggerAllBtn.updatePaused(session.pause(body.duration));
          break;
        } case SessionStates.RUNNING: {
          app.triggerAllBtn.updateRunning(session.start(body.duration));
          break;
        } case SessionStates.STOPPED: {
          app.triggerAllBtn.updateRunning(session.stop());
          break;
        }
      }
      break;
    } case WSEvents.SUCCESS: case WSEvents.FAIL:
      console.log("Session result:", payload.msgType, payload.body);
      break;
  }
}


export function msgHandler(app: VLApp, payload: WSPayload): void {
  switch (payload.kind) {
    case WSKind.ERROR: console.error("Server error:", payload.msgType); break;
    case WSKind.EVENT: handleEvents(app, payload); break;
    default: console.warn("Unknown WS message:", payload); break;
  }
}
