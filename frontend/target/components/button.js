function button({ label, classes = [], onClick, visibility = 'visible' }) {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.classList.add('highlight-on-cursor', ...classes);
    btn.onclick = () => onClick();
    btn.style.visibility = visibility;
    return btn;
}
export { button };
