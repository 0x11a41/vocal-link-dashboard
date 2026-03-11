import {RecMetadata } from '../models/primitives.js'
import { RecordingCard } from '../components/RecordingCard.js';
import { button } from '../components/button.js';
import { checkbox } from '../components/checkbox.js';
import { modalDialog } from '../components/modalDialog.js';
import { URL } from '../models/constants.js';
import { MutableTextBox } from '../components/MutableTextBox.js';

class RecordingsView {
    public view = document.createElement('section');

    private cards = new Map<string, RecordingCard>();

    private selectionCounter = document.createElement('span');
    private selectedRids = new Set<string>();
    private checkBox: HTMLInputElement;
    private mergeBtn: HTMLButtonElement;

    private currentPlaying?: string | null = null;

    constructor() {
        this.view.classList.add("recordings-view", "stack");
        this.checkBox = checkbox({ onCheck: (val) => this.toggleAll(val) });
        this.mergeBtn = button({
            label: "Merge",
            onClick: () => this.mergeSelected(),
            visibility: "hidden"
        });
    }

    public render() {
        this.view.replaceChildren();
        if (this.cards.size > 0) {
            this.view.appendChild(this.createHeader());
            this.cards.forEach((card) => {
                card.render();
                this.view.appendChild(card.element);
            })
        } else {
            this.view.innerHTML = `
                <header>
                    <span class="muted" style="width: 100%; text-align: center;">
                        No recordings has been uploaded yet
                    </span>
                </header>
            `;
        }
    }

    private createHeader(): HTMLElement {
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
                        {label: 'Cancel'},
                        {label: 'Proceed', handler: () => {
                            if (this.selectedRids.size > 0) this.deleteSelected()
                            else this.deleteAll();
                        }}
                    ]
                })
            }
        }));

        header.append(selectionArea, buttons);
        return header;
    }

    public resetSelection(): void {
        this.selectedRids.clear();
        this.cards.forEach(card => card.deselect());
        this.syncSelectionUI();
    }

    private async mergeSelected(): Promise<void> {
        if (this.selectedRids.size < 2) return;

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

        } catch (error) {
            console.error("Merge Request Network/System Error:", error);
        }
    }

    private deleteSelected(): void {
        this.selectedRids.forEach(rid => this.removeCard(rid));
        this.selectedRids.clear();
        this.render(); // Re-render once after bulk delete
        this.syncSelectionUI();
    }

    private deleteAll(): void {
        this.cards.forEach((_, rid) => this.removeCard(rid));
        this.selectedRids.clear();
        this.render();
        this.syncSelectionUI();
    }

    private removeCard(rid: string): void {
        const card = this.cards.get(rid);
        if (!card) return;

        if (this.currentPlaying === rid) {
            card.audioPlayer.pause();
            this.currentPlaying = null;
        }

        card.drop();
        this.cards.delete(rid);
    }

    private syncSelectionUI(): void {
        const count = this.selectedRids.size;
        const total = this.cards.size;

        this.selectionCounter.innerText = count > 0 
            ? `Selected ${count} of ${total}` 
            : `Select all (${total})`;

        this.checkBox.checked = total > 0 && count === total;
        this.checkBox.indeterminate = count > 0 && count < total;
        this.mergeBtn.style.visibility = count > 1 ? 'visible' : 'hidden';
    }

    private toggleAll(forceSelect: boolean): void {
        this.cards.forEach((card, rid) => {
            forceSelect ? card.select() : card.deselect();
            forceSelect ? this.selectedRids.add(rid) : this.selectedRids.delete(rid);
        });
        this.syncSelectionUI();
    }

    public append(meta: RecMetadata) {
        const card = new RecordingCard(meta);

        card.onselect = (isSelected: boolean) => {
            if (isSelected) {
                this.selectedRids.add(meta.rid);
            } else {
                this.selectedRids.delete(meta.rid);
            }
            this.syncSelectionUI();
        };

        card.ondelete = () => {
            this.cards.delete(meta.rid);
            this.selectedRids.delete(meta.rid); // Logic is safe even if not selected
            this.syncSelectionUI();
            this.render();
        };

        card.setOnPlay((rid: string) => {
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

    public amend(id: string, newMeta: RecMetadata) {
        const card = this.cards.get(id);
        if (card) {
            card.amend(newMeta);
        }
        this.render();
    }

    public contains(rid: string): boolean {
        return this.cards.has(rid);
    }
}

export const Recordings = new RecordingsView();
