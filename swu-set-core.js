/* Read-only SWU checklist identity. Never match a card using its name alone. */
(function(root){
 'use strict';
 const shared = root.CardRiftSetCore;
 const norm = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
 function parse(value) {
  const text = String(value ?? '').normalize('NFKC').trim().toUpperCase().replace(/^SWU:/, '');
  const m = text.match(/^([A-Z][A-Z0-9]{1,7})\s*[-:#· ]\s*(T?\d+[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*(\d+))?$/);
  if (!m) return null;
  return {key: m[1] + '-' + m[2].replace(/^(T?)0+(?=\d)/, '$1'), set: m[1], total: m[3] ? Number(m[3]) : null};
 }
 const canonical = value => parse(value)?.key || null;
 function buildIndex(data) {
  const aliases = new Map(), codes = new Map(), sets = new Map(), metadata = new Map();
  const add = (map, key, card) => {
   if (!key) return;
   if (!map.has(key)) map.set(key, card);
   else if (map.get(key)?.key !== card.key) map.set(key, null);
  };
  for (const set of data.sets) {
   sets.set(norm(set.id), set.id); sets.set(norm(set.name), set.id); metadata.set(set.id, set);
  }
  for (const card of data.cards) {
   for (const alias of [card.key, card.code, ...(card.aliases || [])]) {
    add(aliases, norm(alias), card); add(codes, canonical(alias), card);
   }
  }
  return {data, aliases, codes, sets, metadata};
 }
 function resolve(index, saved) {
  const game = norm(saved.game).replace(/[^a-z0-9]/g, ''), catalogGame = norm(saved.catalogGame);
  if (game ? !['starwarsunlimited','swu'].includes(game) : catalogGame !== 'swu') return null;
  const byId = index.aliases.get(norm(saved.catalogId));
  if (byId) return byId;
  for (const value of [saved.localId, saved.number]) {
   if (!value) continue;
   const setName = typeof saved.set === 'object' ? saved.set?.id || saved.set?.name || saved.set?.label : saved.set;
   const set = index.sets.get(norm(setName));
   const code = parse(value) || (set ? parse(set + '-' + value) : null);
   if (!code) continue;
   if (code.total !== null && code.total !== index.metadata.get(code.set)?.baseCount) continue;
   const match = index.codes.get(code.key);
   if (match) return match;
  }
  return null;
 }
 function ownership(index, savedCards) {
  const map = new Map();
  for (const saved of savedCards || []) {
   const qty = saved.qty == null ? 1 : Number(saved.qty);
   if (!Number.isFinite(qty) || Math.floor(qty) < 1) continue;
   const card = resolve(index, saved); if (!card) continue;
   const entry = map.get(card.key) || {qty: 0, ids: []};
   entry.qty += Math.floor(qty); entry.ids.push(saved.id); map.set(card.key, entry);
  }
  return map;
 }
 root.CardSWUSetCore = {canonical, buildIndex, resolve, ownership,
  summary: shared.summary, filter: shared.filter, fingerprint: shared.fingerprint};
})(globalThis);
