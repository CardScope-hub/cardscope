(()=>{
 const C=globalThis.CardTabletopCore,KEY='cardscope.tabletop.v1';if(!C||document.getElementById('tabletop-open'))return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';if(fn)b.onclick=fn;return b;};
 const icons={dice:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3.5" stroke-linecap="round"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',history:'<path d="M3 11a9 9 0 1 1 2.6 7.3M3 4v7h7M12 7v5l3 2"/>',undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v4"/>',plus:'<path d="M12 5v14M5 12h14"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'};
 function icon(name){const n=el('span','life-icon');n.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+icons[name]+'</svg>';return n;}
 let state=null,storageAvailable=true,rollTimer=0,clockTimer=0,positionFrame=0,selectedCount=2,screen='board',historyLimit=40;
 const fab=button('','life-fab');fab.id='tabletop-open';fab.append(icon('dice'));fab.title='Licznik życia';fab.setAttribute('aria-label','Otwórz licznik życia');fab.setAttribute('aria-haspopup','dialog');fab.setAttribute('aria-controls','tabletop-dialog');fab.setAttribute('aria-expanded','false');
 const dialog=el('dialog','life-dialog');dialog.id='tabletop-dialog';dialog.setAttribute('aria-labelledby','life-title');
 const close=button('×','life-close',()=>{if(menu.open)menu.close();dialog.close();});close.id='tabletop-close';close.setAttribute('aria-label','Zamknij licznik życia');
 const header=el('header','life-heading'),headingText=el('div','life-heading-text'),kicker=el('span','life-kicker','CARDSCOPE / PRZY STOLE'),title=el('h2','','Wasza gra. Wasze zasady.');title.id='life-title';
 const intro=el('p','life-intro','Od pierwszego ruchu do ostatniego punktu.');headingText.append(kicker,title,intro);
 const timerBox=el('div','life-timer'),timerCopy=el('div'),timerLabel=el('span','life-timer-label','CZAS PARTII'),timer=el('output','life-timer-value','00:00');timer.id='life-timer';timer.setAttribute('role','timer');timer.setAttribute('aria-live','off');timer.setAttribute('aria-label','Czas od rozpoczęcia partii');timerCopy.append(timerLabel,timer);timerBox.append(icon('clock'),timerCopy);timerBox.hidden=true;header.append(headingText);
 const setup=el('form','life-setup');setup.id='life-setup';setup.noValidate=true;
 const countField=el('fieldset','life-field'),countLegend=el('legend','life-label','01 / Ilu was gra?'),countOptions=el('div','life-count-options'),countButtons=[];countField.append(countLegend,countOptions);
 for(let n=2;n<=6;n++){const b=button(String(n),'life-count',()=>{selectedCount=n;updateCount();});b.dataset.count=String(n);b.setAttribute('aria-label',n+' graczy');countOptions.append(b);countButtons.push(b);}
 const pointsField=el('div','life-field'),lifeLabel=el('label','life-label','02 / Życie na start');lifeLabel.htmlFor='life-start';
 const presets=el('div','life-presets');presets.setAttribute('role','group');presets.setAttribute('aria-label','Początkowe życie');
 const lifeInput=el('input','life-input');lifeInput.id='life-start';lifeInput.name='startingLife';lifeInput.type='text';lifeInput.inputMode='numeric';lifeInput.pattern='[0-9]*';lifeInput.maxLength=4;lifeInput.required=true;lifeInput.value='30';lifeInput.autocomplete='off';lifeInput.setAttribute('aria-label','Własna liczba punktów życia');lifeInput.setAttribute('aria-describedby','life-start-hint life-setup-error');
 const presetButtons=[];for(const n of [20,30,40]){const b=button(String(n),'life-preset',()=>{lifeInput.value=String(n);updatePresets();});b.dataset.life=String(n);presets.append(b);presetButtons.push(b);}presets.append(lifeInput);
 const hint=el('p','life-hint','20, 30, 40… lub własna liczba w ostatnim polu.');hint.id='life-start-hint';pointsField.append(lifeLabel,presets,hint);
 const namesField=el('fieldset','life-field'),namesLegend=el('legend','life-label','03 / Kto jest przy stole?'),names=el('div','life-names'),nameInputs=[],nameLabels=[];namesField.append(namesLegend,names);
 for(let i=0;i<6;i++){const label=el('label','life-name-field'),tag=el('span','life-name-tag','0'+(i+1)),input=el('input','life-input');label.dataset.player=String(i);input.id='life-name-'+i;input.name='player'+i;input.type='text';input.maxLength=24;input.placeholder='Gracz '+(i+1);input.setAttribute('aria-label','Nazwa gracza '+(i+1));input.autocomplete='off';label.htmlFor=input.id;label.append(tag,input);names.append(label);nameInputs.push(input);nameLabels.push(label);}
 const error=el('p','life-error');error.id='life-setup-error';error.setAttribute('role','alert');error.hidden=true;
 const setupActions=el('div','life-setup-actions'),start=el('button','life-primary','Rozpocznij partię');start.id='life-begin';start.type='submit';const resume=button('Wróć do trwającej partii','life-secondary',()=>showMatch());resume.id='life-resume';resume.hidden=true;setupActions.append(start,resume);
 setup.append(countField,pointsField,namesField,error,setupActions,el('p','life-local-note','Wynik i historia zapisują się na tym urządzeniu. Możesz zamknąć licznik i wrócić do gry.'));
 const match=el('div','life-match');match.id='life-match';match.hidden=true;
 const nav=el('div','life-match-nav'),views=el('div','life-view-switch');views.setAttribute('role','group');views.setAttribute('aria-label','Widok partii');
 const boardButton=button('','life-view',()=>showScreen('board'));boardButton.id='life-board-tab';boardButton.setAttribute('aria-controls','life-menu-options');boardButton.append(icon('grid'),el('span','','Opcje'));
 const historyButton=button('','life-view',()=>showScreen('history'));historyButton.id='life-history-tab';historyButton.setAttribute('aria-controls','life-history');const historyCount=el('span','life-history-count','0');historyButton.append(icon('history'),el('span','','Historia'),historyCount);views.append(boardButton,historyButton);
 const undo=button('','life-tool',undoLast);undo.id='life-undo';undo.append(icon('undo'),el('span','','Cofnij'));undo.title='Cofnij ostatnią zmianę życia';nav.append(views,undo);
 const board=el('div','life-board');board.id='life-board';const panels=[],FEEDBACK_MS=1200;
 // Keep visual bursts separate from the saved, per-click game history.
 function clearFeedback(p){clearTimeout(p.feedbackTimer);p.feedbackTimer=0;p.feedbackSum=0;p.feedbackUntil=0;p.feedback.dataset.visible='false';}
 function clearFeedbacks(){panels.forEach(clearFeedback);}
 function showFeedback(player,delta){
  const p=panels[player];if(!p)return;const now=performance.now();
  if(now>=p.feedbackUntil)p.feedbackSum=0;
  clearTimeout(p.feedbackTimer);p.feedbackSum+=delta;p.feedbackUntil=now+FEEDBACK_MS;
  p.feedback.textContent=p.feedbackSum===0?'±0':(p.feedbackSum>0?'+':'−')+Math.abs(p.feedbackSum);
  p.feedback.dataset.sign=p.feedbackSum>0?'plus':p.feedbackSum<0?'minus':'neutral';
  p.feedback.dataset.visible='true';p.feedbackTimer=setTimeout(()=>clearFeedback(p),FEEDBACK_MS);
 }
 let seatFrame=0;
 const seatObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(scheduleSeats):null;
 function setSeatStyle(seat,key,value){if(seat.style.getPropertyValue(key)!==value)seat.style.setProperty(key,value);}
 function sizeScore(p){
  if(!p.geometry)return;const {numberWidth,numberHeight}=p.geometry;
  const length=String(state.players[Number(p.panel.dataset.player)].life).length;
  const feedbackSpace=Math.round(Math.min(30,Math.max(18,numberHeight*.2)));
  const size=Math.max(12,Math.floor(Math.min(180,(numberHeight-feedbackSpace)*.95,numberWidth/(length*.66))));
  setSeatStyle(p.seat,'--seat-delta-space',feedbackSpace+'px');
  setSeatStyle(p.seat,'--seat-delta-size',Math.max(12,Math.min(20,Math.round(feedbackSpace*.65)))+'px');
  setSeatStyle(p.seat,'--seat-score-size',size+'px');
 }
 function layoutSeats(){
  seatFrame=0;if(!state||match.hidden)return;
  const landscape=window.matchMedia('(orientation: landscape)').matches,count=state.players.length;
  panels.forEach((p,i)=>{
   let turn;
   if(!landscape)turn=count===2?(i===0?180:0):(count%2===1&&i===count-1?0:(i%2===0?90:-90));
   else if(count===2)turn=i===0?90:-90;
   else turn=i<(count>=5?3:2)?180:0;
   p.panel.dataset.facing=String(turn);setSeatStyle(p.seat,'--seat-turn',turn+'deg');
   const rect=p.panel.getBoundingClientRect(),quarter=Math.abs(turn)===90;
   if(rect.width<=0||rect.height<=0)return;
   // Rotate the complete controls, swapping dimensions so corners stay inside the tile.
   const width=Math.max(1,(quarter?rect.height:rect.width)-2),height=Math.max(1,(quarter?rect.width:rect.height)-2);
   const pad=Math.round(Math.min(20,Math.max(8,Math.min(width,height)*.055))),front=height<200?14:Math.round(Math.min(34,Math.max(14,height*.18))),gap=6,button=width<184?40:Math.round(Math.min(56,Math.max(44,width*.15)));
   p.geometry={width,height,numberWidth:Math.max(16,width-2*pad-2*button-2*gap),numberHeight:Math.max(16,height-front-pad-54-2*gap)};
   const quick=p.geometry.numberHeight<100?32:40,buttonHeight=Math.min(button,Math.max(28,p.geometry.numberHeight-quick));
   for(const [key,value] of Object.entries({'--seat-heading':'54px','--seat-width':width+'px','--seat-height':height+'px','--seat-pad':pad+'px','--seat-front':front+'px','--seat-button':button+'px','--seat-button-height':buttonHeight+'px','--seat-quick':quick+'px'}))setSeatStyle(p.seat,key,value);
   sizeScore(p);p.panel.dataset.seatReady='true';
  });
 }
 function scheduleSeats(){if(!seatFrame)seatFrame=requestAnimationFrame(layoutSeats);}

 function buildPlayers(){
  clearFeedbacks();seatObserver?.disconnect();panels.length=0;board.replaceChildren();board.dataset.count=String(state.players.length);
  for(let i=0;i<state.players.length;i++){
   const panel=el('section','life-player'),seat=el('div','life-seat');panel.dataset.player=String(i);panel.setAttribute('aria-labelledby','life-player-name-'+i);
   const who=el('div','life-player-heading'),numberTag=el('span','life-player-tag','0'+(i+1)),playerName=el('h3','life-player-name'),badge=el('span','life-starter','START');playerName.id='life-player-name-'+i;badge.hidden=true;
   const nameRow=el('div','life-player-name-row'),leaderPick=button('Wybierz lidera','life-leader-pick',()=>pickLeader(i));
   leaderPick.id='life-leader-pick-'+i;leaderPick.setAttribute('aria-haspopup','dialog');leaderPick.setAttribute('aria-controls','tabletop-leaders');
   nameRow.append(numberTag,playerName,badge);who.append(nameRow,leaderPick);
   const backdrop=el('div','life-leader-backdrop'),leaderImage=el('img');backdrop.setAttribute('aria-hidden','true');backdrop.hidden=true;leaderImage.alt='';leaderImage.draggable=false;leaderImage.decoding='async';leaderImage.onload=()=>{if(leaderImage.getAttribute('src'))backdrop.hidden=false;};leaderImage.onerror=()=>{backdrop.hidden=true;};backdrop.append(leaderImage);
   const counter=el('div','life-counter'),minus=button('−','life-step',()=>adjust(i,-1)),plus=button('+','life-step',()=>adjust(i,1));minus.dataset.delta='-1';plus.dataset.delta='1';
   const readout=el('div','life-readout'),feedback=el('span','life-change'),value=el('output','life-number');
   feedback.setAttribute('aria-hidden','true');feedback.dataset.visible='false';
   value.id='life-value-'+i;value.setAttribute('aria-live','off');readout.append(feedback,value);counter.append(minus,readout,plus);
   const quick=el('div','life-quick'),minus5=button('−5','life-step-small',()=>adjust(i,-5)),plus5=button('+5','life-step-small',()=>adjust(i,5));minus5.dataset.delta='-5';plus5.dataset.delta='5';const latest=el('span','life-last-change','PUNKTY ŻYCIA');quick.append(minus5,latest,plus5);
   seat.append(backdrop,who,counter,quick);panel.append(seat);board.append(panel);panels.push({panel,seat,playerName,badge,leaderPick,leaderImage,backdrop,leaderKey:null,value,latest,feedback,feedbackSum:0,feedbackUntil:0,feedbackTimer:0,buttons:[minus,plus,minus5,plus5],geometry:null});seatObserver?.observe(panel);
  }
  historyFilter.replaceChildren(el('option','','Wszyscy gracze'));historyFilter.firstChild.value='all';
  state.players.forEach((p,i)=>{const option=el('option','',p.name);option.value=String(i);historyFilter.append(option);});scheduleSeats();
 }
 function pickLeader(player){
  if(!state||match.hidden||!dialog.open)return;
  if(!globalThis.CardTabletopLeaders){status.textContent='Odśwież aplikację, aby wczytać wybór lidera.';return;}
  const panel=panels[player];
  globalThis.CardTabletopLeaders.open({name:state.players[player].name,selected:state.players[player].leader||null,trigger:panel.leaderPick,onSelect:leader=>{
   if(!dialog.open||match.hidden||panels[player]!==panel)return;
   state=C.setLeader(state,player,leader);persist();render();
   status.textContent=state.players[player].name+(leader?': wybrano lidera '+leader.name+'.':': usunięto lidera.');
  }});
 }
 function renderLeader(p,data){
  const leader=data.leader,key=leader?.id||'';
  p.leaderPick.textContent=leader?leader.name:'Wybierz lidera';
  p.leaderPick.title=leader?[leader.name,leader.subtitle,leader.set].filter(Boolean).join(' · '):'Star Wars: Unlimited';
  p.leaderPick.setAttribute('aria-label',data.name+': '+(leader?'Zmień lidera — '+p.leaderPick.title:'Wybierz lidera Star Wars: Unlimited'));
  p.leaderPick.dataset.selected=String(!!leader);
  if(p.leaderKey===key)return;
  p.leaderKey=key;p.backdrop.hidden=true;
  if(leader)p.leaderImage.src=leader.image;else p.leaderImage.removeAttribute('src');
 }
 const historyView=el('section','life-history');historyView.id='life-history';historyView.hidden=true;historyView.setAttribute('aria-label','Historia partii');
 const historyHeading=el('div','life-history-heading'),historyTitle=el('h3','','Przebieg partii'),historyFilter=el('select');historyFilter.id='life-history-filter';historyFilter.setAttribute('aria-label','Filtruj historię według gracza');historyFilter.onchange=()=>{historyLimit=40;renderHistory();};historyHeading.append(historyTitle,historyFilter);
 const historyNote=el('p','life-history-note'),historyList=el('ol','life-history-list');historyList.id='life-history-list';
 const historyMore=button('Pokaż wcześniejsze','life-secondary',()=>{historyLimit+=40;renderHistory();});historyMore.id='life-history-more';
 historyView.append(historyHeading,historyNote,historyList,historyMore);
 const footer=el('div','life-match-footer'),drawBlock=el('div','life-draw-block'),starts=el('p','life-start-result','Kto zaczyna?');starts.id='life-starter-result';
 const roll=button('','life-roll',rollStarter);roll.id='life-roll';const rollLabel=el('span','','Losuj start');roll.append(icon('dice'),rollLabel);drawBlock.append(starts,roll);
 const newGame=button('','life-tool life-new',()=>{menu.close();showSetup(true);});newGame.id='life-new';newGame.append(icon('plus'),el('span','','Nowa partia'));footer.append(drawBlock,newGame);
 const arena=el('div','life-arena');arena.id='life-arena';
 const hub=button('','life-menu-trigger',openMenu);hub.id='life-menu-open';hub.setAttribute('aria-label','Otwórz menu partii');hub.setAttribute('aria-haspopup','dialog');hub.setAttribute('aria-controls','tabletop-menu');hub.setAttribute('aria-expanded','false');hub.append(icon('dice'),el('span','','MENU'));
 const hud=el('div','life-hud'),gameLabel=el('span','life-game-label');hud.append(timerBox,gameLabel);arena.append(board,hub);match.append(hud,arena);
 const menu=el('dialog','life-dialog life-menu-dialog');menu.id='tabletop-menu';menu.setAttribute('aria-labelledby','life-menu-title');
 const menuClose=button('×','life-close',()=>menu.close());menuClose.id='life-menu-close';menuClose.setAttribute('aria-label','Zamknij menu partii');
 const menuHeading=el('header','life-menu-heading'),menuBrand=el('div','life-menu-brand');menuBrand.append(icon('dice'),el('span','life-kicker','CARDSCOPE / PRZY STOLE'));
 const menuTitle=el('h2','','Wasza partia');menuTitle.id='life-menu-title';
 const menuSummary=el('p','life-menu-summary'),menuTimer=el('output','','00:00');menuTimer.id='life-menu-timer';menuTimer.setAttribute('role','timer');menuTimer.setAttribute('aria-live','off');menuTimer.setAttribute('aria-label','Czas partii');menuHeading.append(menuBrand,menuTitle,menuSummary,menuTimer);
 const options=el('div','life-menu-options');options.id='life-menu-options';options.append(footer);
 const backToGame=button('Wróć do gry','life-primary',()=>menu.close());backToGame.id='life-menu-resume';
 menu.append(menuClose,menuHeading,nav,options,historyView,backToGame);
 menu.addEventListener('close',()=>{clearRoll();hub.setAttribute('aria-expanded','false');if(dialog.open&&!match.hidden)hub.focus({preventScroll:true});});
 function openMenu(){if(!state||menu.open||match.hidden)return;showScreen('board');menuSummary.textContent=state.players.length+' graczy · '+state.initial+' życia na start';tickClock();menu.showModal();hub.setAttribute('aria-expanded','true');backToGame.focus({preventScroll:true});}

 const status=el('p','life-status');status.id='life-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const storageNote=el('p','life-storage-note');storageNote.id='life-storage-note';storageNote.setAttribute('role','status');storageNote.hidden=true;
 dialog.append(close,header,setup,match,status,storageNote);document.body.append(fab,dialog,menu);
 function read(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const parsed=JSON.parse(raw),restored=C.restore(parsed);if(restored&&parsed.version===1){state=restored;persist();}return restored;}catch{return null;}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}storageNote.hidden=storageAvailable;storageNote.textContent=storageAvailable?'':'Nie udało się zapisać partii na urządzeniu. Licznik nadal działa. Nie odświeżaj strony, jeśli chcesz zachować tę grę.';fab.dataset.active=String(!!state);}
 function updatePresets(){for(const b of presetButtons)b.setAttribute('aria-pressed',String(lifeInput.value===b.dataset.life));}
 function updateCount(){for(const b of countButtons)b.setAttribute('aria-pressed',String(selectedCount===Number(b.dataset.count)));nameLabels.forEach((label,i)=>{label.hidden=i>=selectedCount;nameInputs[i].disabled=i>=selectedCount;});}
 function clearRoll(){clearTimeout(rollTimer);rollTimer=0;roll.disabled=false;delete roll.dataset.rolling;}
 function tickClock(){if(!state)return;const text=C.formatDuration(C.elapsed(state));if(timer.textContent!==text)timer.textContent=text;if(menuTimer.textContent!==text)menuTimer.textContent=text;}
 function stopClock(){clearInterval(clockTimer);clockTimer=0;}
 function syncClock(){stopClock();if(dialog.open&&!match.hidden&&!document.hidden){tickClock();clockTimer=setInterval(tickClock,1000);}}
 function showSetup(newMatch=false){
  globalThis.CardTabletopLeaders?.close();if(menu.open)menu.close();clearFeedbacks();clearRoll();stopClock();dialog.dataset.lifeStage='setup';setup.hidden=false;match.hidden=true;timerBox.hidden=true;title.textContent=state?'Nowe rozdanie.':'Wasza gra. Wasze zasady.';intro.textContent=state?'Obecny wynik i historię zastąpisz dopiero po rozpoczęciu nowej partii.':'Od pierwszego ruchu do ostatniego punktu.';
  selectedCount=state?.players.length||2;lifeInput.value=String(state?.initial||30);nameInputs.forEach((input,i)=>input.value=state?.players[i]?.name||'');resume.hidden=!state;start.textContent=state?'Rozpocznij nową partię':'Rozpocznij partię';error.hidden=true;error.textContent='';lifeInput.removeAttribute('aria-invalid');status.textContent='';updatePresets();updateCount();resetScroll();if(newMatch)countButtons[selectedCount-2].focus({preventScroll:true});
 }
 function showMatch(){if(!state)return;setup.hidden=true;match.hidden=false;timerBox.hidden=false;dialog.dataset.lifeStage='match';gameLabel.textContent=state.players.length+' GRACZY';title.textContent='Partia w toku';intro.textContent=state.players.length+' graczy · '+state.initial+' życia na start';timerLabel.textContent=state.timerEstimated?'CZAS OD AKTUALIZACJI':'CZAS PARTII';error.hidden=true;buildPlayers();showScreen('board');render();syncClock();}
 function resetScroll(){const target=menu.open?menu:dialog,panel=target.querySelector(':scope > .cs-modal-panel');if(panel)panel.scrollTop=0;target.scrollTop=0;}
 function showScreen(next){screen=next;board.hidden=false;options.hidden=next!=='board';historyView.hidden=next!=='history';boardButton.setAttribute('aria-pressed',String(next==='board'));historyButton.setAttribute('aria-pressed',String(next==='history'));menu.dataset.lifeView=next;if(next==='history'){historyLimit=40;renderHistory();}resetScroll();}
 function render(){
  if(!state)return;
  const lastByPlayer=new Map();for(const event of state.events)if(event.kind!=='draw')lastByPlayer.set(event.player,event);
  panels.forEach((p,i)=>{const data=state.players[i];p.playerName.textContent=data.name;p.playerName.title=data.name;renderLeader(p,data);p.value.textContent=String(data.life);sizeScore(p);p.value.dataset.digits=String(String(data.life).length);p.value.setAttribute('aria-label',data.name+': '+data.life+' pkt życia');p.badge.hidden=state.starter!==i;p.panel.dataset.starts=String(state.starter===i);p.panel.dataset.empty=String(data.life<=0);const latest=lastByPlayer.get(i);p.latest.textContent=latest?(latest.kind==='undo'?'Cofnięcie: ':'Ostatnio: ')+(latest.after>latest.before?'+':'−')+Math.abs(latest.after-latest.before):'PUNKTY ŻYCIA';for(const b of p.buttons){const delta=Number(b.dataset.delta);b.setAttribute('aria-label',(delta>0?'Dodaj ':'Odejmij ')+Math.abs(delta)+' pkt życia: '+data.name);b.disabled=data.life+delta<C.MIN||data.life+delta>C.MAX;}});
  starts.textContent=state.starter===null?'Kto wykona pierwszy ruch?':'Zaczyna: '+state.players[state.starter].name;rollLabel.textContent=state.starter===null?'Losuj start':'Losuj ponownie';undo.disabled=!C.undoTarget(state);historyCount.textContent=String(state.events.filter(e=>e.kind!=='draw').length);historyCount.hidden=historyCount.textContent==='0';
  fab.dataset.active='true';fab.setAttribute('aria-label','Wróć do licznika życia');if(screen==='history')renderHistory();tickClock();
 }
 function renderHistory(){
  if(!state)return;const filter=historyFilter.value,all=state.events.filter(e=>filter==='all'||e.player===Number(filter)).slice().reverse(),shown=all.slice(0,historyLimit),undone=new Set(state.events.filter(e=>e.kind==='undo').map(e=>e.target));
  historyNote.textContent=state.historyPartial?'Zachowano dostępną historię poprzedniej wersji. Starsze ruchy nie mają czasu; licznik czasu działa od aktualizacji.':'Najnowsze ruchy są na górze. Czas przy ruchu to czas od początku partii.';
  historyList.replaceChildren();
  for(const event of shown){
   const row=el('li','life-history-row');row.dataset.kind=event.kind;row.dataset.player=String(event.player);row.dataset.event=String(event.id);
   const diff=event.kind==='draw'?null:event.after-event.before,delta=el('span','life-history-delta',diff===null?'✦':(diff>0?'+':'−')+Math.abs(diff));if(diff!==null)delta.dataset.sign=diff>0?'plus':'minus';
   const copy=el('div','life-history-copy'),name=el('strong','',state.players[event.player].name),detail=el('span','',event.kind==='draw'?'Wylosowano do rozpoczęcia':event.before+' → '+event.after+' pkt życia'+(event.kind==='undo'?' · cofnięcie ruchu':''));copy.append(name,detail);
   if(undone.has(event.id))copy.append(el('small','life-undone','COFNIĘTO'));
   const when=el('span','life-history-time',event.at===null?'wcześniej':C.formatDuration(C.elapsed(state,event.at)));when.title=event.at===null?'Ruch sprzed aktualizacji':new Date(event.at).toLocaleString('pl-PL');row.append(delta,copy,when);historyList.append(row);
  }
  historyMore.hidden=all.length<=historyLimit;
  if(!shown.length){const empty=el('li','life-history-empty');empty.append(icon('history'),el('strong','',filter==='all'?'Pierwszy ruch przed wami.':'Ten gracz nie ma jeszcze ruchów.'),el('span','','Dodane i odjęte punkty pojawią się tutaj.'));historyList.append(empty);}
  if(historyMore.hidden){const beginning=el('li','life-history-start');beginning.append(el('span','life-start-dot'),el('span','',state.historyPartial?'Początek dostępnej historii':'Początek partii · po '+state.initial+' pkt życia'),el('span','',state.historyPartial?'wcześniej':'00:00'));historyList.append(beginning);}
 }
 function adjust(player,delta){if(!state)return;try{state=C.change(state,player,delta);persist();render();showFeedback(player,delta);status.textContent=state.players[player].name+': '+state.players[player].life+' pkt życia.';}catch(e){status.textContent=e.message;}}
 function undoLast(){if(!state)return;const target=C.undoTarget(state);if(!target)return;state=C.undo(state);persist();render();showFeedback(target.player,target.before-target.after);status.textContent='Cofnięto zmianę. '+state.players[target.player].name+': '+state.players[target.player].life+' pkt życia.';}
 function rollStarter(){if(!state||roll.disabled)return;try{state=C.draw(state,()=>crypto.getRandomValues(new Uint32Array(1))[0]);persist();render();status.textContent=starts.textContent+'.';roll.disabled=true;roll.dataset.rolling='true';rollTimer=setTimeout(clearRoll,460);}catch(e){status.textContent=e.message||'Losowanie jest chwilowo niedostępne.';}}
 setup.addEventListener('submit',event=>{event.preventDefault();try{const next=C.create(lifeInput.value,nameInputs.map(n=>n.value),selectedCount);state=next;persist();showMatch();hub.focus({preventScroll:true});status.textContent='Nowa partia: '+selectedCount+' graczy, po '+state.initial+' pkt życia.';}catch(e){error.textContent=e.message;error.hidden=false;lifeInput.setAttribute('aria-invalid','true');lifeInput.focus({preventScroll:true});}});
 lifeInput.addEventListener('input',()=>{updatePresets();lifeInput.removeAttribute('aria-invalid');error.hidden=true;});
 fab.onclick=()=>{if(dialog.open)return;if(storageAvailable)state=read()||state;if(state)showMatch();else showSetup();dialog.showModal();scheduleSeats();document.documentElement.classList.add('cs-tabletop-open');fab.setAttribute('aria-expanded','true');syncClock();if(state)hub.focus({preventScroll:true});else countButtons[selectedCount-2].focus({preventScroll:true});};
 dialog.addEventListener('close',()=>{globalThis.CardTabletopLeaders?.close();if(menu.open)menu.close();document.documentElement.classList.remove('cs-tabletop-open');clearFeedbacks();clearRoll();stopClock();fab.setAttribute('aria-expanded','false');fab.focus({preventScroll:true});});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearFeedbacks();syncClock();});window.addEventListener('pagehide',()=>{clearFeedbacks();stopClock();});window.addEventListener('pageshow',syncClock);
 function place(){positionFrame=0;const nav=document.querySelector('.nav'),r=nav?.getBoundingClientRect(),height=window.innerHeight,width=window.innerWidth;if(r&&r.width>0&&r.height>0&&r.top>height*.4&&r.top<height){fab.style.bottom=Math.round(height-r.top+12)+'px';fab.style.right=Math.max(16,Math.round(width-r.right+8))+'px';}}
 function schedulePosition(){if(!positionFrame)positionFrame=requestAnimationFrame(place);}
 const mainNav=document.querySelector('.nav');if(mainNav&&typeof ResizeObserver!=='undefined')new ResizeObserver(schedulePosition).observe(mainNav);
 window.addEventListener('resize',()=>{schedulePosition();scheduleSeats();},{passive:true});window.addEventListener('orientationchange',()=>{schedulePosition();scheduleSeats();},{passive:true});window.visualViewport?.addEventListener('resize',scheduleSeats,{passive:true});
 state=read();fab.dataset.active=String(!!state);updatePresets();updateCount();schedulePosition();
})();
