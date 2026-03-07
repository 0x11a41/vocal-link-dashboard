from typing import List
import backend.primitives as P
from backend.DashboardHandler import DashboardHandler
from backend.RecordingsHandler import RecordingsHandler

class Services:
    def __init__(self, dashboard: DashboardHandler, recordings: RecordingsHandler):
        self._dashboard: DashboardHandler = dashboard
        self._recordings: RecordingsHandler = recordings

    async def notify_amend(self, meta: P.RecMetadata | None):
        if meta:
            await self._dashboard.notify(P.WSPayload(
                kind=P.WSKind.EVENT,
                msgType=P.WSEvents.REC_AMEND,
                body=meta
            ))

    async def transcribe(self, rid: str):
        meta = await self._recordings._transcribe(rid)
        await self.notify_amend(meta)

    async def merge(self, rids: List[str]):
        meta = await self._recordings._merge(rids)
        await self.notify_amend(meta)

    async def enhance(self, rid: str, props: int):
        meta = await self._recordings._enhance(rid, props)
        await self.notify_amend(meta)
