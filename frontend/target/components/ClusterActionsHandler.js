import { Payloads, WSActions } from '../primitives.js';
import { sendPayload } from '../ws.js';
import { button } from './button.js';
export class ClusterActionsHandler {
    buttons = document.createElement('div');
    sessions;
    running = 0;
    paused = 0;
    startAllBtn = button({
        label: "Start all",
        classes: ['accent'],
        onClick: () => this.handleStartAll()
    });
    pauseAllBtn = button({
        label: "Pause all",
        onClick: () => this.handlePauseAll(),
    });
    resumeAllBtn = button({
        label: "Resume all",
        onClick: () => this.handleResumeAll(),
    });
    cancelAllBtn = button({
        label: "Cancel all",
        onClick: () => this.handleCancelAll(),
    });
    constructor({ sessions }) {
        this.sessions = sessions;
        this.buttons.classList.add('flex-right-center');
    }
    render() {
        this.buttons.replaceChildren();
        if (this.sessions.size === 0)
            return;
        this.running = 0;
        this.paused = 0;
        this.sessions.forEach(s => {
            if (s.isRunning())
                this.running++;
            else if (s.isPaused())
                this.paused++;
        });
        if (this.paused > 0) {
            if (this.paused === this.sessions.size) {
                this.buttons.appendChild(this.resumeAllBtn);
            }
            else {
                this.buttons.appendChild(this.pauseAllBtn);
                this.buttons.appendChild(this.resumeAllBtn);
            }
        }
        else {
            if (this.running > 0) {
                this.buttons.appendChild(this.pauseAllBtn);
            }
        }
        if (this.hasActiveSessions()) {
            this.buttons.appendChild(this.cancelAllBtn);
            this.startAllBtn.innerText = "Stop all";
            this.startAllBtn.classList.add("immutable");
        }
        else {
            this.startAllBtn.innerText = "Start all";
            this.startAllBtn.classList.remove("immutable");
        }
        this.buttons.appendChild(this.startAllBtn);
    }
    handleStartAll() {
        if (this.hasActiveSessions()) {
            this.sessions.forEach((session) => {
                sendPayload(Payloads.action(WSActions.STOP, session.meta.id));
            });
        }
        else {
            this.sessions.forEach((session) => {
                sendPayload(Payloads.action(WSActions.START, session.meta.id));
            });
        }
    }
    handleResumeAll() {
        this.sessions.forEach((session) => {
            if (session.isPaused()) {
                sendPayload(Payloads.action(WSActions.RESUME, session.meta.id));
            }
        });
    }
    handlePauseAll() {
        this.sessions.forEach((session) => {
            if (session.isRunning()) {
                sendPayload(Payloads.action(WSActions.PAUSE, session.meta.id));
            }
        });
    }
    handleCancelAll() {
        this.sessions.forEach((session) => {
            if (!session.isStopped()) {
                sendPayload(Payloads.action(WSActions.CANCEL, session.meta.id));
            }
        });
    }
    hasActiveSessions() {
        return this.running > 0 || this.paused > 0;
    }
}
