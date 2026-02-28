import { button } from "./button.js"

interface DialogProps {
  msg: string;
  choices: string[];
}

export function modalDialog({ msg, choices }: DialogProps): Promise<string> {
  return new Promise((resolve) => {

    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";

    const dialogWindow = document.createElement("div");
    dialogWindow.className = "dialog";

    const para = document.createElement("p");
    para.innerText = msg;

    const dialogButtons = document.createElement("div");
    dialogButtons.className = "flex-right-center";

    const close = (value: string) => {
      overlay.remove();
      resolve(value);
    };

    choices.forEach((choice) => {
      const btn = button({
        label: choice,
        onClick: () => close(choice)
      });
      dialogButtons.appendChild(btn);
    });

    dialogWindow.appendChild(para);
    dialogWindow.appendChild(dialogButtons);
    overlay.appendChild(dialogWindow);
    document.body.appendChild(overlay);
  });
}
