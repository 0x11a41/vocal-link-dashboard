from typing import Optional 
from fastapi import WebSocket
import asyncio
import backend.core.primitives as P
from backend.utils.logging import log
import backend.utils.cypher as cypher


class DashboardHandler:
    def __init__(self):
        self._dashboard: Optional[WebSocket] = None
        self.lock = asyncio.Lock()
        self.key: Optional[str] = None


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
        self.key = cypher.get_key(length=18)


    async def drop(self, ws: WebSocket):
        async with self.lock:
            if self._dashboard == ws:
                self._dashboard = None
            self.key = None


    async def notify(self, payload: P.WSPayload):
        async with self.lock:
            if not self._dashboard:
                return
        try:
            await self._dashboard.send_json(payload.model_dump())
            log.info(payload)
        except Exception:
            log.warning('dashboard got disconnected due to unexpected exception')
            await self.drop(self._dashboard)


    async def error(self, err: P.WSErrors):
        async with self.lock:
            if not self._dashboard:
                return

        payload = P.WSPayload(kind=P.WSKind.ERROR, msgType=err)
        try:
            await self._dashboard.send_json(payload.model_dump())
            log.info(payload)
        except Exception:
            log.warning('dashboard got disconnected due to unexpected exception')
            await self.drop(self._dashboard)


    async def available(self) -> bool:
        async with self.lock:
            return self._dashboard is not None

