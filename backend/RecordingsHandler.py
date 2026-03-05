from typing import Dict, List, Optional, Callable
import asyncio
import os
import uuid
import json
from fastapi import UploadFile

from backend.merge import merge_sounds
from backend.transcript import get_transcript
import backend.primitives as P
from backend.logging import log
from backend.utils import now_ms

NotifyCallback = Callable[[P.WSPayload], None]
ALLOWED_EXTENSIONS = {".m4a", ".mp4", ".ogg", ".wav"}

class RecordingsHandler:
    def __init__(self, root: str = "storage"):    
        self._files: Dict[str, P.FileMetadata] = {}
        self._lock = asyncio.Lock()

        self.root: str = root

        self.original_dir: str = os.path.join(root, "original")
        self.enhanced_dir: str = os.path.join(root, "enhanced")
        self.transcripts_dir: str = os.path.join(root, "transcripts")

        os.makedirs(self.original_dir, exist_ok=True)
        os.makedirs(self.enhanced_dir, exist_ok=True)
        os.makedirs(self.transcripts_dir, exist_ok=True)

    def _get_ext(self, fileName: str) -> str:
        _, ext = os.path.splitext(fileName or "")
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file extension: {ext}")
        return ext

    def _original_path(self, fileId: str, fileName: str) -> str:
        ext = self._get_ext(fileName)
        return os.path.join(self.original_dir, f"{fileId}{ext}")

    def _enhanced_path(self, fileId: str) -> str:
        return os.path.join(self.enhanced_dir, f"{fileId}.wav")

    def _transcript_path(self, fileId: str) -> str:
        return os.path.join(self.transcripts_dir, f"{fileId}.json")


    async def stage(self, info: P.FileStageInfo, session: P.SessionMetadata ) -> Optional[P.FileId]:
        fmeta = P.FileMetadata(
            fid=str(uuid.uuid4()),
            fileName=info.fileName,
            sessionId=session.id,
            senderName=session.name,
            device=session.device,
            duration=info.duration,
            sizeBytes=info.sizeBytes,
            createdAt=now_ms(),
            status=P.FileStatus.UPLOADING,
        )

        async with self._lock:
            self._files[fmeta.fid] = fmeta

        return P.FileId(id=fmeta.fid)


    async def save(self, fid: str, file: UploadFile) -> Optional[P.FileMetadata]:
        async with self._lock:
            meta = self._files.get(fid)
            if not meta:
                return None

            if meta.status != P.FileStatus.UPLOADING:
                return None

        try:
            final_path = self._original_path(fid, meta.fileName)
            temp_path = final_path + ".tmp"
        except ValueError as e:
            log.error(f"Invalid extension for {fid}: {e}")
            async with self._lock:
                meta.status = P.FileStatus.FAILED
            return meta

        try:
            with open(temp_path, "wb") as buffer:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    buffer.write(chunk)

            os.replace(temp_path, final_path)
            size = os.path.getsize(final_path)

            async with self._lock:
                meta.sizeBytes = size
                meta.status = P.FileStatus.READY

            return meta

        except Exception as e:
            log.error(f"File save failed for {fid}: {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

            async with self._lock:
                if fid in self._files:
                    meta.status = P.FileStatus.FAILED

            return meta

        finally:
            await file.close()


    async def transcribe(self, fid: str) -> Optional[P.FileMetadata]:
        async with self._lock:
            meta = self._files.get(fid)
            if not meta:
                return None
            if meta.status != P.FileStatus.PROCESSING:
                return None

        src_path = self._original_path(fid, meta.fileName)

        if not os.path.exists(src_path):
            async with self._lock:
                meta.status = P.FileStatus.FAILED
                return meta.model_copy()

        try:
            transcript_result: P.TranscriptResult = await asyncio.to_thread(
                get_transcript,
                src_path,
                fid
            )

            transcript_path = self._transcript_path(fid)

            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(transcript_result.model_dump_json(indent=2))

            async with self._lock:
                meta.transcriptPath = transcript_path
                meta.status = P.FileStatus.READY
                return meta.model_copy()

        except Exception as e:
            log.error(f"Transcription failed for {fid}: {e}")
            async with self._lock:
                meta.status = P.FileStatus.FAILED
                return meta.model_copy()


    def resolve_transcript(self, fid: str) -> Optional[P.TranscriptResult]:
        path = self._transcript_path(fid)
        if not os.path.exists(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as tf:
                data = json.load(tf)

            return P.TranscriptResult.model_validate(data)

        except Exception as e:
            log.error(f"Failed to load transcript for {fid}: {e}")
            return None


    async def merge(self, fids: List[str]) -> Optional[P.FileMetadata]:
        if not fids:
            return None

        async with self._lock:
            source_metas = []
            for fid in fids:
                meta = self._files.get(fid)
                if not meta or meta.status != P.FileStatus.READY:
                    return None
                source_metas.append(meta)

            merged_fid = str(uuid.uuid4())

            merged_meta = P.FileMetadata(
                fid=merged_fid,
                fileName=f"{merged_fid}.wav",
                sessionId=source_metas[0].sessionId,
                senderName="system",
                device="server",
                duration=0,
                sizeBytes=0,
                createdAt=now_ms(),
                status=P.FileStatus.PROCESSING,
            )

            self._files[merged_fid] = merged_meta

        try:
            input_paths = [
                self._original_path(meta.fid, meta.fileName)
                for meta in source_metas
            ]

            output_path = self._original_path(merged_fid, merged_meta.fileName)

            duration, size = await asyncio.to_thread(
                merge_sounds,
                input_paths,
                output_path,
                "overlay"
            )

            async with self._lock:
                merged_meta.duration = duration
                merged_meta.sizeBytes = size
                merged_meta.status = P.FileStatus.READY
                return merged_meta.model_copy()

        except Exception as e:
            log.error(f"Merge failed: {e}")
            async with self._lock:
                merged_meta.status = P.FileStatus.FAILED
                return merged_meta.model_copy()


    async def exist(self, fid: str) -> bool:
        async with self._lock:
            return fid in self._files

    
    async def get(self, fid: str) -> Optional[P.FileMetadata]:
        async with self._lock:
            meta = self._files.get(fid)
            return meta if meta else None


    async def get_all(self) -> List[P.FileMetadata]:
        async with self._lock:
            return [m.model_copy() for m in self._files.values()]

        
    async def set_status(self, fid: str, state: P.FileStatus):
        async with self._lock:
            meta = self._files.get(fid)
            if not meta:
                return
            meta.status = state


    async def status(self, fid: str):
        async with self._lock:
            meta = self._files.get(fid)
            return meta.status if meta else None


    async def set_transcript_path(self, fid: str):
        async with self._lock:
            meta = self._files.get(fid)
            if not meta:
                return
            meta.transcriptPath = self._transcript_path(fid)

