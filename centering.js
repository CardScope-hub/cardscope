/* Manual image-space centering ruler. Photos never leave the device. */
(function(root){
const defaults=()=>({left:10,innerLeft:15,innerRight:85,right:90,top:10,innerTop:15,innerBottom:85,bottom:90});
function measure(g){const keys=['left','innerLeft','innerRight','right','top','innerTop','innerBottom','bottom'];if(!g||keys.some(k=>!Number.isFinite(g[k])||g[k]<0||g[k]>100))return null;if(!(g.left<g.innerLeft&&g.innerLeft<g.innerRight&&g.innerRight<g.right&&g.top<g.innerTop&&g.innerTop<g.innerBottom&&g.innerBottom<g.bottom))return null;const l=g.innerLeft-g.left,r=g.right-g.innerRight,t=g.innerTop-g.top,b=g.bottom-g.innerBottom;return {horizontal:[100*l/(l+r),100*r/(l+r)],vertical:[100*t/(t+b),100*b/(t+b)]};}
function nearestGuide(g,b,x,y,tolerance=14,selected=null){
 if(!g||!b.width||!b.height||x<b.left-tolerance||x>b.left+b.width+tolerance||y<b.top-tolerance||y>b.top+b.height+tolerance)return null;
 let found=null,best=tolerance;
 for(const [key,value] of Object.entries(g)){
  if(!Object.hasOwn(defaults(),key)||!Number.isFinite(value))continue;
  const vertical=!/top|bottom/i.test(key),position=(vertical?b.left:b.top)+(vertical?b.width:b.height)*value/100;
  const distance=Math.abs((vertical?x:y)-position);
  if(distance<best||(distance===best&&(found===null||key===selected))){found=key;best=distance;}
 }
 return found;
}
root.CenteringMath={defaults,measure,nearestGuide};if(typeof document==='undefined')return;
const el=id=>document.getElementById('ctr-'+id), sides={front:null,back:null};let side='front',img=null,loading=0,db=null;
const labels={left:'Lewa krawędź karty',innerLeft:'Lewa krawędź nadruku',innerRight:'Prawa krawędź nadruku',right:'Prawa krawędź karty',top:'Górna krawędź karty',innerTop:'Górna krawędź nadruku',innerBottom:'Dolna krawędź nadruku',bottom:'Dolna krawędź karty'};
const horizontal=k=>/top|bottom/i.test(k), canvas=el('canvas'),ctx=canvas.getContext('2d');
const notify=s=>{el('status').textContent=s;};
let selectedLine='left',dragLine=null,lineRenderScale=0;const handleButtons=new Map();
const photoView=root.CenteringViewport.create({viewport:el('viewer'),content:canvas,prefix:'ctr',onPlace:place,pickLine,onViewChange:syncView});
const request=indexedDB.open('cardscope-centering',1);request.onupgradeneeded=()=>request.result.createObjectStore('draft');request.onerror=()=>notify('Zapis lokalny niedostępny. Możesz pobrać kopię pomiaru.');request.onsuccess=()=>{db=request.result;const r=db.transaction('draft').objectStore('draft').get('pair');r.onsuccess=()=>{if(!sides.front&&!sides.back&&r.result){Object.assign(sides,r.result);activate(side);notify('Przywrócono ostatnio zapisany pomiar z tego urządzenia.');}};};
function result(s){if(!s)return 'Brak zdjęcia';if(!s.confirmed)return 'Ustaw linie i zatwierdź';const m=measure(s.guides);return m?`L/P ${ratio(m.horizontal)} · G/D ${ratio(m.vertical)}`:'Sprawdź kolejność linii';}
const ratio=a=>{const n=Math.round(a[0]*10)/10;return n.toFixed(1)+' / '+(100-n).toFixed(1);};
function summary(){el('front-result').textContent=result(sides.front);el('back-result').textContent=result(sides.back);root.CenteringGrades?.render(sides);}
function refresh(){const s=sides[side];el('tools').hidden=!s;el('empty').hidden=!!s;el('viewer').hidden=!s;el('photo-controls').hidden=!s;el('confirm').checked=!!s?.confirmed;summary();if(!s)return;const k=selectedLine;el('line-name').textContent=(k.startsWith('inner')?'Wewnętrzna · ':'Zewnętrzna · ')+labels[k].toLocaleLowerCase('pl');el('line-name').parentElement.dataset.kind=k.startsWith('inner')?'inner':'outer';el('position').value=s.guides[k];el('position-value').textContent=s.guides[k].toFixed(2)+'% zdjęcia';const m=measure(s.guides);el('reading').textContent=!m?'Linie nadruku muszą znajdować się wewnątrz karty.':!s.confirmed?'Podgląd — zatwierdź dopasowanie linii.':`Lewo / prawo: ${ratio(m.horizontal)}% · Góra / dół: ${ratio(m.vertical)}%`;draw();}
async function activate(next,focusPhoto=false){side=next;img=null;dragLine=null;photoView.clear();ctx.clearRect(0,0,canvas.width,canvas.height);const ticket=++loading;document.querySelectorAll('[data-center-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.centerSide===side)));el('side-title').textContent=side==='front'?'Przód karty':'Tył karty';refresh();if(!sides[side])return;const image=new Image();image.onload=()=>{if(ticket!==loading)return;img=image;refresh();photoView.load(image.width,image.height);if(focusPhoto)requestAnimationFrame(()=>el('viewer').scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));};image.onerror=()=>notify('Nie udało się odczytać zapisanego zdjęcia.');image.src=sides[side].photo;}
// Redraw only when the photo scale changes, keeping guides thin at every zoom.
function syncView(view){
 updateHandles(view);
 const next=img?view.w*view.zoom/img.width:0;
 if(next>0&&Math.abs(next-lineRenderScale)>.000001)draw();
}
function draw(){if(!img)return;canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);const g=sides[side].guides,w=canvas.width,h=canvas.height,scale=Math.max(w,h)/800,view=photoView.getState();lineRenderScale=view.w>0?view.w*view.zoom/w:1;const pixel=1/lineRenderScale;ctx.lineWidth=1.3*scale;for(const [key,value] of Object.entries(g)){const yAxis=horizontal(key),n=(yAxis?h:w)*value/100;ctx.setLineDash(key.startsWith('inner')?[4*pixel,3*pixel]:[]);ctx.beginPath();ctx.moveTo(yAxis?0:n,yAxis?n:0);ctx.lineTo(yAxis?w:n,yAxis?n:h);ctx.lineWidth=(key===selectedLine?1.6:1.25)*pixel;ctx.strokeStyle='#10091e88';ctx.stroke();ctx.lineWidth=(key===selectedLine?1:.75)*pixel;ctx.strokeStyle=key.startsWith('inner')?'#ffc29d':'#bd9aff';ctx.stroke();}ctx.setLineDash([]);ctx.lineWidth=1.3*scale;ctx.fillStyle='#100d22cc';ctx.fillRect(0,0,w,23*scale);ctx.fillRect(0,0,23*scale,h);ctx.strokeStyle='#e5d5ff';ctx.fillStyle='#fff';ctx.font=`${9*scale}px sans-serif`;for(let i=0;i<=100;i++){const tick=i%10===0?12:5;ctx.beginPath();ctx.moveTo(w*i/100,0);ctx.lineTo(w*i/100,tick*scale);ctx.moveTo(0,h*i/100);ctx.lineTo(tick*scale,h*i/100);ctx.stroke();if(i%10===0&&i>0&&i<100){ctx.fillText(i,w*i/100+2*scale,21*scale);ctx.fillText(i,2*scale,h*i/100+10*scale);}}updateHandles(photoView.getState());}
function chooseLine(key){if(!Object.hasOwn(labels,key))return;selectedLine=key;refresh();}
function updateHandles(view){
 const s=sides[side],ready=!!img&&!!s&&view.w>0&&view.h>0;
 el('guide-handles').hidden=!ready;if(!ready)return;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const [key,button] of handleButtons){
  const yAxis=horizontal(key),inner=key.startsWith('inner'),n=s.guides[key];
  const x=yAxis?clamp(view.x+view.w*view.zoom*(inner ? .66 : .34),40,view.width-40):view.x+view.w*view.zoom*n/100;
  const y=yAxis?view.y+view.h*view.zoom*n/100:clamp(view.y+view.h*view.zoom*(inner ? .64 : .36),28,view.height-28);
  button.hidden=!Number.isFinite(n)||x<0||x>view.width||y<0||y>view.height;
  button.style.left=x+'px';button.style.top=y+'px';
  button.setAttribute('aria-pressed',String(key===selectedLine));
  button.setAttribute('aria-label',(inner?'Wewnętrzna: ':'Zewnętrzna: ')+labels[key]+', '+(Number.isFinite(n)?n.toFixed(2):'—')+'%. Przeciągnij lub użyj strzałek.');
 }
}
function pickLine(event){
 const s=sides[side];dragLine=null;if(!img||!s)return false;
 const target=event.target?.closest?.('[data-centering-line]');
 const handle=target&&el('guide-handles').contains(target)?target.dataset.centeringLine:null;
 const key=Object.hasOwn(labels,handle)?handle:nearestGuide(s.guides,canvas.getBoundingClientRect(),event.clientX,event.clientY,event.pointerType==='touch'?20:12,selectedLine);
 if(!key)return false;
 chooseLine(key);dragLine={key,value:s.guides[key],point:horizontal(key)?event.clientY:event.clientX};return true;
}
const abbreviations={left:'L',innerLeft:'L',right:'P',innerRight:'P',top:'G',innerTop:'G',bottom:'D',innerBottom:'D'};
for(const [key,label] of Object.entries(labels)){
 const button=document.createElement('button'),caption=document.createElement('span');
 button.type='button';button.className='ctr-guide-handle';button.dataset.centeringLine=key;button.dataset.kind=key.startsWith('inner')?'inner':'outer';button.dataset.axis=horizontal(key)?'y':'x';
 caption.textContent=(key.startsWith('inner')?'Wewn. ':'Zewn. ')+abbreviations[key];button.append(caption);button.title=label;
 button.onclick=()=>chooseLine(key);button.onfocus=()=>chooseLine(key);
 button.onkeydown=event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();chooseLine(key);
  if(!sides[side])return;setPosition(sides[side].guides[key]+(['ArrowLeft','ArrowUp'].includes(event.key)?-.05:.05));
 };
 handleButtons.set(key,button);el('guide-handles').append(button);
}
document.querySelectorAll('[data-center-side]').forEach(b=>b.onclick=()=>activate(b.dataset.centerSide));
function acceptPhoto(url,target){sides[target]={photo:url,guides:defaults(),confirmed:false};activate(target,true);notify('Zdjęcie zatwierdzone. Dopasuj wszystkie 8 linii miarki.');}
el('camera-open').onclick=()=>{const target=side;root.CenteringCamera.open(url=>acceptPhoto(url,target));};
el('upload').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>30*1024*1024){notify('Wybierz zdjęcie mniejsze niż 30 MB.');return;}const target=side,ticket=++loading,url=URL.createObjectURL(file),image=new Image();image.onload=()=>{try{if(ticket!==loading)return;const c=document.createElement('canvas'),scale=Math.min(1,2200/Math.max(image.width,image.height));c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);root.CenteringCamera.review(c.toDataURL('image/jpeg',.94),url=>acceptPhoto(url,target));}finally{URL.revokeObjectURL(url);}};image.onerror=()=>{URL.revokeObjectURL(url);notify('Nie odczytano zdjęcia. Użyj JPG, PNG lub WebP.');};image.src=url;};
function setPosition(n){const s=sides[side];if(!s||!Number.isFinite(n))return;const value=Math.max(0,Math.min(100,Math.round(n*100)/100));if(s.guides[selectedLine]===value)return;s.guides[selectedLine]=value;s.confirmed=false;refresh();}
el('position').oninput=e=>setPosition(Number(e.target.value));el('minus').onclick=()=>setPosition(Number(el('position').value)-.05);el('plus').onclick=()=>setPosition(Number(el('position').value)+.05);
function place(e){if(!img||!dragLine||dragLine.key!==selectedLine)return;const b=canvas.getBoundingClientRect(),yAxis=horizontal(selectedLine),size=yAxis?b.height:b.width;if(!size)return;setPosition(dragLine.value+100*((yAxis?e.clientY:e.clientX)-dragLine.point)/size);}
el('confirm').onchange=e=>{const s=sides[side];if(!s)return;if(!measure(s.guides)){e.target.checked=false;notify('Popraw kolejność linii przed zatwierdzeniem.');return;}s.confirmed=e.target.checked;refresh();};
el('reset').onclick=()=>{if(!sides[side])return;sides[side].guides=defaults();sides[side].confirmed=false;refresh();};
el('rotate').onclick=()=>{if(!img)return;const c=document.createElement('canvas');c.width=img.height;c.height=img.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(img,0,0);sides[side].photo=c.toDataURL('image/jpeg',.94);sides[side].guides=defaults();sides[side].confirmed=false;activate(side);notify('Obrócono zdjęcie. Ustaw linie ponownie.');};
el('save').onclick=()=>{if(!db){notify('Zapis lokalny niedostępny. Pobierz kopię.');return;}if(!sides.front&&!sides.back){notify('Najpierw dodaj zdjęcie.');return;}const tx=db.transaction('draft','readwrite');tx.objectStore('draft').put(structuredClone(sides),'pair');tx.oncomplete=()=>notify('Zapisano przód i tył na tym urządzeniu.');tx.onerror=()=>notify('Nie zapisano pomiaru. Pobierz kopię JSON.');};
el('export').onclick=()=>{if(!sides.front&&!sides.back){notify('Najpierw dodaj zdjęcie.');return;}const data={app:'CardScope',type:'centering',version:2,grading:root.CenteringGrades?.evaluate(sides)||null,date:new Date().toISOString(),sides,measurements:Object.fromEntries(Object.entries(sides).map(([k,v])=>[k,v?.confirmed?measure(v.guides):null]))};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.href=url;a.download='cardscope-centering.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
refresh();
})(globalThis);
