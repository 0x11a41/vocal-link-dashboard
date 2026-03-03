from typing import Optional, List, Dict
from fastapi import WebSocket
import asyncio
import backend.primitives as P
from backend.logging import log
from backend.utils import now_ms


class Session:
    __slots__ = ('meta', 'ws') 
    def __init__(self, meta: P.SessionMetadata, ws: WebSocket):
        self.meta: P.SessionMetadata = meta
        self.ws: WebSocket = ws


class SessionsHandler:
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



    async def send_to_one(self, id: str, payload: P.WSPayload):
        async with self._lock:
            session = self._active.get(id)
            ws = session.ws if session else None

        if not ws:
            return

        try:
            await ws.send_json(payload.model_dump())
            if payload.kind != P.WSKind.SYNC:
                log.info(payload.model_dump())
        except Exception:
            await self.drop(id)


    async def broadcast(self, data: P.WSPayload) -> None:
        async with self._lock:
            targets = [(sid, s.ws) for sid, s in self._active.items()]

        payload = data.model_dump()
        dead = []

        async def send_one(sid, ws):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(sid)

        await asyncio.gather(*(send_one(sid, ws) for sid, ws in targets))

        if dead:
            await asyncio.gather(*(self.drop(sid) for sid in dead))

        log.info(f'BROADCASTING {payload}')

    
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
        
