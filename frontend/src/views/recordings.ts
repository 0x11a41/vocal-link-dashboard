import {RecMetadata } from '../models/primitives.js'
import { RecordingCard } from '../components/RecordingCard.js';
import { button } from '../components/button.js';
import { checkbox } from '../components/checkbox.js';
import { modalDialog } from '../components/modalDialog.js';
import { URL } from '../models/constants.js';

class RecordingsView {
    public view = document.createElement('section');

    private cards = new Map<string, RecordingCard>();

    private selectionCount = 0;
    private selectionCounter = document.createElement('span');
    private selectedRids = new Set<string>();
    private checkBox: HTMLInputElement;
    private mergeBtn: HTMLButtonElement;

    constructor() {
      this.view.classList.add("recordings-view", "stack");
      this.checkBox = checkbox({
            onCheck: (isChecked) => {
                this.cards.forEach((card) => {
                    if (isChecked) { card.select() }
                    else { card.deselect() }
                })
            }
        });

        this.mergeBtn = button({
            label: "Merge",
            onClick: async () => { await this.mergeSelected() },
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
            this.setCount(0);
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
                    msg: this.selectionCount > 0 ?
                    'Proceed to permenantly delete SELECTED recordings?' :
                    "Are you sure you want to delete ALL recordings?",
                    opts: [
                        {label: 'Cancel'},
                        {label: 'Proceed', handler: () => {
                            if (this.selectionCount > 0) this.deleteSelected()
                            else this.deleteAll();
                        }}
                    ]
                })
            }
        }));

        header.append(selectionArea, buttons);
        return header;
    }

    private resetSelection(): void {
        this.cards.forEach((card) => card.deselect());
        this.checkBox.checked = false;
        this.setCount(-this.selectionCount);
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
        this.selectedRids.forEach((rid) => {
            const card = this.cards.get(rid);
            card?.drop();
            this.cards.delete(rid);
        });

        this.selectedRids.clear();
        this.setCount(-this.selectionCount);
    
        this.render();
    }

    private deleteAll(): void {
        this.cards.forEach((card) => {
            card.drop();
        });
    
        this.cards.clear();
        this.selectedRids.clear();
        this.setCount(-this.selectionCount);
    
        this.render();
    }

    private setCount(step: number): void {
        this.selectionCount += step;
        this.selectionCounter.innerText = `Select all (${this.selectionCount})`
        if (this.selectionCount == this.cards.size) {
            this.checkBox.checked = true;
        } else {
            this.checkBox.checked = false;
        }

        if (this.selectionCount > 1) {
            this.mergeBtn.style.visibility = 'visible';
        } else {
            this.mergeBtn.style.visibility = 'hidden';
        }
    }

    public append(meta: RecMetadata) {
        const card = new RecordingCard(meta);
        card.onDelete = () => {
            this.cards.delete(meta.rid);
            if (this.selectedRids.has(meta.rid)) {
                this.selectedRids.delete(meta.rid);
                this.setCount(-1);
            }
            this.render();
        }
        card.onSelect = (isSelected: boolean) => {
            if (isSelected) {
                this.setCount(+1);
                this.selectedRids.add(meta.rid);
            } else {
                this.setCount(-1);
                this.selectedRids.delete(meta.rid);
            }
        }
        this.cards.set(meta.rid, card);
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




  // <div class="transcription-section">
  //     <div class="transcription-header">
  //         <span>Transcription</span>
  //         <span>
  //           <button class="btn-small">SAVE SRT</button>
  //           <button class="btn-small">COPY</button>
  //         </span>
  //     </div>
  //     <div class="transcript-scroll">
  //         <span class="sentence highlight">This is an example of a sentence-based transcription layout.</span>
  //         <span class="sentence">The active sentence is highlighted highlighted highlighted with a side border and a subtle background color.</span>
  //         <span class="sentence">The active sentence is with a side border and a subtle background color.</span>
  //     </div>
  // </div>
