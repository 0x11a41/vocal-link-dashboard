export function Slider({ min, max, step, initialValue, onchange }) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = initialValue.toString();
    const valDisplay = document.createElement('span');
    valDisplay.className = 'slider-val';
    valDisplay.textContent = initialValue.toString();
    input.oninput = () => {
        valDisplay.textContent = input.value;
    };
    input.onchange = () => {
        const currentVal = parseFloat(input.value);
        onchange(currentVal);
    };
    group.append(input, valDisplay);
    return group;
}
