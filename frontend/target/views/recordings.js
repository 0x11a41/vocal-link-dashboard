import { RecStates } from '../models/primitives.js';
import { RecordingCard } from '../components/RecordingCard.js';
export function RecordingsView() {
    const dummyRecording = {
        rid: "68b81008-2ea4-4a3d-9a8a-aba60e693ed9",
        recName: "20260308_085408.m4a",
        sessionId: "a0540a3a-540f-44cf-9d18-252b926025d4",
        speaker: "calcifer",
        device: "Motorola moto g84 5G",
        duration: 3,
        sizeBytes: 43909,
        createdAt: 1772940253688,
        original: RecStates.OK,
        enhanced: RecStates.NA,
        transcript: RecStates.NA,
        "merged": null
    };
    const recording = new RecordingCard(dummyRecording);
    recording.render();
    const recordingsView = document.createElement('section');
    recordingsView.classList.add("recordings-view", "stack");
    recordingsView.appendChild(recording.card);
    return recordingsView;
}
