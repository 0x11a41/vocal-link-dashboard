import { URL } from './constants.js';
import { Views, SessionMetadata, Payloads, WSActions } from './primitives.js';
import { SessionCard } from './components/SessionCard.js';
import { SettingsView } from './views/settings.js';
import { RecordingsView } from './views/recordings.js';
import { server } from './serverInfo.js';
import { DashboardView } from './views/dashboard.js';
import { sendPayload, ws } from './ws.js';
import { wsHandler } from './wsHandler.js';


export class VLApp {
  public root: HTMLElement;
  public sidePanel = document.createElement('aside');
  public mainPanel = document.createElement('main');

  public dashboard = new DashboardView();

  private currentView: Views = Views.DASHBOARD;
  public viewSelector = document.createElement('menu');

  constructor() {
    const root = document.getElementById("app");
    if (!root) throw new Error("#app root element not found");
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

  private bindNavigation(): void {
    this.viewSelector.onclick = (ev: MouseEvent) => {
      const li = (ev.target as HTMLElement).closest('li');
      if (!li) return;

      const next = li.dataset.key as Views;
      if (next !== this.currentView) this.setCurrentView(next);
    };
  }

  private setActiveMenuItem(): void {
    this.viewSelector.querySelectorAll('li').forEach(li =>
      li.classList.toggle('active', li.dataset.key === this.currentView)
    );
  }

  public setCurrentView(view: Views): void {
    this.currentView = view;
    this.renderCurrentView();
  }

  public refresh(): void {
    this.renderCurrentView();
  }

  private renderCurrentView(): void {
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

  private renderSidebar(): void {
    this.sidePanel.innerHTML = `
      <h2>VocalLink</h2>
      <div class="qrcode-wrapper">
        <img src="${URL}/dashboard/qr" alt="Server QR Code">
        <div class="label">scan to join session</div>
        <div class="ip-address">${server.data.ip}</div> 
      </div>
    `;

    this.sidePanel.appendChild(this.viewSelector);

    this.sidePanel.insertAdjacentHTML('beforeend',
      `<i class="version">vocal-link-dashboard ${server.data.version}</i>`
    );
  }

  async init(): Promise<void> {
    try {
      const res = await fetch(URL + "/sessions");
      const metas: SessionMetadata[] = await res.json();

      for (const meta of metas) {
        this.dashboard.sessions.set(meta.id, new SessionCard(meta));
        sendPayload(Payloads.action(WSActions.GET_STATE, meta.id));
      }

      this.renderCurrentView();

      ws.onmessage = (ev: MessageEvent) =>
        wsHandler({
          dashboard: this.dashboard,
          payload: JSON.parse(ev.data),
          refresh: () => this.refresh(),
        });

      ws.onclose = () => {
        console.warn("WebSocket closed");
      };

    } catch (err) {
      console.error("Init failed:", err);
    }
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
}

const app = new VLApp();
await app.init();
