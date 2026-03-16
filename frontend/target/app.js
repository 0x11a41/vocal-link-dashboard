import { URL } from './models/constants.js';
import { Views, Payloads, WSActions } from './models/primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { server } from './network/serverInfo.js';
import { sendPayload, ws } from './network/ws.js';
import { wsHandler } from './network/wsHandler.js';
import { ViewSelector } from './components/ViewSelector.js';
import { Dashboard } from './views/dashboard.js';
import { Recordings } from './views/recordings.js';
import { modalDialog } from './components/modalDialog.js';
export class VLApp {
    root;
    sidePanel = document.createElement('aside');
    mainPanel = document.createElement('main');
    viewSelector = new ViewSelector(this.mainPanel, Views.CONFIGURE);
    constructor() {
        const root = document.getElementById("app");
        if (!root)
            throw new Error("#app root element not found");
        this.root = root;
        ws.onmessage = (ev) => wsHandler({
            payload: JSON.parse(ev.data),
            renderDashboard: () => this.viewSelector.render(),
        });
        ws.onclose = () => {
            Dashboard.sessions.clear();
            Dashboard.render();
            modalDialog({
                msg: "Error! Connection closed unexpectedly.",
                opts: [
                    { label: "Reload", handler: () => window.location.reload() },
                    { label: "Exit", handler: () => window.close() }
                ]
            });
        };
        this.root.append(this.sidePanel, this.mainPanel);
        this.bindServerUpdates();
    }
    renderSidebar() {
        this.sidePanel.innerHTML = `
      <h2>VocalLink</h2>
      <div class="qrcode-wrapper">
        <img src="${URL}/dashboard/qr" alt="Server QR Code">
        <div class="label">scan to join session</div>
        <div class="ip-address">${server.info?.ip ?? 'x.x.x.x'}</div> 
      </div>
    `;
        this.sidePanel.appendChild(this.viewSelector.menu);
        this.sidePanel.insertAdjacentHTML('beforeend', `<i class="version">vocal-link-dashboard ${server.info?.version}</i>`);
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
    render() {
        this.renderSidebar();
        this.viewSelector.render();
    }
    async setup() {
        try {
            const res = await fetch(URL + "/sessions");
            const metas = await res.json();
            for (const meta of metas) {
                Dashboard.sessions.set(meta.id, new SessionCard(meta));
                sendPayload(Payloads.action(WSActions.GET_STATE, meta.id));
            }
            const recResponse = await fetch(URL + '/recordings');
            const recMetas = await recResponse.json();
            for (const meta of recMetas) {
                Recordings.append(meta);
            }
        }
        catch (err) {
            console.error("Init failed:", err);
        }
    }
}
const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
function updateTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
}
darkMode.addEventListener('change', (e) => updateTheme(e.matches));
updateTheme(darkMode.matches);
const app = new VLApp();
await app.setup();
app.render();
