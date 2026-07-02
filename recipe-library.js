(() => {
  const publicDomainRecipes = [
    {name:'Easy Chicken and Rice Casserole',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/easy-chicken-and-rice-casserole/',ingredients:['chicken','rice','mushrooms','peas','carrots','onion','butter'],uses:[['chicken',1,'lbs'],['rice',1,'cup']],steps:['Cook onion in butter until soft.','Stir in chicken, rice, vegetables, mushrooms, and liquid.','Bake covered at 350°F until rice is tender.']},
    {name:'Cheddar-Crusted Chicken',time:'30 min',sourceUrl:'https://publicdomainrecipes.com/cheddar-crusted-chicken/',ingredients:['chicken','mayonnaise','breadcrumbs','cheddar cheese'],uses:[['chicken',1,'lbs'],['cheese',1,'cup']],steps:['Coat chicken with mayonnaise.','Press into a cheddar breadcrumb mix.','Bake until cooked through and crisp.']},
    {name:'Meatloaf',time:'1 hr 40 min',sourceUrl:'https://publicdomainrecipes.com/meatloaf/',ingredients:['ground beef','onion','bread','eggs','milk','ketchup'],uses:[['ground beef',2,'lbs'],['eggs',2,'each']],steps:['Mix beef, onion, bread, eggs, milk, and mild seasoning.','Shape into a loaf or pans.','Bake and glaze near the end.']},
    {name:'Basic Meatballs',time:'35 min',sourceUrl:'https://publicdomainrecipes.com/basic-meatballs/',ingredients:['ground beef','bread crumbs','egg','milk','onion'],uses:[['ground beef',1,'lbs'],['eggs',1,'each']],steps:['Mix beef, crumbs, egg, milk, and seasoning.','Shape into meatballs.','Bake or simmer in sauce until done.']},
    {name:'Bolognese Sauce',time:'1 hr',sourceUrl:'https://publicdomainrecipes.com/bolognese-sauce/',ingredients:['ground beef','tomato sauce','onion','carrot','celery','pasta'],uses:[['ground beef',1,'lbs'],['pasta',1,'box']],steps:['Brown beef with onion and vegetables.','Add tomato sauce and simmer.','Serve over pasta.']},
    {name:'Shepherds Pie',time:'1 hr',sourceUrl:'https://publicdomainrecipes.com/shepherds-pie/',ingredients:['ground beef','potatoes','corn','peas','carrots','cheese'],uses:[['ground beef',1,'lbs'],['cheese',1,'cup']],steps:['Cook beef and vegetables.','Top with mashed potatoes.','Bake until hot and lightly browned.']},
    {name:'Hamburger Patties',time:'25 min',sourceUrl:'https://publicdomainrecipes.com/hamburger-patties/',ingredients:['ground beef','salt','pepper','buns','cheese'],uses:[['ground beef',1,'lbs'],['bread',1,'loaf']],steps:['Shape beef into patties.','Season mildly.','Cook and serve on buns or bread.']},
    {name:'Mexican Meat Loaf',time:'1 hr',sourceUrl:'https://publicdomainrecipes.com/mexican-meat-loaf/',ingredients:['ground beef','eggs','tomato sauce','corn','cheese'],uses:[['ground beef',1,'lbs'],['eggs',1,'each']],steps:['Mix beef with egg, sauce, corn, and mild seasoning.','Shape into loaf.','Bake until cooked through.']},
    {name:'Chicken Paprikash',time:'50 min',sourceUrl:'https://publicdomainrecipes.com/chicken-paprikash/',ingredients:['chicken','onion','paprika','sour cream','noodles'],uses:[['chicken',1,'lbs'],['pasta',1,'box']],steps:['Brown chicken with onion.','Simmer with paprika and broth.','Finish with sour cream and serve over noodles.']},
    {name:'Chicken Tenders Airfried',time:'25 min',sourceUrl:'https://publicdomainrecipes.com/chicken-tenders-airfried/',ingredients:['chicken','breadcrumbs','egg','flour'],uses:[['chicken',1,'lbs'],['eggs',1,'each']],steps:['Coat chicken strips in flour, egg, and crumbs.','Air fry or bake until crisp.','Serve with a mild dip.']},
    {name:'Honey Garlic Chicken with Broccoli and Brown Rice',time:'40 min',sourceUrl:'https://publicdomainrecipes.com/honey-garlic-chicken-with-broccoli-and-brown-rice/',ingredients:['chicken','rice','broccoli','honey','garlic'],uses:[['chicken',1,'lbs'],['rice',1,'cup']],steps:['Cook rice.','Cook chicken and broccoli.','Toss with a mild honey garlic sauce.']},
    {name:'Lemon and Oregano Chicken Traybake',time:'50 min',sourceUrl:'https://publicdomainrecipes.com/lemon-and-oregano-chicken-traybake/',ingredients:['chicken','potatoes','lemon','oregano','onion'],uses:[['chicken',1,'lbs']],steps:['Add chicken and potatoes to a sheet pan.','Season with lemon and oregano.','Bake until tender.']},
    {name:'One-Pot Chicken Tetrazzini',time:'35 min',sourceUrl:'https://publicdomainrecipes.com/one-pot-chicken-tetrazzini/',ingredients:['chicken','pasta','mushrooms','milk','cheese'],uses:[['chicken',1,'lbs'],['pasta',1,'box']],steps:['Cook pasta with chicken and mushrooms.','Stir in creamy sauce.','Top with cheese.']},
    {name:'Apple Chicken',time:'40 min',sourceUrl:'https://publicdomainrecipes.com/apple-chicken/',ingredients:['chicken','apple','onion','rice'],uses:[['chicken',1,'lbs'],['rice',1,'cup']],steps:['Cook chicken with onion.','Add apples for sweetness.','Serve with rice.']},
    {name:'Cheesy Pasta Bake',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/cheesy-pasta-bake/',ingredients:['pasta','cheese','milk','butter','tomato sauce'],uses:[['pasta',1,'box'],['cheese',1,'cup']],steps:['Cook pasta.','Mix with cheese sauce or tomato sauce.','Bake until bubbly.']},
    {name:'Baked Mostaccioli',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/baked-mostaccioli/',ingredients:['pasta','tomato sauce','cheese','ground beef'],uses:[['pasta',1,'box'],['ground beef',1,'lbs']],steps:['Cook pasta and beef.','Mix with sauce.','Top with cheese and bake.']},
    {name:'Simple Creamy Pasta Sauce',time:'20 min',sourceUrl:'https://publicdomainrecipes.com/simple-creamy-pasta-sauce/',ingredients:['pasta','cream','cheese','butter'],uses:[['pasta',1,'box'],['cheese',1,'cup']],steps:['Cook pasta.','Warm cream, butter, and cheese.','Toss together.']},
    {name:'Spaghetti Sauce',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/spaghetti-sauce/',ingredients:['tomato sauce','onion','garlic','ground beef','pasta'],uses:[['pasta',1,'box'],['ground beef',1,'lbs']],steps:['Brown beef and onion.','Add tomato sauce and simmer.','Serve over spaghetti.']},
    {name:'Shrimp Fettuccine Alfredo',time:'30 min',sourceUrl:'https://publicdomainrecipes.com/shrimp-fettuccine-alfredo/',ingredients:['fettuccine','shrimp','cream','cheese','butter'],uses:[['pasta',1,'box']],steps:['Cook fettuccine.','Make a creamy cheese sauce.','Add shrimp and serve.']},
    {name:'French Toast',time:'15 min',sourceUrl:'https://publicdomainrecipes.com/french-toast/',ingredients:['bread','eggs','milk','cinnamon'],uses:[['bread',4,'each'],['eggs',2,'each']],steps:['Whisk eggs and milk.','Dip bread.','Cook on a griddle until golden.']},
    {name:'Breakfast Wrap',time:'20 min',sourceUrl:'https://publicdomainrecipes.com/breakfast-wrap/',ingredients:['eggs','tortillas','cheese','breakfast meat'],uses:[['eggs',2,'each'],['tortillas',2,'each']],steps:['Scramble eggs.','Add cheese and meat if available.','Wrap in tortillas.']},
    {name:'Basic Waffles',time:'25 min',sourceUrl:'https://publicdomainrecipes.com/basic-waffles/',ingredients:['flour','eggs','milk','butter'],uses:[['eggs',2,'each'],['milk',1,'cup']],steps:['Mix batter.','Cook in waffle iron.','Serve with fruit or syrup.']},
    {name:'Hearty Breakfast Oatmeal',time:'10 min',sourceUrl:'https://publicdomainrecipes.com/hearty-breakfast-oatmeal/',ingredients:['oats','milk','banana','apple'],uses:[['milk',1,'cup']],steps:['Cook oats with milk or water.','Add fruit.','Serve warm.']},
    {name:'Potato Soup',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/potato-soup/',ingredients:['potatoes','milk','butter','onion','cheese'],uses:[['milk',1,'cup'],['cheese',1,'cup']],steps:['Simmer potatoes and onion.','Add milk and butter.','Blend or mash to desired texture.']},
    {name:'French Onion Soup',time:'1 hr',sourceUrl:'https://publicdomainrecipes.com/french-onion-soup/',ingredients:['onion','bread','cheese','broth'],uses:[['bread',2,'each'],['cheese',1,'cup']],steps:['Cook onions low and slow.','Add broth and simmer.','Top with bread and cheese.']},
    {name:'Potato Leek Soup',time:'45 min',sourceUrl:'https://publicdomainrecipes.com/potato-leek-soup/',ingredients:['potatoes','leeks','milk','butter'],uses:[['milk',1,'cup']],steps:['Cook potatoes and leeks.','Add milk or cream.','Blend until smooth.']},
    {name:'Easy Pizza Sauce',time:'15 min',sourceUrl:'https://publicdomainrecipes.com/easy-pizza-sauce/',ingredients:['tomato sauce','garlic','oregano','pasta'],uses:[['pasta',1,'box']],steps:['Simmer tomato sauce with mild seasoning.','Use for pizza, pasta, or dipping.','Store leftovers.']},
    {name:'Loaded Mexican Rice',time:'35 min',sourceUrl:'https://publicdomainrecipes.com/loaded-mexican-rice/',ingredients:['rice','corn','beans','tomato sauce','cheese'],uses:[['rice',1,'cup'],['cheese',1,'cup']],steps:['Cook rice with tomato sauce.','Stir in corn and beans.','Top with cheese.']},
    {name:'Egg Roll in a Bowl',time:'25 min',sourceUrl:'https://publicdomainrecipes.com/egg-roll-in-a-bowl/',ingredients:['ground beef','cabbage','carrots','soy sauce','rice'],uses:[['ground beef',1,'lbs'],['rice',1,'cup']],steps:['Brown meat.','Add cabbage and carrots.','Serve over rice.']},
    {name:'Banana and Oatmeal Cookies',time:'25 min',sourceUrl:'https://publicdomainrecipes.com/banana-and-oatmeal-cookies/',ingredients:['banana','oats','milk'],uses:[['milk',1,'cup']],steps:['Mash banana with oats.','Shape into cookies.','Bake until set.']}
  ];

  function safeEsc(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function matchItem(name){
    const key=String(name||'').toLowerCase();
    if(typeof items==='undefined') return null;
    return items.find(i=>String(i.name||'').toLowerCase().includes(key)||key.includes(String(i.name||'').toLowerCase()));
  }
  function renderLinkedRecipes(){
    const box=document.getElementById('recipeIdeas');
    if(!box) return;
    const recipes=publicDomainRecipes.map(r=>{const have=[],missing=[];r.ingredients.forEach(x=>matchItem(x)?have.push(x):missing.push(x));return {...r,have,missing,score:have.length};}).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
    box.innerHTML=recipes.map((r,idx)=>`<div class="recipe"><div class="item-head"><h3>${safeEsc(r.name)}</h3><span class="pill">${safeEsc(r.time)}</span></div><p><strong>Have:</strong> ${r.have.length?r.have.map(safeEsc).join(', '):'None found yet'}</p><p><strong>Missing:</strong> ${r.missing.length?r.missing.map(safeEsc).join(', '):'Nothing obvious'}</p><ol>${r.steps.map(s=>`<li>${safeEsc(s)}</li>`).join('')}</ol><p><a href="${safeEsc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open full public domain recipe</a></p><div class="button-row two-actions"><button data-pdr-add="${idx}">Add Missing</button><button class="secondary" data-pdr-cook="${idx}">Cook This</button></div></div>`).join('');
    box.querySelectorAll('[data-pdr-add]').forEach(btn=>btn.addEventListener('click',()=>{const r=recipes[Number(btn.dataset.pdrAdd)];if(typeof addMissingToGrocery==='function')addMissingToGrocery(r.ingredients.filter(x=>!matchItem(x)));}));
    box.querySelectorAll('[data-pdr-cook]').forEach(btn=>btn.addEventListener('click',async()=>{const r=recipes[Number(btn.dataset.pdrCook)];if(typeof subtractItem==='function'){for(const u of r.uses){const item=matchItem(u[0]);if(item)await subtractItem(item,Number(u[1])||1)}}}));
    const status=document.getElementById('recipeStatus');
    if(status) status.textContent=`Showing ${recipes.length} linked public-domain recipes, sorted by what you have.`;
  }
  function install(){
    if(typeof starterRecipes!=='undefined' && Array.isArray(starterRecipes)){
      starterRecipes.splice(0, starterRecipes.length, ...publicDomainRecipes.slice(0,12));
    }
    const btn=document.getElementById('starterRecipeBtn');
    if(btn){btn.textContent='Show Public Domain Recipes';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();renderLinkedRecipes();},true);}
    renderLinkedRecipes();
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,700));
  if(document.readyState!=='loading')setTimeout(install,700);
})();
