exports.handler=async function(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY)return json(500,{error:"Missing OPENAI_API_KEY"});
 try{
  const {imageBase64,location}=JSON.parse(event.body||"{}");
  if(!imageBase64)return json(400,{error:"Missing imageBase64"});
  const prompt=`Identify visible grocery/pantry/fridge/freezer items. Return only JSON {"items":[{"name":"","category":"Produce|Dairy|Bakery|Protein|Dry Goods|Frozen|Other","quantity":"1","unit":"item","location":"${location||"Pantry"}","expiration_date":"","confidence":"high|medium|low"}]}. Do not invent expiration dates.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",input:[{role:"user",content:[{type:"input_text",text:prompt},{type:"input_image",image_url:`data:image/jpeg;base64,${imageBase64}`}]}],text:{format:{type:"json_schema",name:"pantry_scan",schema:{type:"object",additionalProperties:false,properties:{items:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},category:{type:"string"},quantity:{type:"string"},unit:{type:"string"},location:{type:"string"},expiration_date:{type:"string"},confidence:{type:"string"}},required:["name","category","quantity","unit","location","expiration_date","confidence"]}}},required:["items"]}}}})});
  const data=await r.json(); if(!r.ok)return json(r.status,{error:data.error?.message||"OpenAI error"});
  return json(200,JSON.parse(data.output_text));
 }catch(e){return json(500,{error:e.message||"Scan failed"})}
}
function json(statusCode,data){return{statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}}
