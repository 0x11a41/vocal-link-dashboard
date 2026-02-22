import { WSActions, Payloads, SessionStates } from "../primitives.js";
import { circleButton } from "./circleButton.js";
import { sendPayload } from "../websockets.js";
import { StopWatch } from "./StopWatch.js";
class SessionCard {
    state = SessionStates.STOPPED;
    meta;
    card;
    micBtn;
    statusRow;
    stopWatch = new StopWatch();
    constructor(meta) {
        this.meta = meta;
        this.micBtn = circleButton({ iconName: "record-icon", onClick: () => {
                if (this.state === SessionStates.STOPPED) {
                    this.notify(WSActions.START);
                }
                else if (this.state === SessionStates.RUNNING) {
                    this.notify(WSActions.STOP);
                }
            } });
        this.card = document.createElement('div');
        this.card.classList.add("session-card");
        const left = document.createElement('div');
        left.classList.add('left');
        left.innerHTML = `
        <div>
            <b>${meta.name}</b>
            <div class="device-name">${meta.device}</div>
        </div>
        `;
        this.statusRow = document.createElement('div');
        this.statusRow.classList.add('status-row');
        this.statusRow.innerText = `🔋${meta.battery}%  📶${meta.lastRTT}ms`;
        left.appendChild(this.statusRow);
        const right = document.createElement('div');
        right.classList.add('right');
        right.appendChild(this.stopWatch.element);
        right.appendChild(this.micBtn);
        this.card.appendChild(left);
        this.card.appendChild(right);
    }
    notify(action) {
        sendPayload(Payloads.action(action, this.meta.id));
    }
    start() {
        this.state = SessionStates.RUNNING;
        this.micBtn.classList.remove('record-icon');
        this.micBtn.classList.add('stop-icon');
        this.card.classList.add('border-recording');
        this.stopWatch.start();
    }
    stop() {
        this.state = SessionStates.STOPPED;
        this.micBtn.classList.remove('stop-icon');
        this.micBtn.classList.add('record-icon');
        this.card.classList.remove('border-recording');
        this.stopWatch.reset();
    }
    syncMeta(newMeta) {
        this.meta.battery = newMeta.battery;
        this.meta.lastRTT = newMeta.lastRTT;
        this.meta.theta = newMeta.theta;
        this.meta.lastSync = newMeta.lastSync;
        this.statusRow.innerText = `🔋${this.meta.battery}%  📶${this.meta.lastRTT}ms`;
    }
}
export { SessionCard };
