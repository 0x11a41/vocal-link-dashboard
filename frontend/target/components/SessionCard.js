import { WSActions, Payloads, SessionStates } from "../primitives.js";
import { circleButton } from "./circleButton.js";
import { sendPayload } from "../ws.js";
import { StopWatch } from "./StopWatch.js";
const DROP_BUTTON_RADIUS = 26;
const PAUSE_BUTTON_RADIUS = 32;
const MIC_BUTTON_RADIUS = 44;
const CANCEL_BUTTON_RADIUS = PAUSE_BUTTON_RADIUS;
export class SessionCard {
    state = SessionStates.STOPPED;
    meta;
    card = document.createElement('div');
    statusRow = document.createElement('div');
    name = document.createElement('b');
    stopWatch = new StopWatch();
    micBtn = circleButton({
        classes: ["record-icon"],
        radius: MIC_BUTTON_RADIUS,
        onClick: () => {
            if (this.state === SessionStates.STOPPED)
                this.notify(WSActions.START);
            else
                this.notify(WSActions.STOP);
        }
    });
    pauseBtn = circleButton({
        classes: ['pause-icon-small'],
        radius: PAUSE_BUTTON_RADIUS,
        visibility: 'hidden',
        onClick: () => {
            if (this.state === SessionStates.RUNNING)
                this.notify(WSActions.PAUSE);
            else if (this.state === SessionStates.PAUSED)
                this.notify(WSActions.RESUME);
        }
    });
    cancelBtn = circleButton({
        classes: ['close-icon'],
        radius: CANCEL_BUTTON_RADIUS,
        visibility: 'hidden',
        onClick: () => this.notify(WSActions.CANCEL)
    });
    constructor(meta) {
        this.meta = meta;
        this.statusRow.classList.add('status-row');
        this.card.classList.add("session-card");
        this.name.classList.add("name");
        const closeBtn = circleButton({
            classes: ["close-btn"],
            radius: DROP_BUTTON_RADIUS,
            onClick: () => this.notify(WSActions.DROP)
        });
        const left = document.createElement('div');
        left.classList.add('left');
        const titleSection = document.createElement('div');
        titleSection.appendChild(this.name);
        titleSection.insertAdjacentHTML('beforeend', `<div class="device-name">${meta.device}</div>`);
        left.appendChild(titleSection);
        this.updateStatus();
        left.appendChild(this.statusRow);
        const right = document.createElement('div');
        right.classList.add('right');
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.classList.add('flex-right-center');
        buttonsWrapper.appendChild(this.cancelBtn);
        buttonsWrapper.appendChild(this.pauseBtn);
        buttonsWrapper.appendChild(this.micBtn);
        right.appendChild(this.stopWatch.element);
        right.appendChild(buttonsWrapper);
        this.card.appendChild(left);
        this.card.appendChild(right);
        this.card.appendChild(closeBtn);
        this.render();
    }
    notify(action) {
        sendPayload(Payloads.action(action, this.meta.id));
    }
    start() {
        if (this.isRunning())
            return;
        this.state = SessionStates.RUNNING;
        this.stopWatch.resume();
        this.render();
    }
    stop() {
        if (this.isStopped())
            return;
        this.state = SessionStates.STOPPED;
        this.stopWatch.reset();
        this.render();
    }
    pause() {
        if (!this.isRunning())
            return;
        this.state = SessionStates.PAUSED;
        this.stopWatch.pause();
        this.render();
    }
    resume() {
        if (!this.isPaused())
            return;
        this.state = SessionStates.RUNNING;
        this.stopWatch.resume();
        this.render();
    }
    setState(state, duration) {
        this.state = state;
        if (duration !== undefined)
            this.stopWatch.setDuration(duration);
        if (state === SessionStates.RUNNING)
            this.stopWatch.resume();
        else
            this.stopWatch.pause();
        if (state === SessionStates.STOPPED)
            this.stopWatch.reset();
        this.render();
    }
    syncMeta(newMeta) {
        this.meta.battery = newMeta.battery;
        this.meta.lastRTT = newMeta.lastRTT;
        this.meta.theta = newMeta.theta;
        this.meta.lastSync = newMeta.lastSync;
        this.meta.name = newMeta.name;
        this.updateStatus();
    }
    isPaused() { return this.state === SessionStates.PAUSED; }
    isRunning() { return this.state === SessionStates.RUNNING; }
    isStopped() { return this.state === SessionStates.STOPPED; }
    render() {
        switch (this.state) {
            case SessionStates.RUNNING:
                this.micBtn.classList.replace('record-icon', 'stop-icon');
                this.pauseBtn.classList.replace('play-icon-small', 'pause-icon-small');
                this.card.classList.add('border-recording');
                this.stopWatch.element.classList.remove("blink");
                this.showPauseBtn();
                this.showCancelBtn();
                break;
            case SessionStates.PAUSED:
                this.micBtn.classList.replace('record-icon', 'stop-icon');
                this.pauseBtn.classList.replace('pause-icon-small', 'play-icon-small');
                this.card.classList.remove('border-recording');
                this.stopWatch.element.classList.add("blink");
                this.showPauseBtn();
                this.showCancelBtn();
                break;
            case SessionStates.STOPPED:
                this.micBtn.classList.replace('stop-icon', 'record-icon');
                this.stopWatch.element.classList.remove("blink");
                this.card.classList.remove('border-recording');
                this.hidePauseBtn();
                this.hideCancelBtn();
                break;
        }
    }
    updateStatus() {
        this.statusRow.innerText = `🔋${this.meta.battery ? this.meta.battery : -1}%  📶${this.meta.lastRTT ? this.meta.lastRTT : -1}ms`;
        this.name.innerText = this.meta.name;
    }
    showPauseBtn() { this.pauseBtn.style.visibility = 'visible'; }
    hidePauseBtn() { this.pauseBtn.style.visibility = 'hidden'; }
    showCancelBtn() { this.cancelBtn.style.visibility = 'visible'; }
    hideCancelBtn() { this.cancelBtn.style.visibility = 'hidden'; }
}
