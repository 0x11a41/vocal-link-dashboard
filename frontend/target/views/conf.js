import { server } from "../network/serverInfo.js";
import { ColorPicker } from "../components/ColorPicker.js";
import { Slider } from "../components/Slider.js";
import { DropDownMenu } from "../components/DropDownMenu.js";
import { CodeEditor } from "../components/CodeEditor.js";
import { button } from "../components/button.js";
class ConfView {
    view = document.createElement('section');
    constructor() {
        this.view.className = "conf-view stack";
    }
    render() {
        this.view.replaceChildren();
        this.createInterfaceSection();
        this.createCodeArea();
        this.createAudioProcessingSection();
        this.createResetSection();
    }
    createInterfaceSection() {
        const colorPicker = ColorPicker({
            colors: server.conf?.accentColors ?? ['#E7965C'],
            active: server.conf?.accentActive ?? 0,
            onselect: (i) => this.setAccentColor(i)
        });
        const accentRow = createConfRow({
            label: 'Accent color',
            element: colorPicker
        });
        const confSection = createConfSection({
            title: 'Interface',
            elements: [accentRow]
        });
        this.view.appendChild(confSection);
    }
    createAudioProcessingSection() {
        const rows = [];
        const fmtDropDown = DropDownMenu({
            options: server.conf?.fmts ?? ['error'],
            active: server.conf?.fmtActive ?? 0,
            onchange: (val) => { server.updateConf({ fmtActive: val }); }
        });
        rows.push(createConfRow({ label: "Preferred audio format", element: fmtDropDown }));
        const noiseSlider = Slider({
            min: 0.0,
            max: 1.0,
            step: 0.05,
            initialValue: server.conf?.noiseStrength ?? 0.75,
            onchange: (val) => { server.updateConf({ noiseStrength: val }); }
        });
        rows.push(createConfRow({ label: 'Noise reduction strength', element: noiseSlider }));
        const amplitudeSlider = Slider({
            min: -24,
            max: -12,
            step: 1,
            initialValue: server.conf?.amplitudeStrength ?? -18,
            onchange: (val) => { server.updateConf({ amplitudeStrength: val }); }
        });
        rows.push(createConfRow({ label: 'Amplitude boost strength', element: amplitudeSlider }));
        const bassBoostSlider = Slider({
            min: 0,
            max: 12,
            step: 0.5,
            initialValue: server.conf?.filterBassBoost ?? 6,
            onchange: (val) => { server.updateConf({ filterBassBoost: val }); }
        });
        rows.push(createConfRow({ label: "Bass boost level", element: bassBoostSlider }));
        const airBoostSlider = Slider({
            min: 0,
            max: 10,
            step: 0.5,
            initialValue: server.conf?.airBoost ?? 4,
            onchange: (val) => { server.updateConf({ airBoost: val }); }
        });
        rows.push(createConfRow({ label: "Air boost level", element: airBoostSlider }));
        const compressorThresholdSlider = Slider({
            min: -40,
            max: -10,
            step: 1,
            initialValue: server.conf?.compressorThreshold ?? -10,
            onchange: (val) => { server.updateConf({ compressorThreshold: val }); }
        });
        rows.push(createConfRow({ label: "Compressor threshold", element: compressorThresholdSlider }));
        const compressorRatioSlider = Slider({
            min: 1.0,
            max: 10,
            step: 0.2,
            initialValue: server.conf?.compressorRatio ?? 4.0,
            onchange: (val) => { server.updateConf({ compressorRatio: val }); }
        });
        rows.push(createConfRow({ label: "Compressor Ratio", element: compressorRatioSlider }));
        const section = createConfSection({ title: 'Audio Processing', elements: rows });
        this.view.appendChild(section);
    }
    createCodeArea() {
        const editor = CodeEditor({
            defaultval: server.conf?.intends ?? "pass",
            onsave: (code) => { server.updateConf({ intends: code }); }
        });
        this.view.appendChild(createConfSection({
            title: "Event triggers",
            desc: "Define custom Python handlers that run on start, stop, pause, and resume events.",
            elements: [editor],
        }));
    }
    createResetSection() {
        const element = createConfRow({
            label: "Load the default configuration (WARNING this will erase the custom script)",
            element: button({
                label: "Reset",
                classes: ['immutable'],
                onClick: async () => {
                    await server.reset();
                    window.location.reload();
                }
            }),
        });
        this.view.appendChild(createConfSection({ title: 'Server', elements: [element] }));
    }
    setAccentColor(i) {
        server.updateConf({ accentActive: i });
        const hexColor = server.conf?.accentColors[i];
        if (hexColor)
            document.documentElement.style.setProperty('--accent', hexColor);
    }
}
export const Conf = new ConfView();
function createConfRow({ label, element }) {
    const confRow = document.createElement('div');
    confRow.className = 'row';
    const left = document.createElement('div');
    left.className = 'left';
    left.insertAdjacentHTML('beforeend', `<p>${label}</p>`);
    const right = document.createElement('div');
    right.className = 'right';
    right.appendChild(element);
    confRow.append(left, right);
    return confRow;
}
function createConfSection({ title, desc = null, elements }) {
    const confSection = document.createElement('div');
    confSection.className = 'conf-section';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    confSection.appendChild(h4);
    if (desc) {
        const p = document.createElement('p');
        p.className = 'desc';
        p.textContent = desc;
        confSection.appendChild(p);
    }
    for (const element of elements) {
        confSection.appendChild(element);
    }
    return confSection;
}
