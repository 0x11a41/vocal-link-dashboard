import {RecMetadata, RecStates} from '../models/primitives.js'
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
        this.view.appendChild(this.createHeader());
        this.cards.forEach((card) => {
            card.render();
            this.view.appendChild(card.element);
        })
        this.setCount(0);
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
            this.setCount(-1);
            this.selectedRids.delete(rid);
        });
    }

    private deleteAll(): void {
        this.cards.forEach((card) => {
            card.drop();
        })
        this.setCount(-this.selectionCount);
        this.selectedRids.clear();
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


export function recordingsView(): HTMLElement {
    const dummyRecording: RecMetadata ={
        rid:"68b81008-2ea4-4a3d-9a8a-aba60e693ed9",
        recName:"20260308_085408.m4a",
        sessionId:"a0540a3a-540f-44cf-9d18-252b926025d4",
        speaker:"calcifer",
        device:"Motorola moto g84 5G",
        duration:3,
        sizeBytes:43909,
        createdAt:1772940253688,
        original:RecStates.OK,
        enhanced:RecStates.NA,
        transcript:RecStates.NA,
        merged: null
    };

    const recording = new RecordingCard(dummyRecording)
    recording.render();
    const recordingsView = document.createElement('section');
    recordingsView.classList.add("recordings-view", "stack");
    recordingsView.appendChild(recording.element);
  // recordingsView.innerHTML = `

  //       <section class="recording-card">
  //           <div class="card-header">
  //               <span class="card-left">
  //                   <input type="checkbox">
  //                   <div class="mini-meta">
  //                       <div class="title">AUD0332-UUIDA53-CE0603026.m4a</div>
  //                       <div class="details">Calcifer • Motorola moto g84 5g • Recorded at 03:12 • <span class="link">More info</span></div>
  //                       <div>
  //                           <span class="badge badge-green">ENHANCED</span>
  //                           <span class="badge badge-violet">TRANSCRIBED</span>
  //                           <span class="badge badge-blue">MERGED</span>
  //                       </div>
  //                   </div>
  //               </span>

  //               <span class="card-right">
  //                   <button>↓</button>
  //                   <button class="immutable">Delete</button>
  //                   <button>Save</button>
  //               </span>
  //           </div>
  //           <div class="full-metadata open">
  //               <div class="detail-row"><span>File Name:</span> AUD0332-UUIDA53-CE0603026.m4a</div>
  //               <div class="detail-row"><span>Size:</span> 23 MB</div>
  //               <div class="detail-row"><span>Device:</span> Motorola moto g84 5g</div>
  //               <div class="detail-row"><span>Duration:</span> 03:23 sec</div>
  //               <div class="detail-row"><span>Created at:</span> 19:03</div>
  //               <div class="detail-row"><span>Speaker:</span> Calcifer</div>
  //               <div class="detail-row"><span>Transcripted:</span> yes</div>
  //               <div class="detail-row"><span>Enhanced:</span> yes</div>
  //               <div class="detail-row"><span>Uploaded:</span> yes</div>
  //           </div>

  //           <div class="expandable open">
  //               <div class="expandable-inner">
  //                   <div class="player-panel">
  //                       <div class="player-toggle-group">
  //                           <button class="active btn-small">ORIGINAL</button>
  //                           <button class="btn-small">ENHANCED</button>
  //                       </div>

  //                       <div class="player">
  //                           <button class="accent">PLAY</button>
  //                           <span class="time-stamp">01:12</span>
  //                           <div class="progress-bar-container">
  //                               <div class="progress-fill"></div>
  //                           </div>
  //                           <span class="time-stamp">03:45</span>
  //                           <button class="btn-small">SAVE</button>
  //                       </div>
  //                   </div>

  //                   <div class="enhancement-panel">
  //                       <div class="toggle-group">
  //   												<label class="switch small">
  //   													<input type="checkbox" checked>
  //   													<span class="slider round"></span>
  //   												</label>
  //                           <span class="muted">reduce noise</span>
  //                       </div>
  //                       <div class="toggle-group">
  //   												<label class="switch small">
  //   													<input type="checkbox" checked>
  //   													<span class="slider round"></span>
  //   												</label>
  //                           <span class="muted">boost amplitude</span>
  //                       </div>
  //                       <div class="toggle-group">
  //   												<label class="switch small">
  //   													<input type="checkbox" checked>
  //   													<span class="slider round"></span>
  //   												</label>
  //                           <span class="muted">studio effect</span>
  //                       </div>
  //                       <button class="btn-enhance btn-small">ENHANCE</button>
  //                   </div>

  //                   <div class="transcription-section">
  //                       <div class="transcription-header">
  //                           <span>Transcription</span>
  //                           <span>
  //   	                        <button class="btn-small">SAVE SRT</button>
  //   	                        <button class="btn-small">COPY</button>
  //                           </span>
  //                       </div>
  //                       <div class="transcript-scroll">
  //                           <span class="sentence highlight">This is an example of a sentence-based transcription layout.</span>
  //                           <span class="sentence">The active sentence is highlighted highlighted highlighted with a side border and a subtle background color.</span>
  //                           <span class="sentence">The active sentence is with a side border and a subtle background color.</span>
  //                       </div>
  //                   </div>
  //               </div.
  //           </div>
  //       </section>
  // `;
  return recordingsView;
}
