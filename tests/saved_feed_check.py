# Runs the content script against a saved LinkedIn feed page (Ctrl+S on linkedin.com/feed)
# with stubbed extension messaging, and prints what happened to each post.
# Usage: python3 tests/saved_feed_check.py "Feed _ LinkedIn.html" [--synthetic]
from playwright.sync_api import sync_playwright
import pathlib, json
root = pathlib.Path("/home/alhareth/projects/linkedin_filter")
import sys
args = [a for a in sys.argv[1:] if not a.startswith("--")]
html = pathlib.Path(args[0] if args else root / "Feed _ LinkedIn.html").read_text(encoding="utf-8")

STUB = """
window.__lifCalls = [];
window.chrome = { runtime: { sendMessage: async (msg) => {
    window.__lifCalls.push({type: msg.type, key: msg.key, arabic: msg.arabic, text: (msg.text||'').slice(0,40)});
    if (msg.type === 'getSettings') return {enabled:true, hideMode:'collapse', showBadges:true, hidePromoted:true, ambiguousPolicy:'keep'};
    if (msg.type === 'classify') {
      await new Promise(r => setTimeout(r, 300));
      const offer = /GitTree/.test(msg.text);
      return {category: offer ? 'offer' : 'other', keep: offer, source: 'nano'};
    }
  }, onMessage: { addListener() {} } },
  storage: { onChanged: { addListener() {} } } };
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    def route(r):
        if r.request.url.rstrip("/") == "https://www.linkedin.com/feed":
            r.fulfill(body=html, content_type="text/html")
        else:
            r.abort()
    page.route("**/*", route)
    page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
    page.add_style_tag(path=str(root / "src/content/content.css"))
    page.evaluate(STUB)
    if "--synthetic" in sys.argv:
        page.evaluate("""() => {
          const feed = document.querySelector('[data-testid="mainFeed"]');
          // Ad with a non-standard wrapper (no listitem / update-card-focus).
          feed.insertAdjacentHTML('beforeend', '<div id="synthetic-ad"><div><a href="/company/acme/">Acme</a><span>Promoted</span></div><p>Buy our stuff</p></div>');
          // Organic post whose body says "Promoted"; must not be treated as an ad.
          feed.insertAdjacentHTML('beforeend', '<div><div role="listitem" componentkey="update-card-focusSYNTHETIC"><span data-testid="expandable-text-box">Promoted</span></div></div>');
        }""")
    for f in ["keywords.js", "selectors.js", "content.js"]:
        page.add_script_tag(path=str(root / "src/content" / f))
    page.wait_for_timeout(1500)
    res = page.evaluate("""() => [...document.querySelectorAll('[role="listitem"][componentkey^="update-card-focus"]')].map(p => ({
        state: p.dataset.lifState, cat: p.dataset.lifCategory, src: p.dataset.lifSource,
        bar: p.querySelector(':scope > .lif-bar')?.innerText,
        visibleChildren: [...p.children].filter(c => getComputedStyle(c).display !== 'none').length,
        height: Math.round(p.getBoundingClientRect().height)
    }))""")
    for r in res: print(r)
    if "--synthetic" in sys.argv:
        print("synthetic ad:", page.evaluate("() => { const e = document.getElementById('synthetic-ad'); return {state: e.dataset.lifState, cat: e.dataset.lifCategory, bar: e.querySelector(':scope > .lif-bar')?.innerText}; }"))
    print("calls:", json.dumps(page.evaluate("window.__lifCalls"), ensure_ascii=False))
    print("page errors (ours):", [e for e in errors if 'LIF' in e or 'content.js' in e or 'keywords' in e])
    page.set_viewport_size({"width":1280,"height":900}); page.locator('[data-testid="mainFeed"]').scroll_into_view_if_needed(); page.wait_for_timeout(300); page.screenshot(path="/tmp/lif_feed.png", full_page=True); print("screenshot: /tmp/lif_feed.png")
    b.close()
