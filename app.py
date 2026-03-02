import sys
import subprocess
import webview
import webbrowser
import socket
import time
import signal
import os

HOST = "0.0.0.0"
PORT = 6210
URL = f"http://127.0.0.1:{PORT}"

server = None
tsc = None


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


def kill_process(proc, name):
    if not proc or proc.poll() is not None:
        return

    try:
        proc.terminate()
        proc.wait(3)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()


def shutdown(*_):
    print("\nShutting down...")

    kill_process(tsc, "tsc")
    kill_process(server, "server")

    os._exit(0)  # force exit to prevent hanging threads


if __name__ == "__main__":
    debug = "--debug" in sys.argv

    # start server in its own process group
    server = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.server:api",
            "--host", HOST,
            "--port", str(PORT)
        ],
        start_new_session=True
    )

    if debug:
        tsc = subprocess.Popen(
            ["tsc", "-w"],
            start_new_session=True
        )

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
                width=1600,
                height=900,
                resizable=True
            )

            def on_closed():
                shutdown()

            if window:
                window.events.closed += on_closed
                webview.start()
            else:
                print("failed to create webview window")

        while True:
            if server.poll() is not None:
                raise RuntimeError("Backend stopped unexpectedly")
            time.sleep(0.5)

    except Exception as e:
        print("Error:", e)
        shutdown()
