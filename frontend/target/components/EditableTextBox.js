export function MutableTextBox({ initial, onsave }) {
    const container = document.createElement('div');
    container.className = 'title-container';
    const renderView = () => {
        container.replaceChildren();
        const span = document.createElement('div');
        span.className = 'title clickable';
        span.innerText = params.initialName;
        span.onclick = (e) => {
            e.stopPropagation();
            renderEdit();
        };
        container.appendChild(span);
    };
    const renderEdit = () => {
        container.replaceChildren();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'title-input';
        input.value = params.initialName;
        const save = () => {
            const val = input.value.trim();
            if (val && val !== params.initialName) {
                params.onSave(val);
            }
            else {
                renderView();
            }
        };
        input.onkeydown = (e) => {
            if (e.key === 'Enter')
                save();
            if (e.key === 'Escape')
                renderView();
        };
        input.onblur = () => save();
        container.appendChild(input);
        input.focus();
        input.select();
    };
    renderView();
    return container;
}
