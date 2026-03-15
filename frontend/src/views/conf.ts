export function ConfView(): HTMLElement {
  const settingsView = document.createElement('section');
  settingsView.classList.add("conf-view", "stack");
  settingsView.innerHTML = `
    <div class="conf-section">
      <h4>Appearance</h4>
      <div class="row">
        <div class="left">
          <p>Accent color</p>
        </div>
        <div class="right">
  				<div class="color-picker">
  					<div class="color active" style="background: #E7965C;"></div>
  					<div class="color" style="background: #877;"></div>
  					<div class="color" style="background: #7e7;"></div>
  					<div class="color" style="background: #77a;"></div>
  					<div class="color" style="background: #87f;"></div>
  				</div>
        </div>
      </div>
    </div>  

    <div class="conf-section">
      <h4>Audio processing</h4>
      <div class="row">
        <div class="left">
          <p>Noise reduction strength</p>
        </div>
        <div class="right">
  				<div class="slider-group">
						<input type="range" min="0" max="1" step="0.05" value="0.75">
						<span class="slider-val">0.75</span>
					</div>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Amplitude boost level</p>
        </div>
        <div class="right">
  				<div class="slider-group">
						<input type="range" min="-24" max="12" step="1" value="-18">
						<span class="slider-val">-18dB</span>
					</div>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Transcription model size</p>
        </div>
        <div class="right">
  				<select>
  					<option>Tiny (Fastest)</option>
  					<option>Base</option>
  					<option selected>Small (Balanced)</option>
  					<option>Medium (High Accuracy)</option>
  				</select>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Preferred recording format</p>
        </div>
        <div class="right">
  				<select>
  					<option>.ogg</option>
  					<option>.mp3</option>
  					<option selected>.m4a</option>
  				</select>
        </div>
      </div>
    </div>  

    <div class="conf-section">
      <h4>Custom Event triggers</h4>
      <p class="desc">Write custom actions in python to trigger with the ui actions.</p>
      <div class="row">
  			<textarea class="code-area" spellcheck="false">
class EventTriggers:
	def onStart():
		# Triggered when recording begins
		print("Recording Started...")

	def onStop():
		# Triggered when recording ends
		print("Recording Saved.")

	def onPause():
		pass

	def onResume():
		pass
    		</textarea>
      </div>
    </div>  
  `;
  return settingsView;
}
