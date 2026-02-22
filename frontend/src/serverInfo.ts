import { URL } from "./env.js";

export interface ServerInfo {
    name: string;
    ip: string;
    version: string;
    active_sessions: number;
}

class ServerStateManager {
  public data: ServerInfo = {
      name: "Loading...",
      ip: "0.0.0.0",
      version: "v0.0",
      active_sessions: 0
  };

  constructor() {
      this.updateServerInfo();
      setInterval(() => this.updateServerInfo(), 30000);
  }

  public async updateServerInfo() {
    try {
      const response = await fetch(`${URL}/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch");
      this.data = await response.json();
      window.dispatchEvent(new CustomEvent('server-update', { detail: this.data }));
    } catch (err) {
      console.error("Dashboard sync error:", err);
      this.data.name = "Unknown (Offline)";
    }
  }
}

export const server = new ServerStateManager();
