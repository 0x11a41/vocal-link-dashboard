import { Payloads, WSActions, SessionStates } from '../primitives.js';
import { sendPayload } from '../websockets.js';
import { button } from './button.js';
export class TriggerAllBtn {
    sessions;
    running = 0;
    paused = 0;
    element;
    constructor({ sessions }) {
        this.sessions = sessions;
        this.element = button({
            label: "Start All",
            classes: ["accent"],
            onClick: () => this.handleClick()
        });
    }
    handleClick() {
        if (this.running == 0) {
            this.sessions.forEach((session) => {
                if (session.state == SessionStates.STOPPED) {
                    sendPayload(Payloads.action(WSActions.START, session.meta.id));
                }
            });
        }
        else {
            this.sessions.forEach((session) => {
                if (session.state == SessionStates.RUNNING) {
                    sendPayload(Payloads.action(WSActions.STOP, session.meta.id));
                }
            });
        }
    }
    updateRunning(step) {
        this.running += step;
        if (this.running > 0) {
            this.element.classList.replace("accent", "immutable");
            this.element.innerText = "Stop All";
        }
        else {
            this.element.classList.replace("immutable", "accent");
            this.element.innerText = "Start All";
        }
    }
    updatePaused(step) {
        this.paused += step;
        if (this.paused > 0) {
        }
        else {
        }
    }
}
