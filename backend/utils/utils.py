import random
import socket
import time

def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

def get_random_name(file_path="backend/utils/server_names.txt") -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        names = [line.strip() for line in f if line.strip()]
    if not names:
        return "VLServer"
    return random.choice(names)

def now_ms():
    return time.time_ns() // 1_000_000
