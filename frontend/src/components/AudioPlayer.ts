import { RecMetadata, RecStates } from "../models/primitives.js";
import { circleButton } from "./circleButton.js";
import { button } from "./button.js";
import { formatDuration } from "../utils/formatting.js";
import { URL } from "../models/constants.js";
import { downloadFile } from "../utils/downloadFile.js";
import { modalDialog } from "./modalDialog.js";

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
  saveBtn: HTMLButtonElement;
  modeButtons?: ModeButtons; // if meta.enhanced
}

export class AudioPlayer {
  public element: HTMLDivElement;
  private audio: HTMLAudioElement;
  private meta: RecMetadata;
  
  private isPlaying: boolean = false;
  private isDragging: boolean = false;
  private ui:  PlayerUI; 

  private currentMode: AudioMode = AudioMode.ORIGINAL;

  public onplay?: (rid: string) => void;
  public onpause?: (rid: string) => void;
  public ontimeupdate?: (currentTime: number) => void;
  public onend?: () => void;

  constructor({meta}: {meta: RecMetadata}) {
    this.meta = meta;
    this.audio = new Audio();
    this.element = document.createElement('div');
    this.element.className = 'player-panel';

    this.ui = {
      playBtn: circleButton({
        classes: ['play-icon'],
        onClick: () => this.togglePlay(),
        radius: 48
      }),
      progressFill: document.createElement('div'),
      currentTimeSpan: document.createElement('span'),
      saveBtn: button({
            label: 'SAVE',
            classes: ['btn-small'],
            onClick: async () => await downloadFile(this.audio.src, this.meta.recName, this.ui.saveBtn)

          }),
    };
    this.ui.progressFill.className = 'progress-fill';
    this.ui.currentTimeSpan.className = 'time-stamp';

    this.loadAudio();
    this.setupAudioListeners();
    this.render();
  }

  public render(): void {
    this.element.replaceChildren();
    this.element.classList.remove('loading');

    if (this.meta.original === RecStates.NA) {
      return;
    }

    if (this.meta.original === RecStates.WORKING) {
      const statusText = document.createElement('span');
      statusText.innerText = "Obtaining file...";
      this.element.appendChild(statusText);
      this.element.classList.add('loading');
      return;
    }

    this.element.appendChild(this.createPlayerControls());
    if (this.meta.enhanced === RecStates.OK) {
      this.element.appendChild(this.createToggleGroup());
    }
    this.syncToggleButtons();
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

      this.ui.currentTimeSpan.innerText = '00:00 sec';

      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-bar-container';
      progressContainer.appendChild(this.ui.progressFill);

      const onMouseMove = (e: MouseEvent) => {
          if (this.isDragging) this.handleSeek(e, progressContainer);
      };

      const onMouseUp = () => {
          if (this.isDragging) {
              this.isDragging = false;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              if (this.isPlaying) this.audio.play();
          }
      };

      progressContainer.onmousedown = (e: MouseEvent) => {
          this.isDragging = true;
          this.handleSeek(e, progressContainer);
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
      };

      const totalTimeSpan = document.createElement('span');
      totalTimeSpan.className = 'time-stamp';
      totalTimeSpan.innerText = formatDuration(this.meta.duration);

      playerRow.append(
          this.ui.playBtn, 
          this.ui.currentTimeSpan, 
          progressContainer, 
          totalTimeSpan, 
          this.ui.saveBtn
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

  private syncToggleButtons(): void {
    this.ui.modeButtons?.original.classList.toggle('active', this.currentMode === AudioMode.ORIGINAL);
    this.ui.modeButtons?.enhanced.classList.toggle('active', this.currentMode === AudioMode.ENHANCED);
  }

  public loadAudio(mode: AudioMode = this.currentMode): void {
    this.currentMode = mode;
    this.syncToggleButtons();

    const wasPlaying = this.isPlaying;
    const prevTime = this.audio.currentTime;

    if (mode === AudioMode.ENHANCED && this.meta.enhanced === RecStates.OK) {
      this.audio.src = `${URL}/recordings/${this.meta.rid}/enhanced`;
    } else if (mode === AudioMode.ORIGINAL && this.meta.original === RecStates.OK) {
      this.audio.src = `${URL}/recordings/${this.meta.rid}/original`;
    }
    
    if (wasPlaying) {
      this.audio.addEventListener('loadedmetadata', () => {
        this.audio.currentTime = prevTime;
        this.play();
      }, { once: true });
    }
  }

  private setupAudioListeners(): void {
    this.audio.onplay = () => {
      this.isPlaying = true;
      this.ui.playBtn.classList.replace('play-icon', 'pause-icon');
      this.onplay?.(this.meta.rid);
      this.updateMediaSession();
    };

    this.audio.onpause = () => {
      this.isPlaying = false;
      this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
      this.onpause?.(this.meta.rid);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };

    this.audio.ontimeupdate = () => {
      if (this.audio.duration && !this.isDragging) {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.ui.progressFill.style.width = `${percent}%`;
        this.ui.currentTimeSpan.innerText = formatDuration(Math.floor(this.audio.currentTime));
        this.ontimeupdate?.(this.audio.currentTime);
      }
    };

    this.audio.onended = () => {
      this.ui.progressFill.style.width = '0%';
      this.onend?.();
    };

    this.audio.onerror = () => {
      this.isPlaying = false;
      this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
      this.element.replaceChildren();
      modalDialog({
        msg: "⚠️ Audio file is broken or not found.",
        opts: [{label: 'ok'}]
      });
    };
  }

  private handleSeek(e: MouseEvent, container: HTMLDivElement): void {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);

    if (!isNaN(this.audio.duration)) {
        this.audio.currentTime = percent * this.audio.duration;
        this.ui.progressFill.style.width = `${percent * 100}%`;
        this.ui.currentTimeSpan.innerText = formatDuration(Math.floor(this.audio.currentTime));
    }
  }

  public seekTo(time: number): void {
    if (isNaN(this.audio.duration)) return;

    const targetTime = Math.min(Math.max(time, 0), this.audio.duration);
    this.audio.currentTime = targetTime;

    const percent = (targetTime / this.audio.duration) * 100;
    this.ui.progressFill.style.width = `${percent}%`;
    this.ui.currentTimeSpan.innerText = formatDuration(Math.floor(targetTime));

    this.ontimeupdate?.(targetTime);
  }

  private updateMediaSession(): void {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: this.meta.recName,
        artist: 'Voice Recorder',
        album: this.currentMode === AudioMode.ENHANCED ? 'Enhanced' : 'Original'
    });

    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => { this.audio.currentTime -= 5; });
    navigator.mediaSession.setActionHandler('seekforward', () => { this.audio.currentTime += 5; });
  }

  public pause(): void {
    this.audio.pause();
  }

  public async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (err) {
      console.warn("Playback blocked:", err);
      this.pause(); 
    }
  }

  public drop(): void {
    this.pause();
    this.audio.src = "";
    this.audio.ontimeupdate = null;
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.load();
    this.element.remove();
    this.element.replaceChildren();
    (this.ui as any) = null;
  }
}
