import { RecStates } from '../models/primitives.js';
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
        this.view.appendChild(this.createHeader());
        this.cards.forEach((card) => {
            card.render();
            this.view.appendChild(card.element);
        });
        this.setCount(0);
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
            this.setCount(-1);
            this.selectedRids.delete(rid);
        });
    }
    deleteAll() {
        this.cards.forEach((card) => {
            card.drop();
        });
        this.setCount(-this.selectionCount);
        this.selectedRids.clear();
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
        card.onDelete = () => {
            this.cards.delete(meta.rid);
            if (this.selectedRids.has(meta.rid)) {
                this.selectedRids.delete(meta.rid);
                this.setCount(-1);
            }
        };
        card.onSelect = (isSelected) => {
            if (isSelected) {
                this.setCount(+1);
                this.selectedRids.add(meta.rid);
            }
            else {
                this.setCount(-1);
                this.selectedRids.delete(meta.rid);
            }
        };
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
export function recordingsView() {
    const dummyRecording = {
        rid: "68b81008-2ea4-4a3d-9a8a-aba60e693ed9",
        recName: "20260308_085408.m4a",
        sessionId: "a0540a3a-540f-44cf-9d18-252b926025d4",
        speaker: "calcifer",
        device: "Motorola moto g84 5G",
        duration: 3,
        sizeBytes: 43909,
        createdAt: 1772940253688,
        original: RecStates.OK,
        enhanced: RecStates.NA,
        transcript: RecStates.NA,
        merged: null
    };
    const recording = new RecordingCard(dummyRecording);
    recording.render();
    const recordingsView = document.createElement('section');
    recordingsView.classList.add("recordings-view", "stack");
    recordingsView.appendChild(recording.element);
    return recordingsView;
}
