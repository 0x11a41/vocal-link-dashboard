interface Props {
  classes: string[];
  onClick: (e: PointerEvent) => void;
  radius?: number;
  visibility?: 'visible' | 'hidden';
  tooltip?: string | null;
}

function circleButton({
  classes: classes,
  onClick, radius = 45,
  visibility: visibility = 'visible',
  tooltip = null
}: Props): HTMLElement {
  const btn = document.createElement('div');
  btn.style.width = `${radius}px`;
  btn.style.height = `${radius}px`;
  btn.classList.add('btn-circle', 'highlight-on-cursor', ...classes);
  btn.onclick = (e: PointerEvent) => onClick(e);
  btn.style.visibility = visibility;
  if (tooltip) btn.setAttribute("data-tooltip", tooltip);
  return btn;
}

export { circleButton }
