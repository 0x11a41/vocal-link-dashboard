import { URL } from "../models/constants.js";
export const ws = new WebSocket(`${URL.replace(/^http/, 'ws')}/ws/control`);
export function sendPayload(payload) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}
;
