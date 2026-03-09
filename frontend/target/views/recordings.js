import { RecordingCard } from '../components/RecordingCard.js';
import { button } from '../components/button.js';
import { checkbox } from '../components/checkbox.js';
import { modalDialog } from '../components/modalDialog.js';
import { URL } from '../models/constants.js';
class RecordingsView {
    view = document.createElement('section');
    cards = new Map();
    selectionCount = 0;
    selectionCounter = document.createElement('span');
    selectedRids = new Set();
    checkBox;
    mergeBtn;
    currentPlaying = null;
    constructor() {
        this.view.classList.add("recordings-view", "stack");
        this.checkBox = checkbox({
            onCheck: (isChecked) => {
                this.cards.forEach((card) => {
                    if (isChecked) {
                        card.select();
                    }
                    else {
                        card.deselect();
                    }
                });
            }
        });
        this.mergeBtn = button({
            label: "Merge",
            onClick: async () => { await this.mergeSelected(); },
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
            this.setCount(0);
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
                    msg: this.selectionCount > 0 ?
                        'Proceed to permenantly delete SELECTED recordings?' :
                        "Are you sure you want to delete ALL recordings?",
                    opts: [
                        { label: 'Cancel' },
                        { label: 'Proceed', handler: () => {
                                if (this.selectionCount > 0)
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
        this.cards.forEach((card) => card.deselect());
        this.checkBox.checked = false;
        this.setCount(-this.selectionCount);
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
        this.selectedRids.forEach((rid) => {
            const card = this.cards.get(rid);
            card?.drop();
            this.cards.delete(rid);
        });
        this.selectedRids.clear();
        this.setCount(-this.selectionCount);
        this.render();
    }
    deleteAll() {
        this.cards.forEach((card) => {
            card.drop();
        });
        this.cards.clear();
        this.selectedRids.clear();
        this.setCount(-this.selectionCount);
        this.render();
    }
    setCount(step) {
        this.selectionCount += step;
        this.selectionCounter.innerText = `Select all (${this.selectionCount})`;
        if (this.selectionCount == this.cards.size) {
            this.checkBox.checked = true;
        }
        else {
            this.checkBox.checked = false;
        }
        if (this.selectionCount > 1) {
            this.mergeBtn.style.visibility = 'visible';
        }
        else {
            this.mergeBtn.style.visibility = 'hidden';
        }
    }
    append(meta) {
        const card = new RecordingCard(meta);
        card.ondelete = () => {
            if (this.currentPlaying === meta.rid) {
                this.currentPlaying = null;
            }
            this.cards.delete(meta.rid);
            if (this.selectedRids.has(meta.rid)) {
                this.selectedRids.delete(meta.rid);
                this.setCount(-1);
            }
            this.render();
        };
        card.onselect = (isSelected) => {
            if (isSelected) {
                this.setCount(+1);
                this.selectedRids.add(meta.rid);
            }
            else {
                this.setCount(-1);
                this.selectedRids.delete(meta.rid);
            }
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
        this.render();
    }
    amend(id, newMeta) {
        const card = this.cards.get(id);
        if (card) {
            card.amend(newMeta);
        }
        this.render();
    }
    contains(rid) {
        return this.cards.has(rid);
    }
}
export const Recordings = new RecordingsView();
