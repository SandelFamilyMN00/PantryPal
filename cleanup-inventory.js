(() => {
  const CUTOFF_ISO = '2026-06-27T00:00:00-05:00';
  const CUTOFF_LABEL = 'Saturday, Jun 27, 2026 at 12:00 AM';
  const $ = id => document.getElementById(id);

  function waitForMorePanel(){
    const panel = document.querySelector('[data-panel="more"] .page-card') || document.querySelector('[data-panel="more"]');
    if(panel) return addCleanupCard(panel);
    setTimeout(waitForMorePanel, 100);
  }

  function addCleanupCard(panel){
    if($('cleanupInventoryCard')) return;
    const card = document.createElement('section');
    card.className = 'page-card';
    card.id = 'cleanupInventoryCard';
    card.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Cleanup</p>
          <h2>Remove Recent Inventory Imports</h2>
          <p class="muted">Removes pantry inventory rows created from ${CUTOFF_LABEL} through now. Use this to clear the bad Walmart receipt import rows.</p>
        </div>
      </div>
      <div class="two-col">
        <button id="previewRecentInventoryBtn" type="button" class="secondary">Preview Count</button>
        <button id="deleteRecentInventoryBtn" type="button" class="danger">Delete Saturday-to-Now Inventory</button>
      </div>
      <p id="cleanupInventoryStatus" class="status-text muted">Nothing deleted yet.</p>
    `;
    panel.appendChild(card);
    $('previewRecentInventoryBtn').addEventListener('click', previewRecentInventory);
    $('deleteRecentInventoryBtn').addEventListener('click', deleteRecentInventory);
  }

  function client(){
    return window.supabase.createClient(window.PANTRYPAL_CONFIG.SUPABASE_URL, window.PANTRYPAL_CONFIG.SUPABASE_ANON_KEY);
  }

  async function previewRecentInventory(){
    const status = $('cleanupInventoryStatus');
    status.textContent = 'Checking recent inventory rows...';
    const db = client();
    const { count, error } = await db
      .from('pantry_items')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', CUTOFF_ISO);
    if(error){ status.textContent = 'Preview error: ' + error.message; return; }
    status.textContent = `Found ${count || 0} inventory row(s) created from ${CUTOFF_LABEL} through now.`;
  }

  async function deleteRecentInventory(){
    const status = $('cleanupInventoryStatus');
    const ok = confirm(`Delete all inventory rows created from ${CUTOFF_LABEL} through now? This cannot be undone.`);
    if(!ok) return;
    status.textContent = 'Deleting recent inventory rows...';
    const db = client();
    const { data, error } = await db
      .from('pantry_items')
      .delete()
      .gte('created_at', CUTOFF_ISO)
      .select('id,name,created_at');
    if(error){ status.textContent = 'Delete error: ' + error.message; return; }
    const deleted = Array.isArray(data) ? data.length : 0;
    status.textContent = `Deleted ${deleted} inventory row(s) created from ${CUTOFF_LABEL} through now. Refresh Pantry to confirm.`;
  }

  document.addEventListener('DOMContentLoaded', waitForMorePanel);
})();
