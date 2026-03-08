interface checkboxProps {
  checked?: boolean;
  onCheck: (isChecked: boolean) => void;
}
 
export function checkbox({checked = false, onCheck}: checkboxProps) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.onchange = () => onCheck(input.checked); 
  return input;
}
