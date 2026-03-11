import { RecMetadata, RecStates } from "../models/primitives.js";
import { Link } from "./Link.js";
import { checkbox } from "./checkbox.js";
import { BadgeColors, Badge } from "./Badge.js";
import { button } from "./button.js";
import { circleButton } from "./circleButton.js";
import { formatBytes, formatDuration, formatTime } from "../utils/formatting.js";
import { AudioPlayer } from "./AudioPlayer.js";
import { EnhancePanel } from "./EnhancePanel.js";
import { modalDialog } from "./modalDialog.js";
import { URL } from "../models/constants.js";
import { TranscriptionSection } from "./TranscriptSection.js";

export class RecordingCard {
  public element = document.createElement('section');
  private meta: RecMetadata; 
  private fullMetaSection: HTMLElement;
  private expandable:  HTMLElement = document.createElement('div');

  public onselect?: (isSelected: boolean) => void;
  public ondelete?: (rid: string) => void;

  public audioPlayer: AudioPlayer;
  public enhancePanel: HTMLElement;
  public transcriptPanel: TranscriptionSection;

  private checkbox = checkbox({
    onCheck: (isChecked) => this.handleSelection(isChecked)
  });

  private expandBtn: HTMLElement; 


  constructor(meta: RecMetadata) {
    this.element.className = "recording-card";
    this.expandable.className = 'expandable';
    this.meta = meta;
    this.fullMetaSection = this.createFullMetaSection();
    this.audioPlayer = new AudioPlayer({meta: meta});
    this.expandBtn = circleButton({
                      classes: ['expand-icon', 'transparent'],
                      onClick: () => this.handleExpand(),
                      radius: 38,
                    });
    this.enhancePanel = EnhancePanel(meta.rid);
    this.transcriptPanel = new TranscriptionSection({meta: meta});
    this.audioPlayer.ontimeupdate = (time: number) => this.transcriptPanel.updateTime(time);
    this.audioPlayer.onend = () => { this.transcriptPanel.resetScroll(); }
    this.transcriptPanel.onSeekRequest = (time: number) => { this.audioPlayer.seekTo(time); }
  }

  public setOnPlay(onplay: (rid: string) => void) {
    this.audioPlayer.onplay = onplay;
  }

  public setOnPause(onpause: (rid: string) => void) {
    this.audioPlayer.onpause = onpause;
  }

  public render(): void {
    this.element.replaceChildren();
    this.expandable.replaceChildren();

    const header = this.createHeaderSection();    
    const expandableInner = document.createElement('div');
    expandableInner.className = 'expandable-inner';

    this.audioPlayer.render();
    expandableInner.append(
      this.audioPlayer.element,
      this.enhancePanel,
      this.transcriptPanel.element,
    );

    this.expandable.appendChild(expandableInner);
    this.element.append(header, this.fullMetaSection, this.expandable);
  }

  private createFullMetaSection() {
    const pane = document.createElement('div');
    pane.className = 'full-metadata';
    pane.innerHTML = `
      <div class="detail-row"><span>File Name:</span> ${this.meta.recName}</div>
      <div class="detail-row"><span>Size:</span>${formatBytes(this.meta.sizeBytes)}</div>
      <div class="detail-row"><span>Device:</span>${this.meta.device}</div>
      <div class="detail-row"><span>Duration:</span>${formatDuration(this.meta.duration)}</div>
      <div class="detail-row"><span>Created at:</span>${formatTime(this.meta.createdAt)}</div>
      <div class="detail-row"><span>Speaker:</span>${this.meta.speaker}</div>
      <div class="detail-row"><span>Transcript:</span>${this.meta.transcript}</div>
      <div class="detail-row"><span>Enhanced:</span>${this.meta.enhanced}</div>
      <div class="detail-row"><span>Original:</span>${this.meta.original}</div>
    `;
    return pane;
  }

