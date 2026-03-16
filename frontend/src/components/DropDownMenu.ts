interface DropDownProps {
  options: string[];
  active?: number;
  onchange: (index: number) => void;
}

export function DropDownMenu({ options, active = 0, onchange }: DropDownProps): HTMLElement {
  const select = document.createElement('select');
  select.className = 'conf-select';

  options.forEach((opt, index) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    
    if (index === active) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  select.onchange = () => {
    onchange(select.selectedIndex);
  };

  return select;
}
