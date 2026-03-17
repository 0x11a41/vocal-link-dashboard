import { URL } from "../models/constants.js";
class ServerStateManager {
    _info = null;
    get info() {
        return this._info;
    }
    get conf() {
        return this._info?.conf ?? null;
    }
    constructor() {
        this.refresh();
    }
    async refresh() {
        try {
            const res = await fetch(`${URL}/dashboard`);
            if (!res.ok)
                throw new Error("Failed to fetch dashboard");
            const data = (await res.json());
            this._info = data;
            const hexColor = this._info.conf.accentColors[this._info.conf.accentActive];
            document.documentElement.style.setProperty('--accent', hexColor);
        }
        catch (err) {
            console.error("Dashboard sync error:", err);
        }
    }
    async updateConf(patch) {
        if (!this._info)
            return;
        const nextConf = {
            ...this._info.conf,
            ...patch,
        };
        try {
            const res = await fetch(`${URL}/dashboard`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nextConf),
            });
            if (!res.ok)
                throw new Error("Failed to update config");
            this._info.conf = nextConf;
        }
        catch (err) {
            console.error("Config update error:", err);
        }
    }
    async reset() {
        try {
            const res = await fetch(`${URL}/dashboard`, { method: "DELETE", });
            if (!res.ok)
                throw new Error("Failed to reset config");
            const data = (await res.json());
            this._info = data;
        }
        catch (err) {
            console.error("Config reset error:", err);
        }
    }
}
export const server = new ServerStateManager();
