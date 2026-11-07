(()=>{
 'use strict';
 const $=id=>document.getElementById(id),dialog=$('profile-crop-dialog');if(!dialog)return;
 let staged={},paths={},urls={},source=null,kind='avatar',decodeRun=0,drag=null,previousFocus=null;
 const notify=()=>document.dispatchEvent(new Event('profile-media-change'));
 const revoke=k=>{if(urls[k])URL.revokeObjectURL(urls[k]);delete urls[k]};
 const close=()=>{decodeRun++;source?.close?.();source=null;dialog.close();previousFocus?.focus();};
 const canvas=$('profile-crop-canvas'),zoom=$('profile-crop-zoom'),x=$('profile-crop-x'),y=$('profile-crop-y');
 function draw(){if(!source)return;const scale=Math.max(canvas.width/source.width,canvas.height/source.height)*Number(zoom.value);const w=source.width*scale,h=source.height*scale;const ctx=canvas.getContext('2d');ctx.fillStyle='#24182f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,(canvas.width-w)*Number(x.value)/100,(canvas.height-h)*Number(y.value)/100,w,h);}
 async function open(file,k){if(!file)return;const run=++decodeRun;kind=k;const status=$('profile-media-status');status.textContent='Otwieram zdjęcie…';
  try{if(file.size>15*1024*1024)throw Error('Wybierz zdjęcie mniejsze niż 15 MB.');if(file.type&&!file.type.startsWith('image/'))throw Error('Wybierz plik ze zdjęciem.');
   let img;if(window.createImageBitmap)try{img=await createImageBitmap(file,{resizeWidth:2048,imageOrientation:'from-image'});}catch{/* Safari may support the gallery format through Image instead. */}if(!img){const url=URL.createObjectURL(file);try{img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('format'));i.src=url;});}finally{URL.revokeObjectURL(url)}}
   if(run!==decodeRun){img?.close?.();return}if(!img.width||!img.height||img.width*img.height>32000000){img?.close?.();throw Error('Zdjęcie ma zbyt duże wymiary. Wybierz mniejsze.');}
   source?.close?.();source=img;canvas.width=k==='avatar'?512:1200;canvas.height=k==='avatar'?512:450;canvas.dataset.kind=k;
   zoom.value='1';x.value=y.value='50';$('profile-crop-title').textContent=k==='avatar'?'Twoje zdjęcie profilowe':'Twój baner';status.textContent='';previousFocus=document.activeElement;dialog.showModal();draw();$('profile-crop-use').focus();
  }catch(e){if(run===decodeRun)status.textContent=e.message==='format'||e.name==='InvalidStateError'?'Nie można odczytać tego formatu. Wybierz JPG, PNG lub WebP.':e.message||'Nie udało się otworzyć zdjęcia.';}
 }
 for(const k of ['avatar','banner']){$('profile-'+k+'-file').onchange=e=>{void open(e.target.files[0],k);e.target.value=''};$('profile-'+k+'-upload').onclick=()=>$('profile-'+k+'-file').click();$('profile-'+k+'-remove').onclick=()=>remove(k);}
 for(const input of [zoom,x,y])input.oninput=draw;
 canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,px:Number(x.value),py:Number(y.value)};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag||!source)return;const rect=canvas.getBoundingClientRect(),scale=Math.max(canvas.width/source.width,canvas.height/source.height)*Number(zoom.value),overflowX=(source.width*scale-canvas.width)*rect.width/canvas.width,overflowY=(source.height*scale-canvas.height)*rect.height/canvas.height;
  x.value=String(Math.max(0,Math.min(100,drag.px-(e.clientX-drag.x)/(overflowX||Infinity)*100)));y.value=String(Math.max(0,Math.min(100,drag.py-(e.clientY-drag.y)/(overflowY||Infinity)*100)));draw();};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 $('profile-crop-cancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 $('profile-crop-use').onclick=()=>{const run=decodeRun,k=kind;canvas.toBlob(blob=>{if(run!==decodeRun||!blob)return;if(blob.size>1500000){$('profile-media-status').textContent='Zdjęcie jest za duże. Wybierz mniejszy plik.';close();return}revoke(k);staged[k]=blob;paths[k]=null;urls[k]=URL.createObjectURL(blob);close();notify();},'image/jpeg',.88)};
 function remove(k){revoke(k);staged[k]=null;paths[k]=null;notify();}
 function reset(profile){decodeRun++;if(dialog.open)close();for(const k of ['avatar','banner'])revoke(k);staged={};paths={avatar:profile?.avatarPath||null,banner:profile?.bannerPath||null};$('profile-media-status').textContent='';}
 function preview(p){const avatar=$('profile-preview-avatar'),banner=$('profile-banner-image');for(const k of ['avatar','banner'])$('profile-'+k+'-remove').hidden=!urls[k]&&!paths[k];
  if(urls.avatar){window.CardSocial.paintAvatar(avatar,{...p,avatarPath:null});const img=document.createElement('img');img.src=urls.avatar;img.alt='';avatar.replaceChildren(img)}else window.CardSocial.paintAvatar(avatar,{...p,avatarPath:paths.avatar});
  if(urls.banner){window.CardSocial.paintBanner(banner,{});const img=document.createElement('img');img.src=urls.banner;img.alt='';banner.replaceChildren(img)}else window.CardSocial.paintBanner(banner,{...p,bannerPath:paths.banner});
 }
 window.CardMedia=Object.freeze({reset,remove,preview,get(){return {avatarPath:paths.avatar||null,bannerPath:paths.banner||null}},get blobs(){return {...staged}},get dirty(){return Object.keys(staged).length>0}});
})();
