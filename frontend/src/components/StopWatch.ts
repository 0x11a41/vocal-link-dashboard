class StopWatch {
  public element: HTMLElement;
  private intervalId: number | null = null;
  private secondsElapsed: number = 0;

  constructor() {
    this.element = document.createElement('p');
    this.element.classList.add('timer');
    this.element.innerText = '00:00';
  }

  public start(): void {
    if (this.intervalId) return; 
    this.intervalId = window.setInterval(() => {
      this.secondsElapsed++;
      this.updateDisplay();
    }, 1000);
  }

  public reset(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.secondsElapsed = 0;
    this.element.innerText = "00:00";
  }

  private updateDisplay(): void {
    const mins = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (this.secondsElapsed % 60).toString().padStart(2, '0');
    this.element.innerText = `${mins}:${secs}`;
  }
}

export { StopWatch }
