import { URL } from './models/constants.js';
import { SessionMetadata, Payloads, WSActions } from './models/primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { server } from './network/serverInfo.js';
import { sendPayload, ws } from './network/ws.js';
import { wsHandler } from './network/wsHandler.js';
import { ViewSelector } from './components/ViewSelector.js';
import { dashboard } from './views/dashboard.js';


export class VLApp {
  private root: HTMLElement;
  private sidePanel = document.createElement('aside');
  private mainPanel = document.createElement('main');

  private viewSelector = new ViewSelector(this.mainPanel);

  constructor() {
    const root = document.getElementById("app");
    if (!root) throw new Error("#app root element not found");
    this.root = root;

    ws.onmessage = (ev: MessageEvent) =>
      wsHandler({
        payload: JSON.parse(ev.data),
        renderView: () => this.viewSelector.render(),
      });

    ws.onclose = () => {
      console.warn("WebSocket closed");
    };

    this.root.append(this.sidePanel, this.mainPanel);
    this.bindServerUpdates();
  }

  private renderSidebar(): void {
    this.sidePanel.innerHTML = `
      <h2>VocalLink</h2>
      <div class="qrcode-wrapper">
        <img src="${URL}/dashboard/qr" alt="Server QR Code">
        <div class="label">scan to join session</div>
        <div class="ip-address">${server.data.ip}</div> 
      </div>
    `;

    this.sidePanel.appendChild(this.viewSelector.menu);
    this.sidePanel.insertAdjacentHTML('beforeend',
      `<i class="version">vocal-link-dashboard ${server.data.version}</i>`
    );
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
        dashboard.sessions.set(meta.id, new SessionCard(meta));
        sendPayload(Payloads.action(WSActions.GET_STATE, meta.id));
      }
    } catch (err) {
      console.error("Init failed:", err);
    }
  }
}

const app = new VLApp();
await app.setup();
app.render();
