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


    def ws(self) -> Optional[WebSocket]:
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
        if not self._dashboard:
            return 
        try:
            await self._dashboard.send_json(payload.model_dump())
        except Exception:
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
            return [s.meta.model_copy() for s in self._active.values()]


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

            self._active[meta.id] = Session(meta, session_ws)
            return meta


    async def drop(self, id: str):
        async with self._lock:
            if id in self._active:
                del self._active[id]
            elif id in self._staging:
                del self._staging[id]


    async def send_to_one(self, id, payload):
        async with self._lock:
            session = self._active.get(id)
            ws = session.ws if session else None

        if not ws:
            return

        try:
            await ws.send_json(payload.model_dump())
        except Exception as e:
            print(e)


    async def broadcast(self, data: P.WSPayload) -> None:
        async with self._lock:
            targets = [(sid, s.ws) for sid, s in self._active.items()]
        
        payload = data.model_dump()
        for sid, ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    
    async def update_sync(self, id: str, report: P.SyncReport) -> P.SessionMetadata | None:
        async with self._lock:
            session = self._active.get(id)
            if session:
                session.meta.theta = report.theta
                session.meta.lastRTT = report.rtt
                session.meta.lastSync = now_ms()
                return session.meta
            return None


    async def get_id(self, ws: WebSocket) -> Optional[str]:
        async with self._lock:
            for id, session in self._active.items():
                if session.ws is ws:
                    return id
        return None
        


class SyncHandler:
    def __init__(self):
        self._channels: Dict[str, WebSocket] = {} # id -> ws
        self.lock = asyncio.Lock()


    async def add(self, id: str, ws: WebSocket):
        async with self.lock:
            self._channels[id] = ws


    async def remove(self, id: str):
        async with self.lock:
            ws = self._channels.pop(id, None)

        if ws:
            try:
                await ws.close()
            except Exception:
                pass


    async def get(self, id: str) -> WebSocket | None:
        async with self.lock:
            return self._channels.get(id)


    async def handle_ping(self, id: str, req: P.SyncRequest):
        ws = await self.get(id)
        t2_ms = now_ms() 
        if not ws:
            return
        try:
            t3_ms = now_ms()
            await ws.send_json(P.SyncResponse(
                t1=req.t1, 
                t2=t2_ms,
                t3=t3_ms
            ).model_dump())
        except Exception:
            await ws.send_json({"error": "MALFORMED_T1"})



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
        self.clock: SyncHandler = SyncHandler()

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



    async def handle_ws_events(self, payload: P.WSPayload, ws: WebSocket):
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
                payload.body = updated_meta
                await self.dashboard.notify(payload)
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
                report = P.StateReport.model_validate(payload.body)
                payload.body = report
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



    async def handle_ws_actions(self, payload: P.WSPayload, ws: WebSocket):
        if payload.kind != P.WSKind.ACTION:
            return

        if ws != self.dashboard.ws():
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

        else:
            await send_error(ws, P.WSErrors.INVALID_ACTION)
                
        

    async def handle_disconnect(self, ws: WebSocket):
        if await self.dashboard.available() and ws == self.dashboard.ws():
            await self.dashboard.drop(ws)
            print("Dashboard went offline (refresh or close).")
            return

        id = await self.sessions.get_id(ws)
        if id:
            meta = await self.sessions.getMetaFromActive(id)
        
            if meta and await self.dashboard.available():
                await self.dashboard.notify(
                    P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.SESSION_LEFT,
                        body=meta
                    )
                )

            await self.sessions.drop(id)
            await self.clock.remove(id)
            print(f"Session [{id}] disconnected.")
