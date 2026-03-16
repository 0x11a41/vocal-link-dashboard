import { server } from "../network/serverInfo.js";
import { ColorPicker } from "../components/ColorPicker.js";
import { Slider } from "../components/Slider.js";
import { DropDownMenu } from "../components/DropDownMenu.js";

interface ConfRowProps {
  label: string;
  element: HTMLElement;
}

function createConfRow({label, element}: ConfRowProps): HTMLElement {
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

interface ConfSectionProps {
  title: string;
  desc?: string | null;
  elements: HTMLElement[]; 
}

function createConfSection({title, desc = null, elements}: ConfSectionProps): HTMLElement {
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


class ConfView {
  public view = document.createElement('section');

  constructor() {
    this.view.className = "conf-view stack";
  }

  public render(): void {
    this.view.replaceChildren();
    this.createInterfaceSection();
    this.createAudioProcessingSection();
  }

  private createInterfaceSection(): void {
    const colorPicker = ColorPicker({
      colors: server.conf?.accentColors ?? ['#E7965C'],
      active: server.conf?.accentActive ?? 0,
      onselect: (i) => this.setAccentColor(i)
    })

    const accentRow = createConfRow({
      label: 'Accent color',
      element: colorPicker
    })

    const confSection = createConfSection({
      title: 'Interface',
      elements: [accentRow]
    })

    this.view.appendChild(confSection);
  }

  private createAudioProcessingSection(): void {
    const rows: HTMLElement[] = [];
    const noiseSlider = Slider({
      min: 0.0,
      max: 1.0,
      step: 0.05,
      initialValue: server.conf?.noiseStrength ?? 0.75,
      onchange: (val) => {server.updateConf({noiseStrength: val})}
    });
    rows.push(createConfRow({label: 'Noise reduction strength', element: noiseSlider}));

    const amplitudeSlider = Slider({
      min: -24,
      max: -12,
      step: 1,
      initialValue: server.conf?.amplitudeStrength ?? -18,
      onchange: (val) => {server.updateConf({amplitudeStrength: val})}
    });
    rows.push(createConfRow({label: 'Amplitude boost strength', element: amplitudeSlider}));

    const bassBoostSlider = Slider({
      min: 0,
      max: 12,
      step: 0.5,
      initialValue: server.conf?.filterBassBoost ?? 6,
      onchange: (val) => {server.updateConf({filterBassBoost: val})}
    });
    rows.push(createConfRow({label: "Bass boost level", element: bassBoostSlider}));

    const airBoostSlider = Slider({
      min: 0,
      max: 10,
      step: 0.5,
      initialValue: server.conf?.airBoost ?? 4,
      onchange: (val) => {server.updateConf({airBoost: val})}
    });
    rows.push(createConfRow({label: "Air boost level", element: airBoostSlider}));

    const compressorThresholdSlider = Slider({
      min: -40,
      max: -10,
      step: 1,
      initialValue: server.conf?.compressorThreshold ?? -10,
      onchange: (val) => {server.updateConf({compressorThreshold: val})}
    });
    rows.push(createConfRow({label: "Compressor threshold", element: compressorThresholdSlider}));

    const compressorRatioSlider = Slider({
      min: 1.0,
      max: 10,
      step: 0.2,
      initialValue: server.conf?.compressorRatio ?? 4.0,
      onchange: (val) => {server.updateConf({compressorRatio: val})}
    });
    rows.push(createConfRow({label: "Compressor Ratio", element: compressorRatioSlider}));

    const fmtDropDown = DropDownMenu({
      options: server.conf?.fmts ?? ['error'],
      active: server.conf?.fmtActive ?? 0,
      onchange: (val) => { server.updateConf({fmtActive: val})}
    });
    rows.push(createConfRow({label: "Preferred audio format", element: fmtDropDown}));
    
    const section = createConfSection({title: 'Audio Processing', elements: rows})
    this.view.appendChild(section);
  }

  private setAccentColor(i: number): void {
    server.updateConf({accentActive: i});
    const hexColor = server.conf?.accentColors[i];
    if (hexColor)
      document.documentElement.style.setProperty('--accent', hexColor);
  }

}

export const Conf = new ConfView();

function CofView(): HTMLElement {
  const settingsView = document.createElement('section');
  settingsView.classList.add("conf-view", "stack");
  settingsView.innerHTML = `

    <div class="conf-section">
      <h4>Audio processing</h4>
      <div class="row">
        <div class="left">
          <p>Noise reduction strength</p>
        </div>
        <div class="right">
  				<div class="slider-group">
						<input type="range" min="0" max="1" step="0.05" value="0.75">
						<span class="slider-val">0.75</span>
					</div>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Amplitude boost level</p>
        </div>
        <div class="right">
  				<div class="slider-group">
						<input type="range" min="-24" max="12" step="1" value="-18">
						<span class="slider-val">-18dB</span>
					</div>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Transcription model size</p>
        </div>
        <div class="right">
  				<select>
  					<option>Tiny (Fastest)</option>
  					<option>Base</option>
  					<option selected>Small (Balanced)</option>
  					<option>Medium (High Accuracy)</option>
  				</select>
        </div>
      </div>
      <div class="row">
        <div class="left">
          <p>Preferred recording format</p>
        </div>
        <div class="right">
  				<select>
  					<option>.ogg</option>
  					<option>.mp3</option>
  					<option selected>.m4a</option>
  				</select>
        </div>
      </div>
    </div>  

    <div class="conf-section">
      <h4>Custom Event triggers</h4>
      <p class="desc">Write custom actions in python to trigger with the ui actions.</p>
      <div class="row">
  			<textarea class="code-area" spellcheck="false">
class EventTriggers:
	def onStart():
		# Triggered when recording begins
		print("Recording Started...")

	def onStop():
		# Triggered when recording ends
		print("Recording Saved.")

	def onPause():
		pass

	def onResume():
		pass
    		</textarea>
      </div>
    </div>  
  `;
  return settingsView;
}
