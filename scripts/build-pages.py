#!/usr/bin/env python3
"""Stage only the reviewed, self-contained demo for public GitHub Pages."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / '.local' / 'pages-site'
TARGET.mkdir(parents=True, exist_ok=True)
allowed = {'index.html', '.nojekyll'}
unexpected = {p.name for p in TARGET.iterdir()} - allowed
if unexpected:
    raise SystemExit('Unexpected files in Pages staging directory; inspect before publishing.')
source = ROOT / 'demos' / 'shinjuku-flow' / 'index.html'
(TARGET / 'index.html').write_bytes(source.read_bytes())
(TARGET / '.nojekyll').write_text('', encoding='utf-8')
print('Pages artifact: .local/pages-site (index.html and .nojekyll only)')
