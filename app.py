import sys
import subprocess
import webview
import webbrowser
import socket
import time
import signal

HOST = "0.0.0.0"
PORT = 6210
URL = f"http://127.0.0.1:{PORT}"


def wait_until_server_ready(timeout=15):
    start = time.time()
    while True:
        try:
            with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
                return
        except OSError:
            if time.time() - start > timeout:
                raise RuntimeError("Server failed to start")
            time.sleep(0.05)


if __name__ == "__main__":
    debug = "--debug" in sys.argv

    server = subprocess.Popen([
        sys.executable,
        "-m",
        "uvicorn",
        "backend.server:api",
        "--host", HOST,
        "--port", str(PORT)
    ])

    tsc = None
    if debug:
        tsc = subprocess.Popen(["tsc", "-w"])

    def shutdown(*_):
        print("\nShutting down...")

        if tsc and tsc.poll() is None:
            tsc.terminate()
            try:
                tsc.wait(2)
            except subprocess.TimeoutExpired:
                tsc.kill()

        if server.poll() is None:
            server.terminate()
            try:
                server.wait(3)
            except subprocess.TimeoutExpired:
                server.kill()

        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        print("Waiting for backend...")
        wait_until_server_ready()
        print("Backend ready")

        if debug:
            webbrowser.open(URL)
        else:
            window = webview.create_window(
                "VocalLink Dashboard",
                URL,
                width=1200,
                height=800,
                resizable=True
            )
            if window:
                window.events.closed += shutdown
            webview.start()

        while True:
            if server.poll() is not None:
                raise RuntimeError("Backend server stopped unexpectedly")
            time.sleep(0.5)

    except Exception as e:
        print("Error:", e)
        shutdown()
