from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from zeroconf import ServiceInfo
from contextlib import asynccontextmanager
from zeroconf.asyncio import AsyncZeroconf
import socket
import time
import asyncio

def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.controller: WebSocket | None = None
    app.state.recorders: set[WebSocket] = set()

    app.state.port = 6210
    app.state.ip_str = get_local_ip()
    app.state.server_name = "VocalLink"
    app.state.zc_engine = AsyncZeroconf()

    app.state.current_info = ServiceInfo(
        type_ = "_vocalink._tcp.local.",
        name = f"{app.state.server_name}._vocalink._tcp.local.",
        port = app.state.port,
        addresses = [socket.inet_aton(app.state.ip_str)],
    )

    await app.state.zc_engine.async_register_service(app.state.current_info)
    print(f"Advertising {app.state.server_name} to local network...")
    yield
    print("Shutting down...")
    await app.state.zc_engine.async_unregister_service(app.state.current_info)
    await app.state.zc_engine.async_close()


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws/inform")
async def handle_control_commands(ws: WebSocket):
    await ws.accept()
    app.state.recorders.add(ws)
    try:
        while True:
            data = await ws.receive_json()
            if app.state.controller:
                await app.state.controller.send_json(data)
    except WebSocketDisconnect:
        app.state.recorders.discard(ws)


@app.websocket("/ws/command")
async def handle_frontend_commands(ws: WebSocket):
    if app.state.controller is not None:
        print("Connection rejected. Controller already attached!")
        await ws.accept()
        await ws.send_json({"error": "ALREADY_CONNECTED"})
        await ws.close(code=1008) 
        return

    await ws.accept()
    app.state.controller = ws
    
    try:
        while True:
            data = await ws.receive_json()
            data["timestamp"] = int(time.time() * 1000)
            print(f"/ws/command: {data}")
            
            if app.state.recorders:
                # Parallel broadcast to all nodes
                await asyncio.gather(
                    *[r.send_json(data) for r in app.state.recorders],
                    return_exceptions=True
                )
    except Exception as e:
        print(f"Controller error or disconnect: {e}")
    finally:
        app.state.controller = None
        print("Controller slot freed.")

        
@app.get("/session")
async def session_info():
    return { "VOCAL_LINK": "running" }
