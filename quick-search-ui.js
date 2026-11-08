(()=>{
 const $=id=>document.getElementById(id),Q=CardQuickSearch;
 const labels={lorcana:'Disney Lorcana',cyberpunk:'Cyberpunk TCG',pokemon:'Pokémon',mtg:'Magic: The Gathering',onepiece:'One Piece',weiss:'Weiß Schwarz · EN','weiss-jp':'Weiß Schwarz · JP',riftbound:'Riftbound',swu:'Star Wars: Unlimited'};
 let generation=0,groups=[];
 function invalidate(){generation++;scanId++;$('catalog-submit').disabled=false;$('matches').replaceChildren();$('more-matches').hidden=true;$('catalog-count').textContent='';}
 function filters(){const game=$('catalog-game').value;$('catalog-language').disabled=!['auto','pokemon'].includes(game);$('catalog-query').placeholder='Nazwa lub kod, np. ASC 271/217';}
 $('catalog-game').onchange=()=>{invalidate();filters()};$('catalog-language').onchange=invalidate;
 $('catalog-query').oninput=invalidate;
 function button(card,token){const b=document.createElement('button');b.type='button';b.className='match-choice';CardPokemonArt.thumbnail(b,card);const info=document.createElement('span'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=card.name;sub.textContent=[labels[card.gameKey],card.set?.name,card.printedNumber||card.localId,card.rarity].filter(Boolean).join(' · ');info.append(title,sub);b.append(info);b.onclick=()=>{if(token===scanId)void CardAutoScanUI.open(card,token)};return b;}
 function paint(token){$('matches').replaceChildren(...groups.flatMap(g=>g.cards.map(c=>button(c,token))));$('more-matches').hidden=!groups.some(g=>g.next);}
 $('catalog-search').onsubmit=async e=>{e.preventDefault();const q=$('catalog-query').value.trim();if(q.length<2&&!/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(q)){status('Wpisz nazwę lub kod karty.');return;}
  const run=++generation,token=++scanId,game=$('catalog-game').value,language=$('catalog-language').value||'en',games=game==='auto'?Q.gamesFor(q):[game];groups=[];$('matches').replaceChildren();$('more-matches').hidden=true;$('scan-checks').hidden=true;$('catalog-submit').disabled=true;status('Szukam nazwy lub dokładnego wydania…');
  const results=await Promise.allSettled(games.map(g=>Q.page(g,q,language)));if(run!==generation||token!==scanId||document.body.dataset.view!=='processing')return;
  let failed=0;results.forEach((r,i)=>{if(r.status==='rejected'){failed++;return}groups.push({game:games[i],cards:r.value.cards||[],next:r.value.nextPage,total:r.value.total||0,q,language})});
  const total=groups.reduce((n,g)=>n+g.total,0);$('catalog-submit').disabled=false;$('catalog-count').textContent=total+' wyników'+(failed?' · '+failed+' katalogów chwilowo niedostępnych':'');
  if(total===1&&!failed&&groups.every(g=>!g.next)){const c=groups.flatMap(g=>g.cards)[0];if(c){void CardAutoScanUI.open(c,token);return}}
  paint(token);status(total?'Wybierz ilustrację i wydanie zgodne ze swoją kartą.'+(failed?' Część katalogów jest niedostępna — możesz ponowić wyszukiwanie.':''):failed?'Nie udało się przeszukać wszystkich katalogów. Spróbuj ponownie lub wskaż grę.':'Nie znaleziono tego wydania. Sprawdź kod albo wpisz nazwę; grę i język możesz wybrać poniżej.');
  $('more-matches').onclick=async()=>{const b=$('more-matches');b.disabled=true;try{for(const g of groups){if(!g.next)continue;const d=await Q.page(g.game,g.q,g.language,g.next);if(token!==scanId||run!==generation)return;const ids=new Set(g.cards.map(c=>c.id));g.cards.push(...d.cards.filter(c=>!ids.has(c.id)));g.next=d.nextPage;}paint(token)}catch{if(token===scanId)status('Nie pobrano kolejnych wyników. Spróbuj ponownie.')}finally{b.disabled=false}};
 };
 filters();
})();
