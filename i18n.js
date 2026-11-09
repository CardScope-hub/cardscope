/* CardScope interface localization. Catalog data and persisted values stay unchanged. */
(() => {
 'use strict';
 const KEY='cardscope.interface-language', supported=['pl','en'];
 let language='pl';try{const saved=localStorage.getItem(KEY);if(supported.includes(saved))language=saved;}catch{}
 const dictionary=globalThis.CardScopeEnglish||{}, originals=new WeakMap(), attributes=new WeakMap();
 const normalized=s=>s.replace(/\s+/g,' ').trim();
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const patterns=Object.entries(dictionary).filter(([s])=>s.includes('{{v}}')).map(([source,target])=>({source,target,weight:source.replaceAll('{{v}}','').length,regex:new RegExp('^'+source.split('{{v}}').map(escape).join('([\\s\\S]{0,1500}?)')+'$')})).filter(p=>p.weight>=4).sort((a,b)=>b.weight-a.weight);
 // Only enum labels may be localized inside template parameters. Names remain verbatim.
 const enumLabels=new Set(['Angielski','Japoński','Niemiecki','Francuski','Hiszpański','Włoski','Portugalski','Koreański','Chiński uproszczony','Chiński tradycyjny','Polski','Nieustalony','Inny','Inna','Nieoceniony','wycena ręczna','Brak wyceny','pełna wycena','odświeżam ceny','Własna wycena','Zgodny numer i seria','Zgodny numer','Podobna nazwa','Zapisana wycena','cena sklepu','cena katalogowa · produkt niedostępny','twoja strona','druga strona','NBP · tabela A','zapisana kopia','starsza wycena','w tym Twój zapis','bez wyceny','bez ceny','bez kursu','karta niedostępna','dodaj kartę','możesz dodać kilka kart jednocześnie','jedna karta do wybranej kieszonki','Brak daty źródła','brak daty źródła','Rynek angielski','Wydanie z ilustracji']);
 const cache=new Map();
 function translate(value,depth=0){
  if(language!=='en'||typeof value!=='string'||!value.trim())return value;
  const text=normalized(value);if(cache.has(value))return cache.get(value);let result=dictionary[text];
  if(result===undefined){
   for(const pattern of patterns){const match=pattern.regex.exec(text);if(!match)continue;let i=0;result=pattern.target.replace(/\{\{v\}\}/g,()=>{const raw=match[++i]||'';const key=normalized(raw);if(depth<3&&(enumLabels.has(key)||/^(?:\s*[·.]\s+|\d+ szt\.|\d{4}-\d\d-\d\d · )/.test(raw)))return translate(raw,depth+1);return raw});break;}
  }
  if(result===undefined&&text.includes(' · ')){const parts=text.split(' · ');const translated=parts.map((p,i)=>enumLabels.has(p)||i>0&&dictionary['· '+p]?dictionary[p]||dictionary['· '+p]?.replace(/^· /,'')||p:p);if(parts.some((p,i)=>p!==translated[i]))result=translated.join(' · ');}
  const output=result===undefined?value:value.match(/^\s*/)[0]+result+value.match(/\s*$/)[0];if(cache.size>=4000)cache.clear();cache.set(value,output);return output;
 }
 const dataSelectors='#profile-preview-bio,#b-preview-name,#b-preview-subtitle,#public-owner,#public-card-owner,#owner-avatar,.learn-translation,.learn-original,.origins-pl-rules,.origins-pl-glossary dl';
 const protectedSelector='[translate="no"],[data-i18n-skip],script,style,textarea,code,pre,kbd,samp,svg,canvas,video,'+dataSelectors;
 function skipped(el){return !el||!!el.closest(protectedSelector);}
 function applyText(node){
  const el=node.parentElement;if(skipped(el))return;
  let record=originals.get(node);const current=node.data;
  if(!record||current!==record.output)record={source:current,output:current};
  const next=translate(record.source);record.output=next;originals.set(node,record);
  if(current!==next)node.data=next;
 }
 const attrNames=['title','placeholder','aria-label','aria-description','alt','label'];
 function applyElement(el){
  if(skipped(el))return;
  // Freeze an implicit option value before changing its visible label. All scan and
  // database enums retain the exact Polish values understood by the existing app.
  if(el.tagName==='OPTION'&&!el.hasAttribute('value'))el.setAttribute('value',el.value);
  let records=attributes.get(el);if(!records){records={};attributes.set(el,records);}
  for(const name of attrNames){if(!el.hasAttribute(name)){delete records[name];continue;}const current=el.getAttribute(name);let r=records[name];if(!r||current!==r.output)r={source:current,output:current};const next=translate(r.source);r.output=next;records[name]=r;if(current!==next)el.setAttribute(name,next);}
 }
 function apply(root=document.documentElement){
  if(root.nodeType===3){applyText(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){if(skipped(root))return;applyElement(root);}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===1&&skipped(n)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let node;while((node=walker.nextNode())){if(node.nodeType===1)applyElement(node);else applyText(node);}
 }
 function rawText(el){if(!el)return '';if(el.nodeType===3){const r=originals.get(el);return r&&r.output===el.data?r.source:el.data;}return [...el.childNodes].map(rawText).join('');}
 function rawAttribute(el,name){const r=attributes.get(el)?.[name],v=el.getAttribute(name);return r&&r.output===v?r.source:v;}
 function syncSelectors(){for(const select of document.querySelectorAll('[data-interface-language]'))select.value=language;document.documentElement.lang=language;}
 function setLanguage(value){
  if(!supported.includes(value))return false;if(value===language){syncSelectors();return true;}
  language=value;cache.clear();try{localStorage.setItem(KEY,value);}catch{}
  syncSelectors();apply();document.dispatchEvent(new CustomEvent('cardscope:languagechange',{detail:{language}}));
  return true;
 }
 const api={t:translate,apply,rawText,rawAttribute,set:setLanguage,get language(){return language},get locale(){return language==='en'?'en-GB':'pl-PL'},protect:el=>{if(el?.setAttribute)el.setAttribute('translate','no');return el},userText:(el,value,isUser=true)=>{if(isUser)el.setAttribute('translate','no');else el.removeAttribute('translate');el.textContent=value;return el}};
 globalThis.CardI18n=api;document.documentElement.lang=language;
 // Native confirmation dialogs aren't DOM nodes; translate at the display boundary.
 for(const name of ['alert','confirm','prompt']){const original=window[name]?.bind(window);if(original)window[name]=(message,...args)=>original(translate(String(message)),...args);}
 function start(){
  syncSelectors();apply();
  document.addEventListener('change',e=>{if(e.target.matches?.('[data-interface-language]'))setLanguage(e.target.value);});
  const pending=new Set();let scheduled=false;
  const flush=()=>{scheduled=false;const roots=[...pending];pending.clear();for(const root of roots){if(!root.isConnected)continue;if(roots.some(p=>p!==root&&p.nodeType===1&&p.contains(root)))continue;apply(root);}};
  new MutationObserver(records=>{for(const r of records){if(r.type==='characterData'){const saved=originals.get(r.target);if(saved?.output===r.target.data)continue;pending.add(r.target);}else if(r.type==='attributes'){const saved=attributes.get(r.target)?.[r.attributeName];if(saved?.output===r.target.getAttribute(r.attributeName))continue;pending.add(r.target);}else for(const n of r.addedNodes)pending.add(n);}if(pending.size&&!scheduled){scheduled=true;queueMicrotask(flush);}}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrNames});
  window.addEventListener('storage',e=>{if(e.key===KEY&&supported.includes(e.newValue))setLanguage(e.newValue);});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
