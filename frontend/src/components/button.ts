interface ButtonProps {
  label: string;
  classes?: string[];
  onClick: (e: PointerEvent) => void;
  visibility?: 'hidden' | 'visible'
  tooltip?: string | null;
}

export function button({
  label,
  classes = [],
  onClick,
  visibility = 'visible',
  tooltip = null
}: ButtonProps): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.innerText = label;
  btn.classList.add('highlight-on-cursor', ...classes);
  btn.onclick = (e: PointerEvent) => onClick(e);
  btn.style.visibility = visibility;
  if (tooltip) btn.setAttribute("data-tooltip", tooltip);
  return btn;
}
