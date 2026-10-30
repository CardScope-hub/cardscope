export const LAYOUTS = [[2,2],[3,3],[4,3],[4,4],[4,5],[5,4],[5,5],[6,6]];
export const THEMES = ['amethyst','lavender','plum','midnight','iris','pearl'];
export const PATTERNS = ['aurora','linen','stars'];
export const EMBLEMS = ['diamond','star','moon','pokeball','dragon','bolt','flower'];
export const MAX_PAGES = 100;
const idOK = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value);
export function validateBinder(input) {
 if(!input || !idOK(input.id))throw Error('Nieprawidłowy identyfikator bindera.');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>70)throw Error('Nazwa bindera musi mieć od 1 do 70 znaków.');
 if(!LAYOUTS.some(([c,r])=>c===input.columns&&r===input.rows))throw Error('Wybierz jeden z dostępnych układów.');
 if(!Number.isInteger(input.pages)||input.pages<1||input.pages>MAX_PAGES)throw Error('Binder może mieć od 1 do 100 stron.');
 if(!THEMES.includes(input.theme)||!PATTERNS.includes(input.pattern)||!EMBLEMS.includes(input.emblem))throw Error('Wybierz wygląd okładki.');
 const capacity=input.pages*input.columns*input.rows;
 if(!Array.isArray(input.slots)||input.slots.length!==capacity||input.slots.some(x=>x!==null&&!idOK(x)))throw Error('Nieprawidłowy układ kart w binderze.');
 const subtitle=typeof input.subtitle==='string'?input.subtitle.trim():'';if(subtitle.length>120)throw Error('Opis może mieć do 120 znaków.');
 for(const field of ['createdAt','updatedAt'])if(typeof input[field]!=='string'||!Number.isFinite(Date.parse(input[field])))throw Error('Nieprawidłowa data bindera.');
 const entries={},quotes={};
 for(const [key,value] of Object.entries(input.entries||{})){const index=Number(key);if(!Number.isInteger(index)||index<0||index>=capacity||!input.slots[index])continue;if(!value||!Number.isFinite(Date.parse(value.addedAt)))throw Error('Nieprawidłowa data dodania karty.');entries[key]={addedAt:value.addedAt,baseline:validateQuote(value.baseline)};}
 for(const [key,value] of Object.entries(input.quotes||{})){if(input.slots.includes(key))quotes[key]=validateQuote(value);}
 return {entries,quotes,id:input.id,name:input.name.trim(),subtitle,columns:input.columns,rows:input.rows,pages:input.pages,theme:input.theme,pattern:input.pattern,emblem:input.emblem,slots:[...input.slots],createdAt:input.createdAt,updatedAt:input.updatedAt};
}
export function createBinder(settings,id,now=new Date().toISOString()) {
 const config={name:'Mój binder',subtitle:'',columns:3,rows:3,pages:10,theme:'amethyst',pattern:'aurora',emblem:'diamond',...settings};
 if(!Number.isInteger(config.pages)||config.pages<1||config.pages>MAX_PAGES||!LAYOUTS.some(([c,r])=>c===config.columns&&r===config.rows))throw Error('Sprawdź układ i liczbę stron.');
 return validateBinder({...config,id,slots:Array(config.pages*config.columns*config.rows).fill(null),createdAt:now,updatedAt:now});
}
export function reconfigure(binder,settings) {
 const perPage=settings.columns*settings.rows,capacity=perPage*settings.pages;
 const last=binder.slots.reduce((n,id,i)=>id===null?n:i,-1);
 if(last>=capacity)throw Error('Karty zajmują dalsze kieszonki. Potrzebujesz co najmniej '+Math.ceil((last+1)/perPage)+' stron w tym układzie.');
 return validateBinder({...binder,...settings,slots:[...binder.slots.slice(0,capacity),...Array(Math.max(0,capacity-binder.slots.length)).fill(null)],updatedAt:new Date().toISOString()});
}
export function counts(binder){const used=new Map();for(const id of binder.slots)if(id)used.set(id,(used.get(id)||0)+1);return used}
export function availableCards(binder,collection){const used=counts(binder);return collection.map(card=>({card,available:Math.max(0,card.qty-(used.get(card.id)||0))})).filter(x=>x.available>0)}
export function placementPlan(binder,selection,collection,{start=0,grow=false,replace=false}={}) {
 const entries={...binder.entries},quotes={...binder.quotes};const slots=[...binder.slots];if(!Number.isInteger(start)||start<0||start>=slots.length)throw Error('Wybierz prawidłową kieszonkę.');
 if(replace)slots[start]=null;
 const capacity=slots.length,used=counts({...binder,slots}),byId=new Map(collection.map(c=>[c.id,c])),ids=[];
 for(const item of selection){const card=byId.get(item.id),already=used.get(item.id)||0;if(!card||!Number.isInteger(item.count)||item.count<1||item.count>card.qty-already)throw Error('Liczba wybranych kopii przekracza liczbę kart w kolekcji.');used.set(item.id,already+item.count);for(let n=0;n<item.count;n++)ids.push(item.id)}
 if(!ids.length)throw Error('Wybierz przynajmniej jedną kartę.');if(replace&&ids.length!==1)throw Error('Do tej kieszonki wybierz jedną kartę.');
 const free=slots.filter(x=>x===null).length,perPage=binder.columns*binder.rows,extraPages=Math.ceil(Math.max(0,ids.length-free)/perPage);
 if(extraPages&&!grow)throw Error('Brakuje miejsca. Włącz dodawanie stron lub wybierz mniej kart.');
 if(binder.pages+extraPages>MAX_PAGES)throw Error('Maksymalnie 100 stron. Wybierz mniej kart lub utwórz drugi binder.');
 slots.push(...Array(extraPages*perPage).fill(null));
 const targets=[];for(let i=start;i<slots.length;i++)if(slots[i]===null)targets.push(i);for(let i=0;i<start;i++)if(slots[i]===null)targets.push(i);
 ids.forEach((id,n)=>{const index=targets[n],card=byId.get(id),now=new Date().toISOString();slots[index]=id;const quote=quotes[id]||quoteFromCard(card,now);entries[index]={addedAt:now,baseline:quote};if(quote)quotes[id]=quote;});
 return {binder:validateBinder({...binder,pages:binder.pages+extraPages,slots,entries,quotes,updatedAt:new Date().toISOString()}),placed:ids.length,extraPages,indices:targets.slice(0,ids.length),oldCapacity:capacity};
}
export function swapSlots(binder,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=binder.slots.length||to>=binder.slots.length)throw Error('Wybierz prawidłową kieszonkę.');const slots=[...binder.slots];[slots[from],slots[to]]=[slots[to],slots[from]];const entries={...binder.entries};[entries[from],entries[to]]=[entries[to],entries[from]];for(const key of [from,to])if(!entries[key])delete entries[key];return {...binder,slots,entries,updatedAt:new Date().toISOString()}}
export function clearSlot(binder,index){if(!Number.isInteger(index)||index<0||index>=binder.slots.length)throw Error('Wybierz prawidłową kieszonkę.');const slots=[...binder.slots];slots[index]=null;const entries={...binder.entries};delete entries[index];return {...binder,slots,entries,updatedAt:new Date().toISOString()}}

