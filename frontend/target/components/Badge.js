export var BadgeColors;
(function (BadgeColors) {
    BadgeColors[BadgeColors["GREEN"] = 0] = "GREEN";
    BadgeColors[BadgeColors["VIOLET"] = 1] = "VIOLET";
    BadgeColors[BadgeColors["BLUE"] = 2] = "BLUE";
    BadgeColors[BadgeColors["RED"] = 3] = "RED";
    BadgeColors[BadgeColors["AMBER"] = 4] = "AMBER";
})(BadgeColors || (BadgeColors = {}));
export function Badge({ label, color }) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.innerText = label;
    switch (color) {
        case BadgeColors.AMBER:
            badge.classList.add('badge-amber');
            break;
        case BadgeColors.VIOLET:
            badge.classList.add('badge-violet');
            break;
        case BadgeColors.BLUE:
            badge.classList.add('badge-blue');
            break;
        case BadgeColors.RED:
            badge.classList.add('badge-red');
            break;
        case BadgeColors.GREEN:
            badge.classList.add('badge-green');
            break;
    }
    return badge;
}
