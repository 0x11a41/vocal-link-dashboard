interface checkboxProps {
  checked?: boolean;
  onCheck: (isChecked: boolean) => void;
}
 
export function checkbox({checked = false, onCheck}: checkboxProps): HTMLInputElement {
  const chkbox = document.createElement('input');
  chkbox.type = 'checkbox';
  chkbox.checked = checked;
  chkbox.onchange = () => onCheck(chkbox.checked); 
  chkbox.onclick = (e) => {e.stopPropagation()};
  chkbox.setAttribute("data-tooltip", "Select | Deselect");
  return chkbox;
}
