class StopWatch {
    element;
    intervalId = null;
    secondsElapsed = 0;
    constructor() {
        this.element = document.createElement('p');
        this.element.classList.add('timer');
        this.element.innerText = '00:00';
    }
    start() {
        if (this.intervalId)
            return;
        this.intervalId = window.setInterval(() => {
            this.secondsElapsed++;
            this.updateDisplay();
        }, 1000);
    }
    reset() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.secondsElapsed = 0;
        this.element.innerText = "00:00";
    }
    updateDisplay() {
        const mins = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (this.secondsElapsed % 60).toString().padStart(2, '0');
        this.element.innerText = `${mins}:${secs}`;
    }
}
export { StopWatch };
