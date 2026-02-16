import { VERSION, URL } from './env.js';
import { Views, SessionMetadata } from './types.js';
import { SessionCard } from './components/SessionCard.js';
import { SettingsView } from './views/settings.js';
import { RecordingsView } from './views/recordings.js';
import { server } from './serverInfo.js';
import { TriggerAllBtn } from './components/TriggerAllBtn.js';
import { DashboardView } from './views/dashboard.js';
import { ws } from './websockets.js';
import { msgHandler } from './msgHandler.js';


export class VLApp {
  public canvas = document.getElementById("app");
  public sidePanel = document.createElement('aside');
  public mainPanel: HTMLElement = document.createElement('main');

	public sessions = new Map<string, SessionCard>();
	public triggerAllBtn = new TriggerAllBtn({sessions: this.sessions});

  private currentView: Views = Views.DASHBOARD;
  public viewSelector: HTMLElement = document.createElement('menu');

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

  private setActiveMenuItem(state: Views = this.currentView): void {
    const options = this.viewSelector.querySelectorAll('li');
    options.forEach(option => {
      option.classList.toggle('active', option.dataset.key === state);
    });
  }

  public syncView(newView: Views) {
    this.currentView = newView;
    this.setActiveMenuItem();

    this.mainPanel.innerHTML = "";
    switch (newView) {
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

  private renderSidebar() {
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
    	<i class="version">vocal-link-dashboard ${VERSION}</i>
  	`);
    
    this.viewSelector.onmouseup = (ev: Event) => {
      const target = (ev.target as HTMLElement).closest('li');
      if (target) {
        const state = target.dataset.key as Views;
        if (state !== this.currentView) {
          this.syncView(state);
        }
      }
    };
    this.setActiveMenuItem();
  }

  async init(): Promise<void> {
    try {
      const sessionsResponse = await fetch(URL + "/sessions");
	    const metas: SessionMetadata[] = await sessionsResponse.json();
	    metas.forEach(meta => {
	        this.sessions.set(meta.id, new SessionCard(meta));
	    });

      this.renderSidebar(); 
      this.syncView(this.currentView);

      ws.onmessage = (ev: MessageEvent) => msgHandler(this, JSON.parse(ev.data));
      ws.onclose = () => {}

    } catch (err) {
      console.error("Init failed:", err);
    }
  }
}

const app = new VLApp();
await app.init();
