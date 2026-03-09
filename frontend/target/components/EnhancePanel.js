import { ToggleSwitch } from './ToggleSwitch.js';
import { button } from './button.js';
import { EnhanceProps, MAX_ENH_PROPS } from '../models/primitives.js';
import { URL } from '../models/constants.js';
import { clamp } from '../utils/utils.js';
export function EnhancePanel(rid) {
    const panel = document.createElement('div');
    panel.className = 'enhancement-panel';
    const noiseToggle = new ToggleSwitch({
        bitmask: EnhanceProps.REDUCE_NOISE,
        classes: ['small'],
        onClick: (isChecked) => updateOpts(isChecked)
    });
    const ampToggle = new ToggleSwitch({
        bitmask: EnhanceProps.AMPLIFY,
        classes: ['small'],
        onClick: (isChecked) => updateOpts(isChecked)
    });
    const studioToggle = new ToggleSwitch({
        bitmask: EnhanceProps.STUDIO_FILTER,
        classes: ['small'],
        onClick: (isChecked) => updateOpts(isChecked)
    });
    const noiseOpt = createOption({ label: "reduce noise", btn: noiseToggle });
    const ampOpt = createOption({ label: "boost amplitude", btn: ampToggle });
    const studioOpt = createOption({ label: 'studio filter', btn: studioToggle });
    const enhanceBtn = button({
        label: 'Enhance',
        classes: ['accent', 'btn-small', 'push-right', 'disabled'],
        onClick: () => {
            const props = noiseToggle.state | ampToggle.state | studioToggle.state;
            enhance(rid, props);
        }
    });
    let optsEnabled = 0;
    function increment() {
        optsEnabled = clamp(optsEnabled + 1, 0, MAX_ENH_PROPS);
    }
    function decrement() {
        optsEnabled = clamp(optsEnabled - 1, 0, MAX_ENH_PROPS);
    }
    function updateOpts(isChecked) {
        if (isChecked) {
            increment();
        }
        else {
            decrement();
        }
        enhanceBtn.classList.toggle('disabled', optsEnabled === 0);
    }
    panel.append(noiseOpt, ampOpt, studioOpt, enhanceBtn);
    return panel;
}
function createOption({ label, btn }) {
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'toggle-group';
    toggleGroup.appendChild(btn.element);
    toggleGroup.insertAdjacentHTML('beforeend', `
      <span class="muted">${label}</span>
    `);
    return toggleGroup;
}
async function enhance(rid, props) {
    try {
        const url = `${URL}/recordings/${rid}/enhance?props=${props}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.status === 202) {
            return true;
        }
        const err = await response.json();
        throw new Error(err.detail || "Enhancement request failed");
    }
    catch (error) {
        console.error("Failed to trigger enhancement:", error);
        return false;
    }
}
