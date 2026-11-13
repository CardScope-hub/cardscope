/* Original editorial learning notes. No card paragraphs, translation service or model. */
(() => {
 'use strict';
 const topics = {
  draw: ['Dobieranie i wybór kart', 'Dobieranie zwiększa wybór dostępnych zagrań. Wyszukiwanie lub oglądanie kart pomaga planować kolejne ruchy. To różne czynności: sprawdź na swojej karcie, które karty rzeczywiście trafiają do ręki.'],
  discard: ['Zarządzanie ręką', 'Odrzucanie zmniejsza zasoby w ręce. Może być kosztem uzyskania innej korzyści albo utrudnieniem dla przeciwnika. Zwróć uwagę, kto wybiera odrzucane karty i kiedy następuje odrzucenie.'],
  damage: ['Obrażenia', 'Przy efektach zadających obrażenia najważniejsze są dozwolony cel i wielkość obrażeń. Nie zakładaj, że efekt zadziała na dowolną jednostkę, gracza lub bazę.'],
  recovery: ['Odzyskiwanie wytrzymałości', 'Leczenie lub odzyskiwanie życia może wydłużyć obecność karty w grze albo dać więcej czasu na odpowiedź. Sprawdź, co można uleczyć i czy efekt ma ograniczenie.'],
  removal: ['Usuwanie kart', 'Zniszczenie, wygnanie i powrót do ręki prowadzą do różnych miejsc. Ma to znaczenie dla możliwości ponownego użycia karty oraz zdolności reagujących na jej opuszczenie pola.'],
  combat: ['Wpływ na walkę', 'Premie do statystyk i zdolności bojowe mogą zmieniać wynik starcia. Zwróć uwagę na czas działania premii oraz na to, czy obowiązuje podczas ataku, obrony czy przez całą turę.'],
  readiness: ['Gotowość do działania', 'Przygotowanie i wyczerpanie wpływają na dostępne działania. Samo przygotowanie nie oznacza automatycznie wykonania dodatkowego ataku — liczą się również pozostałe zasady gry.'],
  resources: ['Koszty i zasoby', 'Zmiana kosztu lub dostępnych zasobów może pozwolić zagrać więcej kart w turze. Oddziel koszt uruchomienia zdolności od korzyści, którą otrzymujesz po jej rozpatrzeniu.'],
  tokens: ['Żetony i znaczniki', 'Żetony lub znaczniki mogą reprezentować dodatkowe obiekty albo modyfikować istniejącą kartę. Sprawdź, co dokładnie powstaje, gdzie trafia i kiedy przestaje działać.'],
  movement: ['Zmiana miejsca karty', 'Przemieszczenie może zmienić dostępne cele, kontrolę obszaru albo udział w walce. Nie utożsamiaj go z powrotem do ręki czy zagraniem karty od nowa.'],
  attachments: ['Dołączanie kart', 'Dołączona karta może wzmacniać inną lub udostępniać jej nowe możliwości. Ważne są wymagania dotyczące celu i los dołączonej karty po usunięciu jej gospodarza.'],
  recursion: ['Ponowne wykorzystanie kart', 'Dostęp do kart spoza ręki może przywrócić wcześniej zużyte możliwości. Sprawdź dozwoloną strefę, koszt i miejsce, do którego karta ma trafić.'],
  protection: ['Ochrona i wybór celu', 'Zdolności ochronne mogą utrudniać atak albo użycie efektu. Nie każda ochrona działa na wszystkie zagrożenia; sprawdź jej zakres i wyjątki.'],
  timing: ['Moment użycia', 'Efekt może czekać na określone zdarzenie lub wymagać świadomego użycia. Ustal moment rozpatrzenia, zanim wykonasz kolejne działanie.'],
  condition: ['Warunki i ograniczenia', 'Warunek trzeba spełnić w odpowiednim momencie. Zwróć uwagę na limity użycia, wymagane karty oraz na to, czy dana czynność jest obowiązkowa czy opcjonalna.'],
  epic: ['Planowanie użycia lidera', 'Akcja epicka wymaga szczególnego planowania. Przed jej użyciem sprawdź wymagania na karcie oraz obowiązujące ograniczenia tej akcji.'],
  choice: ['Decyzje podczas rozpatrywania', 'Gdy efekt daje wybór, najpierw ustal dostępne możliwości i osobę podejmującą decyzję. Kolejność czynności może mieć znaczenie dla wyniku.']
 };
 // Topics identify concepts mentioned in rules, never claim that a card possesses a keyword.
 const patterns = {
  draw:/\bdraw\b|\bsearch (?:your|the) (?:deck|library)\b|\blook at\b/i,
  discard:/\bdiscard\b/i, damage:/\bdamage\b/i,
  recovery:/\bheal\b|\brestore\b|\bgain \d+ life\b/i,
  removal:/\bdestroy\b|\bdefeat\b|\bexile\b|\bbanish\b|\breturn .{0,60}(?:hand|deck)\b/i,
  combat:/\bpower\b|\bmight\b|\bassault\b|\braid\b|\boverwhelm\b|\bgrit\b|[+-]\d+\/[+-]?\d+/i,
  readiness:/\bexhaust\b|\bready\b|\buntap\b|\btap\b/i,
  resources:/\bcost\b|\bresources?\b|\bmana\b|\bchannel\b/i,
  tokens:/\btokens?\b|\bcounters?\b|\bbuff\b/i,
  movement:/\bmove\b|\brecall\b|\bganking\b/i,
  attachments:/\bequip\b|\battach\b|\bpiloting\b/i,
  recursion:/\bgraveyard\b|\bdiscard pile\b|\btrash\b/i,
  protection:/\bsentinel\b|\bshielded\b|\bdeflect\b|\bhexproof\b|\bindestructible\b/i,
  timing:/\bwhen\b|\bwhenever\b|\bat the (?:start|end|beginning)\b/i,
  condition:/\bif\b|\bonce\b|\bonly\b|\bunless\b/i,
  epic:/\bepic action\b/i, choice:/\bchoose\b|\bmay\b/i
 };
 function classify(text){return Object.keys(patterns).filter(k=>patterns[k].test(String(text||'')));}
 function metadata(card){
  if(!card || typeof card!=='object')return [];
  // Do not classify card names, flavour text, OCR guesses or untrusted saved translations.
  const fields=['rules','rulesText','oracle_text','text','effect','description'];
  const parts=[];
  for(const k of fields)if(typeof card[k]==='string')parts.push(card[k]);
  for(const k of ['attacks','abilities'])for(const a of Array.isArray(card[k])?card[k]:[])if(a&&typeof a==='object')for(const f of ['text','effect','description'])if(typeof a[f]==='string')parts.push(a[f]);
  return classify(parts.join('\n'));
 }
 function render(target,card,entry){
  const el=typeof target==='string'?document.getElementById(target):target;if(!el)return false;
  el.replaceChildren();if(!card){el.hidden=true;return false;}
  const ids=[...new Set(entry?.topics||metadata(card))].filter(k=>topics[k]);
  const node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  const title=node('h3','Jak rozumieć działanie karty');title.id=(el.id||'card-explanation')+'-title';el.setAttribute('aria-labelledby',title.id);el.append(title);
  el.append(node('p','Objaśnienie pojęć · opis częściowy','origins-pl-meta'));
  if(ids.length){
   el.append(node('p','Poniżej objaśniamy zagadnienia występujące w opisie tej karty. To wskazówki do jej zrozumienia, a nie pełny opis wszystkich efektów.','origins-pl-note'));
   const dl=node('dl','');dl.className='card-explanation-topics';dl.lang='pl';dl.setAttribute('translate','no');
   for(const id of ids){dl.append(node('dt',topics[id][0]),node('dd',topics[id][1]));}el.append(dl);
  } else el.append(node('p','Objaśnienie tej karty jest jeszcze w przygotowaniu. Nie odtwarzamy jej działania z nazwy ani ilustracji.','origins-pl-note'));
  el.append(node('p','Własne objaśnienia CardScope. Dokładne liczby, cele, koszty i wyjątki sprawdź na posiadanej karcie oraz w zasadach gry.','origins-pl-note'));
  el.hidden=false;return true;
 }
 globalThis.CardExplanations=Object.freeze({classify,metadata,render,topics});
})();
