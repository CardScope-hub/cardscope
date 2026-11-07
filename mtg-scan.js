// MTG: a printed set code + collector number identifies an edition before its name.
// Set codes below are from Scryfall /sets, checked 2026-11-07. No image leaves the device.
globalThis.CardMTGScan=(()=>{
 const knownSets=new Set('10e 2ed 2x2 2xm 30a 3ed 40k 4bb 4ed 5dn 5ed 6ed 7ed 8ed 9ed a25 aa1 aa2 aa3 aa4 aacr aafr ablb abro aclb acmm acr adft admu adsk aecl aeoe aer afc afdn afic afin afr afra ahob ahoc ainr ajmp akh akhm akr ala alci all altc altr amh1 amh2 amh3 amid amkm amom amsh ana anb aneo aone aotj apc arb arc arn asnc asos aspm astx atdm ath atla atle atmt atq atrc atrk avow avr awoe aznr bbd bchr bfz big blb blc bng bok bot brb brc bro brr btd c13 c14 c15 c16 c17 c18 c19 c20 c21 cc1 cc2 ced cei chk chr clb clu cm1 cm2 cma cmb1 cmb2 cmd cmm cmr cn2 cns con cp1 cp2 cp3 csp cst dbl dci dd1 dd2 ddc ddd dde ddf ddg ddh ddi ddj ddk ddl ddm ddn ddo ddp ddq ddr dds ddt ddu dft dgm dis dka dkm dmc dmr dmu dom dpa drb drc drk dsc dsk dst dtk dvd e01 e02 ea1 ea2 ea3 ecc ecl eld ema emn eoc eoe eos eve evg exo exp f01 f02 f03 f04 f05 f06 f07 f08 f09 f10 f11 f12 f13 f14 f15 f16 f17 f18 fbb fbro fca fclu fdc fdmu fdn fem ffdn fic fin fj22 fj25 fjmp fltr fmom fmsc fnm fone fra frc frf ftla ftmc fut g00 g01 g02 g03 g04 g05 g06 g07 g08 g09 g10 g11 g17 g18 g99 gdy gk1 gk2 gn2 gn3 gnt gpt grn gs1 gtc gvl h09 h17 h1r h2r ha1 ha2 ha3 ha4 ha5 ha6 ha7 hbg hho hml hob hoc hop hou ice iko ima inr inv isd itp j12 j13 j14 j15 j16 j17 j18 j19 j20 j21 j22 j25 jgp jmp jou jp1 jtla jud jvc khc khm kld klr ktk l12 l13 l14 l15 l16 l17 lcc lci lea leb leg lgn lmar lrw ltc ltr m10 m11 m12 m13 m14 m15 m19 m20 m21 m3c macr mafr mar mat mb2 mbc mbro mbs mclb md1 mdc mdd mdmu me1 me2 me3 me4 med mgb mh1 mh2 mh3 mic mid mir mkc mkhm mkm mltr mm2 mm3 mma mmh2 mmid mmq mneo moc mom mone mor mp2 mpr mps mrd msc msh msnc mstx mul mvow mznr nau ncc nec nem neo nph o90p oafc oafr oana oarc oc13 oc14 oc15 oc16 oc17 oc18 oc19 oc20 oc21 oclb ocm1 ocmd ody oe01 ogw ohop olep olgc om1 omb omic onc one ons opc2 opca ori otc otj otp ovnt ovoc p02 p03 p04 p05 p06 p07 p08 p09 p10 p10e p11 p15a p22 p23 p2hg p30a p30h p30m p30t p5dn p8ed p9ed pa1 paer pafr pakh pal00 pal01 pal02 pal03 pal04 pal05 pal06 pal99 pala palp pana papc parb parl past pavr pbbd pbfz pbig pblb pbng pbok pbro pc2 pca pcbb pcel pchk pclb pcmd pcmp pcmr pcns pcon pcsp pcy pd2 pd3 pdft pdgm pdis pdka pdmu pdom pdp10 pdp12 pdp13 pdp14 pdp15 pdrc pdsk pdst pdtk pdtp pecl peld pelp pemn peoe peve pewk pexo pf19 pf20 pf23 pf24 pf25 pf26 pf27 pfdn pfin pfra pfrf pfut pgpt pgpx pgrn pgru pgtc ph17 ph18 ph19 ph20 ph21 ph22 ph23 phel phop phou phpr phtr phuk pidw piko pinv pio pip pisd pj21 pjas pjjt pjou pjsc pjse pjud pkhm pkld pktk pl21 pl22 pl23 pl24 pl25 pl26 plc plci plg20 plg21 plg22 plg24 plg25 plgm plgn plny plrw pls plst pltc pltr pm10 pm11 pm12 pm13 pm14 pm15 pm19 pm20 pm21 pmat pmbs pmda pmei pmh1 pmh2 pmh3 pmic pmid pmkm pmmq pmoa pmom pmor pmps pmps06 pmps07 pmps08 pmps09 pmps10 pmps11 pmrd pnat pncc pnem pneo pnph pody pogw pone pons por pori potj ppc1 ppcy pplc ppls ppp1 ppro pptk pr2 pr23 prav prcq pred prix prm prna proe prtr prw2 prwk ps11 ps14 ps15 ps16 ps17 ps18 ps19 psal pscg psdc psdg pshm psnc psoi psok psom psos pspl pspm pss1 pss2 pss3 pss4 pss5 pssc psth pstx psus psvc ptbro ptc ptdm ptdmu ptg pthb pths ptk ptkdf ptla ptmp ptor ptsnc ptsp ptsr puds pulg puma punh punk purl pusg pust pvan pvow pw11 pw12 pw21 pw22 pw23 pw24 pw25 pw26 pw27 pwar pwcs pwoe pwor pwos pwwk pxln pxtc pz1 pz2 pza pzen pznr q06 q07 rav ren rex rfin rin rix rna roe rqs rtr rvr s00 s99 sbro scd scg sch sds shm sir sis skhm slc slci sld slp slu slx slz smh3 smid smom snc sneo soa soc soi sok som sos spe spg spm ss1 ss2 ss3 sstx sta sth stx sum sunf svow sznr t10e t2x2 t2xm t30a t40k ta25 tacr taer tafc tafr takh tala tarb tavr tbbd tbfz tbig tblb tblc tbng tbot tbrc tbro tbth tc14 tc15 tc16 tc17 tc18 tc19 tc20 tc21 tclb tcm2 tcma tcmm tcmr tcn2 tcns tcon td0 td2 tdag tdc tdd1 tdd2 tddc tddd tdde tddf tddg tddh tddi tddj tddk tddl tddm tdds tddt tddu tdft tdgm tdka tdm tdmc tdmr tdmu tdom tdrc tdsc tdsk tdtk tdvd te01 tecc tecl teld tema temn teoc teoe teve tevg tfdc tfdn tfic tfin tfra tfrc tfrf tfth tgk1 tgk2 tgn2 tgn3 tgrn tgtc tgvl thb thob thou thp1 thp2 thp3 ths tiko tima tinr tisd tjou tjvc tkhc tkhm tkld tktk tla tlcc tlci tle tlrw tltc tltr tm10 tm11 tm12 tm13 tm14 tm15 tm19 tm20 tm21 tm3c tmbs tmc tmd1 tmdd tmed tmh1 tmh2 tmh3 tmic tmid tmkc tmkm tmm2 tmm3 tmma tmoc tmom tmor tmp tmsc tmsh tmt tmul tnau tncc tnec tneo tnph togw tonc tone tor tori totc totj totp tpca tpip tpr trc trex trix trk trna troe trtr trvr tsb tscd tshm tsnc tsoc tsoi tsom tsos tsp tspm tsr tstx ttdc ttdm tthb tths ttla ttle ttmc ttmt ttrc ttrk ttsr tugl tuma tund tunf tust tvoc tvow twar twho twoc twoe twwk txln tzen tznc tznr uds ugin ugl ulg ulst uma und unf unh unk usg ust v09 v10 v11 v12 v13 v14 v15 v16 v17 vis vma voc vow w16 w17 war wc00 wc01 wc02 wc03 wc04 wc97 wc98 wc99 wdmu wfin who wmc wmkm wmom woc woe wone wot wth wwk wwoe xana xln yblb ybro ydft ydmu ydsk yecl yeoe yfra ylci ymid ymkm yneo yone yotj ysnc ysos ytdm ywoe zen znc zne znr'.split(' '));
 const languages=new Set(['EN','JA','JP','DE','FR','IT','ES','PT','RU','KO','KR','ZHS','ZHT','CS','CT','PH']);
 const numberKey=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/^0+(?=\d)/,'');
 const normalize=v=>String(v||'').normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/[·•]/g,' ').trim();
 function collector(raw){
  raw=normalize(raw);let corrected=false;
  if(!/^\d{1,5}[A-Z★*]?$/.test(raw)){
   if(!/^[\dOILSBZ]{1,5}[★*]?$/.test(raw)||!/[0-9]/.test(raw))return null;
   raw=raw.replace(/[OILSBZ]/g,c=>({O:'0',I:'1',L:'1',S:'5',B:'8',Z:'2'})[c]);corrected=true;
  }
  // O/I/L at the end of a digit string can be a missed digit, not a proven suffix.
  if(/\d[OIL]$/.test(raw))corrected=true;
  return {number:numberKey(raw),corrected};
 }
 const readCache=new WeakMap();
 function reads(evidence){
  const signature=JSON.stringify((evidence.numbers||[]).map(b=>[b.text,b.confidence]))+(!(evidence.numbers||[]).length?evidence.full||'':'');
  const cached=readCache.get(evidence);if(cached?.signature===signature)return cached.value;
  const sets=[],numbers=[],direct=[];
  const lines=(evidence.numbers||[]).flatMap((b,block)=>String(b.text||'').split(/\r?\n/).map(text=>({text,confidence:Number(b.confidence)||0,block})));
  // Full-card text is only supporting evidence, never a confident footer read.
  if(!lines.length&&evidence.full)lines.push(...String(evidence.full).split(/\r?\n/).map(text=>({text,confidence:0,block:-1})));
  lines.forEach((line,index)=>{
   let text=normalize(line.text).split(/©|COPYRIGHT|WIZARDS OF THE COAST/)[0].trim();
   if(!text)return;
   const tokens=text.match(/\b[A-Z0-9]{2,6}\b/g)||[],codes=[...new Set(tokens.filter(t=>knownSets.has(t.toLowerCase())))];
   // OCR often joins "EN" to the artist: "LTR·ENDAVIDALVAREZ".
   // A completely fused set/language token is accepted only as a whole line.
   const languagePattern=[...languages].sort((a,b)=>b.length-a.length).join('|');
   const head=text.match(new RegExp('^([A-Z0-9]{3,6})[\\s|:]+('+languagePattern+')'))||text.match(new RegExp('^([A-Z0-9]{3,6}?)('+languagePattern+')$'));
   const footerHead=!!head&&knownSets.has(head[1].toLowerCase());
   if(footerHead&&!codes.includes(head[1]))codes.push(head[1]);
   const rawNumber='([0-9OILSBZ]{1,5}[A-Z★*]?)';
   // Explicit codes, e.g. LTR:001 or MH3 0122. Keep the complete collector suffix.
   for(const set of codes){
    const explicit=text.match(new RegExp('(?:^|\\s)'+set+'\\s*[:#/-]\\s*'+rawNumber+'(?=\\s|$)'));
    if(explicit){const n=collector(explicit[1]);if(n)direct.push({...n,set:set.toLowerCase(),confidence:line.confidence,index,block:line.block})}
   }
   const hasLanguage=tokens.some(t=>languages.has(t))||footerHead;
   const hasFraction=/\b[0-9OILSBZ]{1,5}[A-Z★*]?\s*\/\s*\d{2,4}\b/.test(text);
   let body=text;
   for(const set of codes)body=body.replace(new RegExp('\\b'+set+'\\b','g'),' ');
   for(const lang of languages)body=body.replace(new RegExp('\\b'+lang+'\\b','g'),' ');
   body=body.replace(/[:#|]/g,' ').replace(/\s+/g,' ').trim();
   const fraction=body.match(new RegExp('^(?:[CURMSL]\\s+)?'+rawNumber+'\\s*/\\s*([0-9OIL]{2,4})(?=\\s|$)'));
   const single=body.match(new RegExp('^(?:[CURMSL]\\s+)?'+rawNumber+'(?:\\s+[CURMSL])?$'));
   // Modern rarity prefixes are often fused to four digits, e.g. C0043.
   // The anchored rarity + at least three digits also tolerates a logo after it.
   const modern=body.match(/^[CURMSL]\s*(\d{3,5}[A-Z★*]?)(?=\s|$)/);
   const parsed=collector(fraction?.[1]||single?.[1]||modern?.[1]||'');
   const year=single&&/^(19|20)\d\d$/.test(single[1])&&!codes.length&&!/^[CURMSL]\s|\s[CURMSL]$/.test(body);
   const stats=fraction&&!codes.length&&Number(fraction[1])===Number(fraction[2])&&Number(fraction[1])<=20&&!/\s[CURMSL]$/.test(body);
   if(parsed&&!year&&!stats)numbers.push({...parsed,confidence:line.confidence,index,block:line.block,total:fraction?.[2]});
   // A word such as ALL or ONE in rules text is not a set-code observation.
   if(hasLanguage||hasFraction||parsed&&!year||codes.some(c=>text===c))for(const set of codes)sets.push({set:set.toLowerCase(),confidence:line.confidence,index,block:line.block});
  });
  const pairs=[...direct];
  for(const n of numbers)for(const s of sets){
   if(Math.abs(n.index-s.index)>2)continue;
   pairs.push({...n,set:s.set,confidence:Math.min(n.confidence,s.confidence)});
  }
  const unique=new Map();
  for(const p of pairs){const key=p.set+':'+p.number,previous=unique.get(key);if(!previous||Number(p.corrected)<Number(previous.corrected)||p.corrected===previous.corrected&&p.confidence>previous.confidence)unique.set(key,{...p,key});}
  const candidates=[...unique.values()].sort((a,b)=>Number(a.corrected)-Number(b.corrected)||b.confidence-a.confidence);
  const strong=candidates.filter(p=>!p.corrected&&p.confidence>=60);
  // Conflicting clear reads require the name fallback, never an arbitrary winner.
  const strongNumbers=new Set(numbers.filter(p=>!p.corrected&&p.confidence>=60).map(p=>p.number));
  const strongSets=new Set(sets.filter(p=>p.confidence>=60).map(p=>p.set));
  const ambiguous=strong.length>1||strongNumbers.size>1||strongSets.size>1;
  const reliable=!ambiguous&&strong.length===1?strong[0]:null;
  const uniqueNumbers=[...new Map(numbers.map(n=>[n.number,n])).values()];
  const value={pairs:candidates,numbers:uniqueNumbers,sets:[...new Set(sets.map(s=>s.set))],reliable,ambiguous};readCache.set(evidence,{signature,value});return value;
 }
 function observations(evidence){const r=reads(evidence);return r.pairs.length?r.pairs.map(p=>({value:p.key,key:p.key,set:p.set,number:p.number,code:true,confidence:p.confidence,uncertain:!r.reliable||r.reliable.key!==p.key})):r.numbers.map(n=>({value:n.number,key:n.number,code:false,confidence:n.confidence,uncertain:n.corrected||n.confidence<60}));}
 function compare(card,evidence){
  const r=reads(evidence),T=CardScanText,number=numberKey(card.localId),set=String(card.set?.id||card.setCode||'').toLowerCase();
  const scoreName=T.nameScore(card.name,(evidence.names||[]).map(x=>x.text).join('\n'));
  const name=scoreName===1?'match':scoreName>=.8?'similar':'unread';
  const exact=!!r.reliable&&r.reliable.set===set&&r.reliable.number===number;
  const numberState=r.ambiguous?'ambiguous':r.reliable?(r.reliable.number===number?'match':'conflict'):r.numbers.some(n=>n.number===number)?'similar':r.numbers.length?'conflict':'unread';
  const setState=r.ambiguous?'ambiguous':r.reliable?(r.reliable.set===set?'match':'conflict'):r.sets.includes(set)?'similar':r.sets.length?'conflict':'unread';
  const fallback=evidence.mtgLookup?.mode==='name';
  return {name,number:numberState,set:setState,observed:observations(evidence).map(x=>x.value),joint:exact,
   score:(!fallback&&exact?1000:0)+(name==='match'?100:name==='similar'?80:0)+(!fallback&&numberState==='match'?100:0)+(!fallback&&setState==='match'?100:0)};
 }
 function rank(cards,evidence){return cards.map(card=>({card,evidence:compare(card,evidence)})).sort((a,b)=>b.evidence.score-a.evidence.score||a.card.name.localeCompare(b.card.name));}
 function footerStatus(evidence){const r=reads(evidence);return r.reliable?'Seria i numer: '+r.reliable.set.toUpperCase()+' · '+r.reliable.number:r.ambiguous?'Seria / numer: sprzeczne odczyty — szukam po nazwie':'Seria / numer: brak pewnego odczytu';}
 async function lookup(evidence,names,{search,valid=()=>true,onstage=()=>{},getNames}={}){
  const r=reads(evidence),sources=[];let failure,reason=r.ambiguous?'ambiguous':'unread';
  if(!valid())return null;
  if(r.reliable){
   const q='set:'+r.reliable.set+' cn:'+r.reliable.number;
   onstage('Szukam po serii i numerze: '+r.reliable.set.toUpperCase()+' · '+r.reliable.number+'…');
   try{const data=await search({game:'mtg',q,ocr:'0'});if(!valid())return null;
    const cards=(data.cards||[]).filter(c=>String(c.set?.id||c.setCode||'').toLowerCase()===r.reliable.set&&numberKey(c.localId)===r.reliable.number);
    if(cards.length){sources.push({q,ocr:'0',data:{...data,cards}});evidence.mtgLookup={mode:'code',query:q};return {sources,query:r.reliable.key,mode:'code',note:'Dopasowano serię i numer. Porównaj ilustrację oraz wariant karty.'};}
   }catch(e){if(!valid())return null;failure=e;}
   reason='not-found';
  }
  if(!valid())return null;
  onstage('Numer lub seria nie zostały potwierdzone — szukam po nazwie karty…');
  if((!names||!names.length)&&getNames)try{names=await getNames()}catch{};
  if(!valid())return null;
  names=names||[];
  let nameLookupFailed=false;
  const suggestions=CardScanIndex.suggest(names,evidence),queries=[...new Set(suggestions.map(x=>x.name))].slice(0,3);
  if(!queries.length)queries.push(...CardScanText.names({names:evidence.names||[],full:''}).slice(0,3));
  for(const q of queries){if(!valid())return null;try{const data=await search({game:'mtg',q,ocr:'1'});if(!valid())return null;if(data.cards?.length)sources.push({q,ocr:'1',data});}catch(e){if(!valid())return null;failure=e;nameLookupFailed=true}}
  evidence.mtgLookup={mode:'name',reason,incomplete:nameLookupFailed};
  return {sources,query:queries[0]||r.pairs[0]?.key||'',mode:'name',
   note:sources.length?'Propozycje po nazwie. Numer i seria nie zostały potwierdzone — wybierz właściwe wydanie.':failure?.message||'Nie udało się odczytać numeru ani nazwy. Zbliż dolną część karty lub wpisz dane ręcznie.'};
 }
 // Count distinct editions across complete responses, before the live preview is capped.
 // A failed query or a remaining page must not look like a unique result.
 function singleResult(sources,evidence){
  if(!sources?.length||evidence?.mtgLookup?.incomplete)return null;
  const unique=new Map();
  for(const source of sources){const data=source.data;
   if(!Array.isArray(data?.cards)||data.nextPage||Number(data.total)>data.cards.length)return null;
   for(const card of data.cards){if(!card?.id)return null;unique.set(card.id,card);if(unique.size>1)return null;}
  }
  return unique.size===1?unique.values().next().value:null;
 }
 const footerPasses=[{kind:'numbers',region:[0,.84,.62,.16],enhance:false,psm:'11'},{kind:'numbers',region:[0,.84,.62,.16],enhance:true,psm:'6'},{kind:'numbers',region:[0,.82,1,.18],enhance:false,psm:'11'}];
 return Object.freeze({reads,observations,compare,rank,lookup,singleResult,footerStatus,footerPasses,numberKey,hasReliable:e=>!!reads(e).reliable});
})();
