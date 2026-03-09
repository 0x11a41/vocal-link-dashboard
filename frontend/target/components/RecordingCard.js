import { RecStates } from "../models/primitives.js";
import { Link } from "./Link.js";
import { checkbox } from "./checkbox.js";
import { BadgeColors, Badge } from "./Badge.js";
import { button } from "./button.js";
import { circleButton } from "./circleButton.js";
import { formatBytes, formatDuration, formatTime } from "../utils/formatting.js";
import { AudioPlayer } from "./AudioPlayer.js";
import { modalDialog } from "./modalDialog.js";
import { URL } from "../models/constants.js";
export class RecordingCard {
    element = document.createElement('section');
    meta;
    fullMetaSection;
    expandable = document.createElement('div');
    onSelect;
    onDelete;
    audioPlayer;
    checkbox = checkbox({
        onCheck: (isChecked) => this.handleSelection(isChecked)
    });
    expandBtn;
    constructor(meta) {
        this.element.className = "recording-card";
        this.expandable.className = 'expandable';
        this.meta = meta;
        this.fullMetaSection = this.createFullMetaSection();
        this.audioPlayer = new AudioPlayer({ meta: meta });
        this.expandBtn = circleButton({
            classes: ['expand-icon', 'transparent'],
            onClick: () => this.handleExpand(),
            radius: 38,
        });
    }
    render() {
        this.element.replaceChildren();
        this.expandable.replaceChildren();
        const header = this.createHeaderSection();
        const expandableInner = document.createElement('div');
        expandableInner.className = 'expandable-inner';
        this.audioPlayer.render();
        expandableInner.append(this.audioPlayer.element);
        this.expandable.appendChild(expandableInner);
        this.element.append(header, this.fullMetaSection, this.expandable);
    }
    createFullMetaSection() {
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
    createHeaderSection() {
        const header = document.createElement('div');
        header.className = 'card-header';
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
                }
                else {
                    toggleFullMetaViewBtn.innerText = 'Less info';
                    this.fullMetaSection.classList.add('open');
                }
            }
        });
        details.appendChild(toggleFullMetaViewBtn);
        const badgesWrapper = document.createElement('div');
        const badges = this.getBadges();
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
            onClick: () => { }
        }));
        title.onclick = () => this.handleExpand();
        miniMeta.append(title, details, badgesWrapper);
        left.append(chkbox, miniMeta);
        header.append(left, right);
        return header;
    }
    handleExpand() {
        if (this.expandable.classList.contains('open')) {
            this.expandBtn.classList.remove('open');
            this.expandable.classList.remove('open');
            this.audioPlayer.pause();
        }
        else {
            this.expandBtn.classList.add('open');
            this.expandable.classList.add('open');
        }
    }
    getBadges() {
        const badges = [];
        if (this.meta.enhanced === RecStates.OK) {
            badges.push(Badge({ label: 'enhanced', color: BadgeColors.GREEN }));
        }
        if (this.meta.transcript === RecStates.OK) {
            badges.push(Badge({ label: 'transcribed', color: BadgeColors.BLUE }));
        }
        if (this.meta.merged) {
            badges.push(Badge({ label: 'merged', color: BadgeColors.VIOLET }));
        }
        return badges;
    }
    handleSelection(isChecked) {
        this.checkbox.checked = isChecked;
        this.element.classList.toggle('checked', isChecked);
        if (this.onSelect)
            this.onSelect(isChecked);
    }
    amend(newMeta) {
        this.meta.recName = newMeta.recName;
        this.meta.original = newMeta.original;
        this.meta.enhanced = newMeta.enhanced;
        this.meta.transcript = newMeta.transcript;
        this.meta.merged = newMeta.merged;
        if (this.meta.original === RecStates.OK) {
            this.audioPlayer.loadAudio();
        }
        this.fullMetaSection = this.createFullMetaSection();
        this.render();
    }
    UICleanup() {
        this.element.remove();
        this.audioPlayer.drop();
        this.onDelete && this.onDelete(this.meta.rid);
    }
    async drop() {
        try {
            const response = await fetch(`${URL}/recordings/${this.meta.rid}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }
        }
        catch (err) {
            modalDialog({
                msg: "Failed to delete recording, but you can still remove it from here.",
                opts: [
                    { label: 'ok' },
                    { label: "Remove", handler: () => this.UICleanup() }
                ]
            });
            return;
        }
        this.UICleanup();
    }
    select() { this.handleSelection(true); }
    deselect() { this.handleSelection(false); }
    rid() { return this.meta.rid; }
}
