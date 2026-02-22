import { SessionCard, SessionState } from './SessionCard.js';
import { Payloads, WSActions } from '../primitives.js'
import { sendPayload } from '../websockets.js';
import { button } from './button.js';


export class TriggerAllBtn {
	private sessions: Map<string, SessionCard>;
	private activeRecordings: number = 0;
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
		if (this.activeRecordings == 0) {
  		this.sessions.forEach((session) => {
  			if (session.state == SessionState.IDLE) {
  	      sendPayload(Payloads.action(WSActions.START, session.meta.id))
  			}
  		});
		} else {
  		this.sessions.forEach((session) => {
  			if (session.state == SessionState.RECORDING) {
  	      sendPayload(Payloads.action(WSActions.STOP, session.meta.id));
  			}
  		});
		}
	}

	public update(step: number) {
		this.activeRecordings += step;
		if (this.activeRecordings > 0) {
			this.element.classList.replace("accent", "immutable");
			this.element.innerText = "Stop All";
		} else {
			this.element.classList.replace("immutable", "accent");
			this.element.innerText = "Start All";
		}
	}
}
