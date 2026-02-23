interface ButtonProps {
  label: string;
  classes?: string[];
  onClick: () => void;
  visibility?: 'hidden' | 'visible'
}

function button({ label, classes = [], onClick, visibility = 'visible' }: ButtonProps): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.innerText = label;
  btn.classList.add('highlight-on-cursor', ...classes);
  btn.onclick = () => onClick();
  btn.style.visibility = visibility;
  return btn;
}

export { button };
