import asyncio
import random
import httpx
import websockets
import sys
import time
import socket
from datetime import datetime

from zeroconf.asyncio import AsyncZeroconf, AsyncServiceBrowser, AsyncServiceInfo
from zeroconf import ServiceListener

import backend.primitives as P


# =========================================================
# ANSI Color Codes
# =========================================================

class Col:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    GRAY = "\033[90m"


BASE = None
WS = None


def now_ms() -> int:
    return int(time.time() * 1000)


def log(tag, msg, color=Col.RESET):
    timestamp = datetime.now().strftime('%H:%M:%S')
    short_tag = tag.replace("Client-", "C")
    print(f"[{Col.GRAY}{timestamp}{Col.RESET}] [{Col.BOLD}{short_tag:^3}{Col.RESET}] {color}{msg}{Col.RESET}")


# =========================================================
# mDNS DISCOVERY
# =========================================================

class DiscoveryListener(ServiceListener):
    def __init__(self):
        self.services = []

    def add_service(self, zc, type_, name):
        asyncio.create_task(self._resolve(zc, type_, name))

    def update_service(self, zc, type_, name):
        asyncio.create_task(self._resolve(zc, type_, name))

    def remove_service(self, zc, type_, name):
        pass

    async def _resolve(self, zc, type_, name):
        info = AsyncServiceInfo(type_, name)
        await info.async_request(zc, 2000)

        if info and info.addresses:
            ip = socket.inet_ntoa(info.addresses[0])
            port = info.port
            server_name = name.split('.')[0]

            entry = {
                "name": server_name,
                "ip": ip,
                "port": port
            }

            if entry not in self.services:
                self.services.append(entry)


async def discover_servers(timeout=3):
    print(f"{Col.CYAN}Searching for vocalink servers via mDNS...{Col.RESET}")

    aiozc = AsyncZeroconf()
    listener = DiscoveryListener()

    AsyncServiceBrowser(aiozc.zeroconf, "_vocalink._tcp.local.", listener)

    await asyncio.sleep(timeout)
    await aiozc.async_close()

    return listener.services


async def choose_server():
    global BASE, WS

    services = await discover_servers()

    if not services:
        print(f"{Col.YELLOW}No servers discovered. Falling back to localhost.{Col.RESET}")
        BASE = "http://localhost:6210"
        WS = "ws://localhost:6210"
        return

    print(f"\n{Col.MAGENTA}Discovered Servers:{Col.RESET}")
    for i, s in enumerate(services):
        print(f"{Col.BOLD}[{i}]{Col.RESET} {s['name']}  {Col.GRAY}({s['ip']}:{s['port']}){Col.RESET}")

    while True:
        try:
            choice = int(input("\nSelect server index: "))
            if 0 <= choice < len(services):
                break
        except ValueError:
            pass
        print("Invalid selection.")

    selected = services[choice]
    BASE = f"http://{selected['ip']}:{selected['port']}"
    WS = f"ws://{selected['ip']}:{selected['port']}"

    print(f"{Col.GREEN}Using server: {selected['name']} ({selected['ip']}){Col.RESET}\n")


# =========================================================
# SESSION STATE SIMULATION
# =========================================================

class SimState:
    def __init__(self):
        self.state = P.SessionStates.STOPPED
        self.started_at = None
        self.accumulated = 0

    def duration(self):
        if self.state == P.SessionStates.RUNNING and self.started_at is not None:
            return self.accumulated + int(time.monotonic() - self.started_at)
        return self.accumulated

    def start(self):
        if self.state == P.SessionStates.RUNNING:
            return
        self.state = P.SessionStates.RUNNING
        self.started_at = time.monotonic()
        self.accumulated = 0

    def stop(self):
        if self.state == P.SessionStates.RUNNING and self.started_at is not None:
            self.accumulated += int(time.monotonic() - self.started_at)
        self.state = P.SessionStates.STOPPED
        self.started_at = None

    def pause(self):
        if self.state != P.SessionStates.RUNNING or self.started_at is None:
            return
        self.accumulated += int(time.monotonic() - self.started_at)
        self.state = P.SessionStates.PAUSED
        self.started_at = None

    def resume(self):
        if self.state != P.SessionStates.PAUSED:
            return
        self.state = P.SessionStates.RUNNING
        self.started_at = time.monotonic()


# =========================================================
# STAGE SESSION (UNCHANGED LOGIC)
# =========================================================

async def stage_session(name: str) -> P.SessionMetadata:
    log(name, "HTTP > STAGING...", Col.CYAN)

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

        log(name, f"HTTP > STAGED ID:{meta.id[:6]}", Col.GREEN)
        return meta


# =========================================================
# SYNC + CONTROL LOGIC (UNCHANGED)
# =========================================================

async def sync_scheduler(ws, name: str):
    log(name, "SYNC > START", Col.BLUE)
    first_tik = True

    while True:
        t1 = now_ms()
        tik = P.WSPayload(
            kind=P.WSKind.SYNC,
            msgType=P.WSClockSync.TIK,
            body=P.ClockSyncTik(t1=t1)
        )

        if first_tik:
            log(name, "SYNC > TIK (INITIATED)", Col.BLUE)
            first_tik = False

        await ws.send(tik.model_dump_json())
        await asyncio.sleep(5 + random.random())


