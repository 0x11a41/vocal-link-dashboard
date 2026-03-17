import os
import numpy as np
from typing import List, Tuple
from pydub import AudioSegment, effects
from pydub.effects import high_pass_filter
import noisereduce as nr
from faster_whisper import WhisperModel

import backend.core.primitives as P
from backend.utils.logging import log

SUPPORTED_FORMATS = {
    ".m4a": {"format": "mp4", "codec": "aac", "bitrate": "192k"},
    ".mp3": {"format": "mp3", "codec": "libmp3lame", "bitrate": "192k"},
    ".ogg": {"format": "ogg", "codec": "libopus", "bitrate": "128k"},
    ".wav": {"format": "wav"}
}

model_size = "small"
log.info(f"Loading Whisper model ({model_size}) on cpu...")
model = WhisperModel(model_size, device='cpu', compute_type='int8')

class AudioToolkit:
    def __init__(self, props: P.ServerConf = P.ServerConf()):
        self.props = props
        self.sync_params()

    def sync_params(self):
        self.noise_strength = self.props.noiseStrength
        self.target_dbfs = self.props.amplitudeStrength
        self.bass_boost = self.props.filterBassBoost
        self.air_boost = self.props.airBoost
        self.comp_thresh = self.props.compressorThreshold
        self.comp_ratio = self.props.compressorRatio

    def _reduce_noise(self, audio: AudioSegment) -> AudioSegment:
        channels = audio.channels
        sr = audio.frame_rate
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        samples /= np.iinfo(np.int16).max
    
        if channels > 1:
            samples = samples.reshape((-1, channels)).T

        reduced = nr.reduce_noise(
            y=samples, 
            sr=sr, 
            prop_decrease=self.noise_strength, 
            stationary=False,        
            n_fft=2048,             
            time_mask_smooth_ms=64, 
            n_jobs=-1               
        )

        if channels > 1:
            reduced = reduced.T.flatten()
        
        reduced = np.clip(reduced * 32767, -32768, 32767).astype(np.int16)
        return AudioSegment(
            reduced.tobytes(), 
            frame_rate=sr, 
            sample_width=2, 
            channels=channels
        )


    def _apply_studio_filter(self, audio: AudioSegment) -> AudioSegment:
        audio = high_pass_filter(audio, 80)

        if self.bass_boost > 0:
            bass = audio.low_pass_filter(250).apply_gain(self.bass_boost)
            audio = audio.overlay(bass)

        if self.air_boost > 0:
            air = audio.high_pass_filter(6000).apply_gain(self.air_boost)
            audio = audio.overlay(air)

        return effects.compress_dynamic_range(
            audio, 
            threshold=self.comp_thresh, 
            ratio=self.comp_ratio,
            attack=5.0,
            release=100.0
        )


    def _amplify(self, audio: AudioSegment) -> AudioSegment:
        if audio.dBFS == float("-inf"):
            return audio

        gain_needed = self.target_dbfs - audio.dBFS
        gain_needed = max(min(gain_needed, 15.0), -15.0) 
        audio = audio.apply_gain(gain_needed)

        if audio.max_dBFS > -0.5:
            audio = audio.apply_gain(-0.5 - audio.max_dBFS)

        return audio


    def _export(self, audio: AudioSegment, path: str):
        ext = os.path.splitext(path)[1].lower()
        config = SUPPORTED_FORMATS.get(ext, {"format": "wav"})
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
        segments, info = model.transcribe(path, beam_size=5, vad_filter=True)
        
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
