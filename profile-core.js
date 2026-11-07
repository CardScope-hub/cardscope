/* Small, private account profile. These fields never grant access to data. */
(()=>{
 'use strict';
 const avatars=Object.freeze({
  prism:{label:'Pryzmat',paths:['M12 3 21 10 12 22 3 10Z','M3 10h18M8 10l4 12 4-12M8 10l4-7 4 7']},
  orbit:{label:'Orbita',paths:['M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z','M4.2 19.8c2 2 7-.4 11.3-4.3S22 6.2 19.8 4.2 12.8 4.6 8.5 8.5 2 17.8 4.2 19.8Z']},
  bolt:{label:'Błyskawica',paths:['m13 2-9 12h7l-1 8 10-13h-7Z']},
  moon:{label:'Księżyc',paths:['M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z','m17 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z']},
  leaf:{label:'Liść',paths:['M20 3C7 2 2 8 5 15c3 6 15 4 15-12Z','M3 21 15 9M8 16v-5M8 16h6']},
  flame:{label:'Płomień',paths:['M13 2c2 5-4 6-2 10 3 0 5-3 5-5 7 8 4 15-4 15S1 13 6 8c-1 5 3 6 3 2 0-3 1-6 4-8Z']},
  crown:{label:'Korona',paths:['m3 6 4 5 5-8 5 8 4-5-2 13H5Z','M6 22h12']},
  cards:{label:'Karty',paths:['M9 3h11v16H9Z','M6 6 2 7l3 15 11-3']}
 });
 const themes=Object.freeze({amethyst:'Ametyst',lilac:'Lawenda',midnight:'Nocny fiolet',rose:'Różowy kwarc'});
 const games=Object.freeze({'':'Wszystkie karcianki',pokemon:'Pokémon',mtg:'Magic: The Gathering',onepiece:'One Piece',weiss:'Weiß Schwarz EN','weiss-jp':'Weiß Schwarz JP',riftbound:'Riftbound',swu:'Star Wars: Unlimited'});
 const text=v=>typeof v==='string'?v.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').trim():'';
 const cut=(v,n)=>Array.from(text(v)).slice(0,n).join('');
 const own=(map,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(map,key);
 function read(user){const m=user?.user_metadata||{},p=m.cardscope_profile&&typeof m.cardscope_profile==='object'&&!Array.isArray(m.cardscope_profile)?m.cardscope_profile:{};
  return {displayName:cut(p.display_name||m.display_name,50),bio:cut(p.bio,160),avatar:own(avatars,p.avatar)?p.avatar:'prism',theme:own(themes,p.theme)?p.theme:'amethyst',game:own(games,p.game)?p.game:'',updatedAt:typeof p.updated_at==='string'&&Number.isFinite(Date.parse(p.updated_at))?p.updated_at:null,complete:p.version===1&&!!text(p.display_name)};
 }
 function validate(input){const displayName=text(input?.displayName),bio=text(input?.bio);if(Array.from(displayName).length<2||Array.from(displayName).length>50)throw Object.assign(Error('Nick powinien mieć od 2 do 50 znaków.'),{code:'profile_name'});if(Array.from(bio).length>160)throw Object.assign(Error('Opis może mieć maksymalnie 160 znaków.'),{code:'profile_bio'});if(!own(avatars,input?.avatar)||!own(themes,input?.theme)||!own(games,input?.game))throw Object.assign(Error('Wybierz avatar, kolor i grę z dostępnej listy.'),{code:'profile_choice'});return {displayName,bio,avatar:input.avatar,theme:input.theme,game:input.game};}
 function metadata(value,current={},now=new Date().toISOString()){const p=validate(value),old=current?.cardscope_profile;return {display_name:p.displayName,cardscope_profile:{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,display_name:p.displayName,bio:p.bio,avatar:p.avatar,theme:p.theme,game:p.game,updated_at:now}};}
 function paint(container,value){const key=own(avatars,value?.avatar)?value.avatar:'prism',theme=own(themes,value?.theme)?value.theme:'amethyst';container.dataset.theme=theme;
  if(container.dataset.avatar===key&&container.firstElementChild)return;container.dataset.avatar=key;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.4');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');for(const d of avatars[key].paths){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path)}container.replaceChildren(svg);
 }
 globalThis.CardProfile=Object.freeze({avatars,themes,games,read,validate,metadata,paint});
})();
