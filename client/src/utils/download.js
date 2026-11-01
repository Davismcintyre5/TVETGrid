export async function downloadFromUrl(url, fileName = 'download') {
  if (!url) throw new Error('No URL provided');

  try {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // CORS or network failure — fall back to opening in a new tab
    if (err instanceof TypeError || /fetch|network/i.test(err.message || '')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    throw err;
  }
}