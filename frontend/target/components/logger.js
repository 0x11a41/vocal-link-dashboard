class Logger {
    element;
    constructor() {
        this.element = document.createElement('div');
        this.element.className = "logger";
    }
    append(level, msg) {
        const logLine = document.createElement('div');
        logLine.className = "log-line";
        const levelSpan = document.createElement('span');
        levelSpan.className = `level-${level.toLowerCase()}`;
        levelSpan.textContent = `[${level.charAt(0)}] `;
        const messageSpan = document.createElement('span');
        messageSpan.className = 'message';
        messageSpan.textContent = msg;
        logLine.appendChild(levelSpan);
        logLine.appendChild(messageSpan);
        this.element.appendChild(logLine);
        this.element.scrollTop = this.element.scrollHeight;
    }
    info(msg) {
        this.append('INFO', msg);
    }
    warn(msg) {
        this.append('WARN', msg);
    }
    error(msg) {
        this.append('ERROR', msg);
    }
}
export const log = new Logger();
