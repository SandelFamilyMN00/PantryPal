(() => {
  const cats = ['Meat','Beef','Chicken','Pork','Fish/Seafood','Dairy','Eggs','Produce','Bakery','Dry Goods','Canned Goods','Condiments','Snacks','Frozen','Beverages','Household','Paper Goods','Cleaning','Personal Care','Pet Supplies','Other'];
  const locs = ['Pantry','Fridge','Freezer','Garage Freezer','Kitchen Cupboard 1','Kitchen Cupboard 2','Kitchen Cupboard 3','Basement Fridge','Small Fridge','Small Freezer','Bathroom Closet','Laundry Room','Utility Room','Garage Shelf'];
  const units = ['item','each','lb','lbs','oz','gallon','can','box','bag','bottle','jar','pack','loaf','dozen','roll','rolls'];

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const opts = (arr, cur) => arr.map(v => `<option ${String(v).toLowerCase()===String(cur||'').toLowerCase()?'selected':''}>${esc(v)}</option>`).join('');

  const SKIP = /^\s*(?:subtotal|estimated total|savings|tax|total|payment|order #|invoice|ebt|snap|gift card|your order|order placed|order summary|pickup|delivery|sold by|walmart\.com|items? ordered|confirmation|thank you|free shipping|returns)\b/i;
  const JUNK = /^[\s\-_=|*#.]+$/;
  // The middle column from Walmart PDFs — not needed
  const NOISE = /^\s*\d+\s+(?:weight-adjusted items?|shopped)\s*$/i;

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

  // PDF column preprocessor — strips the noise column and rejoins split rows
  function preprocessPdfColumns(text){
    const lines = text.split(/\n+/)
      .map(l => l.trim())
      .filter(l => l && !NOISE.test(l));

    const out = [];
    let i = 0;
    while(i < lines.length){
      const cur  = lines[i];
      const next = lines[i + 1] || '';
      const after= lines[i + 2] || '';

      // Detect split-column PDF format: name / "Qty N" / "$X.XX"
      if(/^Qty\s+\d+/i.test(next) && /^\$?\s*\d+\.\d{2}\s*$/.test(after)){
        out.push(`${cur} ${next} ${after}`);
        i += 3;
      } else {
        out.push(cur);
        i++;
      }
    }
    return out.join('\n');
  }

  // Master parser — preprocess first, then try formats in order
  function parseWalmart(text){
    const clean = text.replace(/\r/g, '\n');
    const processed = preprocessPdfColumns(clean);

    // Format 1: "Item Name  Qty 2  $7.84" (Walmart order email / PDF after preprocessing)
    let rows = parseQtyFormat(processed);
    if(rows.length >= 1) return rows;

    // Format 2: "2 x Item Name  $7.84"
    rows = parseMultiplyFormat(clean);
    if(rows.length >= 1) return rows;

    // Format 3: Paper receipt OCR — "ITEM NAME  F  3.92  T"
    rows = parsePaperFormat(clean);
    if(rows.length >= 2) return rows;

    // Format 4: Flexible fallback
    return parseFlexFormat(clean);
  }

  // Format 1: "Item Name Qty 2 $7.84"
  function parseQtyFormat(text){
    const rows = [];
    for(const line of splitLines(text)){
      const m = line.match(/\bQty[:\s]+(\d+(?:\.\d+)?)\s+\$?\s*(\d+\.\d{2})\s*$/i);
      if(!m) continue;
      let name = cleanName(line.slice(0, m.index));
      if(!validName(name)) continue;
      push(rows, name, Number(m[1])||1, Number(m[2])||0);
    }
    return dedupe(rows);
  }

  // Format 2: "2 x Item Name $7.84"
  function parseMultiplyFormat(text){
    const rows = [];
    for(const line of splitLines(text)){
      const m = line.match(/^(\d+)\s*[xX]\s+(.+?)\s+\$?\s*(\d+\.\d{2})\s*$/);
      if(!m) continue;
      let name = cleanName(m[2]);
      if(!validName(name)) continue;
      push(rows, name, Number(m[1])||1, Number(m[3])||0);
    }
    return dedupe(rows);
  }

  // Format 3: Paper receipt — "GREAT VALUE MILK  F  3.92  T"
  function parsePaperFormat(text){
    const rows = [];
    for(const line of splitLines(text)){
      const m = line.match(/^(.+?)\s+(?:[FNXOBT]\s+)?(\d+\.\d{2})\s*[T]?\s*$/);
      if(!m) continue;
      let name = cleanName(m[1].replace(/^\d+\s+/, ''));
      if(!validName(name)) continue;
      const price = Number(m[2]);
      if(price <= 0 || price > 500) continue;
      push(rows, name, 1, price);
    }
    return dedupe(rows);
  }

  // Format 4: Flexible fallback
  function parseFlexFormat(text){
    const rows = [];
    const FOOD_HINT = /beef|chicken|pork|milk|egg|bread|cheese|banana|strawberr|avocado|lettuce|corn|pickle|pasta|sauce|mushroom|peas|fries|cracker|cookie|juice|fruit|rice|butter|yogurt|turkey|ham|bacon|toilet paper|paper towel|charmin|bounty|softener|salt|detergent|soap|trash bag|cleaner|shampoo|tortilla|gallon|frozen|snack|cereal|beverage|water|coffee/i;
    for(const line of splitLines(text)){
      const prices = [...line.matchAll(/\$?\s*(\d+\.\d{2})/g)].map(m=>Number(m[1]));
      if(!prices.length) continue;
      const price = prices[prices.length - 1];
      if(price <= 0 || price > 300) continue;
      let name = cleanName(line.replace(/\$?\s*\d+\.\d{2}/g,'').replace(/\bQty[:\s]+\d+/gi,'').replace(/^\d+\s*[xX]\s+/,''));
      if(!validName(name)) continue;
      if(!FOOD_HINT.test(name) && !FOOD_HINT.test(line)) continue;
      push(rows, name, 1, price);
    }
    return dedupe(rows);
  }

  function splitLines(text){
    return text.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x && !SKIP.test(x) && !JUNK.test(x));
  }

  function push(rows, name, qty, price){
    const category = categoryFor(name);
    const location = locationFor(name, category);
    const amount   = amountFor(name, qty, category);
    rows.push({name, quantity: qty, total_price: price, category, location, amount: amount.amount, amount_unit: amount.unit, skip: isNonFood(category)});
  }

  function validName(name){
    return name && name.length >= 2 && !/^\d+\.?\d*$/.test(name);
  }

  function cleanName(name){
    return String(name || '')
      .replace(/,\s*each\s*$/i, '')            // strip ", Each" suffix from produce
      .replace(/FlavorInstant/ig, 'Flavor Instant')
      .replace(/pack of(\d+)/ig, 'pack of $1')
      .replace(/Pack of(\d+)/ig, 'Pack of $1')
      .replace(/,([0-9]+(?:\.[0-9]+)?)(lb|oz)/ig, ', $1 $2')
      .replace(/\b\d+\s+(?:weight-adjusted items?|shopped)\b/ig, '')
      .replace(/\b(?:SNAP|EBT|eligible|Rollback|Clearance|New Low Price)\b/ig, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function isNonFood(cat){
    return ['Household','Paper Goods','Cleaning','Personal Care','Pet Supplies'].includes(cat);
  }

  function categoryFor(name){
    const s = name.toLowerCase();
    if(/toilet paper|paper towel|charmin|bounty|napkin|tissue/.test(s)) return 'Paper Goods';
    if(/detergent|bleach|dish soap|laundry|water softener|softener salt|trash bag|cleaner|lysol|windex/.test(s)) return 'Cleaning';
    if(/shampoo|conditioner|deodorant|toothpaste|body wash/.test(s)) return 'Personal Care';
    if(/dog food|cat food|pet food|cat litter|dog treat/.test(s)) return 'Pet Supplies';
    if(/soap|battery|batteries|light bulb/.test(s)) return 'Household';
    if(/ramen|noodle soup/.test(s)) return 'Snacks';
    if(/ground beef|beef|chuck|steak/.test(s)) return 'Beef';
    if(/chicken/.test(s)) return 'Chicken';
    if(/pork|bacon|ham/.test(s)) return 'Pork';
    if(/fish|shrimp|salmon|tuna/.test(s)) return 'Fish/Seafood';
    if(/milk|cheese|butter|yogurt|cream/.test(s)) return 'Dairy';
    if(/egg/.test(s)) return 'Eggs';
    if(/frozen|fries|freeze pop|funpops|ice cream/.test(s)) return 'Frozen';
    if(/banana|onion|grape|strawberr|avocado|lettuce|spinach|tomato|apple|potato|carrot|broccoli|pepper/.test(s)) return 'Produce';
    if(/bread|bun|roll|tortilla/.test(s)) return 'Bakery';
    if(/corn|mushroom|fruit cocktail|beans|canned/.test(s)) return 'Canned Goods';
    if(/sauce|pickle|dressing|salsa|ketchup|mustard|mayo/.test(s)) return 'Condiments';
    if(/cracker|cookie|cereal|granola|chips|pretzel/.test(s)) return 'Snacks';
    if(/juice|coffee|soda|water|drink|tea/.test(s)) return 'Beverages';
    if(/pasta|rice|flour|sugar|oats|salt|spice/.test(s)) return 'Dry Goods';
    return 'Dry Goods';
  }

  function locationFor(name, category){
    const s = name.toLowerCase();
    if(['Paper Goods','Cleaning'].includes(category)) return 'Utility Room';
    if(category === 'Personal Care') return 'Bathroom Closet';
    if(category === 'Pet Supplies') return 'Garage Shelf';
    if(category === 'Frozen' || /frozen|fries|peas|freeze pop|funpops|ice cream/.test(s)) return 'Freezer';
    if(['Beef','Chicken','Pork','Fish/Seafood'].includes(category)) return 'Freezer';
    if(['Dairy','Eggs'].includes(category)) return 'Fridge';
    if(category === 'Produce') return /banana|onion|potato|apple|grape/.test(s) ? 'Pantry' : 'Fridge';
    return 'Pantry';
  }

  function amountFor(name, qty, category){
    const s = name.toLowerCase();
    let m = s.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/);
    if(m) return {amount: Math.round(Number(m[1]) * qty * 100) / 100, unit: 'lb'};
    m = s.match(/(\d+(?:\.\d+)?)\s*(?:fl oz|oz)\b/);
    if(m) return {amount: Math.round(Number(m[1]) * qty * 100) / 100, unit: 'oz'};
    if(/gallon/.test(s)) return {amount: qty, unit: 'gallon'};
    if(category === 'Bakery' && /bread/.test(s)) return {amount: qty, unit: 'loaf'};
    m = s.match(/(\d+)\s*(?:count|ct|rolls?|bars|pouches|bags?)\b/i);
    if(m) return {amount: Number(m[1]) * qty, unit: 'each'};
    return {amount: qty, unit: 'each'};
  }

  function key(r){ return r.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+'|'+r.quantity+'|'+r.total_price; }
  function dedupe(rows){ const map = new Map(); rows.forEach(r=>{ if(!map.has(key(r))) map.set(key(r),r); }); return [...map.values()]; }

  function render(rows){
    const review = $('receiptReview');
    if(!rows.length){
      $('receiptStatus').textContent = 'No items found. Try pasting the full order text or email — include item names and prices.';
      $('receiptSaveBtn')?.classList.add('hidden');
      $('receiptSummary')?.classList.add('hidden');
      review.innerHTML = '';
      return;
    }
    const trackable = rows.filter(r=>!r.skip);
    const skipped   = rows.filter(r=>r.skip);
    const total     = trackable.reduce((n,r)=>n+(Number(r.total_price)||0), 0);
    $('receiptSummary')?.classList.remove('hidden');
    $('receiptSummary').innerHTML = `
      <div><small>Food items</small><strong>${trackable.length}</strong></div>
      <div><small>Non-food (unchecked)</small><strong>${skipped.length}</strong></div>
      <div><small>Food total</small><strong>$${total.toFixed(2)}</strong></div>`;
    review.innerHTML = rows.map((r,i)=>`
      <div class="receipt-row" data-i="${i}">
        <input class="receipt-save" type="checkbox" ${r.skip?'':'checked'} aria-label="Save ${esc(r.name)}">
        <input class="receipt-name" value="${esc(r.name)}">
        <input class="receipt-qty" type="number" step="0.25" value="${esc(r.quantity)}" title="Receipt Qty">
        <select class="receipt-category">${opts(cats, r.category)}</select>
        <select class="receipt-location">${opts(locs, r.location)}</select>
        <input class="receipt-price" type="number" step="0.01" value="${esc(r.total_price)}" placeholder="total $">
        <input class="receipt-amount" type="number" step="0.01" value="${esc(r.amount)}" placeholder="amount">
        <select class="receipt-amount-unit">${opts(units, r.amount_unit)}</select>
      </div>`).join('');
    $('receiptStatus').textContent = `Found ${rows.length} item(s). Non-food/household is unchecked by default. Review and save.`;
    $('receiptSaveBtn')?.classList.remove('hidden');
  }

  waitReady();
})();
