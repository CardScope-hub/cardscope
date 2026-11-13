/* Edition-aware concept notes; no literal card translations. */
(() => {
'use strict';
const data=globalThis.CardOriginsPLData;
  function lookup(card) {
    if (!data || !card || typeof card !== 'object') return null;
    const games = [card.gameKey, card.catalogGame, card.game].filter(Boolean).map(x=>String(x).toLowerCase());
    if (games.length && !games.includes('riftbound')) return null;
    const resolve = alias => {
      const key=data.aliases[alias], edition=data.editions[alias];
      if (!key || !data.cards[key] || !edition) return null;
      return {key, ...data.cards[key], editionCode:edition.code, setCode:edition.set, setName:data.sets[edition.set].name};
    };
    for (const value of [card.catalogId, card.id, card.riftbound_id, card.localId, card.printedNumber, card.number]) {
      if (value == null) continue;
      const raw=String(value).trim().toLowerCase();
      let entry=resolve(raw);
      if (!entry) {
        const m=raw.match(/^#?\s*(ogn|sfd|unl|ven|rad)[\s-]?(\d{1,3})(a|\*)?(?:\s*[-/]\s*(\d{3}))?$/i);
        if (m && (!m[4] || Number(m[4])===data.sets[m[1].toUpperCase()].total))
          entry=resolve(m[1]+'-'+m[2].padStart(3,'0')+(m[3]||''));
      }
      if (entry) return entry;
    }
    // Legacy saved cards with only a number need an explicit game AND set.
    const rawSet=typeof card.set==='object' ? card.set?.set_id || card.set?.id || card.set?.name || card.set?.label : card.set;
    const set=Object.keys(data.sets).find(code=>[code,data.sets[code].name].some(name=>name.toLowerCase()===String(rawSet||'').trim().toLowerCase()));
    if (games.includes('riftbound') && set) {
      for (const value of [card.number,card.localId,card.printedNumber]) {
        const m=String(value||'').trim().match(/^#?(\d{1,3})(a|\*)?(?:\s*[/\-]\s*(\d{3}))?$/i);
        if (!m || (m[3] && Number(m[3])!==data.sets[set].total)) continue;
        const entry=resolve(set.toLowerCase()+'-'+m[1].padStart(3,'0')+(m[2]||'').toLowerCase());
        if (entry) return entry;
      }
    }
    return null;
  }

function render(target,card){return globalThis.CardExplanations.render(target,card,lookup(card));}
globalThis.CardOriginsPL=Object.freeze({lookup,render,version:'explanations-1'});
})();
