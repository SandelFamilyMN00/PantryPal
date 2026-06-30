exports.handler=async function(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY)return json(500,{error:"Missing OPENAI_API_KEY in Netlify environment variables"});
 try{
  const {inventory=[],style="mild family friendly quick dinners",preferences={},familyProfile={}}=JSON.parse(event.body||"{}");
  if(!Array.isArray(inventory)||!inventory.length)return json(400,{error:"Missing inventory"});
  const compactInventory=inventory.slice(0,80).map(i=>({
   name:String(i.name||"").slice(0,80),
   category:String(i.category||"").slice(0,40),
   location:String(i.location||"").slice(0,40),
   quantity:i.quantity,
   unit:String(i.unit||"").slice(0,30),
   best_by:i.best_by||null
  })).filter(i=>i.name);

  const prefs={
   spiceLevel:String(preferences.spiceLevel||"mild"),
   dislikedIngredients:String(preferences.dislikedIngredients||"spicy foods, hot sauce, jalapenos, cayenne-heavy recipes"),
   favoriteMeals:String(preferences.favoriteMeals||"mild tacos, spaghetti, burgers, chicken rice, breakfast burritos, quesadillas"),
   dietaryNotes:String(preferences.dietaryNotes||"simple, kid-friendly, mild meals with no spicy heat")
  };

  const family={
   adults:Number(familyProfile.adults)||2,
   childAges:Array.isArray(familyProfile.children)?familyProfile.children.map(c=>Number(c.age)).filter(Boolean):[12,10,8],
   adultPortionEquivalent:Number(familyProfile.adultPortionEquivalent)||4.4,
   label:String(familyProfile.label||"Family of 5")
  };

  const prompt=`You are helping a busy parent plan simple meals from pantry inventory.

Recipe source rules:
- Do not scrape or quote recipe websites.
- Use only built-in cooking knowledge, the inventory below, and the family's saved preferences.
- Keep recipes practical and original, not copied from a site.

Family size and quantity rules:
- Plan every recipe for ${family.label}: ${family.adults} adults plus kids ages ${family.childAges.join(", ")}.
- Treat this as about ${family.adultPortionEquivalent} adult-size dinner servings.
- Every recipe MUST include ingredient_lines with exact practical quantities, such as "2 lb ground beef", "10 small tortillas", "2 cups shredded cheese", or "1 bag frozen vegetables".
- Quantities must be enough for the family size, with normal leftovers okay but not huge batch-cooking unless the style asks for it.
- The use array should also include quantity text, not just ingredient names.
- The missing array should include quantity text for any missing items.

Family preferences:
- Spice level: ${prefs.spiceLevel}
- Avoid/disliked: ${prefs.dislikedIngredients}
- Favorite meals: ${prefs.favoriteMeals}
- Dietary notes: ${prefs.dietaryNotes}
- If spice level is mild, avoid spicy foods, hot sauce, jalapenos, cayenne-heavy recipes, and high-heat chili seasoning.
- Mild taco seasoning and mild chili are allowed only when clearly labeled mild.

Suggest 4 practical recipe ideas using the provided inventory. Style: ${style}. Prefer using items on hand. It is okay to list a few missing staple ingredients. Keep steps short and realistic. Inventory JSON: ${JSON.stringify(compactInventory)}`;

  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",
   headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
   body:JSON.stringify({
    model:"gpt-4.1-mini",
    input:[{role:"user",content:[{type:"input_text",text:prompt}]}],
    text:{format:{type:"json_schema",name:"recipe_ideas",schema:{
     type:"object",
     additionalProperties:false,
     properties:{recipes:{type:"array",items:{type:"object",additionalProperties:false,properties:{
      name:{type:"string"},
      time:{type:"string"},
      why:{type:"string"},
      ingredient_lines:{type:"array",items:{type:"string"}},
      use:{type:"array",items:{type:"string"}},
      missing:{type:"array",items:{type:"string"}},
      steps:{type:"array",items:{type:"string"}}
     },required:["name","time","why","ingredient_lines","use","missing","steps"]}}},
     required:["recipes"]
    }}},
    max_output_tokens:1500
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
  if(!Array.isArray(parsed.recipes))parsed.recipes=[];
  return json(200,parsed);
 }catch(e){return json(500,{error:e.message||"Recipe ideas failed"})}
}
function json(statusCode,data){return{statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}}