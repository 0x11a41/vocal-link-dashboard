export function checkbox({ checked = false, onCheck }) {
    const chkbox = document.createElement('input');
    chkbox.type = 'checkbox';
    chkbox.checked = checked;
    chkbox.onchange = () => onCheck(chkbox.checked);
    chkbox.onclick = (e) => { e.stopPropagation(); };
    return chkbox;
}
