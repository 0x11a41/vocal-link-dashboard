import { SessionMetadata, WSActions, Payloads, SessionStates } from "../primitives.js";
import { circleButton } from "./circleButton.js";
import { sendPayload } from "../websockets.js";
import { StopWatch } from "./StopWatch.js";


const DROP_BUTTON_RADIUS = 26;
const PAUSE_BUTTON_RADIUS = 32;
const MIC_BUTTON_RADIUS = 48;
const CANCEL_BUTTON_RADIUS = PAUSE_BUTTON_RADIUS;


export class SessionCard {
  public state: SessionStates = SessionStates.STOPPED;
  public meta: SessionMetadata;

  public card: HTMLElement = document.createElement('div');
  private statusRow: HTMLElement = document.createElement('div');
  private name: HTMLElement = document.createElement('b');
  private stopWatch = new StopWatch();

  private micBtn = circleButton({
    classes: ["record-icon"],
    radius: MIC_BUTTON_RADIUS,
    onClick: () => {
      if (this.state === SessionStates.STOPPED)
        this.notify(WSActions.START);
      else
        this.notify(WSActions.STOP);
    }
  });

  private pauseBtn = circleButton({
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

  private cancelBtn = circleButton({
    classes: ['close-icon'],
    radius: CANCEL_BUTTON_RADIUS,
    visibility: 'hidden',
    onClick: () => this.notify(WSActions.CANCEL)
  });

  constructor(meta: SessionMetadata) {
    this.meta = meta;
    this.statusRow.classList.add('status-row');
    this.card.classList.add("session-card");

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
    this.renderState();
  }

  public notify(action: WSActions): void {
    sendPayload(Payloads.action(action, this.meta.id));
  }

  public start(): number {
    if (this.isRunning()) return 0;
    this.state = SessionStates.RUNNING;
    this.stopWatch.resume();
    this.renderState();
    return 1;
  }

  public stop(): number {
    if (this.isStopped()) return 0;
    this.state = SessionStates.STOPPED;
    this.stopWatch.reset();
    this.renderState();
    return -1;
  }

  public pause(): number {
    if (!this.isRunning()) return 0;
    this.state = SessionStates.PAUSED;
    this.stopWatch.pause();
    this.renderState();
    return 1;
  }

  public resume(): number {
    if (!this.isPaused()) return 0;
    this.state = SessionStates.RUNNING;
    this.stopWatch.resume();
    this.renderState();
    return -1;
  }

  public setState(state: SessionStates, duration?: number): void {
    this.state = state;
    if (duration !== undefined)
      this.stopWatch.setDuration(duration);

    if (state === SessionStates.RUNNING)
      this.stopWatch.resume();
    else
      this.stopWatch.pause();
    if (state === SessionStates.STOPPED)
      this.stopWatch.reset();
    this.renderState();
  }

  public syncMeta(newMeta: SessionMetadata): void {
    this.meta.battery = newMeta.battery;
    this.meta.lastRTT = newMeta.lastRTT;
    this.meta.theta = newMeta.theta;
    this.meta.lastSync = newMeta.lastSync;
    this.meta.name = newMeta.name;
    this.updateStatus();
  }

  public isPaused(): boolean { return this.state === SessionStates.PAUSED; }
  public isRunning(): boolean { return this.state === SessionStates.RUNNING; }
  public isStopped(): boolean { return this.state === SessionStates.STOPPED; }

  private renderState(): void {
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

  private updateStatus(): void {
    this.statusRow.innerText = `🔋${this.meta.battery}%  📶${this.meta.lastRTT}ms`;
    this.name.innerText = this.meta.name;
  }
  private showPauseBtn(): void { this.pauseBtn.style.visibility = 'visible'; }
  private hidePauseBtn(): void { this.pauseBtn.style.visibility = 'hidden'; }
  private showCancelBtn(): void { this.cancelBtn.style.visibility = 'visible'; }
  private hideCancelBtn(): void { this.cancelBtn.style.visibility = 'hidden'; }
}
