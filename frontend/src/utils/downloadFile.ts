export async function downloadFile(
  url: string, 
  filename: string, 
  triggerElement?: HTMLElement
): Promise<void> {
  try {
    triggerElement?.classList.add('loading');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
    const blob = await response.blob();
    
    const localUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = localUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(localUrl);

  } catch (err) {
    console.error("Generic Download Error:", err);
    throw err;
  } finally {
    triggerElement?.classList.remove('loading');
  }
}
