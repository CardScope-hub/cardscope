/* Presentation only: keep catalog identity, prices and saved user records intact. */
globalThis.CardArtwork=(()=>{
 'use strict';
 const src=new URL('assets/card-coming-soon.webp',document.currentScript?.src||document.baseURI).href;
 function bind(img,card,{placeholder=null,note=null}={}){
  img.onload=null;img.onerror=null;
  img.removeAttribute('srcset');img.removeAttribute('sizes');
  img.dataset.cardPlaceholder='true';img.alt=(card?.name?card.name+' — ':'')+'Wkrótce dostępne';
  img.title='Ilustracja wkrótce dostępna';img.src=src;img.hidden=false;
  if(placeholder)placeholder.hidden=true;
  if(note){note.textContent='';note.hidden=true;}
  // No onResolve callback: the placeholder must never be stored as the real artwork.
  return ()=>{};
 }
 function node(card,className=''){
  const img=document.createElement('img');img.className=className;img.loading='lazy';img.decoding='async';img.draggable=false;
  bind(img,card);return img;
 }
 return Object.freeze({hidden:true,src,url:()=>src,bind,node});
})();
