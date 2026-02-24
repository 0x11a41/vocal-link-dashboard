import { SessionCard } from './SessionCard.js';
import { Payloads, WSActions } from '../primitives.js'
import { sendPayload } from '../ws.js';
import { button } from './button.js';

interface Props {
	sessions: Map<string, SessionCard>;
}

export class ClusterActionsHandler {
	public buttons = document.createElement('div');

	private sessions: Map<string, SessionCard>;
	private running: number = 0;
	private paused: number = 0;

	private startAllBtn = button({
		label: "Start all",
		classes: [ 'accent' ],
		onClick: () => this.handleStartAll()
	});
	private pauseAllBtn = button({
		label: "Pause all",
		onClick: () => this.handlePauseAll(),
	})
	private resumeAllBtn = button({
		label: "Resume all",
		onClick: () => this.handleResumeAll(),
	})
	private cancelAllBtn = button({
		label:"Cancel all",
		onClick: () => this.handleCancelAll(),
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

    // ---- pause/resume logic ----
    if (this.paused > 0) {
      if (this.paused === this.sessions.size) {
        this.buttons.appendChild(this.resumeAllBtn);
      } else {
        this.buttons.appendChild(this.pauseAllBtn);
        this.buttons.appendChild(this.resumeAllBtn);
      }
    } else {
      if (this.running > 0) {
        this.buttons.appendChild(this.pauseAllBtn);
      }
    }

    // ---- start/stop toggle ----
    if (this.hasWorkingSessions()) {
	    this.buttons.appendChild(this.cancelAllBtn);
      this.startAllBtn.innerText = "Stop all";
      this.startAllBtn.classList.add("immutable");
    } else {
      this.startAllBtn.innerText = "Start all";
      this.startAllBtn.classList.remove("immutable");
    }
    this.buttons.appendChild(this.startAllBtn);
	}

  private handleStartAll(): void {
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

  private handleResumeAll(): void {
  	this.sessions.forEach((session) => {
  		if (session.isPaused()) {
  			sendPayload(Payloads.action(WSActions.RESUME, session.meta.id));
  		}
  	});
  }

  private handlePauseAll(): void {
  	this.sessions.forEach((session) => {
  		if (session.isRunning()) {
  			sendPayload(Payloads.action(WSActions.PAUSE, session.meta.id));
  		}
  	});
  }

  private handleCancelAll(): void {
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
