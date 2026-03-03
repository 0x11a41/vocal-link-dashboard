from typing import Dict, List, Optional
import asyncio
import os
import uuid
import json
from backend.primitives import FileMetadata, WSFileStatus
from backend.primitives import WSPayload, WSKind, WSEvents
from backend.logging import log

class FileHandler:
    def __init__(self, storage_root: str, dashboard_notify):
        self._files: Dict[str, FileMetadata] = {}
        self._lock = asyncio.Lock()
        self.storage_root = storage_root
        self.dashboard_notify = dashboard_notify

        os.makedirs(f"{storage_root}/original", exist_ok=True)
        os.makedirs(f"{storage_root}/enhanced", exist_ok=True)
        os.makedirs(f"{storage_root}/transcripts", exist_ok=True)
