const cfg=window.PANTRYPAL_CONFIG;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
let items=[],scanItems=[],selectedPhotoFile=null,editingId=null;
const $=id=>document.getElementById(id);
const categories=["Dairy","Produce","Bakery","Protein","Dry Goods","Frozen","Other"];
const locations=["Fridge","Pantry","Freezer","Garage Freezer"];
init();
function init(){
 $("itemForm").addEventListener("submit",addManual);
 $("takePhotoBtn").addEventListener("click",()=>$("cameraInput").click());
 $("uploadPhotoBtn").addEventListener("click",()=>$("uploadInput").click());
 $("cameraInput").addEventListener("change",previewPhoto);
 $("uploadInput").addEventListener("change",previewPhoto);
 $("scanBtn").addEventListener("click",scanPhoto);
 $("saveScanBtn").addEventListener("click",saveScan);
 $("search").addEventListener("input",render);
 $("recipeBtn").addEventListener("click",getRecipeIdeas);
 load();
}
async function load(){
 $("status").textContent="Loading...";
 const {data,error}=await db.from("pantry_items").select("*").order("created_at",{ascending:false});
 if(error){$("status").textContent="Database error: "+error.message;return}
 items=data||[];$("status").textContent=`Connected · ${items.length} item(s)`;$("inventoryCount").textContent=`${items.length} item${items.length===1?"":"s"}`;render();
}
function readForm(){return{name:$("name").value.trim(),category:$("category").value,location:$("location").value,quantity:+$("quantity").value||1,unit:$("unit").value||"item",best_by:$("bestBy").value||null,notes:$("notes").value||"",low_stock:$("lowStock").checked}}
async function addManual(e){e.preventDefault();await insert([readForm()]);e.target.reset();$("quantity").value=1;$("unit").value="item";await load()}
async function insert(rows){const {error}=await db.from("pantry_items").insert(rows);if(error){alert(error.message);throw error}}
function render(){renderInventory();renderGroceryList()}
function renderInventory(){
 const q=$("search").value.toLowerCase();
 const list=items.filter(i=>!q||(i.name||"").toLowerCase().includes(q)||(i.location||"").toLowerCase().includes(q)||(i.category||"").toLowerCase().includes(q));
 $("inventory").innerHTML=list.length?list.map(i=>editingId===i.id?editCard(i):itemCard(i)).join(""):"<p>No matching items.</p>";
}
function itemCard(i){return `<div class="item"><div class="item-head"><div><h3>${esc(i.name)}</h3><p>${esc(i.quantity)} ${esc(i.unit)} · ${esc(i.location)} · ${esc(i.category)}</p></div>${i.low_stock?'<span class="pill">Low stock</span>':""}</div>${i.best_by?`<p class="meta">Best by: ${esc(i.best_by)}</p>`:""}${i.notes?`<p class="notes">${esc(i.notes)}</p>`:""}<div class="button-row"><button onclick="startEdit('${i.id}')">Edit</button><button class="secondary" onclick="toggleLow('${i.id}',${!i.low_stock})">${i.low_stock?"Remove from List":"Add to List"}</button><button class="danger" onclick="del('${i.id}')">Delete</button></div></div>`}
function editCard(i){return `<div class="item edit-card"><h3>Edit Item</h3><input id="edit-name-${i.id}" value="${esc(i.name)}" placeholder="Item name"><div class="grid"><select id="edit-category-${i.id}">${options(categories,i.category)}</select><select id="edit-location-${i.id}">${options(locations,i.location)}</select><input id="edit-quantity-${i.id}" type="number" step="0.25" value="${esc(i.quantity)}"><input id="edit-unit-${i.id}" value="${esc(i.unit)}"></div><input id="edit-best-${i.id}" type="date" value="${esc(i.best_by||"")}"><textarea id="edit-notes-${i.id}" placeholder="Notes">${esc(i.notes||"")}</textarea><label class="checkrow"><input id="edit-low-${i.id}" type="checkbox" ${i.low_stock?"checked":""}> Low stock / add to grocery list</label><div class="button-row two-actions"><button onclick="saveEdit('${i.id}')">Save Changes</button><button class="secondary" onclick="cancelEdit()">Cancel</button></div></div>`}
function renderGroceryList(){
 const low=items.filter(i=>i.low_stock);
 $("groceryList").innerHTML=low.length?low.map(i=>`<div class="grocery-item"><strong>${esc(i.name)}</strong><span>${esc(i.quantity)} ${esc(i.unit)} · ${esc(i.location)}</span><button class="secondary small" onclick="toggleLow('${i.id}',false)">Got it</button></div>`).join(""):"<p class='muted'>No low-stock items yet. Tap “Add to List” on an inventory item.</p>";
}
function startEdit(id){editingId=id;renderInventory()}
function cancelEdit(){editingId=null;renderInventory()}
async function saveEdit(id){
 const row={name:$(`edit-name-${id}`).value.trim(),category:$(`edit-category-${id}`).value,location:$(`edit-location-${id}`).value,quantity:+$(`edit-quantity-${id}`).value||1,unit:$(`edit-unit-${id}`).value||"item",best_by:$(`edit-best-${id}`).value||null,notes:$(`edit-notes-${id}`).value||"",low_stock:$(`edit-low-${id}`).checked};
 const {error}=await db.from("pantry_items").update(row).eq("id",id);
 if(error){alert(error.message);return}
 editingId=null;await load();
}
async function toggleLow(id,val){const {error}=await db.from("pantry_items").update({low_stock:val}).eq("id",id);if(error){alert(error.message);return}await load()}
async function del(id){if(!confirm("Delete this item from PantryPal?"))return;await db.from("pantry_items").delete().eq("id",id);await load()}
function previewPhoto(e){
 const f=e.target.files[0];
 if(!f)return;
 selectedPhotoFile=f;scanItems=[];$("scanResults").innerHTML="";$("saveScanBtn").classList.add("hidden");
 $("preview").src=URL.createObjectURL(f);$("preview").classList.remove("hidden");$("scanStatus").textContent=`Photo selected: ${f.name||"camera photo"}`;
}
async function scanPhoto(){
 const f=selectedPhotoFile;
 if(!f){$("scanStatus").textContent="Choose or take a photo first.";return}
 $("scanStatus").textContent="Preparing photo...";
 try{
  const imageBase64=await imageToJpegBase64(f,1280,0.78);
  $("scanStatus").textContent="Scanning...";
  const r=await fetch("/scan-pantry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64,mimeType:"image/jpeg",location:$("scanLocation").value})});
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||`Server returned ${r.status}`)}
  if(!r.ok)throw new Error(data.error||`Scan failed with status ${r.status}`);
  scanItems=(data.items||[]).map(x=>({name:x.name||"",category:x.category||"Other",location:x.location||$("scanLocation").value,quantity:Number(x.quantity)||1,unit:x.unit||"item",best_by:x.expiration_date||x.best_by||null,notes:x.confidence?`AI confidence: ${x.confidence}`:"",low_stock:false}));
  renderScan();$("scanStatus").textContent=`Found ${scanItems.length} item(s). Review before saving.`;
 }catch(e){$("scanStatus").textContent="Scan error: "+e.message}
}
function renderScan(){
 $("scanResults").innerHTML=scanItems.map((i,n)=>`<div class="scan-card" data-i="${n}"><label class="checkrow"><input class="save" type="checkbox" checked> Save</label><input class="n" value="${esc(i.name)}" placeholder="Name"><div class="grid"><select class="c">${options(categories,i.category)}</select><select class="l">${options(locations,i.location)}</select><input class="q" type="number" step="0.25" value="${esc(i.quantity)}"><input class="u" value="${esc(i.unit)}"></div><input class="b" type="date" value="${esc(i.best_by||"")}"><textarea class="notes-input" placeholder="Notes">${esc(i.notes||"")}</textarea><label class="checkrow"><input class="low" type="checkbox"> Low stock / add to grocery list</label></div>`).join("");
 $("saveScanBtn").classList.remove("hidden");
}
async function saveScan(){
 const rows=[...document.querySelectorAll(".scan-card")].filter(c=>c.querySelector(".save").checked).map(c=>({name:c.querySelector(".n").value.trim(),category:c.querySelector(".c").value,quantity:+c.querySelector(".q").value||1,unit:c.querySelector(".u").value||"item",location:c.querySelector(".l").value,best_by:c.querySelector(".b").value||null,notes:c.querySelector(".notes-input").value||"",low_stock:c.querySelector(".low").checked})).filter(r=>r.name);
 if(!rows.length){$("scanStatus").textContent="No checked items to save.";return}
 await insert(rows);$("scanResults").innerHTML="";$("saveScanBtn").classList.add("hidden");$("scanStatus").textContent=`Saved ${rows.length} item(s).`;await load();
}
async function getRecipeIdeas(){
 if(!items.length){$("recipeStatus").textContent="Add or scan some inventory first.";return}
 $("recipeStatus").textContent="Building ideas from your inventory...";
 $("recipeIdeas").innerHTML="";
 try{
  const inventory=items.slice(0,80).map(i=>({name:i.name,category:i.category,location:i.location,quantity:i.quantity,unit:i.unit,best_by:i.best_by,notes:i.notes}));
  const r=await fetch("/recipe-ideas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inventory,style:$("recipeStyle").value})});
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||`Server returned ${r.status}`)}
  if(!r.ok)throw new Error(data.error||`Recipe request failed with status ${r.status}`);
  renderRecipes(data.recipes||[]);
  $("recipeStatus").textContent=`Found ${(data.recipes||[]).length} idea(s).`;
 }catch(e){$("recipeStatus").textContent="Recipe error: "+e.message}
}
function renderRecipes(recipes){
 $("recipeIdeas").innerHTML=recipes.length?recipes.map(r=>`<div class="recipe"><div class="item-head"><h3>${esc(r.name)}</h3><span class="pill">${esc(r.time||"Quick")}</span></div><p>${esc(r.why||"")}</p><p><strong>Use:</strong> ${(r.use||[]).map(esc).join(", ")}</p>${(r.missing||[]).length?`<p><strong>Missing:</strong> ${r.missing.map(esc).join(", ")}</p>`:`<p><strong>Missing:</strong> Nothing obvious</p>`}<ol>${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>`).join(""):"<p class='muted'>No recipe ideas came back. Add a few more useful ingredients and try again.</p>";
}
function imageToJpegBase64(file,maxSize=1280,quality=0.78){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{try{let {width,height}=img;const scale=Math.min(1,maxSize/Math.max(width,height));width=Math.round(width*scale);height=Math.round(height*scale);const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,width,height);URL.revokeObjectURL(url);resolve(canvas.toDataURL("image/jpeg",quality).split(",")[1])}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image"))};img.src=url})}
function options(arr,current){return arr.map(v=>`<option ${String(v).toLowerCase()===String(current||"").toLowerCase()?"selected":""}>${esc(v)}</option>`).join("")}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}