/* Riftbound checklist identity rules. No writes, name guessing or cross-set matching. */
(function(root){
 'use strict';
 const norm = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
 function canonical(value) {
  const s = String(value ?? '').normalize('NFKC').toUpperCase().trim()
   .replace(/-STAR-/g, '*-').replace(/[★✱]/g, '*').replace(/[·:–—\s]+/g, '-').replace(/\//g, '-').replace(/-+/g, '-');
  if (!/^(OGN|OGS|SFD|UNL|VEN|RAD)-(?:(?:\d+[A-Z]?\*?)|(?:[A-Z]+\d+[A-Z]?))(?:-(?:\d+|[A-Z]+\d+[A-Z]?))?$/.test(s)) return null;
  return s.replace(/(^|-)([A-Z]*)(\d+)/g, (_, sep, prefix, number) => sep + prefix + Number(number));
 }
 function buildIndex(data) {
  const aliases = new Map(), codes = new Map(), sets = new Map();
  const add = (map, key, card) => {
   if (!key) return;
   if (!map.has(key)) map.set(key, card);
   else if (map.get(key)?.key !== card.key) map.set(key, null); // Ambiguous means unowned.
  };
  for (const set of data.sets) { sets.set(norm(set.id), set.id); sets.set(norm(set.name), set.id); }
  for (const card of data.cards) {
   for (const alias of [card.key, card.code, ...(card.aliases || [])]) add(aliases, norm(alias), card);
   add(codes, canonical(card.key), card);
   add(codes, card.key.split('-').slice(0, 2).join('-'), card);
  }
  return { data, aliases, codes, sets };
 }
 function resolve(index, saved) {
  const game = norm(saved.game), catalogGame = norm(saved.catalogGame);
  if (game ? !/^riftbound(?:\b|$)/.test(game) : catalogGame !== 'riftbound') return null;
  const byId = index.aliases.get(norm(saved.catalogId));
  if (byId) return byId;
  for (const value of [saved.riftbound_id, saved.localId, saved.number]) {
   if (!value) continue;
   const exact = index.aliases.get(norm(value));
   if (exact) return exact;
   const code = canonical(value);
   if (code) { if (index.codes.get(code)) return index.codes.get(code); continue; }
   const setName = typeof saved.set === 'object' ? saved.set?.set_id || saved.set?.id || saved.set?.name || saved.set?.label : saved.set;
   const set = index.sets.get(norm(setName));
   if (set) { const match = index.codes.get(canonical(set + '-' + value)); if (match) return match; }
  }
  return null;
 }
 function ownership(index, savedCards) {
  const map = new Map();
  for (const saved of savedCards || []) {
   const qty = saved.qty == null ? 1 : Number(saved.qty);
   if (!Number.isFinite(qty) || Math.floor(qty) < 1) continue;
   const found = resolve(index, saved);
   if (!found) continue;
   const entry = map.get(found.key) || { qty: 0, ids: [] };
   entry.qty += Math.floor(qty); entry.ids.push(saved.id); map.set(found.key, entry);
  }
  return map;
 }
 function summary(list, owned) {
  return { total: list.length, owned: list.filter(c => owned.has(c.key)).length,
   copies: list.reduce((sum, c) => sum + (owned.get(c.key)?.qty || 0), 0) };
 }
 function filter(list, owned, options = {}) {
  const terms = norm(options.query).split(/\s+/).filter(Boolean);
  return list.filter(card => (!options.kind || options.kind === 'all' || options.kind === card.kind)
   && (options.status === 'owned' ? owned.has(card.key) : options.status === 'missing' ? !owned.has(card.key) : true)
   && terms.every(term => norm([card.name, card.code, card.key, ...(card.searchNames || [])].join(' ')).includes(term)));
 }
 function fingerprint(cards) {
  return JSON.stringify((cards || []).map(c => [c.id,c.catalogId,c.game,c.catalogGame,c.set,c.number,c.localId,c.riftbound_id,c.qty]));
 }
 root.CardRiftSetCore = {canonical, buildIndex, resolve, ownership, summary, filter, fingerprint};
})(globalThis);
