exports.handler=async function(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY)return json(500,{error:"Missing OPENAI_API_KEY in Netlify environment variables"});
 try{
  const {imageBase64,mimeType="image/jpeg",location="Pantry"}=JSON.parse(event.body||"{}");
  if(!imageBase64)return json(400,{error:"Missing imageBase64"});

  const prompt=`Identify visible grocery, pantry, fridge, or freezer items in this image. Return only JSON with this shape: {"items":[{"name":"","category":"Produce|Dairy|Bakery|Protein|Dry Goods|Frozen|Other","quantity":"1","unit":"item","location":"${location}","expiration_date":"","confidence":"high|medium|low"}]}. Do not invent expiration dates.`;

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