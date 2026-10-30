/* CardScope: local, static Polish rules for Riftbound: Origins, Spiritforged, Unleashed, Vendetta and Radiance. No network calls. */
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
    ['Wyposażenie · Equipment / Equip', 'Wyposażenie jest rodzajem sprzętu. Wyposaż [Equip] dołącza je do twojej jednostki za wskazany koszt. Dołączone Wyposażenie zapewnia jej opisane premie i zdolności.', /equip|weaponmaster/i],
    ['Powtórzenie · Repeat', 'Opcjonalny dodatkowy koszt pozwala powtórzyć efekt zaklęcia. Nie oznacza zagrania kolejnej karty.', /repeat/i],
    ['Ulepsz · Empower', 'Ulepszenie to stan karty opisany przez jej zdolności. Jest osobną mechaniką od znacznika wzmocnienia [Buff].', /empower/i],
    ['Przepływ · Flow', 'Pozwala zagrać zaklęcie ze stosu odrzuconych za wskazany koszt. Po użyciu Przepływu karta zostaje wygnana.', /flow/i],
    ['Doświadczenie i poziom · XP / Level', 'XP należy do gracza. Poziom jednostek z tą mechaniką jest równy twojemu XP. Efekty Level wymagają co najmniej wskazanego poziomu.', /\bXP\b|\bLevel\b|\bHunt\b/i],
    ['Łowy · Hunt', 'Zdobywasz podaną liczbę XP, gdy jednostka podbije lub utrzyma pole bitwy. Bez liczby jest to 1 XP.', /hunt/i],
    ['Spalanie · Burn', 'Odłóż wskazaną liczbę wierzchnich kart swojej talii głównej na swój stos odrzuconych.', /burn/i],
    ['Rozbrojenie · Disarm', 'Gdy jednostka atakuje, zmniejsza siłę wrogiej jednostki na tym samym polu w tej turze. Bez liczby redukcja wynosi 1.', /disarm/i],
    ['Rozstawienie · Deploy', 'Taki sprzęt zagrywasz na pole bitwy. Zostaje zniszczony, gdy przeciwnik utrzyma to pole.', /deploy/i],
    ['Zasadzka · Ambush', 'Pozwala zagrać jednostkę jako Reakcję na pole bitwy, na którym masz jednostki.', /ambush/i],
    ['Przewidywanie · Predict', 'Spójrz na wierzchnią kartę swojej talii głównej i zdecyduj, czy ją zrecyklować.', /predict/i],
    ['Popis · Show Off', 'Karta określa warunek oraz efekt Popisu. Nie pomijaj opisanego ograniczenia, np. pierwszego zagrania w danej turze.', /show[ -]?off/i],
  ];

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
    const renderKey=entry.key+'|'+entry.editionCode;
    if (rendered.get(el)===renderKey) { el.hidden=false; return true; }
    const header=node('div',null,'origins-pl-heading');
    const badge=node('span','PL','origins-pl-badge'); badge.setAttribute('aria-hidden','true');
    const heading=node('div');
    const title=node('h3','Tekst karty po polsku');
    title.id=(el.id||'origins-translation')+'-title';
    heading.append(title,node('span','Riftbound · '+entry.setName+' · '+entry.editionCode,'origins-pl-meta'));
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
    el.replaceChildren(fragment); el.hidden=false; rendered.set(el,renderKey);
    return true;
  }

  globalThis.CardOriginsPL=Object.freeze({lookup,render,version:data?.version||'riftbound-pl-2'});
})();
