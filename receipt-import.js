(() => {
  const receiptStyles = `
    .receipt-import-card{background:linear-gradient(180deg,#fff8eb,#f2e2c4);border:1px solid var(--line,#dfcda9);box-shadow:var(--soft,0 10px 30px rgba(49,30,12,.12));padding:14px;display:grid;gap:12px}
    .receipt-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .receipt-import-card textarea{min-height:145px;resize:vertical}
    .receipt-review{display:grid;gap:8px}
    .receipt-row{background:#fffdf6;border:1px solid #e5d6ba;padding:10px;display:grid;grid-template-columns:auto 1.3fr .65fr .7fr .7fr;gap:8px;align-items:center}
    .receipt-row input,.receipt-row select{min-height:36px;padding:7px 8px}
    .receipt-row .receipt-name{font-weight:850}
    .receipt-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .receipt-summary div{background:#fffdf6;border:1px solid #e5d6ba;padding:10px}
    .receipt-summary small{display:block;color:var(--muted,#746852);font-weight:800}
    .receipt-status{font-weight:800}
    @media(max-width:820px){.receipt-actions,.receipt-summary{grid-template-columns:1fr}.receipt-row{grid-template-columns:auto 1fr}.receipt-row > *:not(input[type=checkbox]){grid-column:2}.receipt-row label{grid-column:1 / -1}}
  `;
  const stores = ['Walmart Pine City','ALDI Pine City','Walmart Cambridge','ALDI Cambridge','Target Cambridge','Coborn’s Pine City','Jerry’s Foods North Branch','Costco Coon Rapids','Costco Woodbury'];
  const units = ['item','each','lb','lbs','oz','gallon','can','box','bag','bottle','jar','pack','loaf','dozen'];
  const locations = ['Pantry','Fridge','Freezer','Garage Freezer','Kitchen Cupboard 1','Kitchen Cupboard 2','Kitchen Cupboard 3','Basement Fridge','Small Fridge','Small Freezer'];
  const categories = ['Meat','Beef','Chicken','Pork','Fish/Seafood','Dairy','Eggs','Produce','Bakery','Dry Goods','Canned Goods','Condiments','Snacks','Frozen','Beverages','Household','Other'];
  let parsedReceiptItems = [];
  let receiptFile = null;

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function opts(arr,current){ return arr.map(v=>`<option ${String(v).toLowerCase()===String(current||'').toLowerCase()?'selected':''}>${esc(v)}</option>`).join(''); }

  function addReceiptCard(){
    if ($('receiptImportCard')) return;
    const style = document.createElement('style');
    style.textContent = receiptStyles;
    document.head.appendChild(style);

    const panel = document.querySelector('[data-panel="addscan"] .page-grid') || document.querySelector('[data-panel="addscan"]');
    if (!panel) return;
    const card = document.createElement('section');
    card.className = 'page-card receipt-import-card';
    card.id = 'receiptImportCard';
    card.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Receipt Import</p>
          <h2>Upload Store Receipt</h2>
          <p class="muted">Use Walmart, ALDI, Costco, Coborn's, or other store receipts. Review before saving to inventory and price history.</p>
        </div>
        <span class="chip">Beta</span>
      </div>
      <label>Store
        <select id="receiptStore">${opts(stores,'Walmart Pine City')}</select>
      </label>
      <label>Receipt date
        <input id="receiptDate" type="date">
      </label>
      <div class="receipt-actions">
        <button id="receiptPhotoBtn" type="button">Upload Receipt Photo</button>
        <button id="receiptParseBtn" type="button" class="secondary">Parse Receipt</button>
      </div>
      <input id="receiptFileInput" type="file" accept="image/*,.txt,.csv" class="hidden">
      <p id="receiptFileStatus" class="muted">No receipt selected yet.</p>
      <label>Digital receipt text / copied order lines
        <textarea id="receiptText" placeholder="Paste Walmart or ALDI receipt/order text here. Example: 2 Great Value 2% Milk Gallon $3.92"></textarea>
      </label>
      <p id="receiptStatus" class="receipt-status muted">Upload a receipt photo or paste digital receipt text, then parse it.</p>
      <div id="receiptSummary" class="receipt-summary hidden"></div>
      <div id="receiptReview" class="receipt-review"></div>
      <button id="receiptSaveBtn" type="button" class="hidden">Save Checked Items to Pantry + Price History</button>
    `;
    panel.prepend(card);
    const today = new Date().toISOString().slice(0,10);
    $('receiptDate').value = today;
    $('receiptPhotoBtn').addEventListener('click',()=>$('receiptFileInput').click());
    $('receiptFileInput').addEventListener('change',handleReceiptFile);
    $('receiptParseBtn').addEventListener('click',parseReceipt);
    $('receiptSaveBtn').addEventListener('click',saveReceiptItems);
  }

  async function handleReceiptFile(e){
    receiptFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if(!receiptFile) return;
    $('receiptFileStatus').textContent = `Selected: ${receiptFile.name}`;
    if(receiptFile.type.startsWith('text/') || receiptFile.name.toLowerCase().endsWith('.csv')){
      $('receiptText').value = await receiptFile.text();
      $('receiptStatus').textContent = 'Text receipt loaded. Click Parse Receipt.';
    } else {
      $('receiptStatus').textContent = 'Image selected. Click Parse Receipt. PantryPal will try the existing scan backend first; if it cannot read the receipt yet, paste the digital receipt text here.';
    }
  }

  async function parseReceipt(){
    $('receiptStatus').textContent = 'Parsing receipt...';
    const text = ($('receiptText').value || '').trim();
    if(text){
      parsedReceiptItems = parseReceiptText(text);
      renderReceiptReview(parsedReceiptItems);
      return;
    }
    if(receiptFile && receiptFile.type.startsWith('image/')){
      try{
        const imageBase64 = await imageToBase64(receiptFile);
        const res = await fetch('/scan-pantry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64,mimeType:'image/jpeg',location:'Pantry',scanMode:'receipt_import'})});
        const raw = await res.text();
        let data; try{ data = JSON.parse(raw); } catch { throw new Error(raw.slice(0,160) || 'Could not read receipt image.'); }
        if(!res.ok) throw new Error(data.error || 'Receipt scan failed.');
        parsedReceiptItems = (data.items || []).map(normalizeScanItem);
        if(!parsedReceiptItems.length) throw new Error('No items came back from the receipt image.');
        renderReceiptReview(parsedReceiptItems);
      } catch(err){
        $('receiptStatus').textContent = 'Receipt photo OCR is not fully connected yet: ' + err.message + ' Paste the digital receipt text/order lines and click Parse Receipt.';
      }
      return;
    }
    $('receiptStatus').textContent = 'Paste digital receipt text or upload a receipt photo first.';
  }

  function parseReceiptText(text){
    const lines = text.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const skip = /subtotal|estimated total|total|checkout|remove|save for later|subscribe|return|snap|gift|bought|best seller|search walmart|limited time|items$/i;
    const items = [];
    for(const raw of lines){
      if(skip.test(raw)) continue;
      const moneyMatches = [...raw.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)].map(m=>Number(m[1]));
      const hasFoodWords = /beef|chicken|milk|egg|bread|cheese|banana|strawberr|avocado|lettuce|corn|pickle|pasta|sauce|mushroom|peas|fries|cracker|cookie|juice|fruit|tortilla|rice|butter|yogurt|pork|turkey|ham|bacon/i.test(raw);
      if(!moneyMatches.length && !hasFoodWords) continue;
      let name = raw.replace(/\$\s*\d+(?:\.\d{1,2})?/g,'').replace(/\b\d+\.\d+\s*(?:ea|lb|oz|fl oz)\b/ig,'').replace(/\b(?:avg|ea|SNAP|EBT|eligible|Multiplack|Multipack|Quantity)\b.*$/i,'').replace(/\s{2,}/g,' ').trim();
      if(!name || name.length < 3) continue;
      const qtyMatch = raw.match(/^\s*(\d+)\s*[xX]?\s+(.+)/);
      let qty = qtyMatch ? Number(qtyMatch[1]) : 1;
      if(qtyMatch) name = qtyMatch[2].replace(/\$\s*\d+(?:\.\d{1,2})?/g,'').trim();
      const weight = guessAmount(raw,name);
      const totalPrice = moneyMatches.length ? moneyMatches[moneyMatches.length-1] : '';
      const category = guessCategory(name);
      const location = guessLocation(name,category);
      items.push({name,quantity:qty,unit:weight.unit==='lb'?'lbs':'item',category,location,total_price:totalPrice,amount:weight.amount || qty,amount_unit:weight.unit || 'each'});
    }
    return mergeSimilar(items).slice(0,80);
  }

  function guessAmount(raw,name){
    const s = `${raw} ${name}`.toLowerCase();
    let m = s.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/);
    if(m) return {amount:Number(m[1]),unit:'lb'};
    m = s.match(/(\d+(?:\.\d+)?)\s*(?:fl oz|oz)\b/);
    if(m) return {amount:Number(m[1]),unit:'oz'};
    if(/gallon/.test(s)) return {amount:1,unit:'gallon'};
    m = s.match(/(\d+)\s*count\b/);
    if(m) return {amount:Number(m[1]),unit:'each'};
    return {amount:1,unit:'each'};
  }
  function guessCategory(name){
    const s=name.toLowerCase();
    if(/ground beef|beef|steak/.test(s)) return 'Beef';
    if(/chicken/.test(s)) return 'Chicken';
    if(/pork|bacon|ham/.test(s)) return 'Pork';
    if(/milk|cheese|butter|yogurt/.test(s)) return 'Dairy';
    if(/egg/.test(s)) return 'Eggs';
    if(/banana|strawberr|avocado|lettuce|apple|produce/.test(s)) return 'Produce';
    if(/frozen|peas|fries/.test(s)) return 'Frozen';
    if(/bread|bun|roll/.test(s)) return 'Bakery';
    if(/corn|mushroom|fruit cocktail|can/.test(s)) return 'Canned Goods';
    if(/sauce|pickle|condiment/.test(s)) return 'Condiments';
    if(/cracker|cookie|snack/.test(s)) return 'Snacks';
    if(/salt|paper|soap|detergent|softener/.test(s)) return 'Household';
    return 'Dry Goods';
  }
  function guessLocation(name,category){
    const s=name.toLowerCase();
    if(category==='Household') return 'Pantry';
    if(category==='Frozen' || /frozen|fries|peas/.test(s)) return 'Freezer';
    if(['Beef','Chicken','Pork','Fish/Seafood'].includes(category)) return 'Freezer';
    if(['Dairy','Eggs','Produce'].includes(category) || /milk|cheese|lettuce|strawberr|avocado/.test(s)) return 'Fridge';
    return 'Pantry';
  }
  function mergeSimilar(items){
    const map = new Map();
    for(const item of items){
      const key = item.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      if(!map.has(key)) map.set(key,item); else {
        const prior = map.get(key);
        prior.quantity += item.quantity;
        if(item.total_price && prior.total_price) prior.total_price = Number(prior.total_price) + Number(item.total_price);
      }
    }
    return [...map.values()];
  }
  function normalizeScanItem(x){
    const name = x.name || x.item_name || '';
    const category = x.category || guessCategory(name);
    return {name,quantity:Number(x.quantity)||1,unit:x.unit||'item',category,location:x.location||guessLocation(name,category),total_price:x.total_price||'',amount:Number(x.weight||x.amount||x.quantity)||1,amount_unit:x.weight_unit||x.amount_unit||x.unit||'each'};
  }

  function renderReceiptReview(rows){
    const review = $('receiptReview');
    if(!rows.length){
      $('receiptStatus').textContent = 'No likely receipt items found. Try copying the Walmart order item text into the box.';
      $('receiptSaveBtn').classList.add('hidden');
      $('receiptSummary').classList.add('hidden');
      review.innerHTML = '';
      return;
    }
    const total = rows.reduce((n,r)=>n+(Number(r.total_price)||0),0);
    $('receiptSummary').classList.remove('hidden');
    $('receiptSummary').innerHTML = `<div><small>Items found</small><strong>${rows.length}</strong></div><div><small>Price data</small><strong>${total ? '$'+total.toFixed(2) : 'Review'}</strong></div><div><small>Store</small><strong>${esc($('receiptStore').value)}</strong></div>`;
    review.innerHTML = rows.map((r,i)=>`
      <div class="receipt-row" data-i="${i}">
        <input class="receipt-save" type="checkbox" ${r.category==='Household'?'':'checked'} aria-label="Save ${esc(r.name)}">
        <input class="receipt-name" value="${esc(r.name)}">
        <input class="receipt-qty" type="number" step="0.25" value="${esc(r.quantity)}" title="Quantity">
        <select class="receipt-category">${opts(categories,r.category)}</select>
        <select class="receipt-location">${opts(locations,r.location)}</select>
        <input class="receipt-price" type="number" step="0.01" value="${esc(r.total_price)}" placeholder="total $">
        <input class="receipt-amount" type="number" step="0.01" value="${esc(r.amount)}" placeholder="amount">
        <select class="receipt-amount-unit">${opts(units,r.amount_unit)}</select>
      </div>`).join('');
    $('receiptStatus').textContent = `Found ${rows.length} likely item(s). Uncheck anything you do not want in pantry inventory.`;
    $('receiptSaveBtn').classList.remove('hidden');
  }

  async function saveReceiptItems(){
    const rows = [...document.querySelectorAll('.receipt-row')].filter(row=>row.querySelector('.receipt-save').checked).map(row=>({
      name: row.querySelector('.receipt-name').value.trim(),
      quantity: Number(row.querySelector('.receipt-qty').value)||1,
      unit: row.querySelector('.receipt-amount-unit').value==='lb' ? 'lbs' : 'item',
      category: row.querySelector('.receipt-category').value,
      location: row.querySelector('.receipt-location').value,
      total_price: Number(row.querySelector('.receipt-price').value)||null,
      amount: Number(row.querySelector('.receipt-amount').value)||1,
      amount_unit: row.querySelector('.receipt-amount-unit').value
    })).filter(r=>r.name);
    if(!rows.length){ $('receiptStatus').textContent='No checked items to save.'; return; }
    $('receiptStatus').textContent = 'Saving receipt items...';
    const db = window.supabase.createClient(window.PANTRYPAL_CONFIG.SUPABASE_URL, window.PANTRYPAL_CONFIG.SUPABASE_ANON_KEY);
    const inventoryRows = rows.filter(r=>r.category !== 'Household').map(r=>({name:r.name,category:r.category,location:r.location,quantity:r.quantity,unit:r.unit,best_by:null,notes:`Imported from ${$('receiptStore').value} receipt on ${$('receiptDate').value}`,low_stock:false}));
    if(inventoryRows.length){
      const {error} = await db.from('pantry_items').insert(inventoryRows);
      if(error){ $('receiptStatus').textContent = 'Inventory save error: '+error.message; return; }
    }
    const history = JSON.parse(localStorage.getItem('pantrypal_price_history')||'[]');
    const store = $('receiptStore').value;
    const date = $('receiptDate').value || new Date().toISOString().slice(0,10);
    rows.forEach(r=>{
      if(!r.total_price) return;
      const unitPrice = r.amount ? Number(r.total_price)/Number(r.amount) : Number(r.total_price);
      history.push({normalized_name:normalizeName(r.name),item_name:r.name,store_name:store,date,amount:r.amount,unit:r.amount_unit,total_price:r.total_price,unit_price:unitPrice,source:'receipt import'});
    });
    localStorage.setItem('pantrypal_price_history',JSON.stringify(history));
    $('receiptStatus').textContent = `Saved ${inventoryRows.length} food item(s) to inventory and ${rows.filter(r=>r.total_price).length} price record(s). Refresh to see imported items in Pantry.`;
  }

  function normalizeName(name){
    const s = String(name||'').toLowerCase();
    if(s.includes('chicken')) return 'chicken breast';
    if(s.includes('ground beef') || s.includes('beef')) return 'ground beef';
    if(s.includes('milk')) return 'milk';
    if(s.includes('egg')) return 'eggs';
    if(s.includes('cheese')) return 'cheese';
    if(s.includes('bread')) return 'bread';
    return s.replace(/great value|freshness guaranteed|fresh|\d+\s*(oz|lb|count|ct)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function imageToBase64(file){
    if(window.imageToJpegBase64) return window.imageToJpegBase64(file,1280,0.82);
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener('DOMContentLoaded', addReceiptCard);
})();
