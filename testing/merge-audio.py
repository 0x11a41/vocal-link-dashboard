from pydub import AudioSegment
import os

# ----------------------------------------
# MAIN PROGRAM
# ----------------------------------------
print("Enter audio file names (comma-separated):")
files = [f.strip() for f in input().split(",")]

audios = []

print("⏳ Loading audio files...")
for f in files:
    audios.append(AudioSegment.from_file(f))

# ----------------------------------------
# FIND LONGEST AUDIO
# ----------------------------------------
max_length = max(len(audio) for audio in audios)

# ----------------------------------------
# CREATE BASE SILENCE (so nothing is cut)
# ----------------------------------------
mixed_audio = AudioSegment.silent(duration=max_length)

# ----------------------------------------
# CONVERGE (MIX ALL FULLY)
# ----------------------------------------
print("🔊 Mixing all audios fully at the same time...")

for audio in audios:
    mixed_audio = mixed_audio.overlay(audio)

# Optional: normalize to avoid clipping
mixed_audio = mixed_audio.normalize()

# ----------------------------------------
# SAVE OUTPUT (NO PLAYBACK)
# ----------------------------------------
output_name = input("Enter output file name (with extension): ")
output_format = os.path.splitext(output_name)[1][1:]

mixed_audio.export(output_name, format=output_format)

print(f"✅ Converged audio saved as: {output_name}")
