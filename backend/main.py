from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from zeroconf import ServiceInfo
from contextlib import asynccontextmanager
from zeroconf.asyncio import AsyncZeroconf
import uvicorn
import socket

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

clients = []

@app.websocket("/ws/control")
async def handle_control_commands(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            data = await ws.receive_json()
            print(f"websocket: {data}")
            for client in clients:
                if client != ws:
                    await client.send_json(data)
    except WebSocketDisconnect:
        if ws in clients:
            clients.remove(ws)


@app.get("/ping")
async def ping():
    return { "VOCAL_LINK": "running" }
