import { URL } from "../models/constants.js";
import { Payloads, WSEvents, WSPayload } from "../models/primitives.js";


export const ws = new WebSocket(`${URL.replace(/^http/, 'ws')}/ws/control`);
ws.onopen = () => ws.send(JSON.stringify(Payloads.event(WSEvents.DASHBOARD_INIT)));


export function sendPayload(payload: WSPayload):void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
};
