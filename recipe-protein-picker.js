(() => {
  const PROTEIN_CATEGORIES = new Set(['Meat','Beef','Chicken','Pork','Fish/Seafood','Deli Meat','Eggs']);
  const PROTEIN_WORDS = /beef|hamburger|ground beef|chuck|steak|skirt steak|sirloin|ribeye|roast|chicken|breast|thigh|drumstick|pork|bacon|ham|sausage|turkey|fish|salmon|tuna|shrimp|egg/i;
  const $ = id => document.getElementById(id);

  function cleanProteinName(name){
    return String(name || '')
      .replace(/great value|freshness guaranteed|marketside|fresh|all natural|premium/ig,'')
      .replace(/\s{2,}/g,' ')
      .replace(/^,|,$/g,'')
      .trim();
  }

  function normalizeKey(name){
    const s = String(name || '').toLowerCase();
    if(s.includes('hamburger') || s.includes('ground beef') || s.includes('80%') || s.includes('80/20')) return 'Ground beef / hamburger';
    if(s.includes('skirt steak')) return 'Skirt steak';
    if(s.includes('steak')) return 'Steak';
    if(s.includes('chicken breast') || (s.includes('boneless') && s.includes('chicken'))) return 'Chicken breast';
    if(s.includes('chicken thigh')) return 'Chicken thighs';
    if(s.includes('chicken')) return 'Chicken';
    if(s.includes('pork')) return 'Pork';
    if(s.includes('bacon')) return 'Bacon';
    if(s.includes('ham')) return 'Ham';
    if(s.includes('turkey')) return 'Turkey';
    if(s.includes('shrimp')) return 'Shrimp';
    if(s.includes('salmon')) return 'Salmon';
    if(s.includes('fish') || s.includes('tuna')) return 'Fish';
    if(s.includes('egg')) return 'Eggs';
    return cleanProteinName(name).slice(0,56);
  }

  async function getPantryProteins(){
    if(!window.PANTRYPAL_CONFIG || !window.supabase) return [];
    const db = window.supabase.createClient(window.PANTRYPAL_CONFIG.SUPABASE_URL, window.PANTRYPAL_CONFIG.SUPABASE_ANON_KEY);
    const { data, error } = await db.from('pantry_items').select('name,category,quantity,unit,location').order('name', { ascending: true });
    if(error || !Array.isArray(data)) return [];
    const map = new Map();
    data.forEach(item => {
      const name = cleanProteinName(item.name);
      const isProtein = PROTEIN_CATEGORIES.has(item.category) || PROTEIN_WORDS.test(name);
      if(!isProtein) return;
      const label = normalizeKey(name);
      if(!label) return;
      const detail = `${item.quantity || 1} ${item.unit || 'item'} · ${item.location || 'Pantry'}`;
      if(!map.has(label)) map.set(label, { label, names: new Set(), detail: [] });
      map.get(label).names.add(name);
      map.get(label).detail.push(detail);
    });
    return [...map.values()].map(p => ({ label: p.label, value: [...p.names][0] || p.label, detail: p.detail.slice(0,2).join(' / ') }));
  }

  function setSelectOptions(select, proteins){
    const current = localStorage.getItem('pantrypal_recipe_protein') || 'any';
    const starter = [
      { label:'Any pantry protein', value:'any' },
      { label:'Ground beef / hamburger', value:'ground beef or hamburger' },
      { label:'Chicken breast', value:'chicken breast' },
      { label:'Chicken thighs', value:'chicken thighs' },
      { label:'Steak / skirt steak', value:'steak or skirt steak' },
      { label:'Pork', value:'pork' },
      { label:'Fish / seafood', value:'fish or seafood' },
      { label:'Eggs', value:'eggs' }
    ];
    const seen = new Set();
    const options = [...proteins, ...starter].filter(p => {
      const key = String(p.label).toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    select.innerHTML = options.map(p => `<option value="${escapeAttr(p.value)}" ${String(current).toLowerCase()===String(p.value).toLowerCase()?'selected':''}>${escapeHtml(p.label)}${p.detail ? ' — '+escapeHtml(p.detail) : ''}</option>`).join('');
  }

  function escapeHtml(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function escapeAttr(v){ return escapeHtml(v); }

  async function install(){
    const styleSelect = $('recipeStyle');
    const recipeBtn = $('recipeBtn');
    if(!styleSelect || !recipeBtn) return setTimeout(install, 150);

    let label = styleSelect.closest('label');
    if(label){
      label.childNodes[0].textContent = 'Main dish protein';
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.style.margin = '6px 0 0';
      hint.textContent = 'Pulled from proteins in your pantry first, with fallback choices below.';
      label.appendChild(hint);
    }

    const proteins = await getPantryProteins();
    setSelectOptions(styleSelect, proteins);

    styleSelect.addEventListener('change', () => localStorage.setItem('pantrypal_recipe_protein', styleSelect.value));
    recipeBtn.addEventListener('click', () => {
      const protein = styleSelect.value || 'any';
      localStorage.setItem('pantrypal_recipe_protein', protein);
      if(protein === 'any') styleSelect.dataset.recipeStylePrompt = 'mild family-friendly dinner using the best available pantry protein';
      else styleSelect.dataset.recipeStylePrompt = `mild family-friendly dinner using ${protein} as the main dish protein`;
    }, true);

    const originalValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if(originalValue && originalValue.get){
      Object.defineProperty(styleSelect, 'value', {
        get(){ return this.dataset.recipeStylePrompt || originalValue.get.call(this); },
        set(v){ this.dataset.recipeStylePrompt = ''; originalValue.set.call(this, v); }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', install);
  if(document.readyState !== 'loading') install();
})();
