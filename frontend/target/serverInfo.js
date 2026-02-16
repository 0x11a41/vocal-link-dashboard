import { URL } from "./env.js";
class ServerStateManager {
    data = {
        name: "Loading...",
        ip: "0.0.0.0",
        active_sessions: 0
    };
    constructor() {
        this.updateServerInfo();
        setInterval(() => this.updateServerInfo(), 30000);
    }
    async updateServerInfo() {
        try {
            const response = await fetch(`${URL}/dashboard`);
            if (!response.ok)
                throw new Error("Failed to fetch");
            this.data = await response.json();
            window.dispatchEvent(new CustomEvent('server-update', { detail: this.data }));
        }
        catch (err) {
            console.error("Dashboard sync error:", err);
            this.data.name = "Unknown (Offline)";
        }
    }
}
export const server = new ServerStateManager();
