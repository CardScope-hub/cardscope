#!/usr/bin/env python3
"""Public TCG Republic JP single-card prices; no accounts, keys or cart requests.

All requests are normal public category pages. Exact printed numbers and rarities
are required. A separate snapshot keeps other providers' data intact.
"""
import argparse
import concurrent.futures
import datetime
import gzip
import html
from html.parser import HTMLParser
import json
import math
import os
from pathlib import Path
import re
import threading
import time
import unicodedata
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent
ORIGIN = 'https://tcgrepublic.com'
CATEGORY = ORIGIN + '/category/category_page_31.html'
UA = 'CardScope/2.5 (+https://github.com/CardScope-hub/cardscope; public-price-update)'
LOCK = threading.Lock()
LAST = 0
CODE = re.compile(r'(?<![A-Z0-9/])([A-Z0-9@!]+/[A-Z0-9]+-[A-Z]*\d+[A-Z0-9@+_*⁂⁑＊.-]*)\s+([A-Z][A-Z0-9+⁂⁑＊*_-]{0,12})(?=\s|$)', re.I)

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')

def norm(value):
    return unicodedata.normalize('NFKC', str(value or '')).strip().upper().replace('−', '-').replace('－', '-')

class Tiles(HTMLParser):
    """Parse one already isolated main product list, never the ranking carousel."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get('class', '').split())
        if tag == 'li' and 'product_thumbnail' in classes:
            if self.row is not None:
                raise ValueError('Nested product markup')
            self.row = {'title': '', 'price': '', 'url': '', 'text': []}
            self.stack = []
        if self.row is None:
            return
        if tag == 'a' and 'thumbnail_card' in classes:
            self.row['url'] = attrs.get('href', '')
        if tag == 'img' and not self.row['title']:
            self.row['title'] = attrs.get('alt', '')
        if tag not in ['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr']:
            self.stack.append((tag, classes))

    def handle_data(self, value):
        if self.row is None:
            return
        self.row['text'].append(value)
        if any('price_with_unit_offscreen' in classes for _, classes in self.stack):
            self.row['price'] += value

    def handle_endtag(self, tag):
        if self.row is None:
            return
        if tag == 'li':
            self.row['text'] = ' '.join(self.row['text'])
            self.rows.append(self.row)
            self.row = None
            self.stack = []
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break

def parse_page(raw):
    if 'Weiss Schwarz' not in raw or not re.search(r'Japanese.*Weiss Schwarz|List of Japanese Weiss Schwarz', raw, re.I):
        raise ValueError('Unexpected catalog language/game')
    currencies = set(re.findall(r'"priceCurrency"\s*:\s*"([A-Z]{3})"', raw))
    if currencies != {'USD'}:
        raise ValueError('Unverified price currency')
    container = re.search(r'<ul\b[^>]*\bid="main_container"[^>]*>(.*?)</ul>', raw, re.S)
    total = re.search(r'class="paginator_items_total[^\"]*"[^>]*>\s*([\d,]+)', raw)
    if not container or not total:
        raise ValueError('Missing product list or total')
    parser = Tiles()
    parser.feed(container.group(1))
    if parser.row is not None or not 1 <= len(parser.rows) <= 100:
        raise ValueError('Incomplete product list')
    links = re.findall(r'<li class="go_last"><a href="([^\"]+)"', raw)
    pages = int(parse_qs(urlparse(html.unescape(links[-1])).query)['p'][0]) if links else 1
    if not 1 <= pages <= 3000:
        raise ValueError('Unexpected page count')
    return {'total': int(total.group(1).replace(',', '')), 'pages': pages, 'items': parser.rows}

def extract(tile, observed_at):
    title, words = norm(tile.get('title')), norm(tile.get('text'))
    if re.search(r'\b(?:PSA|BGS|CGC|SGC|ARS|GRADED|PRE[ -]?ORDER)\b', title + ' ' + words):
        return None
    matches = list(CODE.finditer(title))
    if len(matches) != 1:
        return None
    code, rarity = matches[0].groups()
    # EN print markers must never acquire a Japanese shop price.
    if re.search(r'-(?:E|TE|PE)\d', code) or '/EN-' in code:
        return None
    price = tile.get('price', '').strip()
    if not re.fullmatch(r'\d{1,8}(?:\.\d{1,2})?', price):
        return None
    amount = float(price)
    if not math.isfinite(amount) or not 0 < amount <= 10000000:
        return None
    url = tile.get('url', '')
    product = re.fullmatch(r'/product/product_page_(\d+)\.html', url)
    if not product:
        return None
    return code + '|' + rarity, {
        'amount': amount, 'currency': 'USD', 'number': code, 'rarity': rarity,
        'productId': product[1], 'url': ORIGIN + url, 'inStock': True,
        'observedAt': observed_at, 'foil': bool(re.search(r'\bFOIL\b', words)),
    }

def request(page, cache=None):
    global LAST
    file = cache / f'page-{page}.json' if cache else None
    if file and file.exists():
        value = json.loads(file.read_text())
        if value.get('parserVersion') == 1:
            return value
    url = CATEGORY + '?' + urlencode({'graded': 2, 'single': 1, 'inventory': 'instock', 'order': 'card_number', 'p': page})
    for attempt in range(3):
        try:
            with LOCK:
                time.sleep(max(0, .65 - (time.monotonic() - LAST)))
                LAST = time.monotonic()
            with urlopen(Request(url, headers={'User-Agent': UA, 'Accept': 'text/html', 'Accept-Encoding': 'gzip'}), timeout=35) as response:
                raw = response.read()
                if response.headers.get('Content-Encoding') == 'gzip':
                    raw = gzip.decompress(raw)
                data = parse_page(raw.decode('utf-8'))
            data.update({'observedAt': now(), 'url': url, 'parserVersion': 1})
            if file:
                temp = file.with_suffix('.tmp')
                temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
                os.replace(temp, file)
            return data
        except Exception as error:
            if getattr(error, 'code', None) in [401, 403, 429]:
                # Stop this request; do not evade restrictions or hammer the site.
                raise
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def consolidate(pages, old=None, failed=None):
    seen, groups = set(), {}
    for page in sorted(pages):
        data = pages[page]
        for tile in data['items']:
            parsed = extract(tile, data['observedAt'])
            if not parsed:
                continue
            key, row = parsed
            if row['productId'] in seen:
                continue
            seen.add(row['productId'])
            groups.setdefault(key, []).append(row)
    rows, ambiguous = {}, []
    for key, offers in groups.items():
        if len({o['foil'] for o in offers}) > 1:
            ambiguous.append(key)
            continue
        row = min(offers, key=lambda o: (o['amount'], o['productId']))
        rows[key] = {**row, 'offersCount': len(offers)}
    if failed and old:
        rows = {**old.get('rows', {}), **rows}
    for key in ambiguous:
        rows.pop(key, None)
    return {'source': 'TCG Republic', 'language': 'ja', 'currency': 'USD', 'kind': 'retail',
            'observedAt': now(), 'rows': rows, 'incomplete': bool(failed), 'failedPages': failed or [],
            'pagesRead': len(pages), 'listedTotal': pages[1]['total'], 'productsRead': len(seen),
            'ambiguous': ambiguous, 'sourceUrl': CATEGORY}

def align_catalog(data, catalog):
    """Retailers omit decorative rarity marks, e.g. official SR⁂ -> shop SR.

    Accept that one spelling difference only for a unique full printed code,
    a foil offer and one official catalog printing. Never collapse R/RR/SR,
    +/- rarities or two cards sharing a code.
    """
    by_number = {}
    for card in catalog.get('cards', []):
        by_number.setdefault(norm(card[3]), []).append(card)
    result = dict(data)
    rows, ambiguous = {}, set(data.get('ambiguous', []))
    for key, row in data['rows'].items():
        matches = by_number.get(norm(row['number']), [])
        candidates = [c for c in matches if re.sub(r'[⁂⁑*]+$', '', norm(c[4])) == row['rarity']]
        if candidates and any(norm(c[4]) != row['rarity'] for c in candidates):
            if len(matches) == 1 and len(candidates) == 1 and row.get('foil') is True:
                card = candidates[0]
                row = {**row, 'sourceRarity': row['rarity'], 'rarity': norm(card[4]), 'catalogId': 'jp-' + str(card[0])}
                key = norm(row['number']) + '|' + row['rarity']
            else:
                ambiguous.add(key)
                continue
        if key not in rows or row['amount'] < rows[key]['amount']:
            rows[key] = row
    for key in ambiguous:
        rows.pop(key, None)
    result.update({'rows': rows, 'ambiguous': sorted(ambiguous)})
    return result

def refresh(cache=None, max_pages=None, workers=8, catalog_file=None):
    output = BASE / 'prices-weiss-republic.json'
    old = json.loads(output.read_text()).get('republic') if output.exists() else None
    if cache:
        cache.mkdir(parents=True, exist_ok=True)
    first = request(1, cache)
    count = min(first['pages'], max_pages) if max_pages else first['pages']
    print('TCG Republic:', first['total'], 'listings,', first['pages'], 'pages', flush=True)
    pages, failures = {1: first}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(24, workers))) as pool:
        tasks = {pool.submit(request, n, cache): n for n in range(2, count + 1)}
        for i, task in enumerate(concurrent.futures.as_completed(tasks), 2):
            page = tasks[task]
            try:
                pages[page] = task.result()
            except Exception as error:
                failures.append(page)
                print('Page failed', page, type(error).__name__, getattr(error, 'code', ''), flush=True)
                if getattr(error, 'code', None) in [401, 403, 429]:
                    for t in tasks:
                        t.cancel()
                    raise
            if i % 100 == 0 or i == count:
                print('Read', i, '/', count, 'pages; failures', len(failures), flush=True)
    if count < first['pages']:
        failures.extend(range(count + 1, first['pages'] + 1))
    data = consolidate(pages, old, sorted(failures))
    catalog_path = catalog_file or BASE / 'catalog-weiss-jp.json'
    if catalog_path.exists():
        data = align_catalog(data, json.loads(catalog_path.read_text()))
    if len(data['rows']) < 1000 and not max_pages:
        raise ValueError('Incomplete source; previous price file retained')
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps({'schema': 1, 'republic': data}, ensure_ascii=False, separators=(',', ':')))
    os.replace(temp, output)
    print('Saved', len(data['rows']), 'exact code/rarity quotes;', len(data['ambiguous']), 'ambiguous keys excluded', flush=True)
    return data

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path)
    parser.add_argument('--max-pages', type=int, help='Partial developer run; marked incomplete')
    parser.add_argument('--workers', type=int, default=8)
    parser.add_argument('--catalog', type=Path, help='JP catalog; defaults to adjacent catalog-weiss-jp.json')
    args = parser.parse_args()
    refresh(args.cache, args.max_pages, args.workers, args.catalog)
