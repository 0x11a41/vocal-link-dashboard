import { SessionMetadata, WSActions, Payloads, SessionStates } from "../primitives.js";
import { circleButton } from "./circleButton.js";
import { sendPayload } from "../websockets.js";
import { StopWatch } from "./StopWatch.js";

// when user clicks start/stop button on a session, it notifies the session
// about it. The session to send an acknowledgement back to UI, and only then
// the visible changes are made using start() or stop() methods.
class SessionCard {
  public state: SessionStates = SessionStates.STOPPED;
  public meta: SessionMetadata;

  public card: HTMLElement;
  public micBtn: HTMLElement;
  private statusRow: HTMLElement;
  private stopWatch = new StopWatch();

  constructor(meta: SessionMetadata) {
    this.meta = meta;
    this.micBtn = circleButton({iconName:"record-icon",onClick:() => {
      if (this.state === SessionStates.STOPPED) {
        this.notify(WSActions.START);
      } else if (this.state === SessionStates.RUNNING) {
        this.notify(WSActions.STOP);
      }
    }});
    
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

  public notify(action: WSActions): void {
    sendPayload(Payloads.action(action, this.meta.id));
  }

  public start(): void {
    this.state = SessionStates.RUNNING;
    this.micBtn.classList.remove('record-icon');
    this.micBtn.classList.add('stop-icon');
    this.card.classList.add('border-recording');
    this.stopWatch.start();
  }

  public stop(): void {
    this.state = SessionStates.STOPPED;
    this.micBtn.classList.remove('stop-icon');
    this.micBtn.classList.add('record-icon');
    this.card.classList.remove('border-recording');
    this.stopWatch.reset();
  }

  public pause(): void {
    
  }

  public resume(): void {
    
  }

  public syncMeta(newMeta: SessionMetadata): void {
    this.meta.battery = newMeta.battery;
    this.meta.lastRTT = newMeta.lastRTT;
    this.meta.theta = newMeta.theta;
    this.meta.lastSync = newMeta.lastSync;

    this.statusRow.innerText = `🔋${this.meta.battery}%  📶${this.meta.lastRTT}ms`;
  }
}

export { SessionCard };
