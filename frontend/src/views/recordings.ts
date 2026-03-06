export function RecordingsView(): HTMLElement {
  const recordingsView = document.createElement('section');
  recordingsView.classList.add("recordings-view", "stack");
  recordingsView.innerHTML = `
      <header>
          <div>
            <input type="checkbox" class="card-checkbox">
            <span>Select all (2)</span>
          </div>
          <div>
            <button>Merge</button>
            <button class="immutable">Delete</button>
          </div>
        </header>

        <section class="recording-card">
            <div class="card-header">
                <span class="card-left">
                    <input type="checkbox">
                    <div class="card-metadata">
                        <div class="title">AUD0332-UUIDA53-CE0603026.m4a</div>
                        <div class="details">Calcifer • Motorola moto g84 5g • Recorded at 03:12 • <span class="link">More info</span></div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-green">ENHANCED</span>
                            <span class="badge badge-violet">TRANSCRIBED</span>
                        </div>
                    </div>
                </span>

                <span class="card-right">
                    <button>↓</button>
                    <button class="immutable">Delete</button>
                    <button>Save</button>
                </span>
            </div>
            <div class="metadata open">
                <div class="detail-row"><span>File Name:</span> AUD0332-UUIDA53-CE0603026.m4a</div>
                <div class="detail-row"><span>Size:</span> 23 MB</div>
                <div class="detail-row"><span>Device:</span> Motorola moto g84 5g</div>
                <div class="detail-row"><span>Duration:</span> 03:23 sec</div>
                <div class="detail-row"><span>Created at:</span> 19:03</div>
                <div class="detail-row"><span>Speaker:</span> Calcifer</div>
                <div class="detail-row"><span>Transcripted:</span> yes</div>
                <div class="detail-row"><span>Enhanced:</span> yes</div>
                <div class="detail-row"><span>Uploaded:</span> yes</div>
            </div>
            <div class="expandable">

                <div class="player-panel">
                    <div class="player-toggle-group">
                        <button class="active btn-small">ORIGINAL</button>
                        <button class="btn-small inactive">ENHANCED</button>
                    </div>

                    <div class="player">
                        <button class="accent">PLAY</button>
                        <span class="time-stamp">01:12</span>
                        <div class="progress-bar-container">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="time-stamp">03:45</span>
                        <button class="btn-small">SAVE</button>
                    </div>
                </div>

                <div class="enhancement-panel">
                    <div class="toggle-group">
												<label class="switch small">
													<input type="checkbox" checked>
													<span class="slider round"></span>
												</label>
                        <span class="muted">reduce noise</span>
                    </div>
                    <div class="toggle-group">
												<label class="switch small">
													<input type="checkbox" checked>
													<span class="slider round"></span>
												</label>
                        <span class="muted">boost amplitude</span>
                    </div>
                    <div class="toggle-group">
												<label class="switch small">
													<input type="checkbox" checked>
													<span class="slider round"></span>
												</label>
                        <span class="muted">studio effect</span>
                    </div>
                    <button class="btn-enhance btn-small">ENHANCE</button>
                </div>

                <div class="transcription-section">
                    <div class="transcription-header">
                        <span>Transcription</span>
                        <span>
	                        <button class="btn-small">SAVE SRT</button>
	                        <button class="btn-small">COPY</button>
                        </span>
                    </div>
                    <div class="transcript-scroll">
                        <span class="sentence highlight">This is an example of a sentence-based transcription layout.</span>
                        <span class="sentence">The active sentence is highlighted highlighted highlighted with a side border and a subtle background color.</span>
                        <span class="sentence">The active sentence is with a side border and a subtle background color.</span>
                    </div>
                </div>
            </div>
        </section>
  `;
  return recordingsView;
}
