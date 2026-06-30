(function(){
  const familyProfile=window.PANTRYPAL_FAMILY_PROFILE||{
    label:'Family of 5',
    adults:2,
    children:[{age:12},{age:10},{age:8}],
    adultPortionEquivalent:4.4
  };

  const familyStarterRecipes=[
    {
      name:'Mild Beef Tacos',
      time:'25 min',
      servings:'Family of 5',
      ingredients:['ground beef','tortillas','cheese','lettuce','tomato','mild taco seasoning'],
      ingredient_lines:['2 lb ground beef','10 small tortillas','2 cups shredded cheese','2 cups chopped lettuce','1-2 diced tomatoes','1 packet mild taco seasoning'],
      uses:[['ground beef',2,'lbs'],['tortillas',10,'each'],['cheese',2,'cup']],
      steps:['Brown beef and drain.','Season with mild taco seasoning.','Serve with tortillas, cheese, lettuce, and mild toppings.']
    },
    {
      name:'Simple Spaghetti',
      time:'30 min',
      servings:'Family of 5',
      ingredients:['pasta','spaghetti sauce','ground beef','parmesan'],
      ingredient_lines:['1.5 lb ground beef','1.5 boxes pasta, about 24 oz total','2 jars spaghetti sauce, 24 oz each','1/2 cup parmesan or shredded cheese'],
      uses:[['pasta',1.5,'box'],['ground beef',1.5,'lbs']],
      steps:['Boil pasta until tender.','Brown beef and drain.','Warm sauce with cooked beef.','Combine and serve with cheese.']
    },
    {
      name:'Mild Chili',
      time:'45 min',
      servings:'Family of 5',
      ingredients:['ground beef','beans','tomato sauce','mild chili seasoning','cheese'],
      ingredient_lines:['2 lb ground beef','2 cans beans, drained','2 cans tomato sauce, 15 oz each','1 packet mild chili seasoning','1 cup shredded cheese'],
      uses:[['ground beef',2,'lbs'],['beans',2,'can']],
      steps:['Brown beef and drain.','Add beans, tomato sauce, and mild seasoning.','Simmer 20-30 minutes.','Serve with cheese.']
    },
    {
      name:'Breakfast Burritos',
      time:'20 min',
      servings:'Family of 5',
      ingredients:['eggs','tortillas','cheese','breakfast sausage'],
      ingredient_lines:['10 eggs','10 tortillas','1.5 cups shredded cheese','1 lb breakfast sausage or other mild breakfast meat'],
      uses:[['eggs',10,'each'],['tortillas',10,'each'],['cheese',1.5,'cup']],
      steps:['Cook sausage if using.','Scramble eggs.','Add cheese and cooked meat.','Wrap in tortillas.']
    },
    {
      name:'Chicken Fried Rice',
      time:'25 min',
      servings:'Family of 5',
      ingredients:['chicken','rice','eggs','mixed vegetables','soy sauce'],
      ingredient_lines:['2 lb chicken','4 cups cooked rice','3 eggs','3 cups mixed vegetables','3-4 tbsp soy sauce or mild seasoning'],
      uses:[['chicken',2,'lbs'],['rice',4,'cup'],['eggs',3,'each']],
      steps:['Cook chicken and cut into bite-size pieces.','Scramble eggs in the pan.','Stir fry rice, egg, vegetables, and chicken.','Add soy sauce or mild seasoning to taste.']
    },
    {
      name:'Cheese Quesadillas',
      time:'15 min',
      servings:'Family of 5',
      ingredients:['tortillas','cheese','chicken'],
      ingredient_lines:['10 tortillas','3 cups shredded cheese','1.5 lb cooked chicken, optional','mild salsa or sour cream on the side'],
      uses:[['tortillas',10,'each'],['cheese',3,'cup'],['chicken',1.5,'lbs']],
      steps:['Add cheese to tortillas.','Add cooked chicken if available.','Toast until melted.','Cut into wedges and serve with mild sides.']
    }
  ];

  document.addEventListener('DOMContentLoaded',patchRecipeQuantities);
  setTimeout(patchRecipeQuantities,350);

  function patchRecipeQuantities(){
    try{
      replaceStarterRecipes();
      replaceRecipeButtons();
      window.renderStarterRecipes=renderStarterRecipesWithQuantities;
      window.renderAiRecipes=renderAiRecipesWithQuantities;
      window.getRecipeIdeas=getFamilySizedRecipeIdeas;
      renderStarterRecipesWithQuantities();
    }catch(e){console.warn('PantryPal recipe quantity patch failed',e);}
  }

  function replaceStarterRecipes(){
    if(typeof starterRecipes==='undefined'||!Array.isArray(starterRecipes)||window.__familyStarterRecipesPatched)return;
    starterRecipes.splice(0,starterRecipes.length,...familyStarterRecipes);
    window.__familyStarterRecipesPatched=true;
  }

  function replaceRecipeButtons(){
    replaceButton('starterRecipeBtn',renderStarterRecipesWithQuantities);
    replaceButton('recipeBtn',getFamilySizedRecipeIdeas);
  }

  function replaceButton(id,handler){
    const oldBtn=document.getElementById(id);
    if(!oldBtn||oldBtn.dataset.quantityPatched)return;
    const newBtn=oldBtn.cloneNode(true);
    newBtn.dataset.quantityPatched='true';
    newBtn.addEventListener('click',handler);
    oldBtn.replaceWith(newBtn);
  }

  function recipeHaveMissing(recipe){
    const have=[],missing=[];
    (recipe.ingredients||[]).forEach(x=>findInventoryMatch(x)?have.push(x):missing.push(x));
    return {...recipe,have,missing};
  }

  function renderStarterRecipesWithQuantities(){
    const el=document.getElementById('recipeIdeas');
    if(!el||typeof starterRecipes==='undefined')return;
    const recipes=starterRecipes.map(recipeHaveMissing);
    el.innerHTML=recipes.map((r,idx)=>'<div class="recipe"><div class="item-head"><h3>'+esc(r.name)+'</h3><span class="pill">'+esc(r.time)+' · '+esc(r.servings||familyProfile.label)+'</span></div><p class="muted">Sized for '+esc(familyText())+'.</p><h4>Ingredient quantities</h4><ul class="ingredient-lines">'+(r.ingredient_lines||[]).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><p><strong>Have:</strong> '+(r.have.length?r.have.map(esc).join(', '):'None found yet')+'</p><p><strong>Missing:</strong> '+(r.missing.length?r.missing.map(esc).join(', '):'Nothing obvious')+'</p><ol>'+r.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><div class="button-row two-actions"><button onclick="addMissingToGrocery(starterRecipes['+idx+'].ingredients.filter(x=>!findInventoryMatch(x)))">Add Missing</button><button class="secondary" onclick="markCooked('+idx+')">Cook This</button></div></div>').join('');
    const status=document.getElementById('recipeStatus');
    if(status)status.textContent='Built-in recipes now include family-of-five quantities. No recipe websites are scraped.';
  }

  async function getFamilySizedRecipeIdeas(){
    const status=document.getElementById('recipeStatus');
    if(typeof items==='undefined'||!items.length){if(status)status.textContent='Add or scan some inventory first.';return;}
    if(status)status.textContent='Building mild family-sized ideas with quantities...';
    try{
      const inventory=items.slice(0,80).map(i=>({name:i.name,category:i.category,location:i.location,quantity:i.quantity,unit:i.unit,best_by:i.best_by,notes:i.notes}));
      const body={
        inventory,
        style:document.getElementById('recipeStyle')?.value||'mild family friendly quick dinners sized for a family of five',
        preferences:getPreferences(),
        familyProfile
      };
      const r=await fetch('/recipe-ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const raw=await r.text();
      let data;
      try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||'Server error')}
      if(!r.ok)throw new Error(data.error||'Recipe failed');
      renderAiRecipesWithQuantities(data.recipes||[]);
      if(status)status.textContent='Found '+(data.recipes||[]).length+' family-sized idea(s) with quantities.';
    }catch(e){if(status)status.textContent='Recipe error: '+e.message;}
  }

  function renderAiRecipesWithQuantities(recipes){
    const el=document.getElementById('recipeIdeas');
    if(!el)return;
    el.innerHTML=recipes.length?recipes.map(r=>{
      const ingredientLines=(r.ingredient_lines||r.ingredients||r.use||[]).map(formatIngredientLine);
      return '<div class="recipe"><div class="item-head"><h3>'+esc(r.name)+'</h3><span class="pill">'+esc(r.time||'Quick')+' · '+esc(familyProfile.label||'Family of 5')+'</span></div><p>'+esc(r.why||'')+'</p><h4>Ingredient quantities</h4><ul class="ingredient-lines">'+ingredientLines.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><p><strong>Use from pantry:</strong> '+((r.use||[]).length?(r.use||[]).map(formatIngredientLine).map(esc).join(', '):'Use available pantry matches where possible')+'</p><p><strong>Missing:</strong> '+((r.missing||[]).length?(r.missing||[]).map(formatIngredientLine).map(esc).join(', '):'Nothing obvious')+'</p><ol>'+(r.steps||[]).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></div>';
    }).join(''):'<p>No recipe ideas came back.</p>';
  }

  function formatIngredientLine(value){
    if(typeof value==='string')return value;
    if(value&&typeof value==='object')return [value.quantity,value.unit,value.name].filter(Boolean).join(' ');
    return String(value||'');
  }

  function familyText(){
    const kids=(familyProfile.children||[]).map(c=>c.age||c.label).filter(Boolean).join(', ');
    return `${familyProfile.adults||2} adults plus kids ages ${kids||'12, 10, 8'}`;
  }
})();