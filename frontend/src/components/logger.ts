class Logger {
  public element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = "logger";
  }

  private append(level: 'INFO' | 'WARN' | 'ERROR', msg: string) {
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

  public info(msg: string) {
    this.append('INFO', msg);
  }

  public warn(msg: string) {
    this.append('WARN', msg);
  }

  public error(msg: string) {
    this.append('ERROR', msg);
  }
}

export const log = new Logger();
