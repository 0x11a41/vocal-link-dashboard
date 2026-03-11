interface LinkProps {
  label: string;
  onClick: (e: PointerEvent) => void;
}

export function Link({label, onClick }: LinkProps): HTMLElement {
  const link = document.createElement('span');
  link.className = 'link';
  link.innerText = label;
  link.onclick = (e: PointerEvent) => onClick(e);
  return link;
}
