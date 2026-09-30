# Verify candidate YouTube ids against oEmbed and merge them into js/data/videos.js.
# Usage: python3 scripts/add-videos.py candidates.json
import json, sys, re, urllib.request, urllib.parse
cand = json.load(open(sys.argv[1]))
path = 'js/data/videos.js'
src = open(path).read()
ok, skipped = {}, []
for k, v in cand.items():
    if not v or not v.get('id'): skipped.append(k); continue
    if re.search(r"^\s+%s: \{" % re.escape(k), src, re.M): continue  # already present
    url = 'https://www.youtube.com/oembed?url=' + urllib.parse.quote('https://www.youtube.com/watch?v=' + v['id'], safe='') + '&format=json'
    try:
        j = json.load(urllib.request.urlopen(url, timeout=15))
        ok[k] = {'id': v['id'], 'title': j['title'].replace('™', '').strip(), 'channel': j['author_name'].replace('™', '').strip()}
    except Exception as e:
        skipped.append(k)
lines = [f"  {k}: {{ id: {json.dumps(v['id'])}, title: {json.dumps(v['title'])}, channel: {json.dumps(v['channel'])} }}," for k, v in ok.items()]
if lines:
    src = src.rstrip()
    assert src.endswith('};')
    src = src[:-2] + '\n'.join(lines) + '\n};\n'
    open(path, 'w').write(src)
print(f'verified and added {len(ok)}; skipped {len(skipped)}: {skipped}')
