interface Props {
  initial: string;
  onsave: (val: string) => void;
  classes?: string[];
}

export function MutableTextBox({ initial, onsave, classes = [] }: Props) {
  const container = document.createElement('div');
  container.classList.add('mutable-container', ...classes);

  const renderView = (currentText: string) => {
    container.replaceChildren();
    const textElement = document.createElement('span');
    textElement.className = 'mutable-text';
    textElement.innerText = currentText;

    textElement.onclick = (e) => {
      e.stopPropagation();
      renderEdit(currentText);
    };
    
    container.appendChild(textElement);
  };

  const renderEdit = (textToEdit: string) => {
    container.replaceChildren();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'mutable-input';
    input.value = textToEdit;

    const finish = (save: boolean) => {
      const val = input.value.trim();
      if (save && val && val !== initial) {
        onsave(val);
        renderView(val);
      } else {
        renderView(initial);
      }
    };

    input.onkeydown = (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    };

    input.onblur = () => finish(true);

    container.appendChild(input);
    input.focus();
    input.select();
  };

  renderView(initial);
  return container;
}
