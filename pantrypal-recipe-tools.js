(function(){
  const savedKey='pantrypal_saved_recipes';
  const cookedKey='pantrypal_cooked_recipes';
  const proteins=['Any protein from pantry','Ground beef','Chicken breast','Chicken thighs','Pork','Fish/Seafood','Eggs','Deli meat','Beans','No meat / vegetarian'];
  const cuisines=['Family comfort','Italian-ish','Mexican-ish mild','Asian-ish mild','Breakfast for dinner','Casserole / hotdish','Soup / chili mild','Grill / skillet','Cheap pantry meal','High-protein simple'];
  let ready=false;

  document.addEventListener('DOMContentLoaded',()=>setTimeout(initRecipeTools,450));

  function initRecipeTools(){
    const recipeCard=document.querySelector('.recipe-card');
    const recipeIdeas=document.getElementById('recipeIdeas');
    if(!recipeCard||!recipeIdeas||document.getElementById('recipeToolsCard'))return;
    const card=document.createElement('section');
    card.id='recipeToolsCard';
    card.className='page-card recipe-tools-card';
    card.innerHTML=`
      <div class="recipe-tools-head">
        <div>
          <p class="eyebrow">Recipe Rolodex</p>
          <h2>Fresh Family Recipe Builder</h2>
          <p class="muted">Generate a new original batch, build around one protein, and save the meals your family actually liked.</p>
        </div>
        <span id="savedRecipeCount" class="chip">0 saved</span>
      </div>
      <div class="recipe-tool-grid">
        <label>Build around protein<select id="recipeProtein"></select></label>
        <label>Meal direction<select id="recipeCuisine"></select></label>
      </div>
      <div class="recipe-action-row">
        <button id="freshRecipeBatchBtn" type="button">Fresh Batch</button>
        <button id="proteinRecipeBtn" type="button" class="secondary">Build Around Protein</button>
        <button id="savedRecipesBtn" type="button" class="secondary">Saved Favorites</button>
      </div>
      <p class="recipe-source-note"><strong>Note:</strong> PantryPal generates original recipes instead of copying internet recipes. That keeps it cleaner, less brittle, and easier to adapt to your pantry and mild family preferences.</p>
      <div class="saved-recipe-panel hidden" id="savedRecipePanel"><h3>Saved Recipes You Liked</h3><div id="savedRecipeList" class="saved-recipe-list"></div></div>`;
    recipeCard.insertBefore(card,recipeIdeas);
    fillSelect('recipeProtein',proteins,proteins[0]);
    fillSelect('recipeCuisine',cuisines,cuisines[0]);
    document.getElementById('freshRecipeBatchBtn').addEventListener('click',()=>generateFreshRecipes(false));
    document.getElementById('proteinRecipeBtn').addEventListener('click',()=>generateFreshRecipes(true));
    document.getElementById('savedRecipesBtn').addEventListener('click',toggleSavedRecipes);
    patchRecipeTabClicks();
    patchRenderAiRecipes();
    ready=true;
    updateSavedCount();
    renderSavedRecipes();
  }

  function patchRecipeTabClicks(){
    document.querySelectorAll('.tab-button[data-tab="recipes"]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        setTimeout(()=>{
          if(readSaved().length)renderSavedRecipes();
          if((Array.isArray(items)&&items.length)&&!sessionStorage.getItem('pantrypal_recipe_autofresh_done')){
            sessionStorage.setItem('pantrypal_recipe_autofresh_done','1');
            generateFreshRecipes(false);
          }
        },250);
      });
    });
  }

  function patchRenderAiRecipes(){
    if(window.__recipeToolsRenderPatch||typeof renderAiRecipes!=='function')return;
    const original=renderAiRecipes;
    window.renderAiRecipes=function(recipes){
      original(recipes);
      rememberLastRecipes(recipes||[]);
      decorateRecipeCards(recipes||[]);
    };
    window.__recipeToolsRenderPatch=true;
  }

  async function generateFreshRecipes(forceProtein){
    const safeItems=Array.isArray(items)?items:[];
    if(!safeItems.length){setRecipeStatus('Add or scan some inventory first.');return;}
    const protein=document.getElementById('recipeProtein')?.value||proteins[0];
    const cuisine=document.getElementById('recipeCuisine')?.value||cuisines[0];
    const savedNames=readSaved().map(r=>r.name).slice(0,20).join(', ');
    const cookedNames=readCooked().map(r=>r.name).slice(0,20).join(', ');
    const proteinInstruction=forceProtein&&protein!==proteins[0]?`Build every recipe around ${protein}.`:protein!==proteins[0]?`Prefer ${protein} when it makes sense.`:'Use the best available protein from inventory.';
    const style=`${cuisine}; ${proteinInstruction} Create a diverse fresh batch with different formats than these saved/cooked meals: ${savedNames||'none'} ${cookedNames||''}. Batch id ${Date.now()}. Keep it mild and family friendly.`;
    setRecipeStatus('Building a fresh original batch...');
    try{
      const inventory=safeItems.slice(0,100).map(i=>({name:i.name,category:i.category,location:i.location,quantity:i.quantity,unit:i.unit,best_by:i.best_by,notes:i.notes}));
      const prefs=typeof getPreferences==='function'?getPreferences():{};
      const response=await fetch('/recipe-ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inventory,style,preferences:prefs})});
      const raw=await response.text();
      let data;
      try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||'Server error');}
      if(!response.ok)throw new Error(data.error||'Recipe failed');
      renderRecipeBatch(data.recipes||[],{protein,cuisine});
      setRecipeStatus(`Fresh batch ready: ${(data.recipes||[]).length} idea(s).`);
    }catch(e){setRecipeStatus('Recipe error: '+(e.message||e));}
  }

  function renderRecipeBatch(recipes,context){
    rememberLastRecipes(recipes);
    const el=document.getElementById('recipeIdeas');
    if(!el)return;
    if(!recipes.length){el.innerHTML='<p class="muted">No recipes came back. Try a different protein or add more inventory.</p>';return;}
    el.innerHTML=recipes.map((r,idx)=>recipeHtml(r,idx,context)).join('');
  }

  function recipeHtml(r,idx,context){
    const use=Array.isArray(r.use)?r.use:[];
    const missing=Array.isArray(r.missing)?r.missing:[];
    const steps=Array.isArray(r.steps)?r.steps:[];
    return `<div class="recipe" data-generated-recipe="${idx}">
      <div class="item-head"><h3>${escapeHtml(r.name||'Recipe Idea')}</h3><span class="pill">${escapeHtml(r.time||'Quick')}</span></div>
      <div class="recipe-meta-line"><span>${escapeHtml(context?.protein||'Any protein')}</span><span>${escapeHtml(context?.cuisine||'Family meal')}</span><span>Mild</span></div>
      ${r.why?`<p>${escapeHtml(r.why)}</p>`:''}
      <p><strong>Use:</strong> ${use.length?use.map(escapeHtml).join(', '):'Pantry items on hand'}</p>
      <p><strong>Missing:</strong> ${missing.length?missing.map(escapeHtml).join(', '):'Nothing obvious'}</p>
      <ol>${steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol>
      <div class="button-row two-actions">
        <button class="save-liked-btn" type="button" onclick="window.PantryPalRecipeTools.saveGenerated(${idx})">Save Favorite</button>
        <button class="cook-liked-btn secondary" type="button" onclick="window.PantryPalRecipeTools.markCooked(${idx})">Cooked + Liked</button>
        <button class="secondary" type="button" onclick="addMissingToGrocery(${JSON.stringify(missing).replace(/"/g,'&quot;')})">Add Missing</button>
      </div>
    </div>`;
  }

  function decorateRecipeCards(recipes){
    const cards=document.querySelectorAll('#recipeIdeas .recipe');
    cards.forEach((card,idx)=>{
      if(card.querySelector('.save-liked-btn'))return;
      const buttons=card.querySelector('.button-row')||card;
      buttons.insertAdjacentHTML('beforeend',`<button class="save-liked-btn" type="button" onclick="window.PantryPalRecipeTools.saveGenerated(${idx})">Save Favorite</button><button class="cook-liked-btn secondary" type="button" onclick="window.PantryPalRecipeTools.markCooked(${idx})">Cooked + Liked</button>`);
    });
    rememberLastRecipes(recipes);
  }

  function rememberLastRecipes(recipes){window.__pantrypalLastRecipes=Array.isArray(recipes)?recipes:[];}
  function saveGenerated(idx){
    const recipe=(window.__pantrypalLastRecipes||[])[idx];
    if(!recipe){toast('Could not find that recipe to save.');return;}
    saveRecipe(recipe,false);
  }
  function markCookedGenerated(idx){
    const recipe=(window.__pantrypalLastRecipes||[])[idx];
    if(!recipe){toast('Could not find that recipe.');return;}
    saveRecipe(recipe,true);
  }
  function saveRecipe(recipe,cooked){
    const saved=readSaved();
    const normalized=normalizeRecipe(recipe,cooked);
    const exists=saved.find(r=>r.name.toLowerCase()===normalized.name.toLowerCase());
    if(exists){Object.assign(exists,normalized,{times_cooked:(exists.times_cooked||0)+(cooked?1:0),last_cooked:cooked?new Date().toISOString():exists.last_cooked});}
    else saved.unshift(normalized);
    localStorage.setItem(savedKey,JSON.stringify(saved.slice(0,80)));
    if(cooked){const cookedList=readCooked();cookedList.unshift({...normalized,cooked_at:new Date().toISOString()});localStorage.setItem(cookedKey,JSON.stringify(cookedList.slice(0,120)));}
    updateSavedCount();
    renderSavedRecipes();
    toast(cooked?'Saved as cooked + liked.':'Recipe saved.');
  }
  function normalizeRecipe(r,cooked){return{name:String(r.name||'Recipe Idea'),time:String(r.time||''),why:String(r.why||''),use:Array.isArray(r.use)?r.use:[],missing:Array.isArray(r.missing)?r.missing:[],steps:Array.isArray(r.steps)?r.steps:[],saved_at:new Date().toISOString(),times_cooked:cooked?1:0,last_cooked:cooked?new Date().toISOString():null};}
  function toggleSavedRecipes(){const panel=document.getElementById('savedRecipePanel');if(!panel)return;panel.classList.toggle('hidden');renderSavedRecipes();}
  function renderSavedRecipes(){
    const list=document.getElementById('savedRecipeList');
    if(!list)return;
    const saved=readSaved();
    updateSavedCount();
    if(!saved.length){list.innerHTML='<p class="muted">No saved recipes yet. Hit Save Favorite or Cooked + Liked on a recipe.</p>';return;}
    list.innerHTML=saved.slice(0,12).map((r,idx)=>`<div class="saved-recipe"><div class="saved-recipe-head"><div><h4>${escapeHtml(r.name)}</h4><p>${escapeHtml(r.time||'')} ${r.times_cooked?`· cooked ${r.times_cooked}x`:''}</p></div><button class="small secondary" type="button" onclick="window.PantryPalRecipeTools.loadSaved(${idx})">Open</button></div></div>`).join('');
  }
  function loadSaved(idx){const recipe=readSaved()[idx];if(!recipe)return;renderRecipeBatch([recipe],{protein:'Saved favorite',cuisine:'Family approved'});document.getElementById('savedRecipePanel')?.classList.add('hidden');}
  function updateSavedCount(){const el=document.getElementById('savedRecipeCount');if(el){const n=readSaved().length;el.textContent=`${n} saved`;}}
  function readSaved(){return readJson(savedKey,[]);}
  function readCooked(){return readJson(cookedKey,[]);}
  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function setRecipeStatus(msg){const el=document.getElementById('recipeStatus');if(el)el.textContent=msg;}
  function fillSelect(id,values,selected){const el=document.getElementById(id);if(el)el.innerHTML=values.map(v=>`<option value="${escapeHtml(v)}" ${v===selected?'selected':''}>${escapeHtml(v)}</option>`).join('');}
  function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function toast(message){let el=document.querySelector('.recipe-tools-toast');if(!el){el=document.createElement('div');el.className='recipe-tools-toast';document.body.appendChild(el);}el.textContent=message;clearTimeout(window.__recipeToolsToastTimer);window.__recipeToolsToastTimer=setTimeout(()=>el.remove(),2400);}
  window.PantryPalRecipeTools={saveGenerated,markCooked:markCookedGenerated,loadSaved};
})();
