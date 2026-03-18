export function button({ label, classes = [], onClick, visibility = 'visible', tooltip = null }) {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.classList.add('highlight-on-cursor', ...classes);
    btn.onclick = (e) => onClick(e);
    btn.style.visibility = visibility;
    if (tooltip)
        btn.setAttribute("data-tooltip", tooltip);
    return btn;
}
