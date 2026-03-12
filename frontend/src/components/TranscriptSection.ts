import { RecMetadata, RecStates, TranscriptResult } from "../models/primitives.js";
import { button } from "./button.js";
import { URL } from "../models/constants.js";
import { modalDialog } from "./modalDialog.js";

export class TranscriptionSection {
  public element: HTMLDivElement = document.createElement('div');
  private meta: RecMetadata;
  private prevState?: RecStates;
  
  private scrollContainer?: HTMLDivElement;
  private segmentElements: HTMLSpanElement[] = [];
  private transcriptData?: TranscriptResult;
  
  private activeIndex: number = -1;
  private isUserScrolling: boolean = false;
  private scrollTimeout?: number;

  public onSeekRequest?: (time: number) => void;

  constructor({ meta }: { meta: RecMetadata }) {
    this.meta = meta;
    this.element.className = 'transcription-section';
    this.prevState = meta.transcript;
    this.render();
  }

  public sync(): void {
    if (this.prevState !== this.meta.transcript) {
      this.prevState = this.meta.transcript;
      this.render();
    }
  }

  public render(): void {
    this.element.replaceChildren();
    this.element.classList.toggle('loading', this.meta.transcript === RecStates.WORKING);
    const header = document.createElement('div');

    header.className = 'transcription-header';
    header.innerHTML = `<span>Transcription</span>`;
    
    const actionsSpan = document.createElement('span');

    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'transcript-scroll';
    this.scrollContainer.addEventListener('wheel', this.handleUserScroll.bind(this), { passive: true });
    this.scrollContainer.addEventListener('touchmove', this.handleUserScroll.bind(this), { passive: true });

    if (this.meta.transcript === RecStates.OK) {
      actionsSpan.append(
        button({ label: 'SAVE SRT', classes: ['btn-small'], onClick: () => this.downloadSRT() }),
        button({ label: 'COPY', classes: ['btn-small'], onClick: () => this.copyToClipboard() })
      );
      this.fetchAndRenderTranscript();

    } else if (this.meta.transcript === RecStates.WORKING) {
      actionsSpan.append(
        button({ label: 'TRANSCRIBING...', classes: ['btn-small', 'disabled'], onClick: () => {} })
      );
      this.scrollContainer.innerHTML = `<span class="sentence muted">Processing audio data...</span>`;

    } else { // RecStates.NA
      actionsSpan.append(
        button({ label: 'TRANSCRIBE', classes: ['btn-small', 'accent'], onClick: () => this.triggerTranscription() })
      );
      this.scrollContainer.innerHTML = `<span class="sentence muted">No transcription available.</span>`;
    }

    header.appendChild(actionsSpan);
    this.element.append(header, this.scrollContainer);
  }

  private async fetchAndRenderTranscript(): Promise<void> {
    if (!this.scrollContainer) return;

    try {
      const response = await fetch(`${URL}/recordings/${this.meta.rid}/transcript`);
      if (!response.ok) throw new Error("Failed to load transcript");
      
      this.transcriptData = await response.json();
      if (!this.transcriptData || this.transcriptData.segments.length == 0) {
        this.scrollContainer.innerHTML = `<span class="sentence muted">ERROR! This audio has no speech segment to transcribe.</span>`;
        return;
      }
      this.scrollContainer.replaceChildren();

      this.segmentElements = this.transcriptData!.segments.map((seg) => {
        const span = document.createElement('span');
        span.className = 'sentence';
        span.innerText = seg.text + " ";
        
        span.style.cursor = 'pointer';
        span.onclick = () => {
          this.onSeekRequest?.(seg.start);
          this.isUserScrolling = false;
        };

        this.scrollContainer!.appendChild(span);
        return span;
      });

    } catch (err) {
      console.error(err);
      this.scrollContainer.innerHTML = `<span class="sentence muted">Failed to load transcription data.</span>`;
    }
  }

  // --- External API for AudioPlayer --- //
  public updateTime(currentTime: number): void {
    if (!this.transcriptData || this.segmentElements.length === 0) return;
    const newIndex = this.transcriptData.segments.findIndex(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );

    if (newIndex !== -1 && newIndex !== this.activeIndex) {
      if (this.activeIndex !== -1) {
        this.segmentElements[this.activeIndex].classList.remove('highlight');
      }
     
      this.segmentElements[newIndex].classList.add('highlight');
      this.activeIndex = newIndex;
      this.autoScrollToActive();
    }
  }

  // --- Internal Logics --- //
  private autoScrollToActive(): void {
    if (this.isUserScrolling || this.activeIndex === -1 || !this.scrollContainer) return;

    const activeEl = this.segmentElements[this.activeIndex];
    const container = this.scrollContainer;

    const targetScrollTop = 
      activeEl.offsetTop - 
      (container.clientHeight / 2) + 
      (activeEl.clientHeight / 2);

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }
  private handleUserScroll(): void {
    this.isUserScrolling = true;
    window.clearTimeout(this.scrollTimeout);
   
    this.scrollTimeout = window.setTimeout(() => {
      this.isUserScrolling = false;
    }, 3000);
  }

  private async triggerTranscription(): Promise<void> {
    try {
      const res = await fetch(`${URL}/recordings/${this.meta.rid}/transcribe`, { method: 'POST' });
      if (res.status === 202) {
        this.meta.transcript = RecStates.WORKING;
        this.render(); // Instantly switch to loading view
      } else if (res.status === 409) {
        modalDialog({ msg: "⚠️ Transcription already in progress.", opts: [{ label: 'OK' }] });
      } else {
        throw new Error("Server rejected request");
      }
    } catch (err) {
      modalDialog({ msg: "⚠️ Failed to start transcription.", opts: [{ label: 'OK' }] });
    }
  }

  private copyToClipboard(): void {
    if (!this.transcriptData) return;
    const fullText = this.transcriptData.segments.map(s => s.text).join(' ');
    navigator.clipboard.writeText(fullText);
    
    const copyBtn = this.element.querySelector('button:last-child') as HTMLButtonElement;
    if (copyBtn) {
      copyBtn.innerText = 'COPIED';
      setTimeout(() => copyBtn.innerText = 'COPY', 2000);
    }
  }

  public downloadSRT(): void {
    if (!this.transcriptData) return;
    
    let srtContent = '';
    this.transcriptData.segments.forEach((seg, i) => {
      srtContent += `${i + 1}\n`;
      srtContent += `${this.formatSrtTime(seg.start)} --> ${this.formatSrtTime(seg.end)}\n`;
      srtContent += `${seg.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.meta.recName}.srt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private formatSrtTime(seconds: number): string {
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
  }

  public resetScroll(): void {
    if (this.activeIndex !== -1 && this.segmentElements[this.activeIndex]) {
      this.segmentElements[this.activeIndex].classList.remove('highlight');
    }
    this.activeIndex = -1;
    this.isUserScrolling = false;

    this.scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
