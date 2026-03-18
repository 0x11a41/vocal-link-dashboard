import { URL } from "../models/constants.js";
import { WSPayload } from "../models/primitives.js";


export const ws = new WebSocket(`${URL.replace(/^http/, 'ws')}/ws/control`);

export function sendPayload(payload: WSPayload):void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
};
