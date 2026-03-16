import { URL } from "../models/constants.js";
import { ServerInfo, ServerConf } from "../models/primitives.js";


class ServerStateManager {
  private _info: ServerInfo | null = null;

  get info(): ServerInfo | null {
    return this._info;
  }

  get conf(): ServerConf | null {
    return this._info?.conf ?? null;
  }

  constructor() {
    this.refresh();
  }

  public async refresh(): Promise<void> {
    try {
      const res = await fetch(`${URL}/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");

      const data = (await res.json()) as ServerInfo;

      this._info = data;
      const hexColor = this._info.conf.accentColors[this._info.conf.accentActive];
      document.documentElement.style.setProperty('--accent', hexColor);
    } catch (err) {
      console.error("Dashboard sync error:", err);
    }
  }


  async updateConf(patch: Partial<ServerConf>): Promise<void> {
    if (!this._info) return;

    const nextConf: ServerConf = {
      ...this._info.conf,
      ...patch,
    };

    try {
      const res = await fetch(`${URL}/dashboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConf),
      });

      if (!res.ok) throw new Error("Failed to update config");

      this._info.conf = nextConf;
    } catch (err) {
      console.error("Config update error:", err);
    }
  }
}

export const server = new ServerStateManager();
