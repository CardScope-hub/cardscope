/* CardScope: finished Polish SWU rules loaded from a local static asset. */
(() => {
 'use strict';
 const data=globalThis.CardSWUPLData,rendered=new WeakMap();
 const normalizeNumber=n=>String(n||'').normalize('NFKC').toUpperCase().replace(/^(T?)0+(?=\d)/,'$1');
 const gameName=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 function isCard(card){if(!card)return false;const games=[card.gameKey,card.catalogGame,card.game].filter(Boolean);return games.some(g=>['swu','starwarsunlimited'].includes(gameName(g)))||!games.length&&[card.id,card.catalogId].some(id=>/^swu:/i.test(String(id||'')))}
 function lookup(card){
  if(!data||!card||typeof card!=='object')return null;
  if(!isCard(card))return null;
  const resolve=(set,number)=>{const code=set.toUpperCase()+':'+normalizeNumber(number),key=data.aliases[code],entry=data.cards[key];return entry?{...entry,key,editionCode:code.replace(':','-'),setCode:set.toUpperCase(),setName:data.sets[set.toUpperCase()]?.name||set}:null};
  for(const value of [card.catalogId,card.id,card.localId,card.printedNumber,card.number]){
   if(value==null)continue;const raw=String(value).normalize('NFKC').trim().toUpperCase().replace(/^SWU:/,'');
   const m=raw.match(/^#?\s*([A-Z][A-Z0-9]{1,7})\s*[-:#]\s*(T?\d{1,4}[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*T?\d{1,4})?$/);
   if(m){const entry=resolve(m[1],m[2]);if(entry)return entry}
  }
  // Legacy collection entries need an explicit SWU game and set, never name-only matching.
  if(!isCard(card))return null;
  const rawSet=typeof card.set==='object'?card.set?.id||card.set?.name:card.set;
  const set=Object.keys(data.sets).find(s=>[s,data.sets[s].name].some(x=>x.toLowerCase()===String(rawSet||'').trim().toLowerCase()));
  if(set)for(const n of [card.collectorNumber,card.number,card.localId,card.printedNumber]){const m=String(n||'').trim().toUpperCase().match(/^#?(T?\d{1,4}[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*T?\d{1,4})?$/);if(m){const entry=resolve(set,m[1]);if(entry)return entry}}
  return null;
 }
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el};
 function rules(ids,language){const el=node('div',null,'origins-pl-rules');el.lang=language;for(const id of ids||[]){const text=data.text[id]?.[language==='pl'?1:0];if(text)el.append(node('p',text))}return el}
 const glossary=[
  ['Koszty i statystyki','C= oznacza liczbowy koszt w zasobach. Nazwy aspektów w koszcie odpowiadają symbolom na karcie. Premia +X/+Y oznacza zmianę siły i PŻ.',/C=|[+-]\d+\/[+-]?\d+|\bHP\b|\bpower\b/i],
  ['Wyczerp / przygotuj · Exhaust / Ready','Wyczerpaną kartę obraca się w poziomie. Przygotowanie przywraca ją do pozycji pionowej. Koszt [Wyczerp] dotyczy karty z daną zdolnością.',/exhaust|ready/i],
  ['Akcja epicka · Epic Action','Z danej akcji epickiej możesz skorzystać tylko raz w grze. Musisz też spełnić warunek zapisany na karcie.',/Epic Action/i],
  ['Zasadzka · Ambush','Po zagraniu tej jednostki możesz ją przygotować i zaatakować nią wrogą jednostkę. To nie pozwala zaatakować bazy.',/\bAmbush\b/i],
  ['Determinacja · Grit','Każde obrażenie na tej jednostce daje jej +1 siły.',/\bGrit\b/i],
  ['Przełamanie · Overwhelm','Podczas atakowania wrogiej jednostki nadmiarowe obrażenia trafiają w bazę jej kontrolującego.',/\bOverwhelm\b/i],
  ['Najazd / Odnowa · Raid / Restore','Najazd zwiększa siłę podczas atakowania. Odnowa leczy wskazaną liczbę obrażeń z twojej bazy, gdy jednostka atakuje.',/\bRaid\b|\bRestore\b/i],
  ['Strażnik · Sentinel','W danej arenie chroni twoją bazę i jednostki bez Strażnika przed atakami. Wyjątki mogą wynikać np. z Sabotażysty.',/\bSentinel\b/i],
  ['Sabotażysta · Saboteur','Podczas ataku ignoruje Strażnika i niszczy Tarcze obrońcy.',/\bSaboteur\b/i],
  ['Osłona · Shielded','Zagranie jednostki z tą zdolnością daje jej żeton Tarczy. Jedna Tarcza zapobiega całemu najbliższemu przypadkowi otrzymania obrażeń, po czym zostaje zniszczona.',/\bShielded\b/i],
  ['Nagroda · Bounty','Gdy ta jednostka zostanie zniszczona lub pojmana, przeciwnik może zebrać opisaną Nagrodę.',/\bBounty\b/i],
  ['Przemyt · Smuggle','Pozwala zagrać tę kartę ze swoich zasobów za podany koszt Przemytu. Zastępujesz ją wierzchnią kartą swojej talii jako zasobem.',/\bSmuggle\b/i],
  ['Koordynacja · Coordinate','Wskazana zdolność działa, gdy kontrolujesz co najmniej 3 jednostki.',/\bCoordinate\b/i],
  ['Wykorzystanie · Exploit','Przy zagrywaniu możesz zniszczyć maksymalnie wskazaną liczbę swoich jednostek. Każda zniszczona w ten sposób jednostka obniża koszt o 2.',/\bExploit\b/i],
  ['Pilotaż · Piloting','Pozwala zagrać jednostkę jako ulepszenie na sojuszniczej jednostce z cechą VEHICLE, która nie ma ulepszenia z cechą PILOT. Użyj podanego kosztu Pilotażu.',/\bPiloting\b/i],
  ['Spisek · Plot','Gdy wystawiasz lidera, możesz zagrać tę kartę ze swoich zasobów, opłacając jej koszt. Zastępujesz ją wierzchnią kartą swojej talii jako zasobem.',/\bPlot\b/i],
  ['Ujawnij · Disclose','Odkryj karty ze swojej ręki zawierające łącznie co najmniej wskazane symbole aspektów. Samo ujawnienie nie oznacza odrzucenia tych kart.',/\bdisclose\b/i],
  ['Żeton Mocy · Force token','„Moc jest z tobą” oznacza, że masz żeton Mocy. Używając Mocy jako kosztu zdolności, tracisz ten żeton. Cecha FORCE na jednostce lub ulepszeniu to osobne oznaczenie.',/Force is with you|use the Force|Force token/i],
  ['Ukrycie · Hidden','Chroni przed atakami w fazie, w której jednostka została zagrana lub lider został wystawiony. Nie chroni przed efektami kart; jednostkę ze Strażnikiem można atakować mimo Ukrycia.',/\bHidden\b/i],
  ['Wsparcie · Support','Po zagraniu jednostki lub wystawieniu lidera z tą zdolnością możesz zaatakować inną sojuszniczą jednostką. Na czas tego ataku atakująca jednostka zyskuje pozostałe zdolności jednostki ze Wsparciem.',/\bSupport\b/i],
  ['Fortyfikacja · Fortify','To ulepszenie dołącza się do twojej bazy zamiast do jednostki.',/\bFortify\b/i]
 ];
 function render(target,card){
  const el=typeof target==='string'?document.getElementById(target):target;if(!el)return false;
  const entry=lookup(card);if(!entry){el.hidden=true;el.replaceChildren();rendered.delete(el);return false}
  const key=entry.key+'|'+entry.editionCode;if(rendered.get(el)===key){el.hidden=false;return true}
  const header=node('div',null,'origins-pl-heading'),badge=node('span','PL','origins-pl-badge'),heading=node('div'),title=node('h3','Tekst karty po polsku');
  title.id=(el.id||'swu-translation')+'-title';badge.setAttribute('aria-hidden','true');heading.append(title,node('span','Star Wars: Unlimited · '+entry.setName+' · '+entry.editionCode,'origins-pl-meta'));header.append(badge,heading);el.setAttribute('aria-labelledby',title.id);
  const body=document.createDocumentFragment();body.append(header);
  function side(parent,label,ids,language){if(label)parent.append(node('h4',label,'swu-pl-side-title'));if(ids.length)parent.append(rules(ids,language));else parent.append(node('p',language==='pl'?'W dołączonym katalogu ta strona nie ma dodatkowego tekstu zasad.':'No additional rules text for this side in the bundled catalog.','origins-pl-note'))}
  side(body,entry.doubleSided?'Przód':null,entry.front,'pl');
  if(entry.epic.length)side(body,'Akcja epicka',entry.epic,'pl');
  if(entry.doubleSided)side(body,'Rewers',entry.back,'pl');
  if(entry.inheritedFrom)body.append(node('p','Tekst uzupełniony z wydania '+entry.inheritedFrom+' tej samej karty.','origins-pl-note'));
  if([...entry.front,...entry.epic,...entry.back].some(id=>data.corrections?.[id]))body.append(node('p','Zapis tekstu sprawdzono na grafice karty.','origins-pl-note'));
  const english=node('details',null,'origins-pl-disclosure');english.append(node('summary','Pokaż tekst angielski'));
  side(english,entry.doubleSided?'Front':null,entry.front,'en');if(entry.epic.length)side(english,'Epic action',entry.epic,'en');if(entry.doubleSided)side(english,'Back',entry.back,'en');body.append(english);
  const source=[...entry.front,...entry.epic,...entry.back].map(id=>data.text[id]?.[0]||'').join('\n'),terms=glossary.filter(([, ,re])=>re.test(source));
  if(terms.length){const help=node('details',null,'origins-pl-disclosure'),dl=node('dl');help.append(node('summary','Słowniczek tej karty'));for(const[t,description]of terms)dl.append(node('dt',t),node('dd',description));help.append(dl);body.append(help)}
  body.append(node('p','Nieoficjalne tłumaczenie CardScope · tekst źródłowy: SWU-DB · nazwy kart pozostają w oryginale.','origins-pl-note'));
  el.replaceChildren(body);el.hidden=false;rendered.set(el,key);return true;
 }
 const swu=Object.freeze({lookup,render,isCard,version:data?.version||'swu-pl-1'});globalThis.CardSWUPL=swu;
 // Existing result/collection/binder hooks use this historical shared renderer.
 // Invalidate both private render caches on a game switch to prevent stale text.
 const rift=globalThis.CardOriginsPL,families=new WeakMap();
 globalThis.CardOriginsPL=Object.freeze({...rift,lookup:card=>swu.lookup(card)||rift?.lookup(card)||null,render(target,card){const el=typeof target==='string'?document.getElementById(target):target;if(!el)return false;const family=isCard(card)?'swu':'rift';if(families.get(el)!==family){rift?.render(el,null);swu.render(el,null);families.set(el,family)}return family==='swu'?swu.render(el,card):rift?.render(el,card)||false},version:'local-pl-swu-1'});
})();