  private createHeaderSection() {
    const header = document.createElement('div');
    header.className = 'card-header'

    const left = document.createElement('span');
    left.className = 'card-left';

    const chkbox = this.checkbox;

    const miniMeta = document.createElement('div');
    miniMeta.className = 'mini-meta';

    const title = document.createElement('div');
    title.className = 'title';
    title.innerText = this.meta.recName;

    const details = document.createElement('div');
    details.className = 'details';
    details.innerText = `${this.meta.speaker} • ${this.meta.device} • ${formatTime(this.meta.createdAt)} • `;
    const toggleFullMetaViewBtn = Link({
      label: 'More info',
      onClick: () => {
        if (this.fullMetaSection.classList.contains('open')) {
          toggleFullMetaViewBtn.innerText = 'More info';
          this.fullMetaSection.classList.remove('open');
        } else {
          toggleFullMetaViewBtn.innerText = 'Less info';
          this.fullMetaSection.classList.add('open');
        }
      }
    });
    details.appendChild(toggleFullMetaViewBtn);

    const badgesWrapper = document.createElement('div');
    const badges: HTMLElement[] = this.getBadges();
    badges.forEach((badge) => badgesWrapper.appendChild(badge));


    const right = document.createElement('span');
    right.className = 'card-right';
    right.appendChild(this.expandBtn);
    right.appendChild(button({
      label: 'Delete',
      classes: ['immutable'],
      onClick: () => this.drop()
    }));
    right.appendChild(button({
      label: 'Save',
      onClick: () => {} // TODO saving
    }))

    title.onclick = () => this.handleExpand();

    miniMeta.append(title, details, badgesWrapper);
    left.append(chkbox, miniMeta)
    header.append(left, right);
    return header;
  }

  private handleExpand(): void {
    if (this.expandable.classList.contains('open')) {
      this.expandBtn.classList.remove('open');
      this.expandable.classList.remove('open');
      this.audioPlayer.pause();
    } else {
      this.expandBtn.classList.add('open');
      this.expandable.classList.add('open');
    }
  }

  private getBadges(): HTMLElement[] {
    const badges: HTMLElement[] = []
    if (this.meta.enhanced === RecStates.OK) {
      badges.push(Badge({label: 'enhanced', color: BadgeColors.GREEN}));
    }
    if (this.meta.transcript === RecStates.OK) {
      badges.push(Badge({label: 'transcribed', color: BadgeColors.BLUE}));
    }
    if (this.meta.merged) {
      badges.push(Badge({label: 'merged', color: BadgeColors.VIOLET}));
    }
    return badges;
  }

  
  private handleSelection(isChecked: boolean): void {
    this.checkbox.checked = isChecked;
    this.element.classList.toggle('checked', isChecked);
    if (this.onselect) this.onselect(isChecked)
  }

  public amend(newMeta: RecMetadata): void {
    this.meta.recName = newMeta.recName;
    this.meta.original = newMeta.original;
    this.meta.enhanced = newMeta.enhanced;
    this.meta.transcript = newMeta.transcript;
    this.meta.merged = newMeta.merged;

    if (this.meta.original == RecStates.OK) {
      this.element.classList.remove('loading');
      this.audioPlayer.loadAudio();
    } else if (this.meta.original === RecStates.WORKING) {
      this.element.classList.add('loading');
    }

    if (this.meta.enhanced === RecStates.WORKING) {
      this.enhancePanel.classList.add('loading');
    } else {
      this.enhancePanel.classList.remove('loading');
    }

    this.transcriptPanel.sync();
    
    this.fullMetaSection = this.createFullMetaSection();
    this.render();
  }

  private UICleanup() {
    this.element.remove();
    this.audioPlayer.drop();
    this.ondelete && this.ondelete(this.meta.rid);
  }

  public async drop(): Promise<void> {
    try {
      const response = await fetch(`${URL}/recordings/${this.meta.rid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (err) {
      modalDialog({
        msg: "Failed to delete recording, but you can still remove it from here.",
        opts: [
          {label: 'ok'},
          {label: "Remove", handler: () => this.UICleanup()}
        ]
      })
      return;
    }
    this.UICleanup();
  }

  public select(): void { this.handleSelection(true); }
  public deselect(): void { this.handleSelection(false); }
  public rid(): string { return this.meta.rid; }
}
