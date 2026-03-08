import { RecMetadata, RecStates } from "../models/primitives.js";
import { Link } from "./Link.js";
import { checkbox } from "./checkbox.js";
import { BadgeColors, Badge } from "./Badge.js";
import { button } from "./button.js";
import { circleButton } from "./circleButton.js";
import { formatBytes, formatDuration, formatTime } from "../utils/formatting.js";
import { AudioPlayer, AudioMode } from "./AudioPlayer.js";

export class RecordingCard {
  public card = document.createElement('section');
  private meta: RecMetadata; 
  private fullMetaSection: HTMLElement;
  private expandable:  HTMLElement = document.createElement('div');

  public onSelect?: (selected: boolean) => void;
  public onDelete?: (rid: string) => void;

  public audioPlayer: AudioPlayer;

  private checkbox = checkbox({
    onCheck: (isChecked) => this.handleSelection(isChecked)
  });


  constructor(meta: RecMetadata) {
    this.card.className = "recording-card";
    this.expandable.className = 'expandable';
    this.meta = meta;
    this.fullMetaSection = this.createFullMetaSection();
    this.audioPlayer = new AudioPlayer(meta);
  }

  public render(): void {
    const header = this.createHeaderSection();    
    const expandableInner = document.createElement('div');
    expandableInner.className = 'expandable-inner';
    expandableInner.append(this.audioPlayer.element);

    this.expandable.appendChild(expandableInner);
    this.card.append(header, this.fullMetaSection, this.expandable);
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

    const buttons: HTMLElement[] = [];
    const expandBtn = circleButton({
      classes: ['expand-icon'],
      radius: 42,
      onClick: () => this.handleExpand(expandBtn)
    });
    buttons.push(button({
      label: 'Delete',
      classes: ['immutable'],
      onClick: () => {
        this.card.remove();
        this.onDelete && this.onDelete(this.meta.rid);
         // TODO deleting
      }
    }));
    buttons.push(button({
      label: 'Save',
      onClick: () => {} // TODO saving
    }))
    buttons.push(expandBtn);

    title.onclick = () => this.handleExpand(expandBtn);

    buttons.forEach((button) => right.appendChild(button));
    miniMeta.append(title, details, badgesWrapper);
    left.append(chkbox, miniMeta)
    header.append(left, right);
    return header;
  }

  private handleExpand(expandBtn: HTMLElement): void {
    if (this.expandable.classList.contains('open')) {
      expandBtn.classList.remove('open');
      this.expandable.classList.remove('open');
      this.audioPlayer.pause();
    } else {
      expandBtn.classList.add('open');
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
    this.card.classList.toggle('checked', isChecked);
    if (this.onSelect) this.onSelect(isChecked)
  }

  public select(): void { this.handleSelection(true); }
  public deselect(): void { this.handleSelection(false); }
  public rid(): string { return this.meta.rid; }
}
