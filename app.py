import sys
import multiprocessing
import subprocess
import uvicorn
import webview
import webbrowser
import socket
import time
import signal

HOST = "0.0.0.0"
PORT = 6210
URL = f"http://127.0.0.1:{PORT}"


def run_server():
    from backend.server import api
    uvicorn.run(api, host=HOST, port=PORT)


def wait_until_server_ready(host, port, timeout=10):
    start = time.time()
    while True:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return
        except OSError:
            if time.time() - start > timeout:
                raise RuntimeError("Server failed to start")
            time.sleep(0.05)


if __name__ == "__main__":
    dev = "--dev" in sys.argv

    if dev:
        server = multiprocessing.Process(target=run_server)
        server.start()
        tsc = subprocess.Popen(["tsc", "-w"])

        def shutdown(*_):
            print("\nShutting down...")
            if tsc.poll() is None:
                tsc.terminate()
                tsc.wait()

            if server.is_alive():
                server.terminate()
                server.join()

            sys.exit(0)

        signal.signal(signal.SIGINT, shutdown)
        signal.signal(signal.SIGTERM, shutdown)
        wait_until_server_ready(HOST, PORT)
        webbrowser.open(URL)
        server.join()

    else:
        server = multiprocessing.Process(target=run_server, daemon=True)
        server.start()
        wait_until_server_ready(HOST, PORT)
        webview.create_window("VocalLink Dashboard", URL)
        webview.start()
