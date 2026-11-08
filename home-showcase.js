// A different catalog series per app document; ordinary tab navigation never rotates it.
(() => {
 const series=[{"id":"mtg-ltr","label":"Magic · The Lord of the Rings","game":"mtg","cards":[{"name":"Gandalf the White","code":"e384c20b-d0c1-4781-9d11-e89e5a6bf3fc","rarity":"Mythic Rare","image":"assets/showcase-rare/mtg-ltr-0.jpg"},{"name":"The One Ring","code":"d5806e68-1054-458e-866d-1f2470f682b2","rarity":"Mythic Rare","image":"assets/showcase-rare/mtg-ltr-1.jpg"}]},{"id":"mtg-fra","label":"Magic · Reality Fracture","game":"mtg","cards":[{"name":"Emrakul, the Exigent Doom","code":"c3ff8dd3-88a8-49dc-a59b-e2748680623c","rarity":"Mythic Rare","image":"assets/showcase-rare/mtg-fra-0.jpg"},{"name":"Chandra, Chill of Compliance","code":"240f58ab-944c-4f4c-9df9-5f40b132bf3e","rarity":"Mythic Rare","image":"assets/showcase-rare/mtg-fra-1.jpg"}]},{"id":"onepiece-op01","label":"One Piece · Romance Dawn","game":"onepiece","cards":[{"name":"Shanks (Parallel) (Manga) (Alternate Art)","code":"OP01-120_p2","rarity":"Secret Rare","image":"assets/showcase-rare/onepiece-op01-0.jpg"},{"name":"Yamato (Parallel)","code":"OP01-121_p1","rarity":"Secret Rare","image":"assets/showcase-rare/onepiece-op01-1.jpg"}]},{"id":"weiss-osk","label":"Weiß Schwarz EN · Oshi no Ko Vol.2","game":"weiss","cards":[{"name":"Pride as an Actress, Kana Arima (SP)","code":"OSK/S121-E001SP SP","rarity":"Special Rare","image":"assets/showcase-rare/weiss-osk-0.jpg"},{"name":"Which One to Choose? MEMcho (SSP)","code":"OSK/S121-E002SSP SSP","rarity":"Super Special Rare","image":"assets/showcase-rare/weiss-osk-1.jpg"}]},{"id":"weiss-bav","label":"Weiß Schwarz JP · Blue Archive","game":"weiss-jp","cards":[{"name":"飛鳥馬トキ","code":"BAV/W112-108SP","rarity":"SP","image":"assets/showcase-rare/weiss-bav-0.jpg"},{"name":"聖園ミカ","code":"BAV/W112-003SP","rarity":"SP","image":"assets/showcase-rare/weiss-bav-1.jpg"}]},{"id":"rift-sfd","label":"Riftbound · Spiritforged","game":"riftbound","cards":[{"name":"Ezreal - Prodigy (Alternate Art)","code":"sfd-149a-221","rarity":"Showcase","image":"assets/showcase-rare/rift-sfd-0.png"},{"name":"Aphelios - Exalted (Signature)","code":"sfd-224*-221","rarity":"Showcase","image":"assets/showcase-rare/rift-sfd-1.png"}]},{"id":"swu-sor","label":"Star Wars: Unlimited · Spark of Rebellion","game":"swu","cards":[{"name":"Darth Vader","code":"087","rarity":"Legendary","image":"assets/showcase-rare/swu-sor-0.jpg"},{"name":"Luke Skywalker","code":"051","rarity":"Legendary","image":"assets/showcase-rare/swu-sor-1.jpg"}]},{"id":"pokemon-sv03","label":"Pokémon · Obsidian Flames","game":"pokemon","cards":[{"name":"Charizard ex","code":"sv03-223","rarity":"Special Illustration Rare","image":"assets/showcase-rare/pokemon-sv03-0.webp"},{"name":"Pidgeot ex","code":"sv03-225","rarity":"Special Illustration Rare","image":"assets/showcase-rare/pokemon-sv03-1.webp"}]}];
 const root=document.getElementById('home-art');if(!root)return;
 const key='cardscope.showcase.last.v1';let last,hiddenAt=0,changedAt=0;
 try{last=localStorage.getItem(key);}catch{}
 function rotate(){
  const options=series.filter(x=>x.id!==last),choice=options[Math.floor(Math.random()*options.length)]||series[0];
  last=choice.id;changedAt=Date.now();try{localStorage.setItem(key,last);}catch{}
  root.dataset.series=choice.id;root.setAttribute('aria-label','Karty: '+choice.label);
  [...root.querySelectorAll('.home-card')].forEach((img,i)=>{const card=choice.cards[i];img.alt=card.name+' · '+card.rarity;img.title=card.name+' · '+card.rarity;img.dataset.rarity=card.rarity;img.src=card.image;img.decoding='async';img.setAttribute('fetchpriority','high');});
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
