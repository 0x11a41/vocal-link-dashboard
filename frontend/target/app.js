import { URL } from './constants.js';
import { Views, Payloads, WSActions } from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { SettingsView } from './views/settings.js';
import { RecordingsView } from './views/recordings.js';
import { server } from './serverInfo.js';
import { DashboardView } from './views/dashboard.js';
import { sendPayload, ws } from './ws.js';
import { wsHandler } from './wsHandler.js';
export class VLApp {
    root;
    sidePanel = document.createElement('aside');
    mainPanel = document.createElement('main');
    dashboard = new DashboardView();
    currentView = Views.DASHBOARD;
    viewSelector = document.createElement('menu');
    constructor() {
        const root = document.getElementById("app");
        if (!root)
            throw new Error("#app root element not found");
        this.root = root;
        this.viewSelector.innerHTML = `
      <li data-key="${Views.DASHBOARD}">Dashboard</li>
      <li data-key="${Views.RECORDINGS}">Recordings</li>
      <li data-key="${Views.SETTINGS}">Settings</li>
    `;
        this.root.append(this.sidePanel, this.mainPanel);
        this.renderSidebar();
        this.bindNavigation();
        this.bindServerUpdates();
    }
    bindNavigation() {
        this.viewSelector.onclick = (ev) => {
            const li = ev.target.closest('li');
            if (!li)
                return;
            const next = li.dataset.key;
            if (next !== this.currentView)
                this.setCurrentView(next);
        };
    }
    setActiveMenuItem() {
        this.viewSelector.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.key === this.currentView));
    }
    setCurrentView(view) {
        this.currentView = view;
        this.renderCurrentView();
    }
    refresh() {
        this.renderCurrentView();
    }
    renderCurrentView() {
        this.setActiveMenuItem();
        this.mainPanel.replaceChildren();
        switch (this.currentView) {
            case Views.DASHBOARD:
                this.dashboard.render();
                this.mainPanel.appendChild(this.dashboard.view);
                break;
            case Views.RECORDINGS:
                this.mainPanel.appendChild(RecordingsView());
                break;
            case Views.SETTINGS:
                this.mainPanel.appendChild(SettingsView());
                break;
        }
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
        this.sidePanel.insertAdjacentHTML('beforeend', `<i class="version">vocal-link-dashboard ${server.data.version}</i>`);
    }
    async init() {
        try {
            const res = await fetch(URL + "/sessions");
            const metas = await res.json();
            for (const meta of metas) {
                this.dashboard.sessions.set(meta.id, new SessionCard(meta));
                sendPayload(Payloads.action(WSActions.GET_STATE, meta.id));
            }
            this.renderCurrentView();
            ws.onmessage = (ev) => wsHandler({
                dashboard: this.dashboard,
                payload: JSON.parse(ev.data),
                refresh: () => this.refresh(),
            });
            ws.onclose = () => {
                console.warn("WebSocket closed");
            };
        }
        catch (err) {
            console.error("Init failed:", err);
        }
    }
    bindServerUpdates() {
        window.addEventListener("server-update", (e) => {
            const data = e.detail;
            const ip = this.sidePanel.querySelector(".ip-address");
            if (ip)
                ip.textContent = data.ip;
            const version = this.sidePanel.querySelector(".version");
            if (version)
                version.textContent = `vocal-link-dashboard ${data.version}`;
        });
    }
}
const app = new VLApp();
await app.init();
