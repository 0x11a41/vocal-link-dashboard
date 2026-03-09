export function Link({ label, onClick }) {
    const link = document.createElement('span');
    link.className = 'link';
    link.innerText = label;
    link.onclick = () => onClick();
    return link;
}
