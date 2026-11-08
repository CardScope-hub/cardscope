/* Local two-player counter. Independent of catalogues, collections and accounts. */
globalThis.CardTabletopCore=(()=>{
 const MIN=-9999,MAX=99999,HISTORY=100;
 const validLife=n=>Number.isInteger(n)&&n>=MIN&&n<=MAX;
 const name=(value,fallback)=>String(value||'').trim().slice(0,24)||fallback;
 function startingLife(value){const text=String(value).trim();if(!/^\d{1,4}$/.test(text)||Number(text)<1)throw Error('Wpisz początkowe życie od 1 do 9999.');return Number(text);}
 function create(value,names=[],opposed=true){const initial=startingLife(value);return {version:1,initial,players:[{name:name(names[0],'Gracz 1'),life:initial},{name:name(names[1],'Gracz 2'),life:initial}],opposed:!!opposed,starter:null,history:[]};}
 function validate(s){
  if(!s||s.version!==1||!Number.isInteger(s.initial)||s.initial<1||s.initial>9999||typeof s.opposed!=='boolean'||![null,0,1].includes(s.starter)||!Array.isArray(s.players)||s.players.length!==2||!s.players.every(p=>p&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=24&&validLife(p.life))||!Array.isArray(s.history)||s.history.length>HISTORY)return null;
  if(!s.history.every(h=>h&&[0,1].includes(h.player)&&validLife(h.before)&&validLife(h.after)))return null;
  // Verify the undo chain before trusting a restored score history.
  const scores=s.players.map(p=>p.life);for(const h of [...s.history].reverse()){if(scores[h.player]!==h.after)return null;scores[h.player]=h.before;}
  return {version:1,initial:s.initial,players:s.players.map(p=>({name:p.name,life:p.life})),opposed:s.opposed,starter:s.starter,history:s.history.map(h=>({player:h.player,before:h.before,after:h.after}))};
 }
 function change(s,player,delta){
  if(![0,1].includes(player)||![1,-1,5,-5].includes(delta))throw Error('Nieprawidłowa zmiana życia.');
  const before=s.players[player].life,after=before+delta;if(!validLife(after))throw Error('Licznik obsługuje od −9999 do 99999 punktów.');
  return {...s,players:s.players.map((p,i)=>i===player?{...p,life:after}:p),history:[...s.history,{player,before,after}].slice(-HISTORY)};
 }
 function undo(s){const h=s.history.at(-1);if(!h)return s;return {...s,players:s.players.map((p,i)=>i===h.player?{...p,life:h.before}:p),history:s.history.slice(0,-1)};}
 function draw(s,randomUint32){
  const n=randomUint32();if(!Number.isInteger(n)||n<0||n>0xffffffff)throw Error('Nie udało się wylosować gracza. Spróbuj ponownie.');
  // Two choices divide the full uint32 range evenly, without modulo bias.
  return {...s,starter:n%2};
 }
 return Object.freeze({MIN,MAX,HISTORY,startingLife,create,validate,change,undo,draw});
})();
