interface ColorPickerProps {
  colors: string[];
  active: number;
  onselect: (activate: number) => void;
}

export function ColorPicker({ colors, active, onselect }: ColorPickerProps): HTMLElement {
  const colorPicker = document.createElement('div');
  colorPicker.className = 'color-picker';

  let activeColor: HTMLElement | null = null;

  colors.forEach((color, i) => {
    const choice = document.createElement('div');
    choice.className = 'color';
    choice.style.backgroundColor = color;

    if (i === active) {
      choice.classList.add('active');
      activeColor = choice;
    }

    choice.onclick = () => {
      activeColor?.classList.remove('active');
      
      choice.classList.add('active');
      activeColor = choice;

      onselect(i);
    };

    colorPicker.appendChild(choice);
  });

  return colorPicker;
}
