import subprocess
import threading
import webbrowser
import time
import os
import signal
import sys
from livereload import Server

# Configuration
BACKEND_CMD = ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "6210", "--reload"]
HOST = "127.0.0.1"
PORT = 3000
URL = f"http://{HOST}:{PORT}"
STARTUP_DELAY = 3

# running uvicorn server (non-blocking)
backend_process = subprocess.Popen(BACKEND_CMD, start_new_session=True)


def open_browser():
    time.sleep(STARTUP_DELAY)
    print(f"Opening browser to {URL}...")
    webbrowser.open(URL)

def cleanup():
    print("\n[!] Shutting down servers...")
    try:
        os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        backend_process.wait(timeout=5)
    except Exception as e:
        print(f"[!] Error stopping backend: {e}")


threading.Thread(target=open_browser, daemon=True).start()

server = Server()
server.watch("frontend/")

try:
    print(f"[*] Frontend running at {URL}")
    server.serve(root="frontend", host=HOST, port=PORT)
except KeyboardInterrupt:
    pass 
finally:
    cleanup()
    sys.exit(0)
