(() => {
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const pdfWorkerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const stores = ['Walmart Pine City','ALDI Pine City','Walmart Cambridge','ALDI Cambridge','Target Cambridge','Coborn’s Pine City','Jerry’s Foods North Branch','Costco Coon Rapids','Costco Woodbury'];
  const units = ['item','each','lb','lbs','oz','gallon','can','box','bag','bottle','jar','pack','loaf','dozen'];
  const locations = ['Pantry','Fridge','Freezer','Garage Freezer','Kitchen Cupboard 1','Kitchen Cupboard 2','Kitchen Cupboard 3','Basement Fridge','Small Fridge','Small Freezer'];
  const categories = ['Meat','Beef','Chicken','Pork','Fish/Seafood','Dairy','Eggs','Produce','Bakery','Dry Goods','Canned Goods','Condiments','Snacks','Frozen','Beverages','Household','Other'];

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function opts(arr,current){ return arr.map(v=>`<option ${String(v).toLowerCase()===String(current||'').toLowerCase()?'selected':''}>${esc(v)}</option>`).join(''); }

  async function waitForReceiptUi(){
    for(let i=0;i<60;i++){
      if($('receiptFileInput') && $('receiptParseBtn') && $('receiptText')) return true;
      await new Promise(r=>setTimeout(r,100));
    }
    return false;
  }

  async function loadPdfJs(){
    if(window.pdfjsLib) return window.pdfjsLib;
    const mod = await import(pdfJsUrl);
    mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    window.pdfjsLib = mod;
    return mod;
  }

  async function extractPdfText(file){
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    const pages = [];
    for(let p=1;p<=pdf.numPages;p++){
      const page = await pdf.getPage(p);
      const txt = await page.getTextContent();
      pages.push(txt.items.map(item=>item.str).join('\n'));
    }
    return pages.join('\n');
  }

  function setup(){
    const fileInput = $('receiptFileInput');
    const parseBtn = $('receiptParseBtn');
    if(!fileInput || !parseBtn) return;
    fileInput.accept = 'image/*,.pdf,application/pdf,.txt,.csv';
    const photoBtn = $('receiptPhotoBtn');
    if(photoBtn) photoBtn.textContent = 'Upload Receipt Photo / PDF';

    fileInput.addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if(!isPdf) return;
      const status = $('receiptStatus');
      const fileStatus = $('receiptFileStatus');
      if(fileStatus) fileStatus.textContent = `Selected PDF: ${file.name}`;
      try{
        if(status) status.textContent = 'Reading PDF receipt text...';
        const text = await extractPdfText(file);
        $('receiptText').value = cleanPdfText(text);
        if(status) status.textContent = 'PDF text loaded. Click Parse Receipt to review only the useful grocery/price lines.';
      }catch(err){
        if(status) status.textContent = 'This PDF could not be read as text. If it is a scanned image PDF, paste the digital receipt text or upload a clear receipt photo. Error: '+err.message;
      }
    }, true);

    parseBtn.addEventListener('click', e => {
      const text = ($('receiptText') && $('receiptText').value || '').trim();
      if(!text) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const rows = parseUsefulReceiptRows(text);
      renderReview(rows);
    }, true);
  }

  function cleanPdfText(text){
    return String(text||'')
      .replace(/\r/g,'\n')
      .replace(/[\t ]+/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function parseUsefulReceiptRows(text){
    const lines = cleanPdfText(text).split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const rows = [];
    const joinedPairs = [];
    for(let i=0;i<lines.length;i++){
      joinedPairs.push(lines[i]);
      if(i < lines.length-1) joinedPairs.push(`${lines[i]} ${lines[i+1]}`);
      if(i < lines.length-2) joinedPairs.push(`${lines[i]} ${lines[i+1]} ${lines[i+2]}`);
    }
    const candidates = [...new Set(joinedPairs)];
    for(const raw of candidates){
      const row = parseLine(raw);
      if(row) rows.push(row);
    }
    return mergeRows(rows).slice(0,80);
  }

  function parseLine(raw){
    let line = raw.replace(/\s+/g,' ').trim();
    if(line.length < 5 || line.length > 160) return null;
    const bad = /(subtotal|sub total|tax|sales tax|total|tender|payment|change due|visa|mastercard|discover|debit|credit|cash|balance|order number|barcode|tc#|ref#|auth|approval|store #|terminal|cashier|receipt|thank you|returns|refund|customer copy|survey|savings|you saved|delivery|pickup|bag fee|regulated fee|fuel|rounding)/i;
    if(bad.test(line)) return null;
    if(/(salt|softener|detergent|soap|shampoo|conditioner|paper towel|toilet paper|trash bag|cat litter|dog food|pet food|medicine|vitamin|battery|charcoal|propane)/i.test(line)){
      const price = lastPrice(line);
      return {name:cleanName(line),quantity:1,unit:'item',category:'Household',location:'Pantry',total_price:price,amount:1,amount_unit:'each',skip:true};
    }
    const foodish = /(beef|chuck|steak|chicken|pork|bacon|ham|turkey|fish|shrimp|milk|egg|cheese|butter|yogurt|cream|bread|bun|roll|banana|apple|strawberr|avocado|lettuce|tomato|potato|onion|corn|pea|fries|frozen|pasta|spaghetti|fettuccine|macaroni|rice|beans|sauce|salsa|pickle|mushroom|fruit|cracker|cookie|cereal|oats|flour|sugar|tortilla|juice|water|coffee|snack)/i;
    const price = lastPrice(line);
    if(!foodish && price === '') return null;
    let name = cleanName(line);
    if(!name || name.length < 3) return null;
    const qty = guessQuantity(line);
    const amount = guessAmount(line,name,qty);
    const category = guessCategory(name);
    const location = guessLocation(name,category);
    return {name,quantity:qty,unit:amount.unit==='lb'?'lbs':'item',category,location,total_price:price,amount:amount.amount,amount_unit:amount.unit};
  }

  function lastPrice(line){
    const matches = [...line.matchAll(/(?:\$\s*)?(\d+\.\d{2})\b/g)].map(m=>Number(m[1])).filter(n=>n>0 && n<1000);
    return matches.length ? matches[matches.length-1] : '';
  }

  function cleanName(line){
    return line
      .replace(/(?:\$\s*)?\d+\.\d{2}\b/g,' ')
      .replace(/\b\d+\s*@\s*\d+\.\d{2}\b/ig,' ')
      .replace(/\b(?:SNAP|EBT|FSA|HSA|TAX|TX|N|F|H|Rollback|Great Value|GV|Marketside|Freshness Guaranteed)\b/ig,' ')
      .replace(/\b\d{8,}\b/g,' ')
      .replace(/\s{2,}/g,' ')
      .replace(/^[#*\-\d\s]+/,'')
      .trim()
      .slice(0,80);
  }

  function guessQuantity(line){
    const m = line.match(/^\s*(\d{1,2})\s*(?:x|@)?\s+[a-z]/i);
    return m ? Number(m[1]) : 1;
  }
  function guessAmount(raw,name,qty){
    const s = `${raw} ${name}`.toLowerCase();
    let m = s.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/);
    if(m) return {amount:Number(m[1]),unit:'lb'};
    m = s.match(/(\d+(?:\.\d+)?)\s*(?:fl oz|oz)\b/);
    if(m) return {amount:Number(m[1]),unit:'oz'};
    if(/gallon/.test(s)) return {amount:1,unit:'gallon'};
    m = s.match(/(\d+)\s*(?:count|ct)\b/);
    if(m) return {amount:Number(m[1]),unit:'each'};
    return {amount:qty || 1,unit:'each'};
  }
  function guessCategory(name){
    const s=name.toLowerCase();
    if(/ground beef|beef|chuck|steak/.test(s)) return 'Beef';
    if(/chicken/.test(s)) return 'Chicken';
    if(/pork|bacon|ham/.test(s)) return 'Pork';
    if(/fish|shrimp|salmon|tuna/.test(s)) return 'Fish/Seafood';
    if(/milk|cheese|butter|yogurt|cream/.test(s)) return 'Dairy';
    if(/egg/.test(s)) return 'Eggs';
    if(/banana|strawberr|avocado|lettuce|tomato|apple|potato|onion|produce/.test(s)) return 'Produce';
    if(/frozen|peas|fries/.test(s)) return 'Frozen';
    if(/bread|bun|roll|tortilla/.test(s)) return 'Bakery';
    if(/corn|mushroom|fruit cocktail|beans|can/.test(s)) return 'Canned Goods';
    if(/sauce|pickle|salsa|condiment/.test(s)) return 'Condiments';
    if(/cracker|cookie|snack|cereal/.test(s)) return 'Snacks';
    if(/juice|water|coffee|soda/.test(s)) return 'Beverages';
    return 'Dry Goods';
  }
  function guessLocation(name,category){
    const s=name.toLowerCase();
    if(category==='Frozen' || /frozen|fries|peas/.test(s)) return 'Freezer';
    if(['Beef','Chicken','Pork','Fish/Seafood'].includes(category)) return 'Freezer';
    if(['Dairy','Eggs','Produce'].includes(category) || /milk|cheese|lettuce|strawberr|avocado/.test(s)) return 'Fridge';
    return 'Pantry';
  }
  function normalizeKey(name){
    const s=String(name||'').toLowerCase();
    if(s.includes('chicken')) return 'chicken breast';
    if(s.includes('ground beef') || s.includes('chuck') || s.includes('beef')) return 'ground beef';
    if(s.includes('milk')) return 'milk';
    if(s.includes('egg')) return 'eggs';
    if(s.includes('cheese')) return 'cheese';
    if(s.includes('bread')) return 'bread';
    return s.replace(/[^a-z0-9]+/g,' ').trim();
  }
  function mergeRows(rows){
    const map = new Map();
    for(const row of rows){
      const key = normalizeKey(row.name);
      if(!map.has(key)) map.set(key,row);
      else{
        const p=map.get(key);
        p.quantity += row.quantity || 1;
        if(Number(p.total_price) && Number(row.total_price)) p.total_price = Number(p.total_price)+Number(row.total_price);
      }
    }
    return [...map.values()].filter(r=>r.name && !/(subtotal|total|tax|payment)/i.test(r.name));
  }

  function renderReview(rows){
    const review = $('receiptReview');
    if(!review) return;
    if(!rows.length){
      $('receiptStatus').textContent = 'No useful grocery lines found. This can happen with image-only PDFs. Paste the digital receipt text or upload a clearer receipt photo.';
      $('receiptSaveBtn')?.classList.add('hidden');
      $('receiptSummary')?.classList.add('hidden');
      review.innerHTML = '';
      return;
    }
    const total = rows.reduce((n,r)=>n+(Number(r.total_price)||0),0);
    $('receiptSummary')?.classList.remove('hidden');
    $('receiptSummary').innerHTML = `<div><small>Trackable items</small><strong>${rows.filter(r=>!r.skip).length}</strong></div><div><small>Skipped/non-food</small><strong>${rows.filter(r=>r.skip).length}</strong></div><div><small>Food subtotal found</small><strong>${total ? '$'+total.toFixed(2) : 'Review'}</strong></div>`;
    review.innerHTML = rows.map((r,i)=>`
      <div class="receipt-row" data-i="${i}">
        <input class="receipt-save" type="checkbox" ${r.skip?'':'checked'} aria-label="Save ${esc(r.name)}">
        <input class="receipt-name" value="${esc(r.name)}">
        <input class="receipt-qty" type="number" step="0.25" value="${esc(r.quantity)}" title="Quantity">
        <select class="receipt-category">${opts(categories,r.category)}</select>
        <select class="receipt-location">${opts(locations,r.location)}</select>
        <input class="receipt-price" type="number" step="0.01" value="${esc(r.total_price)}" placeholder="total $">
        <input class="receipt-amount" type="number" step="0.01" value="${esc(r.amount)}" placeholder="amount">
        <select class="receipt-amount-unit">${opts(units,r.amount_unit)}</select>
      </div>`).join('');
    $('receiptStatus').textContent = `Found ${rows.length} likely receipt line(s). Household/non-food is unchecked by default. Review, then save.`;
    $('receiptSaveBtn')?.classList.remove('hidden');
  }

  waitForReceiptUi().then(ok=>{ if(ok) setup(); });
})();
