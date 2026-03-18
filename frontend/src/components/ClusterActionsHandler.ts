import { Payloads, WSActions, BROADCAST } from '../models/primitives.js'
import { SessionCard } from './SessionCard.js';
import { sendPayload } from '../network/ws.js';
import { button } from './button.js';

interface Props {
	sessions: Map<string, SessionCard>;
}

export class ClusterActionsHandler {
	public buttons = document.createElement('div');

	private sessions: Map<string, SessionCard>;
	private running: number = 0;
	private paused: number = 0;

	private startBtn = button({
		label: "Start",
		classes: [ 'accent' ],
		onClick: () => this.handleStart(),
		tooltip: "Start/Stop all recordings"
	});
	private pauseBtn = button({
		label: "Pause",
		onClick: () => sendPayload(Payloads.action(WSActions.PAUSE_ALL, BROADCAST)),
		tooltip: "Pause all devices"
	})
	private resumeBtn = button({
		label: "Resume",
		onClick: () => sendPayload(Payloads.action(WSActions.RESUME_ALL, BROADCAST)),
		tooltip: "Resume all devices"
	})
	private cancelBtn = button({
		label:"Cancel",
		onClick: () => 	sendPayload(Payloads.action(WSActions.CANCEL_ALL, BROADCAST)),
		tooltip: "Cancel all recordings"
	})

	constructor({ sessions }: Props) {
		this.sessions = sessions;
		this.buttons.classList.add('flex-right-center');
	}

	public render(): void {
		this.buttons.replaceChildren();
    if (this.sessions.size === 0)
      return;

	  this.running = 0;
	  this.paused = 0;

	  this.sessions.forEach(session => {
	    if (session.isRunning()) this.running++;
	    else if (session.isPaused()) this.paused++;
	  });

    if (this.hasWorkingSessions()) {
	    this.buttons.appendChild(this.cancelBtn);
    }

    // ---- pause/resume logic ----
    if (this.paused > 0) {
      if (this.paused === this.sessions.size) {
        this.buttons.appendChild(this.resumeBtn);
      } else {
        this.running && this.buttons.appendChild(this.pauseBtn);
        this.buttons.appendChild(this.resumeBtn);
      }
    } else {
      if (this.running > 0) {
        this.buttons.appendChild(this.pauseBtn);
      }
    }

    // ---- start/stop toggle ----
    if (this.hasWorkingSessions()) {
      this.startBtn.innerText = "Stop ";
      this.startBtn.classList.add("immutable");
    } else {
      this.startBtn.innerText = "Start ";
      this.startBtn.classList.remove("immutable");
    }
    this.buttons.appendChild(this.startBtn);
	}

  private handleStart(): void {
  	if (this.hasWorkingSessions()) {
  		sendPayload(Payloads.action(WSActions.STOP_ALL, BROADCAST));
  	} else {
  		sendPayload(Payloads.action(WSActions.START_ALL, BROADCAST));
  	}
  }

  private hasWorkingSessions(): boolean {
	  return this.running > 0 || this.paused > 0;
	}
}
