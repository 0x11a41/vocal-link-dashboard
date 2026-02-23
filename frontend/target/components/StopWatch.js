class StopWatch {
    element;
    intervalId = null;
    duration = 0;
    constructor() {
        this.element = document.createElement('p');
        this.element.classList.add('timer');
        this.element.innerText = '00:00';
    }
    start() {
        if (this.intervalId)
            return;
        this.intervalId = window.setInterval(() => {
            this.duration++;
            this.updateDisplay();
        }, 1000);
    }
    reset() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.duration = 0;
        this.element.innerText = "00:00";
    }
    setDuration(seconds) {
        this.duration = seconds;
        this.updateDisplay();
    }
    getDuration() {
        return this.duration;
    }
    pause() {
        if (!this.intervalId)
            return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
    resume() {
        if (this.intervalId)
            return;
        this.intervalId = window.setInterval(() => {
            this.duration++;
            this.updateDisplay();
        }, 1000);
    }
    updateDisplay() {
        const mins = Math.floor(this.duration / 60).toString().padStart(2, '0');
        const secs = (this.duration % 60).toString().padStart(2, '0');
        this.element.innerText = `${mins}:${secs}`;
    }
}
export { StopWatch };
