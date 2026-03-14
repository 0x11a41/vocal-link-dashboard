from typing import Dict, List, Optional, Callable 
from enum import Enum
import asyncio
import os
import shutil
import uuid
import json
from fastapi import UploadFile

import backend.core.primitives as P
from backend.utils.logging import log
from backend.utils.utils import now_ms
from backend.utils.audioToolkit import AudioToolkit

NotifyCallback = Callable[[P.WSPayload], None]
ALLOWED_EXTENSIONS = {".m4a", ".mp4", ".ogg"}

class RecordingTypes(Enum):
    ORIGINAL = 'original'
    ENHANCED = 'enhanced'
    TRANSCRIPT = 'transcript'

class RecordingsHandler:
    def __init__(self, root: str = "storage"):    
        self.root: str = root
        if os.path.exists(self.root):
            shutil.rmtree(self.root)

        self._recordings: Dict[str, P.RecMetadata] = {}
        self._lock = asyncio.Lock()

        self._audio = AudioToolkit()

        self.original_dir: str = os.path.join(root, "original")
        self.enhanced_dir: str = os.path.join(root, "enhanced")
        self.transcripts_dir: str = os.path.join(root, "transcripts")

        os.makedirs(self.original_dir, exist_ok=True)
        os.makedirs(self.enhanced_dir, exist_ok=True)
        os.makedirs(self.transcripts_dir, exist_ok=True)

    def _get_ext(self, recName: str) -> str:
        _, ext = os.path.splitext(recName or "")
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported rec extension: {ext}")
        return ext

    def _original_path(self, meta: P.RecMetadata) -> str:
        ext = self._get_ext(meta.recName)
        return os.path.join(self.original_dir, f"{meta.rid}{ext}")

    def _enhanced_path(self, meta: P.RecMetadata) -> str:
        ext = self._get_ext(meta.recName)
        return os.path.join(self.enhanced_dir, f"{meta.rid}{ext}")

    def _transcript_path(self, meta: P.RecMetadata) -> str:
        return os.path.join(self.transcripts_dir, f"{meta.rid}.json")

    async def set_original(self, rid: str, state: P.RecStates):
        async with self._lock:
            meta = self._recordings.get(rid)
            if meta:
                meta.original = state

    async def set_transcript(self, rid: str, state: P.RecStates):
        async with self._lock:
            meta = self._recordings.get(rid)
            if meta:
                meta.transcript = state

    async def set_enhanced(self, rid: str, state: P.RecStates):
        async with self._lock:
            meta = self._recordings.get(rid)
            if meta:
                meta.enhanced = state


    async def stage(self, info: P.RecStageInfo, session: P.SessionMetadata ) -> Optional[P.RecMetadata]:
        meta = P.RecMetadata(
            rid=str(uuid.uuid4()),
            recName=info.recName,
            sessionId=session.id,
            speaker=session.name,
            device=session.device,
            duration=info.duration,
            sizeBytes=info.sizeBytes,
            createdAt=now_ms(),
            original = P.RecStates.WORKING
        )
        async with self._lock:
            self._recordings[meta.rid] = meta
        return meta


    async def save(self, rid: str, file: UploadFile) -> Optional[P.RecMetadata]:
        async with self._lock:
            meta = self._recordings.get(rid)
            if not meta:
                return None

        if meta.original != P.RecStates.WORKING:
            return None

        try:
            path = self._original_path(meta)
            temp_path = path + ".tmp"
        except ValueError as e:
            log.error(f"Invalid extension for {rid}: {e}")
            await self.set_original(rid, P.RecStates.NA)
            return meta

        try:
            with open(temp_path, "wb") as buffer:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    buffer.write(chunk)

            os.replace(temp_path, path)
            size = os.path.getsize(path)

            async with self._lock:
                meta.sizeBytes = size
                meta.original = P.RecStates.OK

            return meta
        except Exception as e:
            log.error(f"File save failed for {rid}: {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

            async with self._lock:
                if rid in self._recordings:
                    meta.original = P.RecStates.NA
            return meta

        finally:
            await file.close()


    async def _transcribe(self, rid: str) -> Optional[P.RecMetadata]:
        async with self._lock:
            meta = self._recordings.get(rid)
            if not meta:
                return None
            if meta.transcript != P.RecStates.WORKING:
                return None

        original = self._original_path(meta)

        if not os.path.exists(original):
            async with self._lock:
                meta.transcript = P.RecStates.NA
                return meta.model_copy()

        try:
            transcript_result: P.TranscriptResult = await asyncio.to_thread(
                self._audio.transcribe,
                original,
                rid
            )

            transcript_path = self._transcript_path(meta)

            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(transcript_result.model_dump_json(indent=2))

            async with self._lock:
                meta.transcript = P.RecStates.OK
                return meta.model_copy()

        except Exception as e:
            log.error(f"Transcription failed for {rid}: {e}")
            async with self._lock:
                meta.transcript = P.RecStates.NA
                return meta.model_copy()


    def resolve_transcript(self, rid: str) -> Optional[P.TranscriptResult]:
        meta = self._recordings.get(rid)
        if not meta:
            return None

        path = self._transcript_path(meta)
        if not os.path.exists(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as tf:
                data = json.load(tf)
        except Exception as e:
            log.error(f"Failed to load transcript for {rid}: {e}")
            return None

        return P.TranscriptResult.model_validate(data)


    async def _merge(self, ids: List[str]) -> Optional[P.RecMetadata]:
        if not ids:
            return None

        async with self._lock:
            metas = []
            for id in ids:
                meta = self._recordings.get(id)
                if not meta or meta.original != P.RecStates.OK:
                    return None
                metas.append(meta)

            new_id = str(uuid.uuid4())
            ext = self._get_ext(metas[0].recName)

            merged_meta = P.RecMetadata(
                rid = new_id,
                recName = f'{new_id}{ext}',
                sessionId = "0",
                speaker = "many",
                device = "many",
                duration = 0,
                sizeBytes = 0,
                createdAt = now_ms(),
            )

            self._recordings[new_id] = merged_meta

        try:
            duration, size = await asyncio.to_thread(
                self._audio.merge,
                [self._original_path(meta) for meta in metas],
                self._original_path(merged_meta),
            )

            async with self._lock:
                merged_meta.duration = duration
                merged_meta.sizeBytes = size
                merged_meta.merged = ids
                merged_meta.original = P.RecStates.OK
                return merged_meta.model_copy()

        except Exception as e:
            log.error(f"Merge failed: {e}")
            async with self._lock:
                merged_meta.merged = None
                return merged_meta.model_copy()


    async def _enhance(self, rid: str, props: int) -> Optional[P.RecMetadata]:
        async with self._lock:
            meta = self._recordings.get(rid)
            if not meta:
                return None
            
            original_path = self._original_path(meta)
            if not os.path.exists(original_path):
                return None

            meta.enhanced = P.RecStates.WORKING
            enhanced_path = self._enhanced_path(meta)

        try:
            await asyncio.to_thread(
                self._audio.enhance,
                original_path,
                enhanced_path,
                props
            )

            async with self._lock:
                meta.enhanced = P.RecStates.OK
                return meta.model_copy()

        except Exception as e:
            log.error(f"Enhancement failed for {rid}: {e}")
            async with self._lock:
                meta.enhanced = P.RecStates.NA
                return meta.model_copy()


    def _delete_file_safely(self, path: str):
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            log.error(f"Failed to delete file at {path}: {e}")


    async def delete(self, rid: str) -> bool:
        async with self._lock:
            meta = self._recordings.get(rid)
            if not meta:
                return False

            files_to_remove = [
                self._original_path(meta),
                self._enhanced_path(meta),
                self._transcript_path(meta)
            ]

            for path in files_to_remove:
                self._delete_file_safely(path)

            del self._recordings[rid]
            
        log.info(f"Deleted all records and files for RID: {rid}")
        return True

    async def rename(self, rid: str, new_name: str) -> Optional[P.RecMetadata]:
        async with self._lock:
            meta = self._recordings.get(rid)
            if not meta:
                log.warning(f"Rename failed: RID {rid} not found.")
                return None

            try:
                self._get_ext(new_name)
                old_name = meta.recName
                meta.recName = new_name
            
                log.info(f"Renamed recording {rid}: '{old_name}' -> '{new_name}'")
                return meta.model_copy()

            except ValueError:
                log.error(f"Rename failed for {rid}: Invalid extension in '{new_name}'")
                return None
            except Exception as e:
                log.error(f"Unexpected error during rename of {rid}: {e}")
                return None

    async def exist(self, rid: str) -> bool:
        async with self._lock:
            return rid in self._recordings


    async def is_enhanced(self, rid: str) -> bool:
        async with self._lock:
            meta = self._recordings.get(rid)
        if not meta:
            return False
        return meta.enhanced == P.RecStates.OK
    

    async def is_uploaded(self, rid: str) -> bool:
        async with self._lock:
            meta = self._recordings.get(rid)
        if not meta:
            return False
        return meta.original == P.RecStates.OK


    async def is_transcribed(self, rid: str) -> bool:
        async with self._lock:
            meta = self._recordings.get(rid)
        if not meta:
            return False
        return meta.transcript == P.RecStates.OK


    async def is_merged(self, rid: str) -> bool:
        async with self._lock:
            meta = self._recordings.get(rid)
        if not meta:
            return False
        return True if meta.merged else False


    async def path(self, rid: str, pathof: RecordingTypes) -> Optional[str]:
        meta = self._recordings.get(rid)
        if not meta:
            return None

        if pathof == RecordingTypes.ORIGINAL:
            return self._original_path(meta)
        elif pathof == RecordingTypes.ENHANCED:
            return self._enhanced_path(meta)
        elif pathof == RecordingTypes.TRANSCRIPT:
            return self._transcript_path(meta)
        else:
            return None


    async def get_meta(self, rid: str) -> Optional[P.RecMetadata]:
        async with self._lock:
            meta = self._recordings.get(rid)
        return meta if meta else None


    async def get_all_metas(self) -> List[P.RecMetadata]:
        async with self._lock:
            return [m.model_copy() for m in self._recordings.values()]
