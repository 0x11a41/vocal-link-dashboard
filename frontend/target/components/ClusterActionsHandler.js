import { Payloads, WSActions } from '../primitives.js';
import { sendPayload } from '../ws.js';
import { button } from './button.js';
export class ClusterActionsHandler {
    buttons = document.createElement('div');
    sessions;
    running = 0;
    paused = 0;
    startBtn = button({
        label: "Start",
        classes: ['accent'],
        onClick: () => this.handleStart()
    });
    pauseBtn = button({
        label: "Pause",
        onClick: () => this.handlePause(),
    });
    resumeBtn = button({
        label: "Resume",
        onClick: () => this.handleResume(),
    });
    cancelBtn = button({
        label: "Cancel",
        onClick: () => this.handleCancel(),
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
        this.sessions.forEach(session => {
            if (session.isRunning())
                this.running++;
            else if (session.isPaused())
                this.paused++;
        });
        if (this.paused > 0) {
            if (this.paused === this.sessions.size) {
                this.buttons.appendChild(this.resumeBtn);
            }
            else {
                this.buttons.appendChild(this.pauseBtn);
                this.buttons.appendChild(this.resumeBtn);
            }
        }
        else {
            if (this.running > 0) {
                this.buttons.appendChild(this.pauseBtn);
            }
        }
        if (this.hasWorkingSessions()) {
            this.buttons.appendChild(this.cancelBtn);
            this.startBtn.innerText = "Stop ";
            this.startBtn.classList.add("immutable");
        }
        else {
            this.startBtn.innerText = "Start ";
            this.startBtn.classList.remove("immutable");
        }
        this.buttons.appendChild(this.startBtn);
    }
    handleStart() {
        if (this.hasWorkingSessions()) {
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
    handleResume() {
        this.sessions.forEach((session) => {
            if (session.isPaused()) {
                sendPayload(Payloads.action(WSActions.RESUME, session.meta.id));
            }
        });
    }
    handlePause() {
        this.sessions.forEach((session) => {
            if (session.isRunning()) {
                sendPayload(Payloads.action(WSActions.PAUSE, session.meta.id));
            }
        });
    }
    handleCancel() {
        this.sessions.forEach((session) => {
            if (!session.isStopped()) {
                sendPayload(Payloads.action(WSActions.CANCEL, session.meta.id));
            }
        });
    }
    hasWorkingSessions() {
        return this.running > 0 || this.paused > 0;
    }
}
