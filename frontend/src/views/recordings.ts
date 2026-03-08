import {RecMetadata, RecStates} from '../models/primitives.js'
import { RecordingCard } from '../components/RecordingCard.js';

export function RecordingsView(): HTMLElement {
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
        "merged":null
    };

    const recording = new RecordingCard(dummyRecording)
    recording.render();
    const recordingsView = document.createElement('section');
    recordingsView.classList.add("recordings-view", "stack");
    recordingsView.appendChild(recording.card);
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


// export class RcordingsView {
//     public view = document.createElement('section');
//     private header = document.createElement('header');

//     private metas = new Map<string, RecMetadata>();
//     private selection: string[] = [];

//     constructor() {
//       this.view.classList.add("recordings-view", "stack");
//     }

//     public render() {
        
//         this.metas.forEach((meta) => {
//             const card = this.constructCard(meta);
            
//         })
//     }

//     private renderHeader(): void {
//         const selectionArea = document.createElement('div');
//         const count = this.selection.length;
//         selectionArea.innerHTML = `
//             <input type="checkbox">
//             <span>Select all ${count > 0 && `(${count})`}</span>
//         `;
//       // <header>
//       //     <div>
//       //       <button>Merge</button>
//       //       <button class="immutable">Delete</button>
//       //     </div>
//       //   </header>
        
//     }
//     private constructCard(meta: RecMetadata): HTMLElement {
        
//     }
// }
