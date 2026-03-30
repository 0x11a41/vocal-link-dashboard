import { URL } from './models/constants.js';
import { Views, SessionMetadata, Payloads, WSEvents, WSActions, RecMetadata } from './models/primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { server } from './network/serverInfo.js';
import { sendPayload, ws } from './network/ws.js';
import { wsHandler } from './network/wsHandler.js';
import { ViewSelector } from './components/ViewSelector.js';
import { Dashboard } from './views/dashboard.js';
import { Recordings } from './views/recordings.js';
import { modalDialog } from './components/modalDialog.js';
import { TooltipManager } from './components/ToolTipManager.js';
import { log } from './components/logger.js';


export class VLApp {
  private root: HTMLElement;
  private sidePanel = document.createElement('aside');
  private mainPanel = document.createElement('main');

  private viewSelector = new ViewSelector(this.mainPanel, Views.DASHBOARD);

  constructor() {
    const root = document.getElementById("app");
    if (!root) throw new Error("#app root element not found");
    this.root = root;


    ws.onmessage = async (ev: MessageEvent) =>
      await wsHandler({
        payload: JSON.parse(ev.data),
        refresh: () => this.render(),
      });

    ws.onopen = () => ws.send(JSON.stringify(Payloads.event(WSEvents.DASHBOARD_INIT)));

    ws.onclose = () => {
      Dashboard.sessions.clear();
      Dashboard.render();

      modalDialog({
        msg: "Error! Connection closed unexpectedly.",
        opts: [
          {label: "Reload", handler: () => window.location.reload()},
          {label: "Exit", handler: () => window.close()}
        ]
      });
    };

    new TooltipManager();
    this.root.append(this.sidePanel, this.mainPanel);
    this.bindServerUpdates();
  }

  private renderSidebar(): void {
    this.sidePanel.innerHTML = `
      <h2>VocalLink</h2>
      <div class="qrcode-wrapper">
        <img src="${URL}/dashboard/qr" alt="Server QR Code">
        <div class="label">scan to join session</div>
        <div class="ip-address">${server.info?.ip ?? 'x.x.x.x'}</div> 
      </div>
    `;

    this.sidePanel.appendChild(this.viewSelector.menu);
    this.sidePanel.appendChild(log.element);
  }

  private bindServerUpdates(): void {
    window.addEventListener("server-update", (e: Event) => {
      const data = (e as CustomEvent).detail;

      const ip = this.sidePanel.querySelector(".ip-address");
      if (ip) ip.textContent = data.ip;

      const version = this.sidePanel.querySelector(".version");
      if (version) version.textContent = `vocal-link-dashboard ${data.version}`;
    });
  }

  public render(): void {
    this.renderSidebar();
    this.viewSelector.render();
  }

  public async setup(): Promise<void> {
    try {
      const res = await fetch(URL + "/sessions");
      const metas: SessionMetadata[] = await res.json();

      for (const meta of metas) {
        Dashboard.sessions.set(meta.id, new SessionCard(meta));
        sendPayload(Payloads.action(WSActions.GET_STATE, meta.id));
      }

      const recResponse = await fetch(URL + '/recordings');
      const recMetas: RecMetadata[] = await recResponse.json();
      
      for (const meta of recMetas) {
        Recordings.append(meta);
      }
    } catch (err) {
      console.error("Init failed:", err);
    }
  }
}

const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
function updateTheme(isDark: boolean) {
  document.body.classList.toggle('dark-theme', isDark);
}
darkMode.addEventListener('change', (e) => updateTheme(e.matches));
updateTheme(darkMode.matches);

const app = new VLApp();
await app.setup();
