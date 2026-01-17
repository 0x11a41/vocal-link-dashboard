from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []

# ---------------- WebSocket ---------------- #

@app.websocket("/ws/control") # this is a route
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    print("Client connected")

    try:
        while True:
            data = await ws.receive_text()
            print("Received:", data)

            # Broadcast to all connected clients
            for client in clients:
                await client.send_text(data)

    except WebSocketDisconnect:
        clients.remove(ws)
        print("Client disconnected")

# ---------------- REST ---------------- #

@app.get("/ping")
def ping():
    return {"status": "server alive"}

@app.get("/greet/{name}")
def greet(name: str):
    return { "msg": f'hello {name}, how are you?'}
