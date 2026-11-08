globalThis.CardPriceLinks=(()=>{
 function safe(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
 function query(c,variant){const language=c.catalogLanguage||c._autoLanguage||c.language,langs={en:'English',ja:'Japanese',jp:'Japanese',Angielski:'English','Japoński':'Japanese',de:'German',fr:'French',es:'Spanish',it:'Italian','pt-br':'Portuguese'};
  const set=typeof c.set==='string'?c.set:c.set?.name||c._set?.name;const number=c.printedNumber||c.localId||c.number;const v=variant||c.variant||c.rarity;
  return [...new Set([c.name,number,set,c.game||({pokemon:'Pokemon',mtg:'MTG',weiss:'Weiss Schwarz','weiss-jp':'Weiss Schwarz',swu:'Star Wars Unlimited',riftbound:'Riftbound',onepiece:'One Piece'})[c.gameKey||c.catalogGame],langs[language],v&&!['Normal','Nieustalony'].includes(v)?v:null].filter(Boolean))].join(' ').slice(0,350);
 }
 function ebay(c,variant,sold=false){const p=new URLSearchParams({_nkw:query(c,variant)});if(sold){p.set('LH_Sold','1');p.set('LH_Complete','1')}return 'https://www.ebay.com/sch/i.html?'+p;}
 function link(url,text){const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';return a}
 function source(host,value,label='Źródło ceny ↗'){if(!host)return;host.replaceChildren();const url=safe(value);if(url)host.append(link(url,label));else{const note=document.createElement('small');note.textContent='Brak linku do zapisanej wyceny';host.append(note)}}
 function render(host,c,variant){if(!host)return;host.replaceChildren();host.hidden=!c;if(!c)return;host.classList.add('ebay-links');const title=document.createElement('strong');title.textContent='Porównaj na eBay';const row=document.createElement('div');row.append(link(ebay(c,variant),'Oferty ↗'),link(ebay(c,variant,true),'Sprzedane ↗'));const note=document.createElement('small');note.textContent='Wyszukiwanie tego wydania, nie automatyczna wycena. Porównaj język, wariant, stan i koszty dostawy.';host.append(title,row,note);}
 return Object.freeze({safe,query,ebay,source,render});
})();
