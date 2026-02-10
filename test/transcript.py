from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")

def format_timestamp(seconds: float):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"[{mins:02d}:{secs:02d}]"

audio_path = input("enter file name: ")

if audio_path:
    print(f"Processing: {audio_path}\n" + "-"*30)
    
    segments, info = model.transcribe(
        audio_path, 
        beam_size=1, 
        language="en",
        vad_filter=True, 
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    full_transcript_with_time = []

    # This loop iterates as the model finishes chunks (real-time)
    for segment in segments:
        time_str = format_timestamp(segment.start)
        entry = f"{time_str} {segment.text.strip()}"
        
        # Print immediately and flush the buffer so it shows up in the console instantly
        print(entry, flush=True)
        full_transcript_with_time.append(entry)

    print("\n--- Process Complete ---")
else:
    print("Operation cancelled.")
