import { RecMetadata } from "../models/primitives.js";

export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss} sec`;
}

export function fmtTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date).toLowerCase(); 
}

export function fmtDate(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  
  return new Intl.DateTimeFormat('en-GB', { // 'en-GB' defaults to Day Month Year
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date).toLowerCase(); 
}

export function fmtRecordingName(meta: RecMetadata): string {
  const filename = `${meta.speaker}-${fmtTime(meta.createdAt)}-${fmtDate(meta.createdAt)}.${meta.recName.split('.').pop()}`
  return filename.replaceAll(' ', '-');
}

