/* Image-only zoom. Measurements remain in the original photo coordinates. */
((root)=>{
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function fitSize(w,h,iw,ih){const scale=Math.min(Math.max(1,w-20)/iw,Math.max(1,h-20)/ih);return {w:iw*scale,h:ih*scale};}
 function constrain(s){
  s.x=s.w*s.zoom<=s.width?(s.width-s.w*s.zoom)/2:clamp(s.x,s.width-s.w*s.zoom,0);
  s.y=s.h*s.zoom<=s.height?(s.height-s.h*s.zoom)/2:clamp(s.y,s.height-s.h*s.zoom,0);
  return s;
 }
 function zoomAt(s,value,point){
  const zoom=clamp(value,1,5),ratio=zoom/s.zoom;
  return constrain({...s,zoom,x:point.x-(point.x-s.x)*ratio,y:point.y-(point.y-s.y)*ratio});
 }
 root.CenteringViewMath={fitSize,constrain,zoomAt};
 function create({viewport,content,prefix,onPlace}){
  const el=suffix=>document.getElementById(prefix+'-'+suffix);
  let natural=null,mode='move',gesture=null;
  let state={width:0,height:0,w:0,h:0,zoom:1,x:0,y:0};
  const pointers=new Map();
  content.setAttribute('draggable','false');
  function paint(){
   content.style.width=state.w+'px';content.style.height=state.h+'px';
   content.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.zoom})`;
   el('zoom').value=String(state.zoom);
   el('zoom-value').textContent=state.zoom.toFixed(1).replace('.',',')+'×';
   el('zoom-out').disabled=state.zoom<=1.001;el('zoom-in').disabled=state.zoom>=4.999;
   viewport.dataset.zoomed=String(state.zoom>1.001);viewport.dataset.mode=mode;
  }
  function layout(reset=false){
   if(!natural||!viewport.clientWidth||!viewport.clientHeight)return;
   const width=viewport.clientWidth,height=viewport.clientHeight;
   const center=state.w?{x:(state.width/2-state.x)/(state.w*state.zoom),y:(state.height/2-state.y)/(state.h*state.zoom)}:{x:.5,y:.5};
   const size=fitSize(width,height,natural.width,natural.height),zoom=reset?1:state.zoom;
   state=constrain({width,height,...size,zoom,x:width/2-(reset ? .5 : center.x)*size.w*zoom,y:height/2-(reset ? .5 : center.y)*size.h*zoom});
   paint();
  }
  function local(event){const b=viewport.getBoundingClientRect();return {x:event.clientX-b.left-(viewport.clientLeft||0),y:event.clientY-b.top-(viewport.clientTop||0)};}
  function distance(a,b){return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));}
  function middle(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  function cancelGesture(){
   const ids=[...pointers.keys()];pointers.clear();gesture=null;
   for(const id of ids)if(viewport.hasPointerCapture?.(id))viewport.releasePointerCapture(id);
   viewport.classList.remove('is-dragging');
  }
  function setZoom(value,point={x:state.width/2,y:state.height/2}){
   if(!natural)return;state=zoomAt(state,value,point);paint();
  }
  function setMode(value){
   mode=value==='line'&&onPlace?'line':'move';cancelGesture();
   el('mode-move')?.setAttribute('aria-pressed',String(mode==='move'));
   el('mode-line')?.setAttribute('aria-pressed',String(mode==='line'));paint();
  }
  function pinchStart(){
   const [a,b]=[...pointers.values()],center=middle(a,b);
   gesture={type:'pinch',start:{...state},distance:distance(a,b),center};
  }
  viewport.addEventListener('pointerdown',event=>{
   if(!natural||(event.pointerType==='mouse'&&event.button!==0))return;
   event.preventDefault();viewport.focus({preventScroll:true});
   pointers.set(event.pointerId,local(event));viewport.setPointerCapture(event.pointerId);
   if(pointers.size>=2){pinchStart();return;}
   gesture={type:mode,start:{...state},point:local(event),moved:false};
   viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove',event=>{
   if(!pointers.has(event.pointerId)||!gesture)return;
   event.preventDefault();const point=local(event);pointers.set(event.pointerId,point);
   if(pointers.size>=2){
    if(gesture.type!=='pinch')pinchStart();
    const [a,b]=[...pointers.values()],center=middle(a,b),start=gesture.start;
    const zoom=clamp(start.zoom*distance(a,b)/gesture.distance,1,5),ratio=zoom/start.zoom;
    state=constrain({...start,zoom,x:center.x-(gesture.center.x-start.x)*ratio,y:center.y-(gesture.center.y-start.y)*ratio});paint();return;
   }
   const dx=point.x-gesture.point.x,dy=point.y-gesture.point.y;
   if(Math.hypot(dx,dy)>4)gesture.moved=true;
   if(gesture.type==='move'){state=constrain({...gesture.start,x:gesture.start.x+dx,y:gesture.start.y+dy});paint();}
   else if(gesture.type==='line'&&gesture.moved)onPlace?.(event);
  });
  function endPointer(event){
   if(!pointers.has(event.pointerId))return;
   if(event.type==='pointerup'&&pointers.size===1&&gesture?.type==='line'&&!gesture.moved)onPlace?.(event);
   pointers.delete(event.pointerId);
   if(viewport.hasPointerCapture?.(event.pointerId))viewport.releasePointerCapture(event.pointerId);
   if(pointers.size>=2)pinchStart();
   else if(pointers.size===1){
    // The last finger after a pinch may pan, but must never move a ruler line.
    gesture={type:'move',start:{...state},point:[...pointers.values()][0],moved:true};
   }else {gesture=null;viewport.classList.remove('is-dragging');}
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,endPointer);
  viewport.addEventListener('wheel',event=>{
   if(!natural||!(event.ctrlKey||event.metaKey))return;
   event.preventDefault();event.stopPropagation();setZoom(state.zoom*Math.exp(-event.deltaY*.008),local(event));
  },{passive:false});
  viewport.addEventListener('keydown',event=>{
   if(!natural)return;
   if(event.key==='+'||event.key==='=')setZoom(state.zoom+.25);
   else if(event.key==='-')setZoom(state.zoom-.25);
   else if(event.key==='Home')layout(true);
   else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
    state=constrain({...state,x:state.x+({'ArrowLeft':30,'ArrowRight':-30}[event.key]||0),y:state.y+({'ArrowUp':30,'ArrowDown':-30}[event.key]||0)});paint();
   }else return;
   event.preventDefault();event.stopPropagation();
  });
  el('zoom').oninput=event=>setZoom(Number(event.target.value));
  el('zoom-out').onclick=()=>setZoom(state.zoom-.25);
  el('zoom-in').onclick=()=>setZoom(state.zoom+.25);
  el('zoom-fit').onclick=()=>{cancelGesture();layout(true);};
  if(el('mode-move'))el('mode-move').onclick=()=>setMode('move');
  if(el('mode-line'))el('mode-line').onclick=()=>setMode('line');
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>layout()):null;
  observer?.observe(viewport);window.addEventListener('resize',()=>layout());
  setMode('move');
  return {
   load(width,height){cancelGesture();natural={width,height};setMode('move');layout(true);},
   clear(){cancelGesture();natural=null;state={width:0,height:0,w:0,h:0,zoom:1,x:0,y:0};paint();},
   setMode,reset(){cancelGesture();layout(true);},refresh(){layout();},
   getState(){return {...state,mode};}
  };
 }
 root.CenteringViewport={create};
})(globalThis);
