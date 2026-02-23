interface Props {
  classes: string[];
  onClick: () => void;
  radius?: number;
  visibility?: 'visible' | 'hidden';
}

function circleButton({ classes: classes, onClick, radius = 45, visibility: visibility = 'visible' }: Props): HTMLElement {
  const micBtn = document.createElement('div');
  micBtn.style.width = `${radius}px`;
  micBtn.style.height = `${radius}px`;
  micBtn.classList.add('btn-circle', 'highlight-on-cursor', ...classes);
  micBtn.onclick = onClick;
  micBtn.style.visibility = visibility;
  return micBtn;
}

export { circleButton }
