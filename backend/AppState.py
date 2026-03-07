from typing import Optional
import socket
from fastapi import WebSocket
from pydantic import ValidationError
from zeroconf.asyncio import AsyncZeroconf, AsyncServiceInfo

from backend.utils import get_local_ip, get_random_name, now_ms
import backend.primitives as P
from backend.logging import log
from backend.DashboardHandler import DashboardHandler
from backend.SessionsHandler import SessionsHandler
from backend.RecordingsHandler import RecordingsHandler
from backend.Services import Services


ACTION_MAP = {
    P.WSActions.START_ALL: P.WSActions.START,
    P.WSActions.STOP_ALL: P.WSActions.STOP,
    P.WSActions.PAUSE_ALL: P.WSActions.PAUSE,
    P.WSActions.RESUME_ALL: P.WSActions.RESUME,
    P.WSActions.CANCEL_ALL: P.WSActions.CANCEL,
}


async def send_error(ws: WebSocket, type: P.WSErrors):
    msg = P.WSPayload(kind=P.WSKind.ERROR, msgType=type).model_dump()
    log.info(msg)
    await ws.send_json(msg)
   


class AppState:
    def __init__(self, server_name: Optional[str] = None):
        self.ip:str = get_local_ip()
        self.port:int = P.PORT
        self.name:str = server_name or get_random_name()

        self.dashboard: DashboardHandler = DashboardHandler()
        self.sessions: SessionsHandler = SessionsHandler()
        self.recordings: RecordingsHandler = RecordingsHandler()

        # a service will run as a background thread and notifies the
        # session or dashboard on task completion.
        self.services: Services = Services(self.dashboard, self.recordings)

        self.mdns: Optional[AsyncZeroconf] = None
        self.mdns_conf: Optional[AsyncServiceInfo] = None


    async def _eval_triggerTime(self) -> int:
        SAFETY_MS = 200
        MIN_DELAY = 500
        DEFAULT_DELAY = 700
        MAX_SYNC_AGE = 10_000  # ms

        metas = await self.sessions.getMetaFromAllActive()
        valid_rtts = []
        now = now_ms()

        for meta in metas:
            if not meta:
                continue
            if meta.lastRTT is None:
                continue
            if meta.lastSync is None:
                continue
            if now - meta.lastSync > MAX_SYNC_AGE:
                continue
            valid_rtts.append(meta.lastRTT)

        if not valid_rtts:
            delay = DEFAULT_DELAY
        else:
            max_rtt = max(valid_rtts)
            delay = max(MIN_DELAY, int(max_rtt * 1.5) + SAFETY_MS)

        return now + delay


    async def server_info(self) -> P.ServerInfo:
        return P.ServerInfo(
            name=self.name,
            ip=self.ip,
            activeSessions = await self.sessions.getActiveCount()
        )

    def _make_mdns_conf(self) -> AsyncServiceInfo:
        return AsyncServiceInfo(
            type_="_vocalink._tcp.local.",
            name=f"{self.name}._vocalink._tcp.local.",
            addresses=[socket.inet_aton(self.ip)],
            port=self.port,
            properties={
                b"service": b"vocalink",
                b"name": self.name
            }
        )


    async def start_mdns(self):
        self.mdns = AsyncZeroconf()
        self.mdns_conf = self._make_mdns_conf()
        await self.mdns.async_register_service(self.mdns_conf)


    async def rename(self, data: P.Rename):
        if not self.mdns:
            return
        old_name = self.name
        self.name = data.name

        try:
            if self.mdns_conf:
                await self.mdns.async_unregister_service(self.mdns_conf)
        
            self.mdns_conf = self._make_mdns_conf()
            await self.mdns.async_register_service(self.mdns_conf)
            log.info(f"[SERVER] Renamed from '{old_name}' to '{self.name}'")

        except Exception as e:
            self.name = old_name
            log.error(f"[SERVER] mDNS Rename Failed: {e}")
            return
    
        await self.sessions.broadcast(P.WSPayload(
                            kind=P.WSKind.EVENT,
                            msgType=P.WSEvents.DASHBOARD_RENAME,
                            body=data
                        ))

    
    async def shutdown(self):
        if not self.mdns:
            return
        if self.mdns_conf:
            await self.mdns.async_unregister_service(self.mdns_conf)
        await self.mdns.async_close()


    async def handle_events(self, payload: P.WSPayload, ws: WebSocket):
        log.info(P.WSPayload.model_dump(payload))
        if payload.kind != P.WSKind.EVENT:
            return

        event_type = payload.msgType

        if event_type == P.WSEvents.DASHBOARD_INIT:
            await self.dashboard.assign(ws)            
            log.info("dashboard online.")


        elif event_type == P.WSEvents.DASHBOARD_RENAME:
            try:
                rename = P.Rename.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                try:
                    await ws.close(code=1007)
                except Exception:
                    pass
                return

            await self.rename(rename)


        elif event_type == P.WSEvents.SESSION_UPDATE:
            try:
                new_meta = P.SessionMetadata.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return

            updated_meta = await self.sessions.updateMeta(new_meta)
            if updated_meta:
                await self.dashboard.notify(P.WSPayload(
                                                kind = P.WSKind.EVENT,
                                                msgType = P.WSEvents.SESSION_UPDATE,
                                                body = updated_meta
                                            ))
            else:
                await send_error(ws, P.WSErrors.SESSION_NOT_FOUND)


        elif event_type == P.WSEvents.SESSION_ACTIVATE:
            try:
                meta = P.WSEventTarget.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return

            if not await self.sessions.exists(meta.id):
                await send_error(ws, P.WSErrors.SESSION_NOT_FOUND)
                await ws.close(code=1007)
                return

            sessionMeta = await self.sessions.commit(meta.id, ws)
            if not sessionMeta:
                await send_error(ws, P.WSErrors.SESSION_NOT_FOUND)
                try:
                    await ws.close(code=1007)
                except Exception:
                    pass
                return

            res = P.WSPayload(
                      kind=P.WSKind.EVENT,
                      msgType=P.WSEvents.SESSION_ACTIVATED,
                      body=sessionMeta
                  )
            await self.sessions.send_to_one(meta.id, res)
            await self.dashboard.notify(res)


        elif event_type in (
                P.WSEvents.SUCCESS,
                P.WSEvents.FAIL
            ):
            await self.dashboard.notify(payload)


        elif event_type in (
                P.WSEvents.STARTED,
                P.WSEvents.STOPPED,
                P.WSEvents.RESUMED,
                P.WSEvents.PAUSED,
            ):
            try:
                P.WSEventTarget.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return
            await self.dashboard.notify(payload)


        elif event_type == P.WSEvents.SESSION_STATE_REPORT:
            try:
                P.StateReport.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return
            await self.dashboard.notify(payload)


        elif event_type == P.WSEvents.REC_STAGE:
            try:
                stageInfo = P.RecStageInfo.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return
            
            meta = await self.sessions.getMetaFromActive(stageInfo.sessionId)
            if not meta:
                return
            recMeta = await self.recordings.stage(stageInfo, meta)

            if not recMeta:
                return
            payload = P.WSPayload(
                                  kind = P.WSKind.EVENT,
                                  msgType = P.WSEvents.REC_STAGED,
                                  body = recMeta
                              )

            self.sessions.send_to_one(recMeta.sessionId, payload)
            self.dashboard.notify(payload)


        else:
            await send_error(ws, P.WSErrors.INVALID_EVENT)
            try:
                await ws.close(code=1007)
            except Exception:
                pass



    async def handle_actions(self, payload: P.WSPayload, ws: WebSocket):
        log.info(P.WSPayload.model_dump(payload))
        if payload.kind != P.WSKind.ACTION:
            return

        dashboard = await self.dashboard.ws()
        if ws != dashboard:
            log.warning("Unauthenticated action sender")
            await send_error(ws, P.WSErrors.ACTION_NOT_ALLOWED)
            return

        action_type = payload.msgType
        try:
            target = P.WSActionTarget.model_validate(payload.body)
        except ValidationError as e:
            log.warning(f"Invalid action body: {e}")
            await send_error(ws, P.WSErrors.INVALID_BODY)
            return

        if action_type in (
            P.WSActions.START,
            P.WSActions.STOP,
            P.WSActions.PAUSE,
            P.WSActions.RESUME,
            P.WSActions.CANCEL,
            P.WSActions.GET_STATE,
        ):
            if await self.sessions.is_active(target.id):
                await self.sessions.send_to_one(target.id, payload)
            else:
                await send_error(ws, P.WSErrors.SESSION_NOT_FOUND)

        elif action_type == P.WSActions.DROP:
            if not await self.sessions.exists(target.id):
                await send_error(ws, P.WSErrors.SESSION_NOT_FOUND)
                return

            await self.sessions.drop(target.id)
            await self.dashboard.notify(P.WSPayload(
                kind = P.WSKind.EVENT,
                msgType = P.WSEvents.DROPPED,
                body = P.WSEventTarget(id=target.id)
            ))


        elif action_type in ACTION_MAP:
            action = ACTION_MAP[action_type]
            if action != P.WSActions.CANCEL:
                target.triggerTime = await self._eval_triggerTime()
            await self.sessions.broadcast(P.WSPayload(
                                        kind = P.WSKind.ACTION,
                                        msgType = action,
                                        body = target
                                    ))
            

        else:
            await send_error(ws, P.WSErrors.INVALID_ACTION)
                

    async def handle_sync(self, payload: P.WSPayload, ws: WebSocket):
        # log.info(P.WSPayload.model_dump(payload))
        if payload.kind != P.WSKind.SYNC:
            return

        id = self.sessions.get_id(ws)
        if not id:
            log.warning("caught inactive session attempting syncing")
            return

        if payload.msgType == P.WSClockSync.TIK:
            try:
                sync_req = P.ClockSyncTik.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return

            t2 = now_ms()
            t1 = sync_req.t1
            await self.sessions.send_to_one(id, P.WSPayload(
                                      kind = P.WSKind.SYNC,
                                      msgType = P.WSClockSync.TOK,
                                      body = P.ClockSyncTok(t1=t1, t2=t2, t3=now_ms())
                                  ))


        elif payload.msgType == P.WSClockSync.SYNC_REPORT:
            try:
                report = P.ClockSyncReport.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return


            meta = await self.sessions.update_sync(id, report)
            if meta:
                await self.dashboard.notify(P.WSPayload(
                                            kind = P.WSKind.EVENT,
                                            msgType = P.WSEvents.SESSION_UPDATE,
                                            body = meta
                                        ))

        

    async def handle_disconnect(self, ws: WebSocket):
        if ws == await self.dashboard.ws():
            await self.dashboard.drop(ws)
            log.info("Dashboard went offline (refresh or close).")
            return

        id = self.sessions.get_id(ws)
        if not id:
            log.info("unknown session disconnected.")
            return

        active = await self.sessions.is_active(id)
        dashboard_available = await self.dashboard.available()
        if active and dashboard_available:
            await self.dashboard.notify(P.WSPayload(
                    kind=P.WSKind.EVENT,
                    msgType=P.WSEvents.DROPPED,
                    body=P.WSEventTarget(id=id)
                ))

            await self.sessions.drop(id)
            log.info(f"Session [{id}] disconnected.")
