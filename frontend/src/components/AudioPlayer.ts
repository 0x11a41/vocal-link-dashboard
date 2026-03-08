import { RecMetadata, RecStates } from "../models/primitives.js";
import { circleButton } from "./circleButton.js";
import { button } from "./button.js";
import { formatDuration } from "../utils/formatting.js";
import { URL } from "../models/constants.js";

export enum AudioMode {
  ORIGINAL,
  ENHANCED
}

interface ModeButtons {
  original: HTMLButtonElement;
  enhanced: HTMLButtonElement;
}

interface PlayerUI {
  playBtn: HTMLElement;
  progressFill: HTMLDivElement;
  currentTimeSpan: HTMLSpanElement;
  modeButtons?: ModeButtons; // if meta.enhanced
}

export class AudioPlayer {
  public readonly element: HTMLDivElement;
  private readonly audio: HTMLAudioElement;
  private readonly meta: RecMetadata;
  
  private isPlaying: boolean = false;
  private ui:  PlayerUI; 

  private currentMode: AudioMode = AudioMode.ORIGINAL;

  constructor(meta: RecMetadata) {
    this.meta = meta;
    this.audio = new Audio();
    this.element = document.createElement('div');
    this.element.className = 'player-panel';
    this.ui = {
      playBtn: circleButton({
        classes: ['play-icon'],
        onClick: () => this.togglePlay()
      }),
      progressFill: document.createElement('div'),
      currentTimeSpan: document.createElement('span'),
    };
    this.ui.progressFill.className = 'progress-fill';
    this.ui.currentTimeSpan.className = 'time-stamp';

    this.loadAudio();
    this.setupAudioListeners();
    this.render();
  }

  public render(): void {
    if (this.meta.enhanced === RecStates.OK) {
      this.element.appendChild(this.createToggleGroup());
    }
    this.element.appendChild(this.createPlayerControls());
  }

  private createToggleGroup(): HTMLDivElement {
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'player-toggle-group';

    const btnOrig = button({
      label: 'ORIGINAL',
      classes: ['btn-small', 'active'],
      onClick: () => {
        this.currentMode = AudioMode.ORIGINAL;
        this.loadAudio();
      }});

    const btnEnh = button({
      label: 'ENHANCED',
      classes: ['btn-small'],
      onClick: () => {
        this.currentMode = AudioMode.ENHANCED;
        this.loadAudio();
    }});

    this.ui.modeButtons = { original: btnOrig, enhanced: btnEnh };
    toggleGroup.append(btnOrig, btnEnh);
    return toggleGroup;
  }

  private createPlayerControls(): HTMLElement {
    const playerRow = document.createElement('div');
    playerRow.className = 'player';


    this.ui.currentTimeSpan.innerText = '00:00';

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-bar-container';
    
    progressContainer.appendChild(this.ui.progressFill);
    progressContainer.onclick = (e: MouseEvent) => this.handleSeek(e, progressContainer);

    const totalTimeSpan = document.createElement('span');
    totalTimeSpan.className = 'time-stamp';
    totalTimeSpan.innerText = formatDuration(this.meta.duration);

    const saveBtn = button({
      label: 'SAVE',
      classes: ['btn-small'],
      onClick: () => this.handleDownloadBtn()
    });

    playerRow.append(
      this.ui.playBtn, 
      this.ui.currentTimeSpan, 
      progressContainer, 
      totalTimeSpan, 
      saveBtn
    );
    
    return playerRow;
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private loadAudio(mode: AudioMode = this.currentMode): void {
    this.ui.modeButtons?.original.classList.toggle('active', mode === AudioMode.ORIGINAL);
    this.ui.modeButtons?.enhanced.classList.toggle('active', mode === AudioMode.ENHANCED);

    const wasPlaying = this.isPlaying;
    const prevTime = this.audio.currentTime;

    if (mode === AudioMode.ENHANCED && this.meta.enhanced === RecStates.OK) {
      this.audio.src = `${URL}/recordings/${this.meta.rid}/enhanced`;
    } else if (mode === AudioMode.ORIGINAL && this.meta.original === RecStates.OK){
      this.audio.src = `${URL}/recordings/${this.meta.rid}/original`;
    }
    
    if (wasPlaying) {
      this.audio.currentTime = prevTime;
      this.audio.play();
    }
  }

  private setupAudioListeners(): void {
    this.audio.ontimeupdate = () => {
      if (this.audio.duration) {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.ui.progressFill.style.width = `${percent}%`;
        this.ui.currentTimeSpan.innerText = formatDuration(Math.floor(this.audio.currentTime));
      }
    };

    this.audio.onended = () => {
      this.isPlaying = false;
      this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
      this.ui.progressFill.style.width = '0%';
    };

    this.audio.onerror = () => {
      this.isPlaying = false;
      this.element.innerHTML = "error! Audio file is broken or not found."
    }
  }

  private handleSeek(e: MouseEvent, container: HTMLDivElement): void {
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = percent * this.audio.duration;
    }
  }

  private handleDownloadBtn(): void {
    const a = document.createElement('a');
    a.href = this.audio.src;
    a.download = this.meta.recName;
    a.click();
  }

  public pause(): void {
    this.audio.pause();
    this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
    this.isPlaying = false;
  }

  public play(): void {
    this.audio.play();
    this.ui.playBtn.classList.replace('play-icon', 'pause-icon');
    this.isPlaying = true;
  }
}
