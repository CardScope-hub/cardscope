/* CardScope: local, static Polish rules for Riftbound Origins. No network calls. */
(() => {
  'use strict';
  const data = globalThis.CardOriginsPLData;
  const rendered = new WeakMap();
  const domains = {fury:'Furia', calm:'Spokój', mind:'Umysł', body:'Ciało', chaos:'Chaos', order:'Ład'};
  const glossary = [
    ['Siła · Might', 'Wartość jednostki używana m.in. przy zadawaniu obrażeń w walce. To nie koszt mocy.', /./],
    ['Energia i moc · Energy / Power', 'Energia to koszt liczbowy. Symbole domen oznaczają moc danej domeny; „dowolna moc” może pochodzić z dowolnej domeny.', /:rb_(energy|rune)_/],
    ['Wyczerp / przygotuj · Exhaust / Ready', 'Wyczerpaną kartę obraca się w poziomie. Przygotowanie przywraca ją do pozycji pionowej. Symbol „Wyczerp” w koszcie dotyczy tej karty.', /exhaust|ready/i],
    ['Recykling · Recycle', 'Odłóż na spód odpowiedniej talii właściciela. Kilka kart trafia na spód talii głównej w losowej kolejności; kolejność kilku run wybiera ich właściciel.', /recycle/i],
    ['Przywołaj runę · Channel', 'Umieść wierzchnią runę ze swojej talii run na planszy. Wchodzi gotowa, chyba że efekt mówi, że ma być wyczerpana.', /channel/i],
    ['Wzmocnienie · Buff', 'Znacznik dający +1 siły. Zwykle jednostka może mieć jeden. Zużycie wzmocnienia usuwa znacznik z twojej jednostki.', /buff/i],
    ['Wycofaj · Recall', 'Odeślij jednostkę do bazy jej kontrolującego. To nie jest przemieszczenie i samo w sobie nie leczy ani nie wyczerpuje jednostki.', /recall/i],
    ['Ukrycie · Hidden', 'Przypomnienie na karcie opisuje koszt ukrycia i późniejszego zagrania. Karty nie można zagrać z ukrycia w tej samej turze, w której została ukryta.', /hidden/i],
    ['Natarcie / Tarcza · Assault / Shield', 'Premia do siły działa odpowiednio podczas atakowania lub bronienia. Bez podanej liczby premia wynosi +1.', /assault|shield/i],
    ['Manewr · Ganking', 'Pozwala jednostce przemieszczać się z jednego pola bitwy na inne.', /ganking/i],
    ['Odbicie · Deflect', 'Przeciwnik musi dopłacić wskazaną ilość mocy, aby wybrać tę kartę swoim zaklęciem lub zdolnością.', /deflect/i],
  ];

  function lookup(card) {
    if (!data || !card || typeof card !== 'object') return null;
    const games = [card.gameKey, card.catalogGame, card.game].filter(Boolean).map(x=>String(x).toLowerCase());
    if (games.length && !games.includes('riftbound')) return null;
    const candidates = [card.catalogId, card.id, card.riftbound_id, card.localId, card.printedNumber, card.number];
    let key;
    for (const value of candidates) {
      if (value == null) continue;
      const raw = String(value).trim().toLowerCase();
      key = data.aliases[raw];
      if (!key) {
        const m = raw.match(/^#?\s*ogn[\s-]?(\d{1,3})(a|\*)?(?:\s*[-/]\s*298)?$/i);
        if (m) key = data.aliases['ogn-'+m[1].padStart(3,'0')+(m[2]||'')];
      }
      if (key && data.cards[key]) return {key, ...data.cards[key]};
    }
    // Old saved cards may only have a collector number. Require both game and set.
    const set = typeof card.set === 'object' ? card.set?.set_id || card.set?.id || card.set?.name || card.set?.label : card.set;
    if (games.includes('riftbound') && /^(origins|ogn)$/i.test(String(set||'').trim())) {
      for (const value of [card.number, card.localId, card.printedNumber]) {
        const m = String(value||'').trim().match(/^#?(\d{1,3})(a|\*)?(?:\s*[/\-]\s*298)?$/i);
        if (!m) continue;
        key = data.aliases['ogn-'+m[1].padStart(3,'0')+(m[2]||'').toLowerCase()];
        if (key && data.cards[key]) return {key, ...data.cards[key]};
      }
    }
    return null;
  }

  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function symbol(token, lang) {
    let text, title, kind;
    const energy = token.match(/^:rb_energy_(\d+):$/);
    const rune = token.match(/^:rb_rune_(\w+):$/);
    if (energy) {
      text = energy[1]+(lang==='en'?' energy':' energii'); kind='energy';
      title = lang==='en'?'Energy':'Energia';
    } else if (rune) {
      kind = rune[1];
      text = kind==='rainbow' ? (lang==='en'?'1 any power':'1 dowolnej mocy') : (lang==='en'?'1 '+kind+' power':'1 mocy · '+domains[kind]);
      title = lang==='en'?'Power':'Moc';
    } else if (token===':rb_exhaust:') {
      text=lang==='en'?'Exhaust':'Wyczerp'; title=lang==='en'?'Exhaust this card':'Wyczerp tę kartę'; kind='exhaust';
    } else {
      text=lang==='en'?'might':'siły'; title='Siła · Might'; kind='might';
    }
    const el = node('span', text, 'origins-pl-symbol');
    el.dataset.kind=kind; el.title=title;
    return el;
  }

  function rules(text, lang='pl') {
    const wrap = node('div', null, 'origins-pl-rules');
    wrap.lang=lang;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const p=node('p');
      for (const part of line.split(/(:rb_(?:energy_\d+|rune_(?:fury|calm|mind|body|chaos|order|rainbow)|exhaust|might):)/g)) {
        if (part.startsWith(':rb_')) p.append(symbol(part, lang));
        else p.append(document.createTextNode(part));
      }
      wrap.append(p);
    }
    return wrap;
  }

  function render(target, card) {
    const el=typeof target==='string'?document.getElementById(target):target;
    if (!el) return false;
    const entry=lookup(card);
    if (!entry) { el.hidden=true; el.replaceChildren(); rendered.delete(el); return false; }
    if (rendered.get(el)===entry.key) { el.hidden=false; return true; }
    const header=node('div',null,'origins-pl-heading');
    const badge=node('span','PL','origins-pl-badge'); badge.setAttribute('aria-hidden','true');
    const heading=node('div');
    const title=node('h3','Tekst karty po polsku');
    title.id=(el.id||'origins-translation')+'-title';
    heading.append(title,node('span','Riftbound · Origins · '+entry.key,'origins-pl-meta'));
    header.append(badge,heading);
    el.setAttribute('aria-labelledby',title.id);
    const fragment=document.createDocumentFragment();
    fragment.append(header,rules(entry.pl));
    if (entry.backNote) fragment.append(node('p',entry.backNote,'origins-pl-note'));
    const english=node('details',null,'origins-pl-disclosure');
    english.append(node('summary','Pokaż tekst angielski'),rules(entry.en||'No additional rules text on this side.','en'));
    fragment.append(english);
    const help=node('details',null,'origins-pl-disclosure');
    help.append(node('summary','Słowniczek tej karty'));
    const dl=node('dl');
    for (const [term,description,pattern] of glossary) if(pattern.test(entry.en)) dl.append(node('dt',term),node('dd',description));
    help.append(dl); fragment.append(help);
    fragment.append(node('p','Opracowanie CardScope · nieoficjalne tłumaczenie'+(entry.errata?' · uwzględniono erratę z katalogu':''),'origins-pl-note'));
    el.replaceChildren(fragment); el.hidden=false; rendered.set(el,entry.key);
    return true;
  }

  globalThis.CardOriginsPL=Object.freeze({lookup,render,version:data?.version||'origins-pl-1'});
})();
