export function SettingsView() {
    const settingsView = document.createElement('section');
    settingsView.classList.add("settings-view", "stack");
    settingsView.innerHTML = `
		<h1>Settings</h1>
		<hr>
		<div class="options-wrapper">
			<div class="setting-card">
          <div class="text-group">
              <b>Server Name</b>
              <p class="muted">Visible on recorders</p>
          </div>

          <div class="input-group">
              <input type="text" value="My-Mac-Mini" placeholder="Enter name">
              <div class="btn-circle tick-icon highlight-on-cursor"></div>
          </div>
      </div>
			<div class="setting-card">
				<div class="text-group">
					<b>Save location</b>
					<p class="muted">current path: /home/hk/Downloads</p>
				</div>
				<button class="accent highlight-on-cursor">Change</button>
			</div>

			<div class="setting-card">
				<div class="text-group">
					<b>Theme</b>
					<p class="muted">Switch between light and dark theme</p>
				</div>
				<label class="toggle-switch">
					<input type="checkbox">
					<span class="slider round"></span>
				</label>
			</div>

			<div class="setting-card">
				<div class="text-group">
					<b>Auto Enhance</b>
					<p class="muted">Automatically run speech enhancement whenever a recording arrive</p>
				</div>
				<label class="toggle-switch">
					<input type="checkbox" checked>
					<span class="slider round"></span>
				</label>
			</div>

			<div class="setting-card">
				<div class="text-group">
					<b>Auto generate transcript</b>
					<p class="muted">Automatically generate transcript whenever a recording arrive</p>
				</div>
				<label class="toggle-switch">
					<input type="checkbox">
					<span class="slider round"></span>
				</label>
			</div>
		</div>
  `;
    return settingsView;
}
