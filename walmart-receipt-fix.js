(() => {
  const cats = ['Meat','Beef','Chicken','Pork','Fish/Seafood','Dairy','Eggs','Produce','Bakery','Dry Goods','Canned Goods','Condiments','Snacks','Frozen','Beverages','Household','Other'];
  const locs = ['Pantry','Fridge','Freezer','Garage Freezer','Kitchen Cupboard 1','Kitchen Cupboard 2','Kitchen Cupboard 3','Basement Fridge','Small Fridge','Small Freezer'];
  const units = ['item','each','lb','lbs','oz','gallon','can','box','bag','bottle','jar','pack','loaf','dozen'];
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const opts = (arr, cur) => arr.map(v => `<option ${String(v).toLowerCase()===String(cur||'').toLowerCase()?'selected':''}>${esc(v)}</option>`).join('');

  function waitReady(){
    if($('receiptParseBtn') && $('receiptText') && $('receiptReview')) return wire();
    setTimeout(waitReady, 100);
  }

  function wire(){
    $('receiptParseBtn').addEventListener('click', e => {
      const text = ($('receiptText').value || '').trim();
      if(!text) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      render(parseWalmart(text));
    }, true);
  }

  function parseWalmart(text){
    const rows = [];
    const lines = String(text || '').replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    for(const line of lines){
      const m = line.match(/\bQty\s+(\d+(?:\.\d+)?)\s+\$\s*(\d+\.\d{2})\s*$/i);
      if(!m) continue;
      let name = line.slice(0, m.index).replace(/\s+\d+\s+(?:weight-adjusted items?|shopped)\s*$/i,'').trim();
      name = cleanName(name);
      if(!name || /invoice|order#|subtotal|savings|tax|total|payment/i.test(name)) continue;
      const qty = Number(m[1]) || 1;
      const price = Number(m[2]) || 0;
      const category = categoryFor(name);
      const location = locationFor(name, category);
      const amount = amountFor(name, qty, category);
      rows.push({name, quantity: qty, total_price: price, category, location, amount: amount.amount, amount_unit: amount.unit, skip: category === 'Household'});
    }
    return dedupe(rows);
  }

  function cleanName(name){
    return String(name || '')
      .replace(/FlavorInstant/ig,'Flavor Instant')
      .replace(/pack of(\d+)/ig,'pack of $1')
      .replace(/,([0-9]+(?:\.[0-9]+)?)(lb|oz)/ig,', $1 $2')
      .replace(/\b\d+\s+(?:weight-adjusted items?|shopped)\b/ig,'')
      .replace(/\s{2,}/g,' ')
      .trim();
  }

  function categoryFor(name){
    const s = name.toLowerCase();
    if(/softener|paper towel|toilet paper|charmin|detergent|soap|battery|trash bag|cat litter|pet food/.test(s)) return 'Household';
    if(/ground beef|beef|chuck|steak/.test(s)) return 'Beef';
    if(/chicken/.test(s)) return 'Chicken';
    if(/pork|bacon|ham/.test(s)) return 'Pork';
    if(/fish|shrimp|salmon|tuna/.test(s)) return 'Fish/Seafood';
    if(/milk|cheese|butter|yogurt|cream/.test(s)) return 'Dairy';
    if(/egg/.test(s)) return 'Eggs';
    if(/banana|onion|grape|strawberr|avocado|lettuce|spinach|tomato|apple|potato/.test(s)) return 'Produce';
    if(/frozen|fries|peas|freeze pop|funpops/.test(s)) return 'Frozen';
    if(/bread|bun|roll|tortilla/.test(s)) return 'Bakery';
    if(/corn|mushroom|fruit cocktail|beans/.test(s)) return 'Canned Goods';
    if(/sauce|pickle|dressing|salsa/.test(s)) return 'Condiments';
    if(/cracker|cookie|cereal|granola|ramen/.test(s)) return 'Snacks';
    if(/juice|coffee|soda|water/.test(s)) return 'Beverages';
    return 'Dry Goods';
  }

  function locationFor(name, category){
    const s = name.toLowerCase();
    if(category === 'Frozen' || /frozen|fries|peas|freeze pop|funpops/.test(s)) return 'Freezer';
    if(['Beef','Chicken','Pork','Fish/Seafood'].includes(category)) return 'Freezer';
    if(['Dairy','Eggs'].includes(category)) return 'Fridge';
    if(category === 'Produce') return /banana|onion/.test(s) ? 'Pantry' : 'Fridge';
    return 'Pantry';
  }

  function amountFor(name, qty, category){
    const s = name.toLowerCase();
    let m = s.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/);
    if(m) return {amount: Math.round(Number(m[1]) * qty * 100) / 100, unit:'lb'};
    m = s.match(/(\d+(?:\.\d+)?)\s*(?:fl oz|oz)\b/);
    if(m) return {amount: Math.round(Number(m[1]) * qty * 100) / 100, unit:'oz'};
    if(/gallon/.test(s)) return {amount: qty, unit:'gallon'};
    if(category === 'Bakery' && /bread/.test(s)) return {amount: qty, unit:'loaf'};
    m = s.match(/(\d+)\s*(?:count|ct|rolls|bars|pouches)\b/i);
    if(m) return {amount: Number(m[1]) * qty, unit:'each'};
    return {amount: qty, unit:'each'};
  }

  function key(row){ return row.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+'|'+row.quantity+'|'+row.total_price; }
  function dedupe(rows){ const map = new Map(); rows.forEach(r => { if(!map.has(key(r))) map.set(key(r), r); }); return [...map.values()]; }

  function render(rows){
    const review = $('receiptReview');
    if(!rows.length){
      $('receiptStatus').textContent = 'No Walmart item rows found. The parser now only accepts lines with Qty and a final item price.';
      $('receiptSaveBtn')?.classList.add('hidden');
      $('receiptSummary')?.classList.add('hidden');
      review.innerHTML = '';
      return;
    }
    const trackable = rows.filter(r => !r.skip);
    const skipped = rows.filter(r => r.skip);
    const total = trackable.reduce((n,r)=>n+(Number(r.total_price)||0),0);
    $('receiptSummary')?.classList.remove('hidden');
    $('receiptSummary').innerHTML = `<div><small>Trackable items</small><strong>${trackable.length}</strong></div><div><small>Skipped/non-food</small><strong>${skipped.length}</strong></div><div><small>Trackable food total</small><strong>$${total.toFixed(2)}</strong></div>`;
    review.innerHTML = rows.map((r,i)=>`
      <div class="receipt-row" data-i="${i}">
        <input class="receipt-save" type="checkbox" ${r.skip?'':'checked'} aria-label="Save ${esc(r.name)}">
        <input class="receipt-name" value="${esc(r.name)}">
        <input class="receipt-qty" type="number" step="0.25" value="${esc(r.quantity)}" title="Receipt Qty">
        <select class="receipt-category">${opts(cats,r.category)}</select>
        <select class="receipt-location">${opts(locs,r.location)}</select>
        <input class="receipt-price" type="number" step="0.01" value="${esc(r.total_price)}" placeholder="total $">
        <input class="receipt-amount" type="number" step="0.01" value="${esc(r.amount)}" placeholder="amount">
        <select class="receipt-amount-unit">${opts(units,r.amount_unit)}</select>
      </div>`).join('');
    $('receiptStatus').textContent = `Found ${rows.length} ordered Walmart item line(s). Household/non-food is unchecked by default. Review, then save.`;
    $('receiptSaveBtn')?.classList.remove('hidden');
  }

  waitReady();
})();
