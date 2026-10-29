/* Public centering thresholds only. Not an overall card-grade prediction. */
(function(root){
 'use strict';
 const version='centering-grades-1',verifiedAt='2026-10-29',epsilon=1e-8;
 const row=(grade,label,front,back)=>Object.freeze({grade,label,front,back});
 const firms=Object.freeze([
  Object.freeze({id:'psa',name:'PSA',source:'https://www.psacard.com/gradingstandards',
   note:'Progi bazowe PSA. Wyjątki zależne od wyglądu karty pozostają decyzją gradera. Oceny z takim samym limitem centeringu różnią się pozostałymi cechami karty.',
   rules:Object.freeze([row('10','Gem Mint',55,75),row('9','Mint',60,90),row('8','Near Mint / Mint',65,90),row('7','Near Mint',70,90),row('6','Excellent / Mint',80,90),row('5','Excellent',85,90),row('4','Very Good / Excellent',85,90),row('3','Very Good',90,90),row('2','Good',90,90),row('1.5','Fair',90,90)])}),
  Object.freeze({id:'bgs',name:'Beckett · BGS',source:'https://beckett.com/grading',
   note:'Aktualne progi Beckett: 10 = 50/50 z przodu i 55/45 z tyłu; 9,5 = 55/45 z przodu i 60/40 z tyłu. Black Label wymaga również najwyższych ocen rogów, krawędzi i powierzchni. Brak osobnych progów oznacza brak wyliczania ocen pośrednich.',
   rules:Object.freeze([row('10','Pristine',50,55),row('9.5','Gem Mint',55,60),row('9','Mint',55,70),row('8','Near Mint / Mint',60,80),row('7','Near Mint',65,90),row('6','Excellent / Mint',70,95),row('5','Excellent',75,95),row('4','Very Good / Excellent',80,100),row('3','Very Good',85,100),row('2','Good',90,100),row('1','Poor',100,100)])}),
  Object.freeze({id:'cgc',name:'CGC',source:'https://www.cgccards.com/card-grading/grading-scale/',
   note:'Dla Pristine CGC podaje 50/50 bez osobnego limitu rewersu — ostrożnie wymagamy 50/50 na obu stronach. Dla kart TCG niższe oceny nie mają tu osobnych progów liczbowych. Nie stosujemy do nich progów opisanych dla kart sportowych i non-sports.',
   rules:Object.freeze([row('10','Pristine',50,50),row('10','Gem Mint',55,75)])})
 ]);
 const ratio=n=>n+'/'+(100-n);
 function sideState(s){
  if(!s||typeof s.photo!=='string'||!s.photo)return {status:'missing',measurement:null};
  const measurement=root.CenteringMath?.measure(s.guides);
  if(!measurement)return {status:'invalid',measurement:null};
  if(s.confirmed!==true)return {status:'unconfirmed',measurement:null};
  return {status:'ready',measurement};
 }
 function evaluate(sides={}){
  const front=sideState(sides.front),back=sideState(sides.back),ready=front.status==='ready'&&back.status==='ready';
  const out={version,verifiedAt,scope:'centering-only',ready,sides:{front,back},results:[]};
  if(!ready)return out;
  const worst=m=>Math.max(...m.horizontal,...m.vertical),f=worst(front.measurement),b=worst(back.measurement);
  out.worst={front:f,back:b};
  out.results=firms.map(firm=>{
   const index=firm.rules.findIndex(r=>f<=r.front+epsilon&&b<=r.back+epsilon),match=index<0?null:firm.rules[index];
   const next=index>0?firm.rules[index-1]:index<0?firm.rules.at(-1):null;
   const margin=match?Math.min(match.front-f,match.back-b):null;
   const nextGap=next?Math.max(f-next.front,b-next.back,0):null;
   const nearHigher=next&&nextGap<=1+epsilon,near=!!nearHigher||(margin!==null&&margin<=1+epsilon);
   return {firm:firm.id,match:match?{...match}:null,next:next?{...next}:null,near,nearHigher:!!nearHigher,margin,nextGap};
  });
  return out;
 }
 function formatRatio(n){return n.toLocaleString('pl-PL',{minimumFractionDigits:1,maximumFractionDigits:2})+' / '+(100-n).toLocaleString('pl-PL',{minimumFractionDigits:1,maximumFractionDigits:2});}
 function render(sides){
  if(typeof document==='undefined')return;
  const panel=document.getElementById('ctr-grading');if(!panel)return;
  const result=evaluate(sides),get=id=>document.getElementById('ctr-grade-'+id);
  const statuses={missing:'Dodaj zdjęcie',unconfirmed:'Potwierdź linie',invalid:'Popraw kolejność linii'};
  panel.dataset.ready=String(result.ready);
  for(const side of ['front','back']){
   const state=result.sides[side],label=side==='front'?'Przód':'Tył';
   const node=get(side);node.dataset.ready=String(state.status==='ready');
   node.textContent=label+' · '+(state.measurement?'L/P '+formatRatio(state.measurement.horizontal[0])+' · G/D '+formatRatio(state.measurement.vertical[0]):statuses[state.status]);
  }
  get('status').textContent=result.ready?'Najwyższe opublikowane progi zgodne z Twoim pomiarem.':'Dodaj zdjęcia tej samej karty i zatwierdź linie osobno dla przodu i tyłu.';
  for(const firm of firms){
   const record=result.results.find(x=>x.firm===firm.id),value=get(firm.id+'-value'),label=get(firm.id+'-label'),note=get(firm.id+'-note'),limit=get(firm.id+'-limit'),badge=get(firm.id+'-badge');
   if(!record){value.textContent='—';label.textContent='Czekam na pomiar';note.textContent='Wynik pojawi się po potwierdzeniu obu stron.';limit.textContent='Przód i tył · obie osie';badge.hidden=true;continue;}
   const matched=record.match;
   value.textContent=matched?matched.grade.replace('.',','):firm.id==='cgc'?'< 10':'—';
   label.textContent=matched?matched.label:firm.id==='cgc'?'Poza progiem Gem Mint':'Poza opublikowanymi progami';
   note.textContent=matched?'Centering spełnia wskazany próg.':firm.id==='cgc'?'Niższej oceny TCG nie da się wyliczyć z opublikowanych limitów.':'Potrzebna jest indywidualna ocena karty.';
   limit.textContent=matched?'Przód ≤ '+ratio(matched.front)+' · Tył ≤ '+ratio(matched.back):'Sprawdź dokładność linii i tabelę progów.';
   badge.hidden=!record.near;badge.textContent=record.nearHigher?'Blisko wyższego progu · sprawdź linie':'Blisko granicy · sprawdź linie';
  }
  return result;
 }
 root.CenteringGrades=Object.freeze({version,verifiedAt,firms,evaluate,render});
})(globalThis);
