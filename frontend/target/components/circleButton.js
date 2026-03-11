function circleButton({ classes: classes, onClick, radius = 45, visibility: visibility = 'visible' }) {
    const micBtn = document.createElement('div');
    micBtn.style.width = `${radius}px`;
    micBtn.style.height = `${radius}px`;
    micBtn.classList.add('btn-circle', 'highlight-on-cursor', ...classes);
    micBtn.onclick = (e) => onClick(e);
    micBtn.style.visibility = visibility;
    return micBtn;
}
export { circleButton };
