import { RecordingCard } from '../components/RecordingCard.js';
import { button } from '../components/button.js';
import { checkbox } from '../components/checkbox.js';
import { modalDialog } from '../components/modalDialog.js';
import { URL } from '../models/constants.js';
import { fmtRecordingName } from '../utils/formatting.js';
class RecordingsView {
    view = document.createElement('section');
    cards = new Map();
    selectionCounter = document.createElement('span');
    selectedRids = new Set();
    checkBox;
    mergeBtn;
    currentPlaying = null;
    constructor() {
        this.view.classList.add("recordings-view", "stack");
        this.checkBox = checkbox({ onCheck: (val) => this.toggleAll(val) });
        this.mergeBtn = button({
            label: "Merge",
            onClick: () => this.mergeSelected(),
            visibility: "hidden"
        });
    }
    render() {
        this.view.replaceChildren();
        if (this.cards.size > 0) {
            this.view.appendChild(this.createHeader());
            this.cards.forEach((card) => {
                card.render();
                this.view.appendChild(card.element);
            });
        }
        else {
            this.view.innerHTML = `
                <header>
                    <span class="muted" style="width: 100%; text-align: center;">
                        No recordings has been uploaded yet
                    </span>
                </header>
            `;
        }
    }
    createHeader() {
        const header = document.createElement('header');
        const selectionArea = document.createElement('div');
        selectionArea.appendChild(this.checkBox);
        selectionArea.appendChild(this.selectionCounter);
        const buttons = document.createElement('div');
        buttons.appendChild(this.mergeBtn);
        buttons.appendChild(button({
            label: "Delete",
            classes: ['immutable'],
            onClick: () => {
                modalDialog({
                    msg: this.selectedRids.size > 0 ?
                        `Proceed to permenantly delete ${this.selectedRids.size} recordings?` :
                        `Are you sure you want to delete all ${this.cards.size} recordings?`,
                    opts: [
                        { label: 'Cancel' },
                        { label: 'Proceed', handler: () => {
                                if (this.selectedRids.size > 0)
                                    this.deleteSelected();
                                else
                                    this.deleteAll();
                            } }
                    ]
                });
            }
        }));
        header.append(selectionArea, buttons);
        return header;
    }
    resetSelection() {
        this.selectedRids.clear();
        this.cards.forEach(card => card.deselect());
        this.syncSelectionUI();
    }
    async mergeSelected() {
        if (this.selectedRids.size < 2)
            return;
        try {
            const rids = Array.from(this.selectedRids);
            const response = await fetch(`${URL}/recordings/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rids })
            });
            if (response.status === 202) {
                this.resetSelection();
                return;
            }
            const err = await response.json();
            console.error("Merge rejected by server:", err.detail);
        }
        catch (error) {
            console.error("Merge Request Network/System Error:", error);
        }
    }
    deleteSelected() {
        this.selectedRids.forEach(rid => this.removeCard(rid));
        this.selectedRids.clear();
        this.render();
        this.syncSelectionUI();
    }
    deleteAll() {
        this.cards.forEach((_, rid) => this.removeCard(rid));
        this.selectedRids.clear();
        this.render();
        this.syncSelectionUI();
    }
    removeCard(rid) {
        const card = this.cards.get(rid);
        if (!card)
            return;
        if (this.currentPlaying === rid) {
            card.audioPlayer.pause();
            this.currentPlaying = null;
        }
        card.drop();
        this.cards.delete(rid);
    }
    syncSelectionUI() {
        const count = this.selectedRids.size;
        const total = this.cards.size;
        this.selectionCounter.innerText = count > 0
            ? `Selected ${count} of ${total}`
            : `Select all (${total})`;
        this.checkBox.checked = total > 0 && count === total;
        this.checkBox.indeterminate = count > 0 && count < total;
        this.mergeBtn.style.visibility = count > 1 ? 'visible' : 'hidden';
    }
    toggleAll(forceSelect) {
        this.cards.forEach((card, rid) => {
            forceSelect ? card.select() : card.deselect();
            forceSelect ? this.selectedRids.add(rid) : this.selectedRids.delete(rid);
        });
        this.syncSelectionUI();
    }
    append(meta) {
        const card = new RecordingCard(meta);
        card.onselect = (isSelected) => {
            if (isSelected) {
                this.selectedRids.add(meta.rid);
            }
            else {
                this.selectedRids.delete(meta.rid);
            }
            this.syncSelectionUI();
        };
        card.ondelete = () => {
            this.cards.delete(meta.rid);
            this.selectedRids.delete(meta.rid);
            this.syncSelectionUI();
            this.render();
        };
        card.setOnPlay((rid) => {
            if (this.currentPlaying && this.currentPlaying !== rid) {
                const previousCard = this.cards.get(this.currentPlaying);
                if (previousCard) {
                    previousCard.audioPlayer.pause();
                }
            }
            this.currentPlaying = rid;
        });
        card.setOnPause(() => {
            if (this.currentPlaying === meta.rid) {
                this.currentPlaying = null;
            }
        });
        this.cards.set(meta.rid, card);
        this.syncSelectionUI();
        this.render();
    }
    amend(rid, newMeta) {
        const card = this.cards.get(rid);
        if (card) {
            card.amend(newMeta);
        }
        this.render();
    }
    setDefaultName(meta) {
        const card = this.cards.get(meta.rid);
        if (card) {
            card.requestRename(fmtRecordingName(meta));
        }
    }
    contains(rid) {
        return this.cards.has(rid);
    }
}
export const recordings = new RecordingsView();
