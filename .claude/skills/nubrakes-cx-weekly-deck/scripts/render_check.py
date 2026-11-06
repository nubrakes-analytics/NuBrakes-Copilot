#!/usr/bin/env python3
"""Optional: screenshot each slide to out/render/NN-id.png to check for overflow (needs playwright + chromium)."""
import json, os, sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "out/project"
d = json.load(open(os.path.join(base, "deck.json")))
os.makedirs("out/render", exist_ok=True)
with sync_playwright() as p:
    exe = "/opt/pw-browsers/chromium" if os.path.exists("/opt/pw-browsers/chromium") else None
    b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    for i, s in enumerate(d["order"], 1):
        h = open(os.path.join(base, "slides", s + ".html")).read().replace("<aside>", '<aside style="display:none">')
        pg.set_content("<html><head><style>*{margin:0;box-sizing:border-box} section{width:1920px;height:1080px;position:relative;overflow:hidden} p,h1,h2,h3{margin:0}</style></head><body>" + h + "</body></html>")
        pg.screenshot(path=f"out/render/{i:02d}-{s}.png")
    b.close()
print("screenshots -> out/render")
