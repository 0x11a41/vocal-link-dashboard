import sys
import subprocess
import webbrowser
import socket
import time
import signal
import os
import psutil

PORT = 6210
URL = f"http://127.0.0.1:{PORT}"
BACKEND_MODULE = "backend.server:api"

class VocalLinkRunner:
    def __init__(self, debug=False):
        self.debug = debug
        self.processes = []
        self.is_shutting_down = False

    def nuke_orphans(self):
        print(f"[*] Scanning for orphan processes on port {PORT}...")
        found_orphan = False
        
        try:
            connections = psutil.net_connections(kind='inet')
            for conn in connections:
                if conn.laddr.port == PORT and conn.pid:
                    self._kill_process_tree(conn.pid)
                    found_orphan = True
        except (RuntimeError, PermissionError):
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    for conn in proc.net_connections(kind='inet'):
                        if conn.laddr.port == PORT:
                            self._kill_process_tree(proc.pid)
                            found_orphan = True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        
        if not found_orphan:
            print("[*] No orphans found. Clean start.")
        else:
            time.sleep(0.5)

    def _kill_process_tree(self, pid):
        try:
            parent = psutil.Process(pid)
            print(f"[!] Found orphan (PID: {pid}, Name: {parent.name()}). Killing...")
            for child in parent.children(recursive=True):
                child.kill()
            parent.kill()
        except psutil.NoSuchProcess:
            pass

    def wait_for_server(self, timeout=15):
        start = time.time()
        while time.time() - start < timeout:
            try:
                with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
                    return True
            except (OSError, ConnectionRefusedError):
                time.sleep(0.1) # Fast polling for quick launch
        return False

    def start_tsc(self):
        print("[*] Starting TSC watch...")
        proc = subprocess.Popen(["tsc", "-w"])
        self.processes.append(proc)
        return proc

    def start_logger(self):
        print("[*] Watching log files...")
        proc = subprocess.Popen(["tail", "-f", "logs/server.log"])
        self.processes.append(proc)
        return proc

    def start_backend(self):
        print("[*] Starting backend...")
        cmd = [sys.executable, "-m", "uvicorn", BACKEND_MODULE, "--host", "0.0.0.0", "--port", str(PORT)]
        proc = subprocess.Popen(cmd)
        self.processes.append(proc)
        return proc

    def cleanup(self):
        if self.is_shutting_down:
            return
        self.is_shutting_down = True
        print("\n[*] Shutting down...")
        
        for proc in self.processes:
            try:
                p = psutil.Process(proc.pid)
                for child in p.children(recursive=True):
                    child.kill()
                p.kill()
            except psutil.NoSuchProcess:
                pass
        
        if not self.debug:
            os._exit(0)

    def _signal_handler(self, *_):
        self.cleanup()
        sys.exit(0)

    def run(self):
        self.nuke_orphans()

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        try:
            self.start_backend()
            
            if self.debug:
                self.start_tsc()
                self.start_logger()

            print("[*] Waiting for server...")
            if not self.wait_for_server():
                print("[!] Backend failed to start.")
                return

            print("[*] Launching Browser...")
            webbrowser.open(URL)

            while not self.is_shutting_down:
                time.sleep(1)
                
        except Exception as e:
            print(f"[!] Error: {e}")
        finally:
            self.cleanup()

if __name__ == "__main__":
    is_debug = "--debug" in sys.argv
    VocalLinkRunner(debug=is_debug).run()
