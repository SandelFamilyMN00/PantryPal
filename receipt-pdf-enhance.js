(() => {
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const pdfWorkerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  function $(id){ return document.getElementById(id); }

  function loadScriptOnce(src){
    if(document.querySelector('script[data-extra="'+src+'"]')) return;
    const s = document.createElement('script');
    s.src = src + '?v=3';
    s.dataset.extra = src;
    document.body.appendChild(s);
  }

  function loadExtras(){
    loadScriptOnce('cleanup-inventory.js');
    loadScriptOnce('recipe-library.js');
  }

  async function waitForReceiptUi(){
    for(let i=0;i<80;i++){
      if($('receiptFileInput') && $('receiptParseBtn') && $('receiptText')) return setupPdfSupport();
      await new Promise(r=>setTimeout(r,100));
    }
  }

  async function readPdfText(file){
    const mod = window.pdfjsLib || await import(pdfJsUrl);
    mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    window.pdfjsLib = mod;
    const pdf = await mod.getDocument({data: await file.arrayBuffer()}).promise;
    const pages = [];
    for(let pageNumber=1; pageNumber<=pdf.numPages; pageNumber++){
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      pages.push(text.items.map(item => item.str).join('\n'));
    }
    return pages.join('\n');
  }

  function setupPdfSupport(){
    const fileInput = $('receiptFileInput');
    const parseBtn = $('receiptParseBtn');
    if(!fileInput || !parseBtn) return;
    fileInput.accept = 'image/*,.pdf,application/pdf,.txt,.csv';
    if($('receiptPhotoBtn')) $('receiptPhotoBtn').textContent = 'Upload Receipt Photo / PDF';
    fileInput.addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if(!isPdf) return;
      try{
        if($('receiptFileStatus')) $('receiptFileStatus').textContent = 'Selected PDF: ' + file.name;
        if($('receiptStatus')) $('receiptStatus').textContent = 'Reading Walmart PDF receipt...';
        $('receiptText').value = await readPdfText(file);
        if($('receiptStatus')) $('receiptStatus').textContent = 'PDF loaded. Click Parse Receipt.';
      }catch(err){
        if($('receiptStatus')) $('receiptStatus').textContent = 'Could not read PDF text: ' + err.message;
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => { loadExtras(); waitForReceiptUi(); });
  if(document.readyState !== 'loading'){ loadExtras(); waitForReceiptUi(); }
})();
