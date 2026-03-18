function circleButton({ classes: classes, onClick, radius = 45, visibility: visibility = 'visible', tooltip = null }) {
    const btn = document.createElement('div');
    btn.style.width = `${radius}px`;
    btn.style.height = `${radius}px`;
    btn.classList.add('btn-circle', 'highlight-on-cursor', ...classes);
    btn.onclick = (e) => onClick(e);
    btn.style.visibility = visibility;
    if (tooltip)
        btn.setAttribute("data-tooltip", tooltip);
    return btn;
}
export { circleButton };