async def control_client(meta: P.SessionMetadata):
    name, sid = meta.name, meta.id
    sim = SimState()

    log(name, f"INIT > {sim.state.name}", Col.YELLOW)

    ws = None  # <-- track socket for cleanup

    try:
        log(name, "WS   > CONNECTING...", Col.YELLOW)
        ws = await websockets.connect(f"{WS}/ws/control")

        activate = P.WSPayload(
            kind=P.WSKind.EVENT,
            msgType=P.WSEvents.SESSION_ACTIVATE,
            body=P.WSEventTarget(id=sid)
        )
        await ws.send(activate.model_dump_json())
        log(name, "WS   > REQ_ACTIVATE", Col.CYAN)

        sync_task, first_sync_done = None, False

        while True:
            raw = await ws.recv()
            payload = P.WSPayload.model_validate_json(raw)

            if payload.kind != P.WSKind.SYNC:
                log(name, f"RECV < {payload.msgType.name}", Col.MAGENTA)

            if payload.msgType == P.WSEvents.SESSION_ACTIVATED:
                log(name, "WS   > ACTIVE", Col.GREEN)
                if sync_task is None:
                    sync_task = asyncio.create_task(sync_scheduler(ws, name))
                continue

            if payload.kind == P.WSKind.SYNC and payload.msgType == P.WSClockSync.TOK:
                if not isinstance(payload.body, P.ClockSyncTok):
                    continue

                t4 = now_ms()
                t1, t2, t3 = payload.body.t1, payload.body.t2, payload.body.t3
                rtt = (t4 - t1) - (t3 - t2)
                theta = ((t2 - t1) + (t3 - t4)) / 2

                if not first_sync_done:
                    log(name, f"SYNC > OK (RTT:{rtt}ms)", Col.BLUE)
                    first_sync_done = True

                report = P.WSPayload(
                    kind=P.WSKind.SYNC,
                    msgType=P.WSClockSync.SYNC_REPORT,
                    body=P.ClockSyncReport(theta=round(theta, 3), rtt=round(rtt, 3))
                )
                await ws.send(report.model_dump_json())
                continue

            if payload.kind != P.WSKind.ACTION:
                continue

            log(name, f"EXEC > {payload.msgType.name}", Col.YELLOW)

            if payload.msgType == P.WSActions.START:
                sim.start()
                evt = P.WSEvents.STARTED
            elif payload.msgType == P.WSActions.STOP:
                sim.stop()
                evt = P.WSEvents.STOPPED
            elif payload.msgType == P.WSActions.PAUSE:
                sim.pause()
                evt = P.WSEvents.PAUSED
            elif payload.msgType == P.WSActions.RESUME:
                sim.resume()
                evt = P.WSEvents.RESUMED
            elif payload.msgType == P.WSActions.CANCEL:
                sim.stop()
                sim.accumulated = 0
                evt = P.WSEvents.STOPPED
            elif payload.msgType == P.WSActions.GET_STATE:
                await ws.send(P.WSPayload(
                    kind=P.WSKind.EVENT,
                    msgType=P.WSEvents.SESSION_STATE_REPORT,
                    body=P.StateReport(id=sid, state=sim.state, duration=sim.duration())
                ).model_dump_json())
                continue
            else:
                continue

            log(name, f"CONF > {sim.state.name}", Col.GREEN)
            await ws.send(P.WSPayload(
                kind=P.WSKind.EVENT,
                msgType=evt,
                body=P.WSEventTarget(id=sid)
            ).model_dump_json())

    except websockets.ConnectionClosed as e:
        log(name, f"ERR  > CLOSED ({e.code})", Col.RED)

    except asyncio.CancelledError:
        raise

    except Exception as e:
        log(name, f"ERR  > {str(e)[:40]}", Col.RED)

    finally:
        if ws and not ws.close:
            try:
                log(name, "WS   > DROPPED", Col.YELLOW)
                await ws.send(P.WSPayload(
                    kind=P.WSKind.EVENT,
                    msgType=P.WSEvents.DROPPED,
                    body=P.WSEventTarget(id=sid)
                ).model_dump_json())

                await ws.close()
            except Exception:
                pass


# =========================================================
# MAIN ENTRY
# =========================================================

async def run_session(idx: int):
    name = f"Client-{idx}"
    log(name, "BOOTING...", Col.CYAN)
    meta = await stage_session(name)
    await control_client(meta)


async def main(n_clients: int):
    await choose_server()

    print(f"{Col.MAGENTA}--- STARTING {n_clients} SESSIONS ---{Col.RESET}\n")

    tasks = [asyncio.create_task(run_session(i + 1)) for i in range(n_clients)]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    try:
        if len(sys.argv) > 1 and sys.argv[1].isdigit():
            count = int(sys.argv[1])
        else:
            count = 5

        asyncio.run(main(count))

    except KeyboardInterrupt:
        print("")
        log("SYS", "TERMINATING GRACEFULLY...", Col.YELLOW)
