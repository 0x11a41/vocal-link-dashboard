import { SessionCard } from './SessionCard.js';
import { Payloads, WSActions, SessionStates } from '../primitives.js'
import { sendPayload } from '../websockets.js';
import { button } from './button.js';


export class TriggerAllBtn {
	private sessions: Map<string, SessionCard>;
	private running: number = 0;
	private paused: number = 0;
	public element: HTMLElement;

	constructor ({sessions}:{sessions: Map<string, SessionCard>}){
		this.sessions = sessions;
		this.element = button({
		  label:"Start All",
		  classes: ["accent"],
		  onClick: () => this.handleClick()
  	});
	}
	
	private handleClick() {
		if (this.running == 0) {
  		this.sessions.forEach((session) => {
  			if (session.state == SessionStates.STOPPED) {
  	      sendPayload(Payloads.action(WSActions.START, session.meta.id))
  			}
  		});
		} else {
  		this.sessions.forEach((session) => {
  			if (session.state == SessionStates.RUNNING) {
  	      sendPayload(Payloads.action(WSActions.STOP, session.meta.id));
  			}
  		});
		}
	}

	public updateRunning(step: number) {
		this.running += step;
		if (this.running > 0) {
			this.element.classList.replace("accent", "immutable");
			this.element.innerText = "Stop All";
		} else {
			this.element.classList.replace("immutable", "accent");
			this.element.innerText = "Start All";
		}
	}

	// TODO: make this class have four buttons button, pause all, resume all and stop all
	public updatePaused(step: number) {
		this.paused += step;
		if (this.paused > 0) {
			
		} else {
			
		}
	}
}
