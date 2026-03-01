import { Payloads, WSActions } from '../models/primitives.js'
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
		onClick: () => this.handleStart()
	});
	private pauseBtn = button({
		label: "Pause",
		onClick: () => this.handlePause(),
	})
	private resumeBtn = button({
		label: "Resume",
		onClick: () => this.handleResume(),
	})
	private cancelBtn = button({
		label:"Cancel",
		onClick: () => this.handleCancel(),
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
	  	this.sessions.forEach((session) => {
	  		sendPayload(Payloads.action(WSActions.STOP, session.meta.id));
	  	});
  	} else {
	  	this.sessions.forEach((session) => {
	  		sendPayload(Payloads.action(WSActions.START, session.meta.id));
	  	});
  	}
  }

  private handleResume(): void {
  	this.sessions.forEach((session) => {
  		if (session.isPaused()) {
  			sendPayload(Payloads.action(WSActions.RESUME, session.meta.id));
  		}
  	});
  }

  private handlePause(): void {
  	this.sessions.forEach((session) => {
  		if (session.isRunning()) {
  			sendPayload(Payloads.action(WSActions.PAUSE, session.meta.id));
  		}
  	});
  }

  private handleCancel(): void {
  	this.sessions.forEach((session) => {
  		if (!session.isStopped()) {
  			sendPayload(Payloads.action(WSActions.CANCEL, session.meta.id));
  		}
  	});
  }

  private hasWorkingSessions(): boolean {
	  return this.running > 0 || this.paused > 0;
	}
}
