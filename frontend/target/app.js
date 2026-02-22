import { URL } from './constants.js';
import { Views } from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { SettingsView } from './views/settings.js';
import { RecordingsView } from './views/recordings.js';
import { server } from './serverInfo.js';
import { TriggerAllBtn } from './components/TriggerAllBtn.js';
import { DashboardView } from './views/dashboard.js';
import { ws } from './websockets.js';
import { msgHandler } from './msgHandler.js';
export class VLApp {
    canvas = document.getElementById("app");
    sidePanel = document.createElement('aside');
    mainPanel = document.createElement('main');
    sessions = new Map();
    triggerAllBtn = new TriggerAllBtn({ sessions: this.sessions });
    currentView = Views.DASHBOARD;
    viewSelector = document.createElement('menu');
    constructor() {
        this.viewSelector.innerHTML = `
      <li data-key="${Views.DASHBOARD}">Dashboard</li>
      <li data-key="${Views.RECORDINGS}">Recordings</li>
      <li data-key="${Views.SETTINGS}">Settings</li>
    `;
        if (this.canvas) {
            this.canvas.insertAdjacentElement('afterbegin', this.sidePanel);
            this.canvas.insertAdjacentElement('beforeend', this.mainPanel);
        }
    }
    setActiveMenuItem(state = this.currentView) {
        const options = this.viewSelector.querySelectorAll('li');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.key === state);
        });
    }
    syncCurrentView() {
        this.setActiveMenuItem();
        this.mainPanel.innerHTML = "";
        switch (this.currentView) {
            case Views.DASHBOARD:
                this.mainPanel.appendChild(DashboardView({
                    sessions: this.sessions,
                    triggerAllBtn: this.triggerAllBtn.element,
                }));
                break;
            case Views.RECORDINGS:
                this.mainPanel.appendChild(RecordingsView());
                break;
            case Views.SETTINGS:
                this.mainPanel.appendChild(SettingsView());
                break;
        }
    }
    setActiveView(newView) {
        this.currentView = newView;
        this.syncCurrentView();
    }
    renderSidebar() {
        this.sidePanel.innerHTML = `
      <h2>VocalLink</h2>
      <div class="qrcode-wrapper">
          <img src="${URL}/dashboard/qr" alt="Server QR Code">
          <div class="label">scan to join session</div>
          <div class="ip-address">${server.data.ip}</div> 
      </div>
    `;
        this.sidePanel.appendChild(this.viewSelector);
        this.sidePanel.insertAdjacentHTML('beforeend', `
    	<i class="version">vocal-link-dashboard ${server.data.version}</i>
  	`);
        this.viewSelector.onmouseup = (ev) => {
            const target = ev.target.closest('li');
            if (target) {
                const state = target.dataset.key;
                if (state !== this.currentView) {
                    this.setActiveView(state);
                }
            }
        };
        this.setActiveMenuItem();
    }
    async init() {
        try {
            const sessionsResponse = await fetch(URL + "/sessions");
            const metas = await sessionsResponse.json();
            metas.forEach(meta => {
                this.sessions.set(meta.id, new SessionCard(meta));
            });
            this.renderSidebar();
            this.setActiveView(this.currentView);
            ws.onmessage = (ev) => msgHandler(this, JSON.parse(ev.data));
            ws.onclose = () => { };
        }
        catch (err) {
            console.error("Init failed:", err);
        }
    }
}
const app = new VLApp();
await app.init();
