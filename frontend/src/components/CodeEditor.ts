import { button } from './button.js'

interface EditorProps {
  defaultval: string;
  onsave: (code: string) => void;
}

export function CodeEditor({ defaultval, onsave }: EditorProps): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-wrapper';

  const textarea = document.createElement('textarea');
  textarea.className = 'code-area';
  textarea.spellcheck = false;
  textarea.value = defaultval;

  textarea.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + 
                       "\t" + 
                       textarea.value.substring(end);

      textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
  };

  const btn = button({
    label: "Save code",
    classes: ['btn-small', 'accent'],
    onClick: () => { onsave(textarea.value) }
  });

  wrapper.append(btn, textarea);
  return wrapper;
}
