export class TooltipManager {
    tooltip;
    hoverTimer = null;
    lastX = 0;
    lastY = 0;
    delay = 900;
    moveThreshold = 2;
    constructor() {
        this.tooltip = document.createElement("div");
        this.tooltip.className = "tooltip";
        document.body.appendChild(this.tooltip);
        this.bindEvents();
    }
    bindEvents() {
        document.addEventListener("mouseover", this.handleMouseOver);
        document.addEventListener("scroll", this.hideTooltip);
        document.addEventListener("mousedown", this.hideTooltip);
    }
    handleMouseOver = (e) => {
        e.stopPropagation();
        const { clientX, clientY } = e;
        if (Math.abs(clientX - this.lastX) > this.moveThreshold ||
            Math.abs(clientY - this.lastY) > this.moveThreshold) {
            this.lastX = clientX;
            this.lastY = clientY;
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
                this.hoverTimer = null;
            }
            this.hideTooltip();
            this.hoverTimer = window.setTimeout(() => {
                this.showTooltipAt(clientX, clientY);
            }, this.delay);
        }
    };
    showTooltipAt(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el)
            return;
        const target = el.closest("[data-tooltip]");
        if (!target)
            return;
        const text = target.getAttribute("data-tooltip");
        if (!text)
            return;
        this.tooltip.textContent = text;
        let left = x + 10;
        let top = y + 10;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        const rect = this.tooltip.getBoundingClientRect();
        if (left + rect.width > window.innerWidth) {
            left = x - rect.width - 10;
            this.tooltip.style.left = `${left}px`;
        }
        if (top + rect.height > window.innerHeight) {
            top = y - rect.height - 10;
            this.tooltip.style.top = `${top}px`;
        }
        this.tooltip.classList.add("visible");
    }
    hideTooltip = () => {
        this.tooltip.classList.remove("visible");
    };
    destroy() {
        document.removeEventListener("mouseover", this.handleMouseOver);
        document.removeEventListener("scroll", this.hideTooltip);
        document.removeEventListener("mousedown", this.hideTooltip);
        if (this.hoverTimer) {
            clearTimeout(this.hoverTimer);
        }
        this.tooltip.remove();
    }
}
