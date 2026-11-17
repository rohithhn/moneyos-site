#!/usr/bin/env python3
"""Search and AI-search readiness check for every public page. Run before each publish:

    python3 _content/seocheck.py

Exits non-zero and lists the problems if any page could be skipped or misread by Google,
Google AI Overviews / AI Mode, Bing (ChatGPT search, Copilot), Perplexity or other AI crawlers.
"""
import glob, json, os, re, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BASE = 'https://rohithhn.github.io/moneyos-site/'
ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
errors = []

def err(page, msg):
    errors.append(f'{page}: {msg}')

sitemap = open('sitemap.xml').read()
llms = open('llms.txt').read()
index = open('blog/index.html').read()
sm_urls = set(re.findall(r'<loc>([^<]+)</loc>', sitemap))

pages = sorted(glob.glob('*.html') + glob.glob('blog/*.html'))
for p in pages:
    s = open(p).read()
    url = BASE + ('' if p == 'index.html' else p.replace('blog/index.html', 'blog/'))
    head = s.split('</head>')[0]
    m = re.search(r'<meta name="robots" content="([^"]+)"', head)
    if not m:
        err(p, 'no robots meta')
    elif 'noindex' in m.group(1) or 'nofollow' in m.group(1):
        err(p, 'robots meta blocks indexing')
    elif m.group(1) != ROBOTS:
        err(p, f'robots meta should be "{ROBOTS}"')
    c = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    if not c or c.group(1) != url:
        err(p, f'canonical should be {url}')
    if url not in sm_urls:
        err(p, 'missing from sitemap.xml')
    t = re.search(r'<title>([^<]+)</title>', head)
    if not t or len(t.group(1)) > 65:
        err(p, 'title missing or over 65 characters')
    d = re.search(r'<meta name="description" content="([^"]+)"', head)
    if not d or not 70 <= len(d.group(1)) <= 160:
        err(p, 'meta description missing or not 70 to 160 characters')
    for tag in ('og:title', 'og:description', 'og:image', 'og:url'):
        if f'property="{tag}"' not in head:
            err(p, f'missing {tag}')
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    types = set()
    for b in blocks:
        try:
            data = json.loads(b)
        except ValueError as e:
            err(p, f'JSON-LD does not parse: {e}')
            continue
        for node in data.get('@graph', [data]):
            ty = node.get('@type')
            types.update(ty if isinstance(ty, list) else [ty])
    if s.count('<h1') != 1:
        err(p, 'needs exactly one <h1>')
    for img in re.findall(r'<img\b[^>]*>', s):
        if 'facebook.com/tr' in img:
            continue
        if not re.search(r'\balt="', img):
            err(p, f'image without alt text: {img[:80]}')
    for src in re.findall(r'(?:src|href)="(\.\./[^"#?]+|img/[^"#?]+|[a-z0-9-]+\.html)"', s):
        path = os.path.normpath(os.path.join(os.path.dirname(p), src))
        if not os.path.exists(path):
            err(p, f'broken local link or image: {src}')
    if p.startswith('blog/') and p != 'blog/index.html':
        slug = os.path.basename(p)[:-5]
        if 'BlogPosting' not in types:
            err(p, 'no BlogPosting JSON-LD')
        if 'FAQPage' not in types:
            err(p, 'no FAQPage JSON-LD (answer-engine friendly Q&A)')
        if 'BreadcrumbList' not in types:
            err(p, 'no BreadcrumbList JSON-LD')
        if 'dateModified' not in s:
            err(p, 'no dateModified')
        if url not in llms:
            err(p, 'missing from llms.txt')
        if f'href="{slug}.html"' not in index:
            err(p, 'no card on blog/index.html')
        if '—' in re.sub(r'<[^>]+>', '', s):
            err(p, 'contains an em dash')
        if re.search(r'\b(lakh|crore)s?\b', s, re.I):
            err(p, 'uses lakh or crore')

for u in sm_urls:
    rel = u[len(BASE):] or 'index.html'
    rel = rel + 'index.html' if rel.endswith('/') else rel
    if not os.path.exists(rel):
        err('sitemap.xml', f'lists a page that does not exist: {u}')

if errors:
    print('\n'.join(errors))
    print(f'\n{len(errors)} problem(s) in {len(pages)} pages')
    sys.exit(1)
print(f'OK: {len(pages)} pages are indexable and listed for search and AI crawlers')
