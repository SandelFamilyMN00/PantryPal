(() => {
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const pdfWorkerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  const $ = id => document.getElementById(id);

  async function wait(){
    for(let i = 0; i < 80; i++){
      if($('receiptFileInput') && $('receiptStatus') && $('receiptText')) return setup();
      await new Promise(r => setTimeout(r, 100));
    }
  }

  async function pdfText(file){
    const mod = window.pdfjsLib || await import(pdfJsUrl);
    mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    window.pdfjsLib = mod;
    const pdf = await mod.getDocument({ data: await file.arrayBuffer() }).promise;
    const pageLines = [];

    for(let p = 1; p <= pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      // Group text spans by their Y position (row), tolerance 3 pts
      const rowMap = new Map();
      for(const item of content.items){
        if(!item.str || !item.str.trim()) continue;
        // PDF Y increases upward; round to nearest 3pt bucket
        const y = Math.round(item.transform[5] / 3) * 3;
        if(!rowMap.has(y)) rowMap.set(y, []);
        rowMap.get(y).push({ x: item.transform[4], str: item.str });
      }

      // Sort rows top-to-bottom (highest Y first in PDF coords)
      const sortedRows = [...rowMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, spans]) =>
          // Sort spans left-to-right within each row, join with space
          spans.sort((a, b) => a.x - b.x).map(s => s.str).join(' ').replace(/\s+/g, ' ').trim()
        )
        .filter(Boolean);

      pageLines.push(...sortedRows);
    }

    return pageLines.join('\n');
  }

  function setup(){
    const fileInput = $('receiptFileInput');
    fileInput.accept = 'image/*,.pdf,application/pdf,.txt,.csv';
    if($('receiptPhotoBtn')) $('receiptPhotoBtn').textContent = 'Upload Receipt Photo / PDF';

    // PDF only — extract text row by row into textarea, then let walmart-receipt-fix.js parse
    fileInput.addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      if(!isPdf) return;
      try {
        if($('receiptFileStatus')) $('receiptFileStatus').textContent = `Selected PDF: ${f.name}`;
        $('receiptStatus').textContent = 'Reading PDF receipt...';
        $('receiptText').value = await pdfText(f);
        $('receiptStatus').textContent = 'PDF loaded. Click Parse Receipt.';
      } catch(err){
        $('receiptStatus').textContent = 'Could not read PDF: ' + err.message;
      }
    }, true);

    loadCleanup();
  }

  function loadCleanup(){
    if(document.querySelector('script[src="cleanup-inventory.js"]')) return;
    const s = document.createElement('script');
    s.src = 'cleanup-inventory.js?v=1';
    document.body.appendChild(s);
  }

  wait();
  document.addEventListener('DOMContentLoaded', loadCleanup);
  if(document.readyState !== 'loading') loadCleanup();
})();
