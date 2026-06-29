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
    const out = [];
    for(let p = 1; p <= pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const txt = await page.getTextContent();
      out.push(txt.items.map(x => x.str).join('\n'));
    }
    return out.join('\n');
  }

  function setup(){
    const fileInput = $('receiptFileInput');

    // Expand file input to accept PDFs
    fileInput.accept = 'image/*,.pdf,application/pdf,.txt,.csv';
    if($('receiptPhotoBtn')) $('receiptPhotoBtn').textContent = 'Upload Receipt Photo / PDF';

    // PDF only — extract text into textarea, then let walmart-receipt-fix.js parse it
    fileInput.addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      if(!isPdf) return; // non-PDFs handled by receipt-import.js
      try {
        if($('receiptFileStatus')) $('receiptFileStatus').textContent = `Selected PDF: ${f.name}`;
        $('receiptStatus').textContent = 'Reading PDF receipt...';
        $('receiptText').value = await pdfText(f);
        $('receiptStatus').textContent = 'PDF text extracted. Click Parse Receipt.';
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
