from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from zeroconf import ServiceInfo
from contextlib import asynccontextmanager
from zeroconf.asyncio import AsyncZeroconf
import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

def create_service_info(app, name):
    return ServiceInfo(
        "_vocalink._tcp.local.",
        f"{name}._vocalink._tcp.local.",
        addresses=[socket.inet_aton(app.state.ip_str)],
        port=app.state.port
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.port = 6210
    app.state.ip_str = get_local_ip()
    app.state.server_name = "VocalLink"
    app.state.aiozc = AsyncZeroconf()
    app.state.current_info = create_service_info(app, app.state.server_name)
    await app.state.aiozc.async_register_service(app.state.current_info)
    print(f"Broadcasting {app.state.server_name} at {app.state.ip_str}...")
    
    yield
    
    print("Shutting down...")
    await app.state.aiozc.async_unregister_service(app.state.current_info)
    await app.state.aiozc.async_close()

app = FastAPI(lifespan=lifespan)

clients = []
@app.websocket("/ws/control")
async def handle_control_commands(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            print(f"Received: {data}")
            for client in clients:
                await client.send_text(data)
    except WebSocketDisconnect:
        clients.remove(ws)

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.get("/ping")
async def ping():
    return { "status": "alive" }

@app.post("/update-name")
async def update_server_name(new_name: str = Body(..., embed=True)):
    await app.state.aiozc.async_unregister_service(app.state.current_info)
    
    app.state.server_name = new_name
    app.state.current_info = create_service_info(app, new_name)
    
    await app.state.aiozc.async_register_service(app.state.current_info)
    return {"status": "updated", "new_name": new_name}
