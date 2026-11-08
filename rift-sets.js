(function(root){
 'use strict';
 const core = root.CardRiftSetCore, $ = id => document.getElementById(id);
 const host = $('collection-sets'), allTab = $('collection-all-cards'), setsTab = $('collection-rift-sets');
 if (!host || !core) return;
 const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
 const button = (text, cls, action) => { const n = el('button', text, cls); n.type = 'button'; n.addEventListener('click', action); return n; };
 let index, pending, saved = [], stamp = '', owned = new Map(), mode = 'all', currentSet = null;
 let status = 'all', kind = 'all', query = '', limit = 48, grid, resultText, more, progressText, progressBar, statusButtons;
 let tiles = new Map(), previewCard, restoreOverflow;
 const modal = el('dialog', null, 'rs-preview');
 modal.setAttribute('aria-labelledby', 'rs-preview-title');
 const close = button('×', 'rs-close', () => modal.close());
 close.setAttribute('aria-label', 'Zamknij podgląd karty');
 const previewBody = el('div', null, 'rs-preview-body');
 modal.append(close, previewBody); document.body.append(modal);
 modal.addEventListener('close', () => {
  if (restoreOverflow !== undefined) document.documentElement.style.overflow = restoreOverflow;
  restoreOverflow = undefined; previewCard = null;
 });
 modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
 });
 function image(card, cls = '') {
  const img = el('img', null, cls); img.src = card.image; img.alt = card.name; img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => { img.hidden = true; img.parentElement?.classList.add('rs-art-unavailable'); });
  return img;
 }
 function preview(card) {
  previewCard = card;
  previewBody.replaceChildren();
  const art = el('div', null, 'rs-preview-art'); art.append(image(card));
  const title = el('h2', card.name); title.id = 'rs-preview-title';
  const info = el('div', null, 'rs-preview-info'), have = owned.get(card.key);
  info.append(el('p', index.data.sets.find(s => s.id === card.setId).name, 'rs-kicker'), title,
   el('p', [card.code, card.rarity].filter(Boolean).join(' · '), 'rs-meta'),
   el('p', have ? `✓ W kolekcji · ${have.qty} szt.` : 'Jeszcze nie masz tego wydania', 'rs-preview-status'));
  if (have) info.append(button('Otwórz kartę z kolekcji ↗', 'primary', () => {
   const record = saved.find(c => owned.get(card.key)?.ids.includes(c.id));
   if (!record || typeof openDetail !== 'function') return;
   modal.close(); openDetail(record);
  }));
  else info.append(el('p', 'Dodaj ją przez skaner lub katalog. Po zapisaniu w kolekcji pojawi się tutaj automatycznie.', 'rs-muted'));
  previewBody.append(art, info);
  if (!modal.open) {
   restoreOverflow = document.documentElement.style.overflow;
   document.documentElement.style.overflow = 'hidden'; modal.showModal(); close.focus();
  }
 }
 function setMode(next) {
  mode = next;
  $('collection-owned').hidden = next !== 'all'; host.hidden = next !== 'sets';
  for (const [tab, selected] of [[allTab, next === 'all'], [setsTab, next === 'sets']]) {
   tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected));
   if (selected) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  if (next === 'sets') void load();
 }
 allTab.addEventListener('click', () => setMode('all'));
 setsTab.addEventListener('click', () => setMode('sets'));
 async function load() {
  if (index) { refresh(); return; }
  if (pending) return pending;
  host.replaceChildren(el('p', 'Wczytuję sety Riftbound…', 'rs-loading'));
  pending = (async () => {
   try {
    const response = await fetch(new URL('riftbound-sets.json?v=rift-sets-1', document.baseURI));
    if (!response.ok) throw Error('catalog');
    const data = await response.json();
    if (data.version !== 1 || data.sets?.length !== 6 || !data.cards?.length) throw Error('schema');
    index = core.buildIndex(data); owned = core.ownership(index, saved); overview();
   } catch {
    host.replaceChildren(el('h2', 'Nie udało się wczytać setów.'), el('p', 'Połącz się z internetem i spróbuj ponownie.', 'rs-muted'), button('Spróbuj ponownie', 'secondary', () => load()));
   } finally { pending = null; }
  })();
  return pending;
 }
 function updateTile(set) {
  const tile = tiles.get(set.id); if (!tile) return;
  const stats = core.summary(index.data.cards.filter(c => c.setId === set.id), owned);
  tile.count.textContent = `${stats.owned} / ${stats.total}`;
  tile.bar.value = stats.owned; tile.bar.max = stats.total;
  tile.node.setAttribute('aria-label', `${set.name}: ${stats.owned} z ${stats.total} wydań w kolekcji. Otwórz set.`);
 }
 function overview() {
  currentSet = null; tiles = new Map(); host.replaceChildren();
  const intro = el('div', null, 'rs-intro');
  intro.append(el('p', 'RIFTBOUND · TWOJE SETY', 'rs-kicker'), el('h2', 'Zobacz, czego jeszcze brakuje.'),
   el('p', 'Karty z Twojej kolekcji zaznaczają się automatycznie. Szare pola to wydania, które czekają na odkrycie.', 'rs-muted'));
  const shelf = el('div', null, 'rs-shelf');
  for (const set of index.data.sets) {
   const tile = button('', 'rs-set', () => openSet(set.id));
   const art = el('span', null, 'rs-set-art'); art.append(image(set));
   const text = el('span', null, 'rs-set-text');
   const bar = el('progress'); bar.setAttribute('aria-label', `Kompletność setu ${set.name}`);
   const count = el('strong');
   text.append(el('span', set.id, 'rs-set-code'), el('span', set.name, 'rs-set-name'), count, el('span', 'wydań w kolekcji', 'rs-set-caption'), bar);
   tile.append(art, text, el('span', '↗', 'rs-set-arrow')); shelf.append(tile);
   tiles.set(set.id, { node: tile, count, bar }); updateTile(set);
  }
  host.append(intro, shelf, el('p', 'Osobno liczymy różne numery, alternatywne ilustracje, sygnatury oraz dodatki do setu. Kilka kopii tego samego wydania zajmuje jedno pole.', 'rs-footnote'));
 }
 function openSet(id) {
  currentSet = index.data.sets.find(s => s.id === id); status = 'all'; kind = 'all'; query = ''; limit = 48;
  host.replaceChildren();
  const back = button('← Wszystkie sety', 'rs-back', () => { overview(); setsTab.focus({preventScroll:true}); });
  const header = el('div', null, 'rs-set-header');
  const title = el('div'); title.append(el('p', `RIFTBOUND / ${id}`, 'rs-kicker'), el('h2', currentSet.name));
  const progress = el('div', null, 'rs-set-progress'); progressText = el('p'); progressBar = el('progress'); progressBar.setAttribute('aria-label', 'Kompletność całego setu');
  progress.append(progressText, progressBar); header.append(title, progress);
  const filters = el('div', null, 'rs-filters'), statuses = el('div', null, 'rs-statuses'); statuses.setAttribute('role', 'group'); statuses.setAttribute('aria-label', 'Posiadanie kart');
  statusButtons = new Map();
  for (const [key, name] of [['all','Wszystkie'],['owned','Posiadane'],['missing','Brakujące']]) {
   const b = button(name, '', () => { status = key; limit = 48; refreshGrid(); }); statuses.append(b); statusButtons.set(key, b);
  }
  const fields = el('div', null, 'rs-fields');
  const search = el('input'); search.type = 'search'; search.placeholder = 'Nazwa lub numer karty…'; search.setAttribute('aria-label', 'Szukaj w tym secie');
  search.addEventListener('input', () => { query = search.value; limit = 48; refreshGrid(); });
  const select = el('select'); select.setAttribute('aria-label', 'Rodzaj wydania');
  for (const [value, label] of [['all','Wszystkie wydania'],['base','Podstawowy set'],['alternate','Alternatywne i sygnatury'],['extra','Runy, tokeny i dodatki']]) {
   const option = el('option', label); option.value = value; select.append(option);
  }
  select.addEventListener('change', () => { kind = select.value; limit = 48; refreshGrid(); });
  fields.append(search, select); filters.append(statuses, fields);
  resultText = el('p', null, 'rs-results'); resultText.setAttribute('role', 'status'); resultText.setAttribute('aria-live', 'polite');
  grid = el('div', null, 'rs-grid');
  more = button('Pokaż kolejne karty', 'secondary rs-more', () => { limit += 48; refreshGrid(); });
  host.append(back, header, filters, resultText, grid, more,
   el('p', '✓ Kolorowe — posiadane. Szare — brakujące. Dopasowanie po serii i numerze karty; nazwa sama nie zaznacza wydania.', 'rs-footnote'));
  refreshGrid(); back.focus({preventScroll:true});
 }
 function refreshGrid() {
  if (!currentSet) return;
  const list = index.data.cards.filter(c => c.setId === currentSet.id), stats = core.summary(list, owned);
  progressText.textContent = `${stats.owned} / ${stats.total} wydań · ${Math.round(stats.owned / stats.total * 100)}%`;
  progressBar.max = stats.total; progressBar.value = stats.owned;
  for (const [key, b] of statusButtons) {
   const label = key === 'all' ? 'Wszystkie' : key === 'owned' ? 'Posiadane' : 'Brakujące';
   b.textContent = `${label} (${key === 'all' ? stats.total : key === 'owned' ? stats.owned : stats.total - stats.owned})`;
   b.setAttribute('aria-pressed', String(status === key));
  }
  const found = core.filter(list, owned, {status, kind, query});
  resultText.textContent = found.length ? `Wyświetlasz ${Math.min(limit, found.length)} z ${found.length} wydań` : 'Brak kart spełniających te warunki.';
  const previous = new Map([...grid.children].map(n => [n.dataset.key, n]));
  const keep = new Set(); let position = 0;
  for (const card of found.slice(0, limit)) {
   let n = previous.get(card.key);
   if (!n) {
    n = button('', 'rs-card', () => preview(card)); n.dataset.key = card.key;
    const art = el('span', null, 'rs-card-art'); art.append(image(card));
    n._badge = el('span', null, 'rs-owned-badge'); art.append(n._badge);
    n.append(art, el('span', card.code, 'rs-card-code'), el('span', card.name, 'rs-card-name'));
   }
   const have = owned.get(card.key);
   n.classList.toggle('rs-missing', !have); n._badge.textContent = have ? `✓ ${have.qty} szt.` : 'Brakuje';
   n.setAttribute('aria-label', `${card.name}, ${card.code}, ${have ? 'w kolekcji: ' + have.qty + ' sztuk' : 'brak w kolekcji'}. Zobacz kartę.`);
   if (grid.children[position] !== n) grid.insertBefore(n, grid.children[position] || null);
   keep.add(n); position++;
  }
  for (const n of [...grid.children]) if (!keep.has(n)) n.remove();
  more.hidden = found.length <= limit;
 }
 function refresh() {
  if (!index) return;
  if (currentSet) refreshGrid(); else for (const set of index.data.sets) updateTile(set);
  if (modal.open && previewCard) preview(previewCard);
 }
 function collectionChanged(next) {
  saved = Array.isArray(next) ? next : [];
  const fingerprint = core.fingerprint(saved); if (stamp === fingerprint) return;
  stamp = fingerprint;
  if (index) { owned = core.ownership(index, saved); refresh(); }
 }
 root.CardRiftSets = { collectionChanged, enter(view) { if (view !== 'collection' && modal.open) modal.close(); } };
 root.addEventListener('cardscope:account-change', () => { if (modal.open) modal.close(); stamp = ''; collectionChanged([]); });
 if (root.CardCloud?.subscribe) root.CardCloud.subscribe('card', collectionChanged);
 else if (typeof cards !== 'undefined') collectionChanged(cards);
})(globalThis);
