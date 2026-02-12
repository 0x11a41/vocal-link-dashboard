import asyncio
import json
import random
import httpx
import websockets
from datetime import datetime

BASE = "http://localhost:6210"
WS = "ws://localhost:6210"


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# ---------------------------------------------------
# STAGE SESSION
# ---------------------------------------------------

async def stage_session(name):
    async with httpx.AsyncClient() as client:
        payload = {
            "event": "session_stage",
            "body": {
                "id": "placeholder",
                "name": name,
                "ip": "127.0.0.1",
                "battery": random.randint(40, 100),
                "device": "pytest",
                "theta": -1,
                "last_rtt": -1,
                "last_sync": None
            }
        }

        r = await client.post(f"{BASE}/sessions", json=payload)
        r.raise_for_status()
        sid = r.json()["body"]["id"]

        log(f"[{name}] STAGED {sid}")
        return sid


# ---------------------------------------------------
# CONTROL SOCKET
# ---------------------------------------------------

async def control_client(session_id, name, ready_evt):
    try:
        async with websockets.connect(f"{WS}/ws/control") as ws:

            meta = {
                "id": session_id,
                "name": name,
                "ip": "127.0.0.1",
                "battery": 100,
                "device": "pytest",
                "theta": 0,
                "last_rtt": 0,
                "last_sync": None
            }

            await ws.send(json.dumps({
                "kind": "event",
                "msg_type": "session_activate",
                "body": meta
            }))
            log(f"[{name}] ACTIVATE SENT")

            ready_evt.set()

            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                t = data["msg_type"]

                log(f"[{name}] GOT {t}")

                if t == "start":
                    await ws.send(json.dumps({
                        "kind": "action",
                        "msg_type": "started",
                        "body": {"session_id": session_id}
                    }))
                    log(f"[{name}] SENT started")

                elif t == "stop":
                    await ws.send(json.dumps({
                        "kind": "action",
                        "msg_type": "stopped",
                        "body": {"session_id": session_id}
                    }))
                    log(f"[{name}] SENT stopped")

    except asyncio.CancelledError:
        log(f"[{name}] control closed")
        raise


# ---------------------------------------------------
# SYNC SOCKET (REPEATS FOREVER)
# ---------------------------------------------------

async def sync_client(session_id, name, ready_evt):
    await ready_evt.wait()
    await asyncio.sleep(0.5)

    try:
        async with websockets.connect(f"{WS}/ws/sync/{session_id}") as ws:
            log(f"[{name}] SYNC CONNECTED")

            while True:
                t1 = int(datetime.now().timestamp() * 1000)

                await ws.send(json.dumps({"t1": t1}))
                log(f"[{name}] SYNC PING")

                resp = json.loads(await ws.recv())

                if resp.get("type") != "SYNC_RESPONSE":
                    log(f"[{name}] INVALID SYNC RESPONSE")
                    continue

                log(f"[{name}] SYNC OK")

                await ws.send(json.dumps({
                    "theta": round(random.uniform(-2, 2), 3),
                    "rtt": random.randint(10, 80)
                }))

                log(f"[{name}] SYNC REPORT")

                await asyncio.sleep(5)

    except asyncio.CancelledError:
        log(f"[{name}] sync closed")
        raise


# ---------------------------------------------------
# SESSION INSTANCE
# ---------------------------------------------------

async def run_session(instance_id):
    name = f"Client-{instance_id}"
    sid = await stage_session(name)

    ready_evt = asyncio.Event()

    await asyncio.gather(
        control_client(sid, name, ready_evt),
        sync_client(sid, name, ready_evt)
    )


# ---------------------------------------------------
# MAIN
# ---------------------------------------------------

async def main():
    count = random.randint(1, 5)
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
