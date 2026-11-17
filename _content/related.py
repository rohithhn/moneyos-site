#!/usr/bin/env python3
"""Add or refresh a "Related guides" list at the end of every blog post.

    python3 _content/related.py

Each post links to the 3 posts that share the most search keywords with it, preferring posts that
few other posts link to, so every post is reachable from other posts (crawlers and AI engines find
and weigh pages through internal links). Run it after adding a post; it is safe to run repeatedly.
"""
import glob, html, os, re

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
START, END = '<!-- related:start -->', '<!-- related:end -->'
STOP = {'expense', 'expenses', 'tracker', 'app', 'iphone', 'track', 'tracking', 'how', 'to', 'in',
        'india', 'your', 'a', 'the', 'of', 'for', 'and', 'with', 'my', 'from', 'on', 'without'}

posts = {}
for p in sorted(glob.glob('blog/*.html')):
    if p.endswith('index.html'):
        continue
    s = open(p).read()
    s = re.sub(r'\n?\s*' + re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '\n', s, flags=re.S)
    kw = re.search(r'<meta name="keywords" content="([^"]*)"', s)
    words = set(re.findall(r'[a-z0-9]+', (kw.group(1) if kw else '').lower())) - STOP
    title = re.sub(r'<[^>]+>', '', re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S).group(1)).strip()
    posts[os.path.basename(p)] = {'path': p, 'src': s, 'words': words, 'title': html.unescape(title)}

def links_in(src):
    return set(re.findall(r'href="([a-z0-9-]+\.html)"', src))

inbound = {k: 0 for k in posts}
for k, v in posts.items():
    for h in links_in(v['src']) - {k}:
        if h in inbound:
            inbound[h] += 1

picked = {}
for k in sorted(posts, key=lambda x: inbound[x]):
    v = posts[k]
    already = links_in(v['src'])
    cands = [c for c in posts if c != k and c != 'introducing-moneyos.html']
    cands.sort(key=lambda c: (-len(v['words'] & posts[c]['words']), c in already, inbound[c], c))
    picked[k] = cands[:3]
    for c in picked[k]:
        if c not in already:
            inbound[c] += 1

for k, v in posts.items():
    items = '\n'.join(f'          <li><a href="{c}">{html.escape(posts[c]["title"], quote=False)}</a></li>'
                      for c in picked[k])
    block = (f'      {START}\n      <nav class="related" aria-label="Related guides">\n'
             f'        <h2>Related guides</h2>\n        <ul>\n{items}\n        </ul>\n'
             f'      </nav>\n      {END}\n')
    s = v['src']
    i = s.index('    </article>')
    s = s[:i] + block + s[i:]
    open(v['path'], 'w').write(s)

final = {k: 0 for k in posts}
for k in posts:
    for h in links_in(open(posts[k]['path']).read()) - {k}:
        if h in final:
            final[h] += 1
print('posts:', len(posts), '| fewest links in from other posts:', min(final.values()))
