from typing import Optional, List, Dict
import asyncio
import socket
import time
from fastapi import WebSocket
from pydantic import ValidationError
from zeroconf.asyncio import AsyncZeroconf, AsyncServiceInfo
from backend.utils import get_local_ip, get_random_name
import backend.primitives as P


async def send_error(ws: WebSocket, type: P.WSErrors):
    msg = P.WSPayload(kind=P.WSKind.ERROR, msgType=type).model_dump()
    print(msg)
    await ws.send_json(msg)

def now_ms():
    return time.time_ns() // 1_000_000

class DashboardHandler:
    def __init__(self):
        self._dashboard: Optional[WebSocket] = None
        self.lock = asyncio.Lock()


    async def ws(self) -> Optional[WebSocket]:
        async with self.lock:
            return self._dashboard


    async def assign(self, ws: WebSocket):
        async with self.lock:
            if self._dashboard and self._dashboard != ws:
                try:
                    await self._dashboard.close()
                except Exception:
                    pass 
            self._dashboard = ws


    async def drop(self, ws: WebSocket):
        async with self.lock:
            if self._dashboard == ws:
                self._dashboard = None


    async def notify(self, payload: P.WSPayload):
        async with self.lock:
            if not self._dashboard:
                return
        try:
            await self._dashboard.send_json(payload.model_dump())
        except Exception:
            print('dashboard got disconnected due to unexpected exception')
            await self.drop(self._dashboard)


    async def available(self) -> bool:
        async with self.lock:
            return self._dashboard is not None



class Session:
    __slots__ = ('meta', 'ws') 
    def __init__(self, meta: P.SessionMetadata, ws: WebSocket):
        self.meta: P.SessionMetadata = meta
        self.ws: WebSocket = ws


class SessionsHandler: # thread safe
    def __init__(self):
        self._active: Dict[str, Session] = {}
        self._staging: Dict[str, P.SessionMetadata] = {} # sessionId, meta
        self._ws_to_id: Dict[WebSocket, str] = {}
        self._lock = asyncio.Lock()

    async def updateMeta(self, new_meta: P.SessionMetadata) -> P.SessionMetadata | None:
        async with self._lock:
            session = self._active.get(new_meta.id)
            if session:
                update_data = new_meta.model_dump(exclude_unset=True)
                session.meta = session.meta.model_copy(update=update_data)
                return session.meta
            return None
                

    async def rename(self, id: str, name: str):
        async with self._lock:
            session = self._active.get(id)
            if session:
                session.meta.name = name


    async def getActiveCount(self) -> int:
        async with self._lock:
            return len(self._active)


    async def is_active(self, id: str) -> bool:
        async with self._lock:
            return id in self._active


    async def exists(self, id: str) -> bool:
        async with self._lock:
            return (id in self._active or id in self._staging)


    async def getMetaFromAllActive(self) -> List[P.SessionMetadata]:
        async with self._lock:
            sessions = list(self._active.values())

        return [s.meta.model_copy() for s in sessions]


    async def getMetaFromActive(self, id: str) -> Optional[P.SessionMetadata]:
        async with self._lock:
            s = self._active.get(id)
            return s.meta.model_copy() if s else None


    # puts metadata into staging
    async def stage(self, meta: P.SessionMetadata) -> None:
        async with self._lock:
            self._staging[meta.id] = meta


    # release id entry from staging and put it into active 
    async def commit(self, id: str, session_ws: WebSocket) -> Optional[P.SessionMetadata]:
        async with self._lock:
            meta = self._staging.pop(id, None)
            if not meta:
                if id in self._active:
                    self._active[id].ws = session_ws
                    return self._active[id].meta
                return None

            self._active[id] = Session(meta, session_ws)
            self._ws_to_id[session_ws] = id
            return meta


    async def drop(self, id: str):
        ws = None
        async with self._lock:
            session = self._active.pop(id, None)
            if session:
                ws = session.ws
                self._ws_to_id.pop(ws, None)
            else:
                self._staging.pop(id, None)

        if ws:
            try:
                await ws.close()
            except Exception:
                pass



    async def send_to_one(self, id, payload):
        async with self._lock:
            session = self._active.get(id)
            ws = session.ws if session else None

        if not ws:
            return

        try:
            await ws.send_json(payload.model_dump())
        except Exception:
            await self.drop(id)


    async def broadcast(self, data: P.WSPayload) -> None:
        async with self._lock:
            targets = [(sid, s.ws) for sid, s in self._active.items()]
        
        payload = data.model_dump()
        dead = []
        for sid, ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(sid)

        for sid in dead:
            await self.drop(sid)

    
    async def update_sync(self,id: str, report: P.ClockSyncReport) -> P.SessionMetadata | None:
        async with self._lock:
            session = self._active.get(id)
            if session:
                session.meta.theta = report.theta
                session.meta.lastRTT = report.rtt
                session.meta.lastSync = now_ms()
                return session.meta
            return None


    def get_id(self, ws: WebSocket) -> Optional[str]:
        return self._ws_to_id.get(ws)
        


