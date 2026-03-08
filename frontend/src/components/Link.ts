interface LinkProps {
  label: string;
  onClick: () => void;
}

export function Link({label, onClick}: LinkProps): HTMLElement {
  const link = document.createElement('span');
  link.className = 'link';
  link.innerText = label;
  link.onclick = () => onClick();
  return link;
}
