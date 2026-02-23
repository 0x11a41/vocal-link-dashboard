import asyncio
import random
import httpx
import websockets
import sys
from datetime import datetime
import backend.primitives as P

BASE = "http://localhost:6210"
WS = "ws://localhost:6210"

INITIAL_RANDOM = "--initial=random" in sys.argv


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# =========================================================
# SESSION STATE SIMULATION
# =========================================================

class SimState:
    def __init__(self):
        if INITIAL_RANDOM:
            self.state = random.choice(list(P.SessionStates))
        else:
            self.state = P.SessionStates.STOPPED

        self.started_at = None
        self.accumulated = 0

        if self.state == P.SessionStates.RUNNING:
            self.started_at = datetime.now()
        elif self.state == P.SessionStates.PAUSED:
            self.accumulated = random.randint(5, 300)

    def duration(self):
        if self.state == P.SessionStates.RUNNING and self.started_at:
            return self.accumulated + int((datetime.now() - self.started_at).total_seconds())
        return self.accumulated

    def start(self):
        if self.state == P.SessionStates.RUNNING:
            return
        self.state = P.SessionStates.RUNNING
        self.started_at = datetime.now()
        self.accumulated = 0

    def stop(self):
        if self.state == P.SessionStates.RUNNING and self.started_at:
            self.accumulated += int((datetime.now() - self.started_at).total_seconds())
        self.state = P.SessionStates.STOPPED
        self.started_at = None

    def pause(self):
        if self.state != P.SessionStates.RUNNING:
            return
        self.accumulated += int((datetime.now() - self.started_at).total_seconds())
        self.state = P.SessionStates.PAUSED
        self.started_at = None

    def resume(self):
        if self.state != P.SessionStates.PAUSED:
            return
        self.state = P.SessionStates.RUNNING
        self.started_at = datetime.now()


# =========================================================
# STAGE SESSION
# =========================================================

async def stage_session(name: str) -> P.SessionMetadata:
    async with httpx.AsyncClient() as client:

        req = P.SessionStageRequestMsg(
            body=P.SessionMetadata(
                id="placeholder",
                name=name,
                ip="127.0.0.1",
                battery=random.randint(40, 100),
                device="pytest"
            )
        )

        r = await client.post(f"{BASE}/sessions", json=req.model_dump())
        r.raise_for_status()

        resp = P.SessionStageResponseMsg.model_validate(r.json())
        meta = resp.body

        log(f"[{name}] STAGED {meta.id}")
        return meta


# =========================================================
# CONTROL SOCKET
# =========================================================

async def control_client(meta: P.SessionMetadata, ready_evt: asyncio.Event):
    name = meta.name
    sid = meta.id
    sim = SimState()

    try:
        async with websockets.connect(f"{WS}/ws/control") as ws:

            activate = P.WSPayload(
                kind=P.WSKind.EVENT,
                msgType=P.WSEvents.SESSION_ACTIVATE,
                body=P.WSEventTarget(id=sid)
            )

            await ws.send(activate.model_dump_json())
            log(f"[{name}] ACTIVATE SENT")

            while True:
                try:
                    raw = await ws.recv()
                except websockets.ConnectionClosed:
                    log(f"[{name}] control disconnected")
                    return

                payload = P.WSPayload.model_validate_json(raw)
                log(f"[{name}] GOT {payload.kind}:{payload.msgType}")

                # activation ack
                if payload.msgType == P.WSEvents.SESSION_ACTIVATED:
                    ready_evt.set()
                    continue

                if payload.kind != P.WSKind.ACTION:
                    continue

                if not isinstance(payload.body, P.WSActionTarget):
                    continue

                target = payload.body

                # =====================================================
                # ACTION HANDLERS
                # =====================================================

                if payload.msgType == P.WSActions.START:
                    sim.start()

                    reply = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.STARTED,
                        body=P.WSEventTarget(id=sid)
                    )
                    await ws.send(reply.model_dump_json())

                elif payload.msgType == P.WSActions.STOP:
                    sim.stop()

                    reply = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.STOPPED,
                        body=P.WSEventTarget(id=sid)
                    )
                    await ws.send(reply.model_dump_json())

                elif payload.msgType == P.WSActions.CANCEL:
                    sim.stop()

                    reply = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.STOPPED,
                        body=P.WSEventTarget(id=sid)
                    )
                    await ws.send(reply.model_dump_json())
                    log(f"[{name}] CANCEL → STOPPED")

                elif payload.msgType == P.WSActions.PAUSE:
                    sim.pause()

                    reply = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.PAUSED,
                        body=P.WSEventTarget(id=sid)
                    )
                    await ws.send(reply.model_dump_json())

                elif payload.msgType == P.WSActions.RESUME:
                    sim.resume()

                    reply = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.RESUMED,
                        body=P.WSEventTarget(id=sid)
                    )
                    await ws.send(reply.model_dump_json())

                elif payload.msgType == P.WSActions.GET_STATE:

                    report = P.WSPayload(
                        kind=P.WSKind.EVENT,
                        msgType=P.WSEvents.SESSION_STATE_REPORT,
                        body=P.StateReport(
                            id=sid,
                            state=sim.state,
                            duration=sim.duration()
                        )
                    )

                    await ws.send(report.model_dump_json())
                    log(f"[{name}] SENT STATE {sim.state}")

    except asyncio.CancelledError:
        log(f"[{name}] control closed")
        raise


# =========================================================
# SYNC SOCKET
# =========================================================

async def sync_client(meta: P.SessionMetadata, ready_evt: asyncio.Event):
    await ready_evt.wait()
    await asyncio.sleep(0.3)

    name = meta.name
    sid = meta.id

    try:
        async with websockets.connect(f"{WS}/ws/sync/{sid}") as ws:
            log(f"[{name}] SYNC CONNECTED")

            while True:
                req = P.SyncRequest(
                    t1=int(datetime.now().timestamp() * 1000)
                )

                await ws.send(req.model_dump_json())

                raw = await ws.recv()
                P.SyncResponse.model_validate_json(raw)

                report = P.SyncReport(
                    theta=round(random.uniform(-2, 2), 3),
                    rtt=random.randint(10, 80)
                )

                await ws.send(report.model_dump_json())

                await asyncio.sleep(5 + random.random())

    except asyncio.CancelledError:
        log(f"[{name}] sync closed")
        raise


# =========================================================
# SESSION INSTANCE
# =========================================================

async def run_session(idx: int):
    name = f"Client-{idx}"
    meta = await stage_session(name)

    ready = asyncio.Event()

    await asyncio.gather(
        control_client(meta, ready),
        sync_client(meta, ready)
    )


# =========================================================
# MAIN
# =========================================================

async def main():
    count = random.randint(1, 20)
    log(f"Starting {count} session(s)\n")

    tasks = [
        asyncio.create_task(run_session(i + 1))
        for i in range(count)
    ]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("Shutting down clients...")
