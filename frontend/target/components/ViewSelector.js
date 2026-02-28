import { Views } from '../models/primitives.js';
import { dashboard } from '../views/dashboard.js';
import { RecordingsView } from "../views/recordings.js";
import { SettingsView } from "../views/settings.js";
export class ViewSelector {
    currentView = Views.DASHBOARD;
    menu = document.createElement('menu');
    mainPanel;
    constructor(mainPanel) {
        this.mainPanel = mainPanel;
        this.menu.innerHTML = `
      <li data-key="${Views.DASHBOARD}">Dashboard</li>
      <li data-key="${Views.RECORDINGS}">Recordings</li>
      <li data-key="${Views.SETTINGS}">Settings</li>
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
                this.mainPanel.appendChild(dashboard.view);
                dashboard.render();
                break;
            case Views.RECORDINGS:
                this.mainPanel.appendChild(RecordingsView());
                break;
            case Views.SETTINGS:
                this.mainPanel.appendChild(SettingsView());
                break;
        }
    }
}
