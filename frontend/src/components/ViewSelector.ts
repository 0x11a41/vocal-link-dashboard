import { Views } from '../models/primitives.js';
import { Dashboard } from '../views/dashboard.js';
import { Conf } from "../views/conf.js"
import { Recordings } from "../views/recordings.js"


export class ViewSelector {
  private currentView: Views;
  public menu = document.createElement('menu');
  private mainPanel: HTMLElement;
  
  constructor(mainPanel: HTMLElement, view: Views = Views.DASHBOARD) {
    this.mainPanel = mainPanel;
    this.currentView = view;
    this.menu.innerHTML = `
      <li data-key="${Views.DASHBOARD}">Dashboard</li>
      <li data-key="${Views.RECORDINGS}">Recordings</li>
      <li data-key="${Views.CONFIGURE}">Configure</li>
    `;
    this.bindNavigation();
  }

  private bindNavigation(): void {
    this.menu.onclick = (ev: MouseEvent) => {
      const li = (ev.target as HTMLElement).closest('li');
      if (!li) return;

      const next = li.dataset.key as Views;
      if (next !== this.currentView) this.setCurrentView(next);
    };
  }

  private setActiveMenuItem(): void {
    this.menu.querySelectorAll('li').forEach(li =>
      li.classList.toggle('active', li.dataset.key === this.currentView)
    );
  }

  private setCurrentView(view: Views): void {
    this.currentView = view;
    this.render();
  }

  public render(): void {
    this.setActiveMenuItem();
    this.mainPanel.replaceChildren();

    switch (this.currentView) {
      case Views.DASHBOARD:
        Dashboard.render();
        this.mainPanel.appendChild(Dashboard.view);
        break;

      case Views.RECORDINGS:
        Recordings.render();
        this.mainPanel.appendChild(Recordings.view);
        break;

      case Views.CONFIGURE:
        Conf.render();
        this.mainPanel.appendChild(Conf.view);
        break;
    }
  }
}


