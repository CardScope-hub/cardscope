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

def json_ld(raw):
    for value in re.findall(r'<script\b[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>', raw, re.S | re.I):
        try:
            yield json.loads(value)
        except (ValueError, TypeError):
            continue

def stock_state(value):
    return {'https://schema.org/InStock': True, 'https://schema.org/LimitedAvailability': True,
            'https://schema.org/OutOfStock': False}.get(value)

def product_quote(product, tile, observed_at):
    """Price and availability are independent. Match one exact public product."""
    if product.get('@type') != 'Product' or product.get('brand') != 'Weiss Schwarz':
        return None
    offer = product.get('offers', {})
    if not isinstance(offer, dict) or offer.get('priceCurrency') != 'USD':
        return None
    state = stock_state(offer.get('availability'))
    if state is None:
        return None
    candidate = {**tile, 'title': product.get('name', ''), 'price': str(offer.get('price', '')),
                 'text': product.get('name', ''), 'inStock': state}
    candidate.pop('priceObservedAt', None)
    candidate.pop('priceOrigin', None)
    expected, actual = tile_identity(tile), tile_identity(candidate)
    if not expected or expected != actual:
        return None
    if offer.get('url') and offer['url'] != ORIGIN + tile['url']:
        return None
    return extract(candidate, observed_at)

class ProductMeta(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonical = []; self.values = {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('itemprop') in ['price', 'priceCurrency', 'availability']:
            self.values.setdefault(attrs['itemprop'], []).append(attrs.get('content'))

def parse_product(raw, tile, observed_at):
    meta = ProductMeta(); meta.feed(raw)
    if meta.canonical != [ORIGIN + tile['url']]:
        raise ValueError('Product canonical URL mismatch')
    products = [p for p in json_ld(raw) if isinstance(p, dict) and p.get('@type') == 'Product']
    if len(products) != 1:
        raise ValueError('Ambiguous product page')
    offer = products[0].get('offers', {})
    for key in ['price', 'priceCurrency', 'availability']:
        if meta.values.get(key) != [str(offer.get(key, ''))]:
            raise ValueError('Conflicting product price metadata')
    quote = product_quote(products[0], tile, observed_at)
    if not quote:
        raise ValueError('Product identity, currency or price mismatch')
    return quote

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
    # Only ItemList products that also occur in the main list may supply a price.
    # A Not Available tile hides the price; its linked Product can still price it.
    structured = {}
    for obj in json_ld(raw):
        if isinstance(obj, dict) and obj.get('@type') == 'ItemList':
            for item in obj.get('itemListElement', []):
                product = item.get('item', {})
                url = product.get('offers', {}).get('url')
                if url:
                    structured.setdefault(url, []).append(product)
    for tile in parser.rows:
        tile['inStock'] = 'NOT AVAILABLE' not in norm(tile['text'])
        candidates = structured.get(ORIGIN + tile['url'], [])
        if len(candidates) == 1:
            quote = product_quote(candidates[0], tile, now())
            if quote:
                row = quote[1]
                if not tile['price'].strip():
                    tile['price'] = str(row['amount'])
                    tile['priceOrigin'] = 'category-structured'
                # Do not advertise availability when either source says unavailable.
                tile['inStock'] = tile['inStock'] and row['inStock']
    return {'total': int(total.group(1).replace(',', '')), 'pages': pages, 'items': parser.rows}

def tile_identity(tile):
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
    product = re.fullmatch(r'/product/product_page_(\d+)\.html', tile.get('url', ''))
    if not product:
        return None
    return code, rarity, product[1], bool(re.search(r'\bFOIL\b', words))

def extract(tile, observed_at):
    identity = tile_identity(tile)
    if not identity:
        return None
    code, rarity, product_id, foil = identity
    price = str(tile.get('price', '')).strip()
    if not re.fullmatch(r'\d{1,8}(?:\.\d{1,2})?', price):
        return None
    amount = float(price)
    if not math.isfinite(amount) or not 0 < amount <= 10000000:
        return None
    state = tile.get('inStock', 'NOT AVAILABLE' not in norm(tile.get('text')))
    if type(state) is not bool:
        return None
    return code + '|' + rarity, {
        'amount': amount, 'currency': 'USD', 'number': code, 'rarity': rarity,
        'productId': product_id, 'url': ORIGIN + tile['url'], 'inStock': state,
        'observedAt': tile.get('priceObservedAt') or observed_at, 'foil': foil,
        **({'priceOrigin': tile['priceOrigin']} if tile.get('priceOrigin') else {}),
    }

def download(url):
    global LAST
    for attempt in range(3):
        try:
            with LOCK:
                time.sleep(max(0, .65 - (time.monotonic() - LAST)))
                LAST = time.monotonic()
            with urlopen(Request(url, headers={'User-Agent': UA, 'Accept': 'text/html', 'Accept-Encoding': 'gzip'}), timeout=35) as response:
                raw = response.read()
                if response.headers.get('Content-Encoding') == 'gzip':
                    raw = gzip.decompress(raw)
                if urlparse(response.geturl()).scheme != 'https' or urlparse(response.geturl()).hostname != 'tcgrepublic.com':
                    raise ValueError('Unexpected redirect')
                return raw.decode('utf-8')
        except Exception as error:
            if getattr(error, 'code', None) in [401, 403, 429]:
                # Stop this request; do not evade restrictions or hammer the site.
                raise
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def request(page, cache=None):
    file = cache / f'all-page-{page}.json' if cache else None
    if file and file.exists():
        value = json.loads(file.read_text())
        if value.get('parserVersion') == 2:
            return value
    url = CATEGORY + '?' + urlencode({'graded': 2, 'single': 1, 'inventory': 'all', 'order': 'card_number', 'p': page})
    data = parse_page(download(url))
    data.update({'observedAt': now(), 'url': url, 'parserVersion': 2})
    if file:
        temp = file.with_suffix('.tmp'); temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))); os.replace(temp, file)
    return data

