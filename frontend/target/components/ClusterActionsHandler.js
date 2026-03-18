import { Payloads, WSActions, BROADCAST } from '../models/primitives.js';
import { sendPayload } from '../network/ws.js';
import { button } from './button.js';
export class ClusterActionsHandler {
    buttons = document.createElement('div');
    sessions;
    running = 0;
    paused = 0;
    startBtn = button({
        label: "Start",
        classes: ['accent'],
        onClick: () => this.handleStart(),
        tooltip: "Start/Stop all recordings"
    });
    pauseBtn = button({
        label: "Pause",
        onClick: () => sendPayload(Payloads.action(WSActions.PAUSE_ALL, BROADCAST)),
        tooltip: "Pause all devices"
    });
    resumeBtn = button({
        label: "Resume",
        onClick: () => sendPayload(Payloads.action(WSActions.RESUME_ALL, BROADCAST)),
        tooltip: "Resume all devices"
    });
    cancelBtn = button({
        label: "Cancel",
        onClick: () => sendPayload(Payloads.action(WSActions.CANCEL_ALL, BROADCAST)),
        tooltip: "Cancel all recordings"
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
        if (this.hasWorkingSessions()) {
            this.buttons.appendChild(this.cancelBtn);
        }
        if (this.paused > 0) {
            if (this.paused === this.sessions.size) {
                this.buttons.appendChild(this.resumeBtn);
            }
            else {
                this.running && this.buttons.appendChild(this.pauseBtn);
                this.buttons.appendChild(this.resumeBtn);
            }
        }
        else {
            if (this.running > 0) {
                this.buttons.appendChild(this.pauseBtn);
            }
        }
        if (this.hasWorkingSessions()) {
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
            sendPayload(Payloads.action(WSActions.STOP_ALL, BROADCAST));
        }
        else {
            sendPayload(Payloads.action(WSActions.START_ALL, BROADCAST));
        }
    }
    hasWorkingSessions() {
        return this.running > 0 || this.paused > 0;
    }
}
