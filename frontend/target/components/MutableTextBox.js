export function MutableTextBox({ initial, onsave, classes = [] }) {
    const container = document.createElement('div');
    container.classList.add('mutable-container', ...classes);
    const renderView = (currentText) => {
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
    const renderEdit = (textToEdit) => {
        container.replaceChildren();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'mutable-input';
        input.value = textToEdit;
        const finish = (save) => {
            const val = input.value.trim();
            if (save && val && val !== initial) {
                onsave(val);
                renderView(val);
            }
            else {
                renderView(initial);
            }
        };
        input.onkeydown = (e) => {
            if (e.key === 'Enter')
                finish(true);
            if (e.key === 'Escape')
                finish(false);
        };
        input.onblur = () => finish(true);
        container.appendChild(input);
        input.focus();
        const dotIndex = textToEdit.lastIndexOf('.');
        const selectionEnd = dotIndex > 0 ? dotIndex : textToEdit.length;
        input.setSelectionRange(0, selectionEnd);
    };
    renderView(initial);
    return container;
}
