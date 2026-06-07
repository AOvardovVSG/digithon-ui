#!/usr/bin/env python3
"""Best-effort fetch of provider logo SVGs from Wikimedia Commons -> public/providers/.
Any provider not found keeps the styled wordmark badge fallback (ProviderLogo.tsx)."""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Reject sponsorship/venue/foundation files that merely contain the brand name.
NOISE = ('stiftung', 'umwelt', 'arena', 'foundation', 'park', 'tower', 'stadi', 'stade',
         'sport', 'center', 'centre', 'field', 'riviera', 'direct', 'global')

OUT = Path(__file__).resolve().parent.parent / 'public' / 'providers'
OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'digithon-ui-logo-fetch/1.0 (broker tool)'}

# provider id -> Commons search terms (tried in order)
SEARCHES = {
    'allianz': ['Allianz logo'],
    'groupama': ['Groupama logo'],
    'uniqa': ['UNIQA logo', 'UNIQA Insurance Group logo'],
    'bulstrad': ['Bulstrad logo', 'Bulstrad Vienna Insurance Group'],
    'armeec': ['Armeec logo', 'ZAD Armeec'],
    'ozk': ['OZK Insurance', 'ОЗК Застраховане'],
    'bulgaria-insurance': ['Bulgaria Insurance logo'],
    'axiom': ['Axiom insurance Bulgaria logo'],
}

API = 'https://commons.wikimedia.org/w/api.php'


def search_svg(term: str) -> str | None:
    q = {
        'action': 'query',
        'generator': 'search',
        'gsrsearch': f'{term} filetype:svg',
        'gsrnamespace': '6',
        'gsrlimit': '5',
        'prop': 'imageinfo',
        'iiprop': 'url|mime',
        'format': 'json',
    }
    url = API + '?' + urllib.parse.urlencode(q)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            data = json.loads(urllib.request.urlopen(req, timeout=15).read())
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            print('   search error:', e)
            return None
        except Exception as e:
            print('   search error:', e)
            return None
    else:
        return None
    pages = sorted(((data.get('query') or {}).get('pages') or {}).values(), key=lambda p: p.get('index', 99))
    for page in pages:
        title = (page.get('title') or '').lower()
        if any(n in title for n in NOISE):
            continue
        ii = (page.get('imageinfo') or [{}])[0]
        if ii.get('mime') == 'image/svg+xml' and ii.get('url'):
            return ii['url']
    return None


def download(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers=UA)
        body = urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:
        print('   download error:', e)
        return False
    if b'<svg' not in body[:4000]:
        return False
    dest.write_bytes(body)
    return True


def main() -> None:
    ids = sys.argv[1:] or list(SEARCHES.keys())
    for pid in ids:
        terms = SEARCHES.get(pid, [pid])
        done = False
        for term in terms:
            time.sleep(2.5)  # be gentle with the Commons API
            url = search_svg(term)
            if url and download(url, OUT / f'{pid}.svg'):
                kb = (OUT / f'{pid}.svg').stat().st_size // 1024
                print(f'OK   {pid:20s} <- {url.split("/")[-1]} ({kb} KB)')
                done = True
                break
        if not done:
            print(f'MISS {pid:20s} (keeps badge fallback)')


if __name__ == '__main__':
    main()
