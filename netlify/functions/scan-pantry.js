exports.handler=async function(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY)return json(500,{error:"Missing OPENAI_API_KEY in Netlify environment variables"});
 try{
  const {imageBase64,mimeType="image/jpeg",location="Pantry",scanMode="general"}=JSON.parse(event.body||"{}");
  if(!imageBase64)return json(400,{error:"Missing imageBase64"});

  const categoryList="Meat|Beef|Chicken|Pork|Fish/Seafood|Deli Meat|Dairy|Eggs|Produce|Bakery|Dry Goods|Canned Goods|Condiments|Snacks|Frozen|Beverages|Household|Other";
  const unitList="item|each|count|lb|lbs|oz|g|kg|jar|can|box|bag|bottle|carton|package|pack|loaf|dozen|gallon|quart|pint|cup|tbsp|tsp|fl oz";
  const modeInstruction=scanMode==="meat_label"
   ? "This is a close-up store meat label scan. Focus on product name, meat type, net weight, sell-by/use-by/best-by date, and package count if visible. For chicken breast labels, use category Chicken. For ground beef or steaks use Beef. For pork use Pork. Return the net weight as quantity and use lbs when the label says lb/lbs. If the date says sell by or use by, put that date in expiration_date in YYYY-MM-DD format when readable. If any number is blurry, use confidence low instead of guessing. Usually this should return one item."
   : "This is a general pantry/fridge/freezer scan. Identify visible grocery items. If package weight or best-by date is clearly readable, include it. Do not guess hidden label details.";
  const prompt=`${modeInstruction} Return only JSON with this shape: {"items":[{"name":"","category":"${categoryList}","quantity":"1","unit":"${unitList}","location":"${location}","expiration_date":"","confidence":"high|medium|low"}]}. Use practical grocery units like lbs, jar, can, box, bag, bottle, carton, package, pack, gallon, dozen, or item. Do not invent expiration dates.`;

  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",
   headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
   body:JSON.stringify({
    model:"gpt-4.1-mini",
    input:[{role:"user",content:[
     {type:"input_text",text:prompt},
     {type:"input_image",image_url:`data:${mimeType};base64,${imageBase64}`}
    ]}],
    text:{format:{type:"json_schema",name:"pantry_scan",schema:{
     type:"object",
     additionalProperties:false,
     properties:{items:{type:"array",items:{type:"object",additionalProperties:false,properties:{
      name:{type:"string"},
      category:{type:"string"},
      quantity:{type:"string"},
      unit:{type:"string"},
      location:{type:"string"},
      expiration_date:{type:"string"},
      confidence:{type:"string"}
     },required:["name","category","quantity","unit","location","expiration_date","confidence"]}}},
     required:["items"]
    }}},
    max_output_tokens:800
   })
  });

  const raw=await response.text();
  let data={};
  try{data=JSON.parse(raw)}catch{return json(502,{error:"OpenAI returned a non-JSON response",details:raw.slice(0,300)})}
  if(!response.ok)return json(response.status,{error:data.error?.message||"OpenAI API error"});

  const outputText=data.output_text || data.output?.flatMap(o=>o.content||[]).find(c=>c.type==="output_text")?.text;
  if(!outputText)return json(502,{error:"OpenAI response did not include output text"});

  let parsed;
  try{parsed=JSON.parse(outputText)}catch{return json(502,{error:"OpenAI output was not valid JSON",details:outputText.slice(0,300)})}
  if(!Array.isArray(parsed.items))parsed.items=[];
  return json(200,parsed);
 }catch(e){return json(500,{error:e.message||"Scan failed"})}
}
function json(statusCode,data){return{statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}}