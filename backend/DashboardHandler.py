from typing import Optional 
from fastapi import WebSocket
import asyncio
import backend.primitives as P
from backend.logging import log


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
            log.warning('dashboard got disconnected due to unexpected exception')
            await self.drop(self._dashboard)


    async def available(self) -> bool:
        async with self.lock:
            return self._dashboard is not None

