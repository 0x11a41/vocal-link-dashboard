import { RecStates } from "../models/primitives.js";
import { circleButton } from "./circleButton.js";
import { button } from "./button.js";
import { formatDuration } from "../utils/formatting.js";
import { URL } from "../models/constants.js";
import { downloadFile } from "../utils/downloadFile.js";
import { modalDialog } from "./modalDialog.js";
export var AudioMode;
(function (AudioMode) {
    AudioMode[AudioMode["ORIGINAL"] = 0] = "ORIGINAL";
    AudioMode[AudioMode["ENHANCED"] = 1] = "ENHANCED";
})(AudioMode || (AudioMode = {}));
export class AudioPlayer {
    element;
    audio;
    meta;
    isPlaying = false;
    ui;
    currentMode = AudioMode.ORIGINAL;
    constructor({ meta }) {
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
    render() {
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
        if (this.meta.enhanced === RecStates.OK) {
            this.element.appendChild(this.createToggleGroup());
        }
        this.element.appendChild(this.createPlayerControls());
        this.syncToggleButtons();
    }
    createToggleGroup() {
        const toggleGroup = document.createElement('div');
        toggleGroup.className = 'player-toggle-group';
        const btnOrig = button({
            label: 'ORIGINAL',
            classes: ['btn-small', 'active'],
            onClick: () => {
                this.currentMode = AudioMode.ORIGINAL;
                this.loadAudio();
            }
        });
        const btnEnh = button({
            label: 'ENHANCED',
            classes: ['btn-small'],
            onClick: () => {
                this.currentMode = AudioMode.ENHANCED;
                this.loadAudio();
            }
        });
        this.ui.modeButtons = { original: btnOrig, enhanced: btnEnh };
        toggleGroup.append(btnOrig, btnEnh);
        return toggleGroup;
    }
    createPlayerControls() {
        const playerRow = document.createElement('div');
        playerRow.className = 'player';
        this.ui.currentTimeSpan.innerText = '00:00';
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-bar-container';
        progressContainer.appendChild(this.ui.progressFill);
        progressContainer.onclick = (e) => this.handleSeek(e, progressContainer);
        const totalTimeSpan = document.createElement('span');
        totalTimeSpan.className = 'time-stamp';
        totalTimeSpan.innerText = formatDuration(this.meta.duration);
        playerRow.append(this.ui.playBtn, this.ui.currentTimeSpan, progressContainer, totalTimeSpan, this.ui.saveBtn);
        return playerRow;
    }
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        }
        else {
            this.play();
        }
    }
    syncToggleButtons() {
        this.ui.modeButtons?.original.classList.toggle('active', this.currentMode === AudioMode.ORIGINAL);
        this.ui.modeButtons?.enhanced.classList.toggle('active', this.currentMode === AudioMode.ENHANCED);
    }
    loadAudio(mode = this.currentMode) {
        this.currentMode = mode;
        this.syncToggleButtons();
        const wasPlaying = this.isPlaying;
        const prevTime = this.audio.currentTime;
        if (mode === AudioMode.ENHANCED && this.meta.enhanced === RecStates.OK) {
            this.audio.src = `${URL}/recordings/${this.meta.rid}/enhanced`;
        }
        else if (mode === AudioMode.ORIGINAL && this.meta.original === RecStates.OK) {
            this.audio.src = `${URL}/recordings/${this.meta.rid}/original`;
        }
        if (wasPlaying) {
            this.audio.addEventListener('loadedmetadata', () => {
                this.audio.currentTime = prevTime;
                this.play();
            }, { once: true });
        }
    }
    setupAudioListeners() {
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
            this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
            this.element.replaceChildren();
            modalDialog({
                msg: "⚠️ Audio file is broken or not found.",
                opts: [{ label: 'ok' }]
            });
        };
    }
    handleSeek(e, container) {
        const rect = container.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (!isNaN(this.audio.duration)) {
            this.audio.currentTime = percent * this.audio.duration;
        }
    }
    pause() {
        this.audio.pause();
        this.ui.playBtn.classList.replace('pause-icon', 'play-icon');
        this.isPlaying = false;
    }
    play() {
        this.ui.playBtn.classList.replace('play-icon', 'pause-icon');
        this.isPlaying = true;
        this.audio.play().catch(err => {
            console.warn("Playback aborted or blocked by browser:", err.message);
            this.pause();
        });
    }
    drop() {
        this.pause();
        this.audio.src = "";
        this.audio.load();
        this.audio.ontimeupdate = null;
        this.audio.onended = null;
        this.audio.onerror = null;
        this.element.remove();
        this.element.replaceChildren();
        this.ui = null;
    }
}
