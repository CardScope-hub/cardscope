/* Local game state. Timed audit entries stay intact when a move is undone. */
globalThis.CardTabletopCore=(()=>{
 const MIN=-9999,MAX=99999;
 const validLife=n=>Number.isInteger(n)&&n>=MIN&&n<=MAX;
 const validTime=n=>Number.isSafeInteger(n)&&n>=0;
 const validCount=n=>Number.isInteger(n)&&n>=2&&n<=6;
 const playerName=(v,i)=>String(v||'').trim().slice(0,24)||'Gracz '+(i+1);
 // Cosmetic leader data is optional. A broken image record must never discard a game.
 function leaderData(value){
  if(!value||typeof value!=='object'||typeof value.id!=='string'||!/^([A-Z0-9]{2,8})-(\d{1,5})$/.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>100)return null;
  const [set,number]=value.id.split('-');
  if(value.set!==set||value.image!=='https://cdn.swu-db.com/images/cards/'+set+'/'+number+'.png')return null;
  return {id:value.id,name:value.name.trim(),subtitle:typeof value.subtitle==='string'?value.subtitle.slice(0,160):'',set,setName:typeof value.setName==='string'?value.setName.slice(0,120):set,image:value.image};
 }
 function setLeader(s,player,value){
  if(!Number.isInteger(player)||!s.players[player])throw Error('Nieprawidłowy gracz.');
  const leader=value===null?null:leaderData(value);
  if(value!==null&&!leader)throw Error('Nie można wybrać tego lidera.');
  return {...s,players:s.players.map((p,i)=>{if(i!==player)return p;const next={...p};if(leader)next.leader=leader;else delete next.leader;return next;})};
 }
 function startingLife(value){const text=String(value).trim();if(!/^\d{1,4}$/.test(text)||Number(text)<1)throw Error('Wpisz początkowe życie od 1 do 9999.');return Number(text);}
 function create(value,names=[],count=2,now=Date.now()){
  if(!validCount(count))throw Error('Wybierz od 2 do 6 graczy.');if(!validTime(now))throw Error('Nie można odczytać czasu urządzenia.');
  const initial=startingLife(value);
  return {version:2,initial,players:Array.from({length:count},(_,i)=>({name:playerName(names[i],i),life:initial})),starter:null,startedAt:now,timerEstimated:false,historyPartial:false,baseline:Array(count).fill(initial),events:[]};
 }
 function validate(s){
  if(!s||s.version!==2||!Number.isInteger(s.initial)||s.initial<1||s.initial>9999||!validTime(s.startedAt)||typeof s.timerEstimated!=='boolean'||typeof s.historyPartial!=='boolean'||!Array.isArray(s.players)||!validCount(s.players.length))return null;
  const n=s.players.length,isPlayer=i=>Number.isInteger(i)&&i>=0&&i<n;
  if(!(s.starter===null||isPlayer(s.starter))||!s.players.every(p=>p&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=24&&validLife(p.life))||!Array.isArray(s.baseline)||s.baseline.length!==n||!s.baseline.every(validLife)||!Array.isArray(s.events))return null;
  if(!s.historyPartial&&s.baseline.some(x=>x!==s.initial))return null;
  const scores=[...s.baseline],events=[],pending=[];let lastAt=s.startedAt,lastStarter=null;
  for(const e of s.events){
   if(!e||e.id!==events.length+1||!['life','undo','draw'].includes(e.kind))return null;
   if(e.at===null){if(!s.historyPartial)return null;}else{if(!validTime(e.at)||e.at<lastAt)return null;lastAt=e.at;}
   if(e.kind==='draw'){
    if(!isPlayer(e.player))return null;lastStarter=e.player;events.push({id:e.id,kind:e.kind,at:e.at,player:e.player});continue;
   }
   if(!isPlayer(e.player)||!validLife(e.before)||!validLife(e.after)||scores[e.player]!==e.before||![1,-1,5,-5].includes(e.after-e.before))return null;
   const event={id:e.id,kind:e.kind,at:e.at,player:e.player,before:e.before,after:e.after};
   if(e.kind==='undo'){
    const target=pending.pop();if(!target||e.target!==target.id||e.player!==target.player||e.before!==target.after||e.after!==target.before)return null;event.target=e.target;
   }else pending.push(event);
   scores[e.player]=e.after;events.push(event);
  }
  if(scores.some((x,i)=>x!==s.players[i].life)||lastStarter!==s.starter)return null;
  return {version:2,initial:s.initial,players:s.players.map(p=>{const next={name:p.name,life:p.life},leader=leaderData(p.leader);if(leader)next.leader=leader;return next;}),starter:s.starter,startedAt:s.startedAt,timerEstimated:s.timerEstimated,historyPartial:s.historyPartial,baseline:[...s.baseline],events};
 }
 function restore(s,now=Date.now()){
  if(s?.version===2)return validate(s);
  // Version 1 did not record timestamps. Keep its scores and retained undo history.
  if(!s||s.version!==1||!validTime(now)||!Number.isInteger(s.initial)||s.initial<1||s.initial>9999||!Array.isArray(s.players)||s.players.length!==2||!s.players.every(p=>p&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=24&&validLife(p.life))||![null,0,1].includes(s.starter)||!Array.isArray(s.history)||s.history.length>100)return null;
  const baseline=s.players.map(p=>p.life);
  for(const h of [...s.history].reverse()){
   if(!h||![0,1].includes(h.player)||!validLife(h.before)||!validLife(h.after)||![1,-1,5,-5].includes(h.after-h.before)||baseline[h.player]!==h.after)return null;baseline[h.player]=h.before;
  }
  const events=s.history.map((h,i)=>({id:i+1,kind:'life',at:null,player:h.player,before:h.before,after:h.after}));
  if(s.starter!==null)events.push({id:events.length+1,kind:'draw',at:null,player:s.starter});
  return validate({version:2,initial:s.initial,players:s.players,starter:s.starter,startedAt:now,timerEstimated:true,historyPartial:true,baseline,events});
 }
 function timestamp(s,now){if(!validTime(now))throw Error('Nie można odczytać czasu urządzenia.');return Math.max(now,s.startedAt,s.events.at(-1)?.at||0);}
 function append(s,event,now){return {...s,events:[...s.events,{...event,id:s.events.length+1,at:timestamp(s,now)}]};}
 function change(s,player,delta,now=Date.now()){
  if(!Number.isInteger(player)||!s.players[player]||![1,-1,5,-5].includes(delta))throw Error('Nieprawidłowa zmiana życia.');
  const before=s.players[player].life,after=before+delta;if(!validLife(after))throw Error('Licznik obsługuje od −9999 do 99999 punktów.');
  return {...append(s,{kind:'life',player,before,after},now),players:s.players.map((p,i)=>i===player?{...p,life:after}:p)};
 }
 function undoTarget(s){const pending=[];for(const e of s.events){if(e.kind==='life')pending.push(e);else if(e.kind==='undo')pending.pop();}return pending.at(-1)||null;}
 function undo(s,now=Date.now()){
  const target=undoTarget(s);if(!target)return s;
  return {...append(s,{kind:'undo',player:target.player,before:target.after,after:target.before,target:target.id},now),players:s.players.map((p,i)=>i===target.player?{...p,life:target.before}:p)};
 }
 function draw(s,randomUint32,now=Date.now()){
  const count=s.players.length,limit=Math.floor(0x100000000/count)*count;
  // Rejection sampling avoids favouring a player for 3, 5 or 6 participants.
  for(let attempt=0;attempt<32;attempt++){
   const value=randomUint32();if(!Number.isInteger(value)||value<0||value>0xffffffff)break;
   if(value<limit){const player=value%count;return {...append(s,{kind:'draw',player},now),starter:player};}
  }
  throw Error('Nie udało się wylosować gracza. Spróbuj ponownie.');
 }
 function elapsed(s,now=Date.now()){return Math.max(0,Math.floor((now-s.startedAt)/1000));}
 function formatDuration(seconds){seconds=Math.max(0,Math.floor(seconds));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
 return Object.freeze({MIN,MAX,leaderData,setLeader,startingLife,create,validate,restore,change,undo,undoTarget,draw,elapsed,formatDuration});
})();
