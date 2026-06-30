(function(){
  const quickStaples=[
    {name:'Milk',category:'Dairy',location:'Fridge',quantity:1,unit:'gallon'},
    {name:'Eggs',category:'Eggs',location:'Fridge',quantity:18,unit:'each'},
    {name:'Bread',category:'Bakery',location:'Pantry',quantity:1,unit:'loaf'},
    {name:'Ground Beef',category:'Beef',location:'Freezer',quantity:1,unit:'lbs'},
    {name:'Chicken Breast',category:'Chicken',location:'Freezer',quantity:1,unit:'lbs'},
    {name:'Tortillas',category:'Bakery',location:'Pantry',quantity:1,unit:'pack'}
  ];

  let panelReady=false;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(initFamilyTools,300));
  window.addEventListener('pantrypal:refresh-family-tools',()=>renderFamilyTools());

  function initFamilyTools(){
    const hero=document.querySelector('.hero-card');
    if(!hero||document.getElementById('familyToolsCard'))return;
    const card=document.createElement('article');
    card.id='familyToolsCard';
    card.className='paper-card family-tools-card';
    card.innerHTML=`
      <div class="family-tools-header">
        <div>
          <p class="eyebrow">Family Quick Tools</p>
          <h3>Fast Pantry Actions</h3>
          <p class="muted">Built for quick phone use: common staples, expiring food, and a simple backup file.</p>
        </div>
        <span class="chip" id="familyToolsCount">Ready</span>
      </div>
      <div class="family-tools-grid">
        <section class="family-tool-box">
          <h3>Quick Add Staples</h3>
          <div class="quick-staples" id="quickStaples"></div>
          <p class="family-tool-note">Adds one common item with sensible Rush City starter defaults. Edit quantity later if needed.</p>
        </section>
        <section class="family-tool-box">
          <h3>Expiring Soon</h3>
          <div class="expiry-list" id="expirySoonList"></div>
        </section>
        <section class="family-tool-box">
          <h3>Backup</h3>
          <div class="family-backup-actions">
            <button type="button" id="exportPantryBtn">Export Pantry</button>
            <button type="button" class="secondary" id="copyGroceryBtn">Copy Grocery List</button>
          </div>
          <p class="family-tool-note">Export creates a JSON backup of current inventory plus local grocery, preference, and price data.</p>
        </section>
        <section class="family-tool-box">
          <h3>Next Best Move</h3>
          <div id="familyNextMove" class="expiry-list"></div>
        </section>
      </div>`;
    hero.insertAdjacentElement('afterend',card);
    document.getElementById('quickStaples').innerHTML=quickStaples.map((s,i)=>`<button type="button" class="secondary" data-quick-staple="${i}">${escapeHtml(s.name)}</button>`).join('');
    document.querySelectorAll('[data-quick-staple]').forEach(btn=>btn.addEventListener('click',()=>quickAddStaple(Number(btn.dataset.quickStaple))));
    document.getElementById('exportPantryBtn').addEventListener('click',exportPantryBackup);
    document.getElementById('copyGroceryBtn').addEventListener('click',copyGroceryList);
    panelReady=true;
    renderFamilyTools();
    patchRenderForFamilyTools();
  }

  function patchRenderForFamilyTools(){
    if(window.__familyToolsRenderPatched||typeof render!=='function')return;
    const originalRender=render;
    window.render=function(){
      originalRender();
      renderFamilyTools();
    };
    window.__familyToolsRenderPatched=true;
  }

  async function quickAddStaple(index){
    const staple=quickStaples[index];
    if(!staple)return;
    const row={...staple,best_by:null,notes:'Quick add staple',low_stock:false};
    try{
      if(typeof insert==='function'&&typeof load==='function'){
        await insert([row]);
        await load();
        toast(`${staple.name} added.`);
      }else{
        toast('Pantry connection is still loading. Try again in a moment.');
      }
    }catch(e){toast(e.message||'Could not add item.');}
  }

  function renderFamilyTools(){
    if(!panelReady)return;
    const safeItems=Array.isArray(items)?items:[];
    const count=document.getElementById('familyToolsCount');
    if(count)count.textContent=`${safeItems.length} item${safeItems.length===1?'':'s'}`;
    renderExpiry(safeItems);
    renderNextMove(safeItems);
  }

  function renderExpiry(safeItems){
    const el=document.getElementById('expirySoonList');
    if(!el)return;
    const today=startOfToday();
    const soon=safeItems.filter(i=>i.best_by).map(i=>{
      const d=parseLocalDate(i.best_by);
      return {...i,days:Math.ceil((d-today)/86400000)};
    }).filter(i=>Number.isFinite(i.days)&&i.days<=14).sort((a,b)=>a.days-b.days).slice(0,6);
    if(!soon.length){
      el.innerHTML='<p class="muted">Nothing with a best-by date in the next 14 days.</p>';
      return;
    }
    el.innerHTML=soon.map(i=>`<div class="expiry-row"><div><strong>${escapeHtml(i.name)}</strong><span>${escapeHtml(i.location||'Pantry')} · ${escapeHtml(String(i.quantity||''))} ${escapeHtml(i.unit||'item')} · ${escapeHtml(i.best_by||'')}</span></div><b class="expiry-badge ${i.days<=3?'soon':''}">${daysLabel(i.days)}</b></div>`).join('');
  }

  function renderNextMove(safeItems){
    const el=document.getElementById('familyNextMove');
    if(!el)return;
    const low=safeItems.filter(i=>i.low_stock).slice(0,3);
    const expiring=safeItems.filter(i=>i.best_by).map(i=>({...i,days:Math.ceil((parseLocalDate(i.best_by)-startOfToday())/86400000)})).filter(i=>Number.isFinite(i.days)&&i.days>=0&&i.days<=5).sort((a,b)=>a.days-b.days).slice(0,2);
    if(expiring.length){
      el.innerHTML=expiring.map(i=>`<div class="expiry-row"><div><strong>Use ${escapeHtml(i.name)} soon</strong><span>${escapeHtml(daysLabel(i.days))} · check recipes before shopping.</span></div><button class="small secondary" type="button" onclick="showTab('recipes')">Recipes</button></div>`).join('');
      return;
    }
    if(low.length){
      el.innerHTML=low.map(i=>`<div class="expiry-row"><div><strong>Restock ${escapeHtml(i.name)}</strong><span>${escapeHtml(i.location||'Pantry')} is marked low.</span></div><button class="small secondary" type="button" onclick="showTab('grocery')">List</button></div>`).join('');
      return;
    }
    el.innerHTML='<p class="muted">Nothing urgent. Add receipt prices or scan the next grocery trip to make PantryPal smarter.</p>';
  }

  function exportPantryBackup(){
    const backup={
      exported_at:new Date().toISOString(),
      app:'PantryPal',
      inventory:Array.isArray(items)?items:[],
      grocery_items:readLocalJson('pantrypal_grocery_items',[]),
      price_history:readLocalJson('pantrypal_price_history',[]),
      preferences:readLocalJson('pantrypal_preferences',{}),
      staple_targets:readLocalJson('pantrypal_staple_targets',[])
    };
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`pantrypal-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Backup exported.');
  }

  async function copyGroceryList(){
    const low=(Array.isArray(items)?items:[]).filter(i=>i.low_stock).map(i=>`- ${i.name} (${i.quantity} ${i.unit}, ${i.location})`);
    const manual=readLocalJson('pantrypal_grocery_items',[]).map(i=>`- ${i.name}${i.detail?' — '+i.detail:''}`);
    const text=[...low,...manual].join('\n')||'PantryPal grocery list is empty.';
    try{
      await navigator.clipboard.writeText(text);
      toast('Grocery list copied.');
    }catch{
      window.prompt('Copy grocery list:',text);
    }
  }

  function readLocalJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
  function parseLocalDate(value){const [y,m,d]=String(value||'').split('-').map(Number);return new Date(y||0,(m||1)-1,d||1);}
  function daysLabel(days){if(days<0)return `${Math.abs(days)}d past`;if(days===0)return 'today';if(days===1)return 'tomorrow';return `${days} days`;}
  function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function toast(message){
    let el=document.querySelector('.family-tools-toast');
    if(!el){el=document.createElement('div');el.className='family-tools-toast';document.body.appendChild(el);}
    el.textContent=message;
    clearTimeout(window.__familyToolsToastTimer);
    window.__familyToolsToastTimer=setTimeout(()=>el.remove(),2400);
  }
})();
