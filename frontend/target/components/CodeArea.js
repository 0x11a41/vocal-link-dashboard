import { button } from './button.js';
export function CodeEditor({ defaultval: defaultval, onsave }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    const textarea = document.createElement('textarea');
    textarea.className = 'code-area';
    textarea.spellcheck = false;
    textarea.value = defaultval;
    const btn = button({
        label: "Save code",
        classes: ['btn-small', 'accent'],
        onClick: () => { onsave(textarea.value); }
    });
    wrapper.append(textarea, btn);
    return wrapper;
}
