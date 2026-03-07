import os
import numpy as np
from typing import List, Tuple
from pydub import AudioSegment, effects
from pydub.effects import high_pass_filter
import noisereduce as nr
from faster_whisper import WhisperModel

import backend.core.primitives as P
from backend.utils.logging import log

class AudioToolkit:
    SUPPORTED_FORMATS = {
        ".m4a": {"format": "mp4", "codec": "aac", "bitrate": "192k"},
        ".mp3": {"format": "mp3", "codec": "libmp3lame", "bitrate": "192k"},
        ".ogg": {"format": "ogg", "codec": "libopus", "bitrate": "128k"},
        ".wav": {"format": "wav"}
    }


    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
        log.info(f"Loading Whisper model ({model_size}) on {device}...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)


    def _reduce_noise(self, audio: AudioSegment, strength: float = 0.65) -> AudioSegment:
        audio = effects.normalize(audio)
        channels = audio.channels
        sr = audio.frame_rate
        
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        samples /= np.iinfo(np.int16).max
        
        if channels > 1:
            samples = samples.reshape((-1, channels)).T # Shape: [2, N]

        total_samples = samples.shape[-1] if channels > 1 else len(samples)
        win_len = min(int(0.5 * sr), total_samples // 4)
        
        if win_len > 100:
            if channels > 1:
                energy = np.sum(samples[:, :win_len*10]**2, axis=0) 
            else:
                energy = samples[:win_len*10]**2
                
            energies = [np.sum(energy[i : i + win_len]) for i in range(0, len(energy) - win_len, win_len)]
            best_idx = np.argmin(energies) * win_len
            noise_sample = samples[:, best_idx : best_idx + win_len] if channels > 1 else samples[best_idx : best_idx + win_len]
        else:
            noise_sample = samples

        reduced = nr.reduce_noise(
            y=samples, 
            y_noise=noise_sample, 
            sr=sr, 
            prop_decrease=strength,
            stationary=True
        )

        if channels > 1:
            reduced = reduced.T.flatten()
            
        reduced = np.clip(reduced * 32767, -32768, 32767).astype(np.int16)
        return AudioSegment(reduced.tobytes(), frame_rate=sr, sample_width=2, channels=channels)


    def _apply_studio_filter(self, audio: AudioSegment) -> AudioSegment:
        audio = high_pass_filter(audio, 80)
        audio = audio.low_pass_filter(300).apply_gain(-3).overlay(audio.high_pass_filter(300))
        air = audio.high_pass_filter(6000).apply_gain(3)
        audio = audio.overlay(air)
        return effects.compress_dynamic_range(
            audio, 
            threshold=-20.0, 
            ratio=3.0, 
            attack=10.0, 
            release=150.0
        )


    def _amplify(self, audio: AudioSegment, target_dbfs: float = -18.0) -> AudioSegment:
        if audio.dBFS == float("-inf"):
            return audio

        dynamic_range = audio.max_dBFS - audio.dBFS
        if dynamic_range > 12:
            audio = effects.compress_dynamic_range(
                audio,
                threshold=-22.0,
                ratio=1.8,
                attack=15.0,
                release=200.0
            )

        current_dbfs = audio.dBFS

        gain_needed = target_dbfs - current_dbfs
        gain_needed = max(min(gain_needed, 12.0), -12.0)  # limit boost

        audio = audio.apply_gain(gain_needed)

        ceiling = -1.0
        if audio.max_dBFS > ceiling:
            audio = audio.apply_gain(ceiling - audio.max_dBFS)

        return audio


    def _export(self, audio: AudioSegment, path: str):
        ext = os.path.splitext(path)[1].lower()
        config = self.SUPPORTED_FORMATS.get(ext, {"format": "wav"})
        audio.export(path, **config)
    

    def enhance(self, input_path: str, output_path: str, props: int) -> Tuple[float, int]:
        if not os.path.exists(input_path):
            raise FileNotFoundError(input_path)

        audio = AudioSegment.from_file(input_path)
        if props & P.EnhanceProps.REDUCE_NOISE:
            audio = self._reduce_noise(audio)
       
        if props & P.EnhanceProps.STUDIO_FILTER:
            audio = self._apply_studio_filter(audio)

        if props & P.EnhanceProps.AMPLIFY:
            audio = self._amplify(audio)

        self._export(audio, output_path)
        return len(audio) / 1000, os.path.getsize(output_path)


    def transcribe(self, path: str, rid: str) -> P.TranscriptResult:
        segments, info = self.model.transcribe(path, beam_size=5, vad_filter=True)
        
        results = []
        for s in segments:
            results.append(P.TranscriptSegment(
                                       start=round(s.start, 3),
                                       end=round(s.end, 3),
                                       text=s.text.strip()
                                   ))
            
        return P.TranscriptResult(
                                  rid=rid,
                                  language=info.language,
                                  duration=info.duration,
                                  segments=results
                              )


    def merge(self, inputs:List[str], output:str, mode:str = "overlap")->Tuple[float, int]:
        audios = [AudioSegment.from_file(p) for p in inputs if os.path.exists(p)]
        if not audios:
            raise ValueError("No valid audio files found.")

        if mode == "concat":
            combined = sum(audios)
        else:
            max_len = max(len(a) for a in audios)
            combined = AudioSegment.silent(duration=max_len)
            for a in audios:
                combined = combined.overlay(a)

        combined = effects.normalize(combined)
        self._export(combined, output)
        return len(combined) / 1000, os.path.getsize(output)

