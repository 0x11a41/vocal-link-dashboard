import { URL } from "../models/constants.js";
import { encode, decode } from "../utils/cypher.js";
class ServerStateManager {
    _info = null;
    key = null;
    get info() {
        return this._info;
    }
    get conf() {
        return this._info?.conf ?? null;
    }
    assignKey(key) {
        this.key = key;
    }
    async setup() {
        if (!this.key) {
            throw new Error("Key not assigned");
        }
        const res = await fetch(`${URL}/dashboard`);
        if (!res.ok)
            throw new Error("Failed to fetch dashboard");
        const raw = await res.text();
        const data = JSON.parse(decode(raw, this.key));
        this._info = data;
        const hexColor = this._info.conf.accentColors[this._info.conf.accentActive];
        document.documentElement.style.setProperty('--accent', hexColor);
    }
    async updateConf(patch) {
        if (!this.info)
            return;
        const key = this.key;
        if (!key)
            throw new Error("Key not assigned");
        const nextConf = {
            ...this.info.conf,
            ...patch,
        };
        const encrypted = encode(JSON.stringify(nextConf), key);
        try {
            const res = await fetch(`${URL}/dashboard`, {
                method: "PUT",
                headers: { "Content-Type": "text/plain" },
                body: encrypted,
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : null;
            if (!res.ok || data?.status !== "ok") {
                throw new Error("Failed to update config");
            }
            this.info.conf = nextConf;
        }
        catch (err) {
            console.error("Config update error:", err);
        }
    }
    async reset() {
        if (!this.key) {
            throw new Error("Key not assigned");
        }
        try {
            const res = await fetch(`${URL}/dashboard`, { method: "DELETE" });
            if (!res.ok)
                throw new Error("Failed to reset config");
            const raw = await res.text();
            if (!raw)
                return;
            const data = JSON.parse(decode(raw, this.key));
            this._info = data;
        }
        catch (err) {
            console.error("Config reset error:", err);
        }
    }
}
export const server = new ServerStateManager();