class AppState:
    def __init__(
        self,
        port: int,
        ip: Optional[str] = None,
        server_name: Optional[str] = None
    ):

        self.ip:str = ip or get_local_ip()
        self.port:int = port
        self.name:str = server_name or get_random_name()

        self.dashboard: DashboardHandler = DashboardHandler()
        self.sessions: SessionsHandler = SessionsHandler()

        self.mdns: AsyncZeroconf = AsyncZeroconf()
        self.mdns_conf: Optional[AsyncServiceInfo] = None


    async def _eval_triggerTime(self) -> int:
        SAFETY_MS = 200
        MIN_DELAY = 500
        DEFAULT_DELAY = 800
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
            delay = max(MIN_DELAY, int(max_rtt * 2) + SAFETY_MS)

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
        self.mdns_conf = self._make_mdns_conf()
        await self.mdns.async_register_service(self.mdns_conf)


    async def rename(self, data: P.Rename):
        old_name = self.name
        self.name = data.name

        try:
            if self.mdns_conf:
                await self.mdns.async_unregister_service(self.mdns_conf)
        
            self.mdns_conf = self._make_mdns_conf()
            await self.mdns.async_register_service(self.mdns_conf)
            print(f"[SERVER] Renamed from '{old_name}' to '{self.name}'")

        except Exception as e:
            self.name = old_name
            print(f"[SERVER] mDNS Rename Failed: {e}")
            return
    
        await self.sessions.broadcast(P.WSPayload(
                            kind=P.WSKind.EVENT,
                            msgType=P.WSEvents.DASHBOARD_RENAME,
                            body=data
                        ))

    
    async def shutdown(self):
        if self.mdns_conf:
            await self.mdns.async_unregister_service(self.mdns_conf)
        await self.mdns.async_close()



    async def handle_events(self, payload: P.WSPayload, ws: WebSocket):
        if payload.kind != P.WSKind.EVENT:
            return

        event_type = payload.msgType

        if event_type == P.WSEvents.DASHBOARD_INIT:
            await self.dashboard.assign(ws)            
            print("dashboard online.")


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


        else:
            await send_error(ws, P.WSErrors.INVALID_EVENT)
            try:
                await ws.close(code=1007)
            except Exception:
                pass



    async def handle_actions(self, payload: P.WSPayload, ws: WebSocket):
        if payload.kind != P.WSKind.ACTION:
            return

        dashboard = await self.dashboard.ws()
        if ws != dashboard:
            print("[error] Unauthenticated action sender")
            await send_error(ws, P.WSErrors.ACTION_NOT_ALLOWED)
            return

        action_type = payload.msgType
        try:
            target = P.WSActionTarget.model_validate(payload.body)
        except ValidationError as e:
            print(f"[error] Invalid action body: {e}")
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
            if action_type == P.WSActions.START:
                target.triggerTime = await self._eval_triggerTime()
                payload.body = target

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

        else:
            await send_error(ws, P.WSErrors.INVALID_ACTION)
                

    async def handle_sync(self, payload: P.WSPayload, ws: WebSocket):
        if payload.kind != P.WSKind.SYNC:
            return

        id = self.sessions.get_id(ws)
        if not id:
            print("[error] caught inactive session attempting syncing")
            return

        if payload.msgType == P.WSClockSync.TIK:
            try:
                sync_req = P.ClockSyncTik.model_validate(payload.body)
            except ValidationError:
                await send_error(ws, P.WSErrors.INVALID_BODY)
                return

            t2 = now_ms()
            t1 = sync_req.t1
            t3 = now_ms()
            await self.sessions.send_to_one(id, P.WSPayload(
                                      kind = P.WSKind.SYNC,
                                      msgType = P.WSClockSync.TOK,
                                      body = P.ClockSyncTok(t1=t1, t2=t2, t3=t3)
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
            print("Dashboard went offline (refresh or close).")
            return

        id = self.sessions.get_id(ws)
        if not id:
            print("unknown session disconnected.")
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
            print(f"Session [{id}] disconnected.")
