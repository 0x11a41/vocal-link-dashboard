import { button } from "./button.js";
export function modalDialog({ msg, opts }) {
    if (document.querySelector(".dialog-overlay")) {
        return;
    }
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    const dialogWindow = document.createElement("div");
    dialogWindow.className = "dialog";
    const para = document.createElement("p");
    para.innerText = msg;
    const dialogButtons = document.createElement("div");
    dialogButtons.className = "flex-right-center";
    const close = () => overlay.remove();
    opts.forEach((opt) => {
        const btn = button({
            label: opt.label,
            onClick: () => {
                if (opt.handler)
                    opt.handler();
                close();
            }
        });
        dialogButtons.appendChild(btn);
    });
    const handleEsc = (e) => {
        if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", handleEsc);
        }
    };
    document.addEventListener("keydown", handleEsc);
    dialogWindow.append(para, dialogButtons);
    overlay.appendChild(dialogWindow);
    document.body.appendChild(overlay);
}
