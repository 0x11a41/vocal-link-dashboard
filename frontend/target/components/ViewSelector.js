import { Views } from '../models/primitives.js';
import { Dashboard } from '../views/dashboard.js';
import { Conf } from "../views/conf.js";
import { Recordings } from "../views/recordings.js";
export class ViewSelector {
    currentView;
    menu = document.createElement('menu');
    mainPanel;
    constructor(mainPanel, view = Views.DASHBOARD) {
        this.mainPanel = mainPanel;
        this.currentView = view;
        this.menu.innerHTML = `
      <li data-key="${Views.DASHBOARD}">Dashboard</li>
      <li data-key="${Views.RECORDINGS}">Recordings</li>
      <li data-key="${Views.CONFIGURE}">Configure</li>
    `;
        this.bindNavigation();
    }
    bindNavigation() {
        this.menu.onclick = (ev) => {
            const li = ev.target.closest('li');
            if (!li)
                return;
            const next = li.dataset.key;
            if (next !== this.currentView)
                this.setCurrentView(next);
        };
    }
    setActiveMenuItem() {
        this.menu.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.key === this.currentView));
    }
    setCurrentView(view) {
        this.currentView = view;
        this.render();
    }
    render() {
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
