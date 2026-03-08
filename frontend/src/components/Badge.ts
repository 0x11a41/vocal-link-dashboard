export enum BadgeColors { GREEN, VIOLET, BLUE, RED, AMBER }

interface badgeProps {
  label: string;
  color: BadgeColors;
}

export function Badge({label, color}: badgeProps): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.innerText = label;
  switch (color) {
    case BadgeColors.AMBER: badge.classList.add('badge-amber'); break;
    case BadgeColors.VIOLET: badge.classList.add('badge-violet'); break;
    case BadgeColors.BLUE: badge.classList.add('badge-blue'); break;
    case BadgeColors.RED: badge.classList.add('badge-red'); break;
    case BadgeColors.GREEN: badge.classList.add('badge-green'); break;
  }
  return badge;
}
