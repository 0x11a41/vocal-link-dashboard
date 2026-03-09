interface SwitchProps {
  bitmask: number;
  classes?: string[]; // small or not
  initial?: number;
  onClick?: (isChecked: boolean) => void;
}

export class ToggleSwitch {
  public element = document.createElement('label');
  private checkbox = document.createElement('input');
  private bitmask: number;
  private onclick?: (isChecked: boolean) => void;

  constructor({ bitmask, classes=[], initial=0, onClick }: SwitchProps) {
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

  get state(): number {
    return this.checkbox.checked ? this.bitmask : 0;
  }

  public set(state: boolean = true): void {
    this.checkbox.checked = state;
    this.onclick?.(state);
  }
}
