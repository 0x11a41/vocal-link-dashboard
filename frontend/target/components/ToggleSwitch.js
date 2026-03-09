export class ToggleSwitch {
    element = document.createElement('label');
    checkbox = document.createElement('input');
    bitmask;
    onclick;
    constructor({ bitmask, classes = [], initial = 0, onClick }) {
        this.bitmask = bitmask;
        this.element.className = ['switch', ...classes].join(' ');
        this.checkbox.type = 'checkbox';
        this.onclick = onClick;
        this.checkbox.checked = (initial & bitmask) !== 0;
        this.checkbox.addEventListener('change', () => {
            this.onclick?.(this.checkbox.checked);
        });
        const slider = document.createElement('span');
        slider.className = 'slider round';
        this.element.append(this.checkbox, slider);
    }
    get state() {
        return this.checkbox.checked ? this.bitmask : 0;
    }
    set(state = true) {
        this.checkbox.checked = state;
        this.onclick?.(state);
    }
}