def recover_unavailable(pages, old=None, limit=200, workers=8):
    """Bound product requests per refresh and rotate unresolved products fairly.

    Previously verified amounts keep their own dates while waiting for refresh.
    No browser CORS workaround, cart or inventory AJAX endpoints are used.
    """
    old = old or {}; previous = {str(r.get('productId')): r for r in old.get('rows', {}).values()}
    checks = dict(old.get('productChecks', {})); queue = {}; unresolved = set()
    for page in pages.values():
        for tile in page['items']:
            ident = tile_identity(tile)
            if not ident or tile.get('inStock') is not False or extract(tile, page['observedAt']):
                continue
            code, rare, pid, foil = ident
            row = previous.get(pid)
            if row and (norm(row.get('number')), norm(row.get('sourceRarity', row.get('rarity'))), row.get('foil')) == (code, rare, foil):
                tile.update({'price': str(row['amount']), 'priceObservedAt': row['observedAt'], 'priceOrigin': 'retained-dated'})
                try:
                    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(row['observedAt'].replace('Z', '+00:00'))
                    if row.get('inStock') is False and age.total_seconds() < 7 * 86400:
                        continue
                except (ValueError, TypeError):
                    pass
            else:
                unresolved.add(pid)
            queue.setdefault(pid, []).append(tile)
    selected = sorted(queue, key=lambda pid: (checks.get(pid, {}).get('at', ''), pid))[:max(0, limit)]
    def fetch(pid):
        tile = queue[pid][0]; at = now()
        return parse_product(download(ORIGIN + tile['url']), tile, at)[1]
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(8, workers))) as pool:
        tasks = {pool.submit(fetch, pid): pid for pid in selected}
        for task in concurrent.futures.as_completed(tasks):
            pid = tasks[task]
            try:
                row = task.result()
                for tile in queue[pid]:
                    tile.update({'price': str(row['amount']), 'priceObservedAt': row['observedAt'], 'inStock': row['inStock'], 'priceOrigin': 'product-page'})
                checks[pid] = {'at': now(), 'status': 'priced'}; unresolved.discard(pid)
            except Exception as error:
                checks[pid] = {'at': now(), 'status': 'failed'}; failures.append(pid)
                if getattr(error, 'code', None) in [401, 403, 429]:
                    for task in tasks: task.cancel()
                    raise
    return {'productChecks': checks, 'productPagesRead': len(selected) - len(failures),
            'failedProducts': failures, 'pendingProducts': sorted(unresolved),
            'productRefreshLimit': limit}

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
        row = min(offers, key=lambda o: (not o['inStock'], o['amount'], o['productId']))
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
        previous = rows.get(key)
        if previous and previous.get('productId') == row.get('productId'):
            # A retained normalized alias must not override a newer reading of
            # the very same product just because its historical price was lower.
            def timestamp(value):
                try:
                    return datetime.datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
                except (ValueError, TypeError, AttributeError):
                    return 0
            take = timestamp(row.get('observedAt')) >= timestamp(previous.get('observedAt'))
        else:
            take = previous is None or (not row['inStock'], row['amount']) < (not previous['inStock'], previous['amount'])
        if take:
            rows[key] = row
    for key in ambiguous:
        rows.pop(key, None)
    result.update({'rows': rows, 'ambiguous': sorted(ambiguous)})
    return result

def refresh(cache=None, max_pages=None, workers=8, catalog_file=None, product_limit=200):
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
    recovery = recover_unavailable(pages, old, product_limit, workers)
    data = {**consolidate(pages, old, sorted(failures)), **recovery}
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
    parser.add_argument('--product-limit', type=int, default=200, help='Max additional product pages per run; unresolved products rotate across runs')
    args = parser.parse_args()
    refresh(args.cache, args.max_pages, args.workers, args.catalog, args.product_limit)
