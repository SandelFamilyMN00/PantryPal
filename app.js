const cfg=window.PANTRYPAL_CONFIG;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
let items=[],scanItems=[],selectedPhotoFile=null;
const $=id=>document.getElementById(id);
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
 load();
}
async function load(){
 $("status").textContent="Loading...";
 const {data,error}=await db.from("pantry_items").select("*").order("created_at",{ascending:false});
 if(error){$("status").textContent="Database error: "+error.message;return}
 items=data||[];$("status").textContent="Connected";render();
}
function readForm(){return{name:$("name").value,category:$("category").value,location:$("location").value,quantity:+$("quantity").value||1,unit:$("unit").value||"item",best_by:$("bestBy").value||null,notes:$("notes").value||"",low_stock:$("lowStock").checked}}
async function addManual(e){e.preventDefault();await insert([readForm()]);e.target.reset();$("quantity").value=1;$("unit").value="item";await load()}
async function insert(rows){const {error}=await db.from("pantry_items").insert(rows);if(error){alert(error.message);throw error}}
function render(){
 const q=$("search").value.toLowerCase();
 const list=items.filter(i=>!q||(i.name||"").toLowerCase().includes(q));
 $("inventory").innerHTML=list.length?list.map(i=>`<div class="item"><h3>${esc(i.name)}</h3><p>${esc(i.quantity)} ${esc(i.unit)} · ${esc(i.location)} · ${esc(i.category)}</p>${i.best_by?`<p>Best by: ${esc(i.best_by)}</p>`:""}<button onclick="del('${i.id}')">Delete</button></div>`).join(""):"<p>No matching items.</p>";
}
async function del(id){await db.from("pantry_items").delete().eq("id",id);await load()}
function previewPhoto(e){
 const f=e.target.files[0];
 if(!f)return;
 selectedPhotoFile=f;
 scanItems=[];
 $("scanResults").innerHTML="";
 $("saveScanBtn").classList.add("hidden");
 $("preview").src=URL.createObjectURL(f);
 $("preview").classList.remove("hidden");
 $("scanStatus").textContent=`Photo selected: ${f.name||"camera photo"}`;
}
async function scanPhoto(){
 const f=selectedPhotoFile;
 if(!f){$("scanStatus").textContent="Choose or take a photo first.";return}
 $("scanStatus").textContent="Preparing photo...";
 try{
  const imageBase64=await imageToJpegBase64(f,1280,0.78);
  $("scanStatus").textContent="Scanning...";
  const r=await fetch("/scan-pantry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64,mimeType:"image/jpeg",location:$("scanLocation").value})});
  const raw=await r.text();
  let data;
  try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||`Server returned ${r.status}`)}
  if(!r.ok)throw new Error(data.error||`Scan failed with status ${r.status}`);
  scanItems=(data.items||[]).map(x=>({name:x.name||"",category:x.category||"Other",location:x.location||$("scanLocation").value,quantity:Number(x.quantity)||1,unit:x.unit||"item",best_by:x.expiration_date||x.best_by||null,notes:x.confidence?`AI confidence: ${x.confidence}`:"",low_stock:false}));
  renderScan();$("scanStatus").textContent=`Found ${scanItems.length} item(s).`;
 }catch(e){$("scanStatus").textContent="Scan error: "+e.message}
}
function renderScan(){
 $("scanResults").innerHTML=scanItems.map((i,n)=>`<div class="scan-card" data-i="${n}"><label><input class="save" type="checkbox" checked> Save</label><div class="grid"><input class="n" value="${esc(i.name)}"><input class="c" value="${esc(i.category)}"><input class="q" type="number" value="${esc(i.quantity)}"><input class="u" value="${esc(i.unit)}"></div></div>`).join("");
 $("saveScanBtn").classList.remove("hidden");
}
async function saveScan(){
 const rows=[...document.querySelectorAll(".scan-card")].filter(c=>c.querySelector(".save").checked).map(c=>{const i=scanItems[+c.dataset.i];return{name:c.querySelector(".n").value,category:c.querySelector(".c").value,quantity:+c.querySelector(".q").value||1,unit:c.querySelector(".u").value,location:i.location||$("scanLocation").value,best_by:i.best_by||null,notes:i.notes||"",low_stock:false}});
 await insert(rows);$("scanResults").innerHTML="";$("saveScanBtn").classList.add("hidden");await load();
}
function imageToJpegBase64(file,maxSize=1280,quality=0.78){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  const url=URL.createObjectURL(file);
  img.onload=()=>{
   try{
    let {width,height}=img;
    const scale=Math.min(1,maxSize/Math.max(width,height));
    width=Math.round(width*scale);height=Math.round(height*scale);
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");
    ctx.drawImage(img,0,0,width,height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg",quality).split(",")[1]);
   }catch(e){URL.revokeObjectURL(url);reject(e)}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image"))};
  img.src=url;
 });
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}