export function validateQuote(q){if(q==null)return null;if(!Number.isFinite(q.amount)||q.amount<0||q.amount>10000000||!['PLN','EUR','USD'].includes(q.currency)||!Number.isFinite(Date.parse(q.at)))throw Error('Nieprawidłowa wycena.');return {amount:q.amount,currency:q.currency,at:q.at,source:String(q.source||'Zapisana cena').slice(0,80)};}
// Read legacy prices defensively. A bad quote must never prevent opening cards.
// Writes still go through validateQuote / validateBinder; stored data is not erased.
export function readQuote(q){try{return validateQuote(q)}catch{return null}}
function priceDate(value){
 if(value==null||value==='')return null;
 const numeric=typeof value==='number'?value:typeof value==='string'&&/^\d{10,13}$/.test(value)?Number(value):null;
 const time=numeric===null?Date.parse(value):numeric<1e12?numeric*1000:numeric;
 return Number.isFinite(time)&&Math.abs(time)<=8.64e15?new Date(time).toISOString():null;
}
export function quoteFromCard(card,now=new Date().toISOString()){
 if(!Number.isFinite(card?.price))return null;
 const at=priceDate(card.priceUpdated)||priceDate(card.createdAt)||(!card.priceUpdated&&!card.createdAt?now:null);
 return at?readQuote({amount:card.price,currency:card.priceCurrency||'EUR',at,source:card.priceSource==='manual'?'Cena ręczna':card.priceSource==='tcgrepublic-jp'?'TCG Republic · JP · '+(card.priceMetric==='retail-unavailable'?'cena katalogowa · produkt niedostępny':'cena sklepu'):card.priceSource==='novatcg-jp'?'NovaTCG · JP · cena sklepu':'Zapisana wycena'}):null;
}
export function binderQuote(binder,id,card){return readQuote(binder.quotes?.[id])||quoteFromCard(card)}
export function binderValue(binder,collection){const totals={},byId=new Map(collection.map(c=>[c.id,c]));let missing=0,compared=0;for(const [index,id] of binder.slots.entries()){if(!id)continue;const quote=binderQuote(binder,id,byId.get(id)),base=readQuote(binder.entries?.[index]?.baseline);if(!quote){missing++;continue}const row=totals[quote.currency]||={value:0,change:0,count:0};row.value+=quote.amount;row.count++;if(base&&base.currency===quote.currency){row.change+=quote.amount-base.amount;compared++;}}return {totals,missing,compared};}
