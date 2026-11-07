// A different catalog series per app document; ordinary tab navigation never rotates it.
(() => {
 const series=[{"id":"mtg-ltr","label":"Magic · The Lord of the Rings","game":"mtg","cards":[{"name":"Gandalf the White","image":"assets/showcase/mtg-ltr-0.jpg","code":"e384c20b-d0c1-4781-9d11-e89e5a6bf3fc"},{"name":"The One Ring","image":"assets/showcase/mtg-ltr-1.jpg","code":"d5806e68-1054-458e-866d-1f2470f682b2"}]},{"id":"mtg-fra","label":"Magic · Reality Fracture","game":"mtg","cards":[{"name":"Emrakul, the Exigent Doom","image":"assets/showcase/mtg-fra-0.jpg","code":"c3ff8dd3-88a8-49dc-a59b-e2748680623c"},{"name":"Academic Ascent","image":"assets/showcase/mtg-fra-1.jpg","code":"730d8c28-1e58-4b8e-89e9-445d154d2e83"}]},{"id":"onepiece-op01","label":"One Piece · Romance Dawn","game":"onepiece","cards":[{"name":"Roronoa Zoro (025)","image":"assets/showcase/onepiece-op01-0.png","code":"OP01-025"},{"name":"Monkey.D.Luffy (024)","image":"assets/showcase/onepiece-op01-1.png","code":"OP01-024"}]},{"id":"weiss-osk","label":"Weiß Schwarz EN · Oshi no Ko Vol.2","game":"weiss","cards":[{"name":"Pride as an Actress, Kana Arima","image":"assets/showcase/weiss-osk-0.jpg","code":"OSK/S121-E001 RR"},{"name":"Which One to Choose? MEMcho","image":"assets/showcase/weiss-osk-1.jpg","code":"OSK/S121-E002 RR"}]},{"id":"rift-sfd","label":"Riftbound · Spiritforged","game":"riftbound","cards":[{"name":"Fae Porter","image":"assets/showcase/rift-sfd-0.png","code":"sfd-125-221"},{"name":"Harpoon Squad","image":"assets/showcase/rift-sfd-1.png","code":"sfd-137-221"}]},{"id":"swu-sor","label":"Star Wars: Unlimited · Spark of Rebellion","game":"swu","cards":[{"name":"Darth Vader","image":"assets/showcase/swu-sor-0.jpg","code":"087"},{"name":"Luke Skywalker","image":"assets/showcase/swu-sor-1.jpg","code":"051"}]},{"id":"pokemon-sv03","label":"Pokémon · Obsidian Flames","game":"pokemon","cards":[{"name":"Charizard ex","image":"assets/showcase/pokemon-sv03-0.webp","code":"sv03-223"},{"name":"Pidgeot ex","image":"assets/showcase/pokemon-sv03-1.webp","code":"sv03-225"}]}];
 const root=document.getElementById('home-art');if(!root)return;
 const key='cardscope.showcase.last.v1';let last,hiddenAt=0,changedAt=0;
 try{last=localStorage.getItem(key);}catch{}
 function rotate(){
  const options=series.filter(x=>x.id!==last),choice=options[Math.floor(Math.random()*options.length)]||series[0];
  last=choice.id;changedAt=Date.now();try{localStorage.setItem(key,last);}catch{}
  root.dataset.series=choice.id;root.setAttribute('aria-label','Karty: '+choice.label);
  [...root.querySelectorAll('.home-card')].forEach((img,i)=>{const card=choice.cards[i];img.alt=card.name;img.src=card.image;img.decoding='async';img.setAttribute('fetchpriority','high');});
  root.querySelector('.art-label').textContent='✧ '+choice.label;
 }
 rotate();
 // A resumed phone app may keep its document alive. Rotate only on a new visit,
 // never on an interval, collection scroll, camera navigation or a price refresh.
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();return;}
  if(hiddenAt&&Date.now()-hiddenAt>=60000&&Date.now()-changedAt>1000)rotate();
  hiddenAt=0;
 });
 window.addEventListener('pageshow',event=>{if(event.persisted&&Date.now()-changedAt>1000)rotate();});
})();
