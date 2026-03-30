export function ColorPicker({ colors, active, onselect }) {
    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';
    colorPicker.setAttribute("data-tooltip", "Click to use this color");
    let activeColor = null;
    colors.forEach((color, i) => {
        const choice = document.createElement('div');
        choice.className = 'color';
        choice.style.backgroundColor = color;
        if (i === active) {
            choice.classList.add('active');
            activeColor = choice;
        }
        choice.onclick = () => {
            activeColor?.classList.remove('active');
            choice.classList.add('active');
            activeColor = choice;
            onselect(i);
        };
        colorPicker.appendChild(choice);
    });
    return colorPicker;
}
