#!/usr/bin/env python3
"""
Builds the /stotras/ section of gitaforall.in from the text files in data/.

Usage:   python build.py            -> writes the finished site into ./stotras/
Needs:   pip install indic_transliteration

Each data/*.txt file is one prayer. You only type the Devanagari text and the
meanings; the English transliteration and Malayalam script are generated here.
See data/README.txt for the file format.
"""
import hashlib, html, json, re, shutil, sys
from pathlib import Path
from indic_transliteration import sanscript as S

ROOT = Path(__file__).parent
DATA = ROOT / "data"
STATIC = ROOT / "static"
OUT = ROOT / "stotras"

CATEGORIES = [
    ("sahasranama", {"en": "Sahasranamas", "hi": "सहस्रनाम", "ml": "സഹസ്രനാമങ്ങൾ"}),
    ("stotra",      {"en": "Stotras & Chalisa", "hi": "स्तोत्र एवं चालीसा", "ml": "സ്തോത്രങ്ങൾ"}),
    ("mantra",      {"en": "Mantras", "hi": "मंत्र", "ml": "മന്ത്രങ്ങൾ"}),
    ("daily",       {"en": "Daily Prayers & Shlokas", "hi": "नित्य प्रार्थना एवं श्लोक", "ml": "നിത്യ പ്രാർത്ഥനകൾ"}),
]
LANGS = ("en", "hi", "ml")
DEV_DIGITS = "०१२३४५६७८९"

# ---------------------------------------------------------------- transliteration
_SIMPLE = {
    "ā": "aa", "ī": "ee", "ū": "oo", "ṛ": "ri", "ṝ": "ree", "ḷ": "lu",
    "ṃ": "m", "ṁ": "m", "ḥ": "h", "ś": "sh", "ṣ": "sh", "ṭ": "t", "ḍ": "d",
    "ṇ": "n", "ṅ": "n", "ñ": "n", "ch": "chh", "c": "ch", "jñ": "gy",
    "kṣ": "ksh", "'": "'",
}
_SIMPLE_RE = re.compile("|".join(sorted(map(re.escape, _SIMPLE), key=len, reverse=True)))
_CONS = set("kgcjṭḍtdpbmnyrlvśṣshṅñṇ")
_VOW = set("aāiīuūṛeo")


_ASP = set("kgcjṭḍtdpb")


def _drop_final_a(m):
    w = m.group(0)
    if len(w) < 3 or w[-1] != "a" or w[-2] not in _CONS:
        return w
    i = len(w) - 2                      # start of the final consonant
    if w[i] == "h" and w[i - 1] in _ASP:  # aspirate such as kh, bh
        i -= 1
    if i == 0 or w[i - 1] in _CONS:     # conjunct (putra, dharma) keeps its 'a'
        return w
    if not any(c in _VOW for c in w[:i]):
        return w
    return w[:-1]


def to_roman(dev: str, hindi: bool) -> str:
    """Devanagari -> easy-to-read English letters (Shuklaambaradharam style)."""
    iast = S.transliterate(dev, S.DEVANAGARI, S.IAST)
    if hindi:  # Hindi/Awadhi: drop the silent final 'a'  (raja -> raj, rāma -> rām)
        iast = re.sub(r"[^\s|,.;:!?'\-]+", _drop_final_a, iast)
    iast = iast.replace("m̐", "ṃ").replace("~", "ṃ")
    iast = re.sub(r"ṃ(?=[kgcjṭḍtdnñṅṇ])", "n", iast)   # anusvara before these sounds is 'n'
    if hindi:
        iast = re.sub(r"ṃ(?=[\s|,.;:!?]|$)", "n", iast)   # nasal vowel at word end
    out = _SIMPLE_RE.sub(lambda m: _SIMPLE[m.group(0)], iast)
    return out[:1].upper() + out[1:] if out else out


_ML_FINAL = {"ര്": "ർ", "ന്": "ൻ", "ല്": "ൽ", "ണ്": "ൺ", "ള്": "ൾ"}


def to_malayalam(dev: str) -> str:
    ml = S.transliterate(dev, S.DEVANAGARI, S.MALAYALAM)
    # chillu letters the way Malayalam books print Sanskrit
    ml = re.sub(r"ര്(?=[ക-ഹ])", "ർ", ml)
    ml = re.sub(r"മ്(?=[\s।॥,]|$)", "ം", ml)
    ml = re.sub(r"മ്(?=[പഫബഭ])", "ം", ml)           # ശുക്ലാംബര, കുടുംബിനി
    ml = re.sub(r"ങ്(?=[ഗഘ])", "ം", ml)              # തുംഗ, സംഘ
    for k, v in _ML_FINAL.items():
        ml = re.sub(re.escape(k) + r"(?=[\s।॥,]|$)", v, ml)
    ml = ml.translate(str.maketrans("൦൧൨൩൪൫൬൭൮൯", "0123456789"))
    return ml


def dev_num(n: int) -> str:
    return "".join(DEV_DIGITS[int(d)] for d in str(n))


# ---------------------------------------------------------------- parsing
def parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    head, _, body = text.partition("\n===\n")
    meta = {}
    for line in head.splitlines():
        if ":" in line and not line.startswith("#"):
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    p = {
        "slug": meta.get("slug", path.stem),
        "order": float(meta.get("order", 99)),
        "category": meta["category"],
        "hindi": meta.get("lang", "sa") == "hi",
        "title": {l: meta.get(f"title_{l}", "") for l in LANGS},
        "sub": {l: meta.get(f"sub_{l}", "") for l in LANGS},
        "intro": {l: meta.get(f"intro_{l}", "") for l in LANGS},
        "sections": [],
        "numbers": meta.get("numbers", "yes") != "no",
    }
    sec = None
    count = 0
    for block in re.split(r"\n\s*\n", body.strip()):
        lines = [l.rstrip() for l in block.strip().splitlines() if l.strip()]
        if not lines:
            continue
        if lines[0].startswith("# "):
            parts = [x.strip() for x in lines[0][2:].split("|")]
            parts += [parts[0]] * (3 - len(parts))
            sec = {"heading": dict(zip(LANGS, parts)), "verses": []}
            p["sections"].append(sec)
            count = 0
            lines = lines[1:]
            if not lines:
                continue
        if sec is None:
            sec = {"heading": None, "verses": []}
            p["sections"].append(sec)
        sa, mean = [], {}
        for l in lines:
            m = re.match(r"^(en|hi|ml):\s*(.*)$", l)
            if m:
                mean[m.group(1)] = m.group(2)
            elif l.startswith("~"):          # speaker / small note line
                sa.append(("note", l[1:].strip()))
            else:
                sa.append(("text", l))
        # auto verse number: a final line ending in a bare ॥
        texts = [i for i, (k, _) in enumerate(sa) if k == "text"]
        if texts:
            i = texts[-1]
            t = sa[i][1]
            if p["numbers"] and re.search(r"॥\s*$", t) and not re.search(r"॥\s*[०-९0-9]+\s*॥\s*$", t):
                count += 1
                sa[i] = ("text", re.sub(r"॥\s*$", f"॥ {dev_num(count)} ॥", t))
        missing = [l for l in LANGS if l not in mean]
        if missing:
            print(f"  ! {path.name}: verse missing meaning {missing}: {lines[0][:50]}", file=sys.stderr)
        sec["verses"].append({"sa": sa, "mean": mean})
    return p


# ---------------------------------------------------------------- rendering
E = html.escape


def tri(d: dict, cls: str = "") -> str:
    """Three-language text; CSS shows the one matching the chosen meaning language."""
    return "".join(
        f'<span class="L {cls}" lang="{l}" data-l="{l}">{E(d.get(l) or d.get("en", ""))}</span>'
        for l in LANGS
    )


def _nb(t: str) -> str:
    """keep dandas and verse numbers from wrapping onto their own line"""
    t = re.sub(r"\s+(?=[।॥|])", "\u00a0", t)
    t = re.sub(r"([॥|]+)\s+(?=[0-9०-९])", "\\1\u00a0", t)
    t = re.sub(r"([0-9०-९]+)\s+(?=[॥|])", "\\1\u00a0", t)
    return t


def render_verse(v: dict, hindi: bool, vid: str) -> str:
    dev, rom, mal = [], [], []
    for kind, t in v["sa"]:
        if kind == "note":
            dev.append(f'<div class="spk">{E(t)}</div>')
            rom.append(f'<div class="spk">{E(to_roman(t, hindi))}</div>')
            mal.append(f'<div class="spk">{E(to_malayalam(t))}</div>')
        else:
            dev.append(f"<div>{E(_nb(t))}</div>")
            rom.append(f"<div>{E(_nb(to_roman(t, hindi)))}</div>")
            mal.append(f"<div>{E(_nb(to_malayalam(t)))}</div>")
    meaning = "".join(
        f'<p class="L" lang="{l}" data-l="{l}">{E(v["mean"].get(l, v["mean"].get("en", "")))}</p>'
        for l in LANGS
    )
    return (
        f'<article class="verse" id="{vid}">'
        f'<div class="col text">'
        f'<div class="dev" lang="sa">{"".join(dev)}</div>'
        f'<div class="rom" lang="sa-Latn">{"".join(rom)}</div>'
        f'<div class="mal" lang="sa-Mlym">{"".join(mal)}</div>'
        f"</div>"
        f'<div class="col meaning">{meaning}</div>'
        f"</article>"
    )


def page(title: str, body: str, depth_css: str = "", extra_head: str = "", page_class: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="Sahasranamas, stotras and mantras in Devanagari, English and Malayalam, with meanings in English, Hindi and Malayalam.">
<meta name="theme-color" content="#f6a04d">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Stotras">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;600&family=Noto+Serif+Devanagari:wght@400;600&family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap">
<link rel="stylesheet" href="css/style.css?v={{V}}">
{extra_head}
</head>
<body class="{page_class}" data-lang="en">
{body}
<script src="js/app.js?v={{V}}"></script>
</body>
</html>
"""


CONTROLS = """
<div class="controls" role="group" aria-label="Reading options">
  <div class="seg" role="radiogroup" aria-label="Meaning language">
    <span class="seg-label">Meaning</span>
    <button type="button" data-set-lang="en">English</button>
    <button type="button" data-set-lang="hi">हिन्दी</button>
    <button type="button" data-set-lang="ml">മലയാളം</button>
  </div>
  <label class="toggle"><input type="checkbox" id="mal-toggle"> <span>Malayalam script</span></label>
</div>
"""


def render_prayer(p: dict) -> str:
    toc = ""
    named = [s for s in p["sections"] if s["heading"]]
    if len(named) > 1:
        toc = '<nav class="jump" aria-label="Sections"><span class="L" data-l="en">Go to:</span><span class="L" data-l="hi">यहाँ जाएँ:</span><span class="L" data-l="ml">പോകുക:</span>' + "".join(
            f'<a href="#s{i}">{tri(s["heading"])}</a>' for i, s in enumerate(p["sections"]) if s["heading"]
        ) + "</nav>"
    secs = []
    for i, s in enumerate(p["sections"]):
        h = f'<h2 class="sec-h" id="s{i}">{tri(s["heading"])}</h2>' if s["heading"] else ""
        verses = "".join(render_verse(v, p["hindi"], f"v{i}-{j+1}") for j, v in enumerate(s["verses"]))
        secs.append(f'<section>{h}<div class="colheads"><span class="L" data-l="en">Prayer</span><span class="L" data-l="hi">पाठ</span><span class="L" data-l="ml">പാഠം</span><span class="L" data-l="en">Meaning</span><span class="L" data-l="hi">अर्थ</span><span class="L" data-l="ml">അർത്ഥം</span></div>{verses}</section>')
    sub = tri(p["sub"]) if any(p["sub"].values()) else ""
    body = f"""
<header class="topbar">
  <a class="home" href="./" aria-label="All prayers">&#8592; <span class="L" data-l="en">All prayers</span><span class="L" data-l="hi">सभी प्रार्थनाएँ</span><span class="L" data-l="ml">എല്ലാ പ്രാർത്ഥനകളും</span></a>
</header>
<main class="reader">
  <div class="title-block">
    <h1><span lang="sa">{E(p["title"]["hi"])}</span></h1>
    <p class="h1-sub"><span class="L" data-l="en">{E(p["title"]["en"])}</span><span class="L" data-l="ml" lang="ml">{E(p["title"]["ml"])}</span></p>
    <p class="sub">{sub}</p>
    <p class="intro">{tri(p["intro"])}</p>
  </div>
  {CONTROLS}
  {toc}
  {''.join(secs)}
  <p class="end">॥ ॐ शान्तिः शान्तिः शान्तिः ॥</p>
</main>
<a href="#" class="totop" aria-label="Back to top">&#8593;</a>
<footer class="foot"><a href="./">Stotras for All</a> · <a href="../">Bhagavad Gita for All</a>
<p class="note"><span class="L" data-l="en">Meanings are simple renderings for devotional reading. Please let us know of any correction.</span><span class="L" data-l="hi">अर्थ भक्तिपूर्ण पठन हेतु सरल भाव में दिए गए हैं। कोई त्रुटि हो तो कृपया बताएँ।</span><span class="L" data-l="ml">അർത്ഥങ്ങൾ ഭക്തിപൂർവമായ വായനയ്ക്കുള്ള ലളിതമായ വിവരണങ്ങളാണ്. തെറ്റുകൾ ഉണ്ടെങ്കിൽ ദയവായി അറിയിക്കുക.</span></p></footer>
"""
    return page(f"{p['title']['en']} – {p['title']['hi']} | Stotras for All", body, page_class="prayer")


def render_home(prayers: list) -> str:
    cats = []
    for key, label in CATEGORIES:
        items = [p for p in prayers if p["category"] == key]
        if not items:
            continue
        lis = "".join(
            f'<li><a href="{p["slug"]}.html"><span class="t-dev" lang="sa">{E(p["title"]["hi"])}</span>'
            f'<span class="t-en">{E(p["title"]["en"])}</span>'
            f'<span class="t-ml" lang="ml">{E(p["title"]["ml"])}</span>'
            f'{"<span class=t-sub>" + tri(p["sub"]) + "</span>" if any(p["sub"].values()) else ""}</a></li>'
            for p in items
        )
        cats.append(f'<section class="cat"><h2>{tri(label)}</h2><ul class="cards">{lis}</ul></section>')
    body = f"""
<div class="lotus-bg" aria-hidden="true"></div>
<main class="home-main">
  <header class="hero">
    <img src="img/lotus.svg" alt="" class="hero-lotus" width="120" height="84">
    <h1><span lang="sa">स्तोत्र संग्रह</span><span class="hero-en">Stotras for All</span><span lang="ml" class="hero-ml">സ്തോത്ര സംഗ്രഹം</span></h1>
    <p class="tag">Sahasranamas, stotras and mantras in Devanagari, English and Malayalam — with meanings in English, Hindi and Malayalam.</p>
  </header>
  {CONTROLS.replace('<label class="toggle"><input type="checkbox" id="mal-toggle"> <span>Malayalam script</span></label>', '')}
  {''.join(cats)}
  <p class="install-hint" id="install-hint" hidden><button type="button" id="install-btn">Install on this device</button></p>
  <p class="ios-hint" id="ios-hint" hidden>On iPhone / iPad: tap <b>Share</b> then <b>Add to Home Screen</b> to install.</p>
</main>
<footer class="foot"><a href="../">Bhagavad Gita for All</a></footer>
"""
    return page("Stotras for All – Sahasranamas, Stotras & Mantras", body, page_class="home")


# ---------------------------------------------------------------- build
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    prayers = []
    for f in sorted(DATA.glob("*.txt")):
        p = parse(f)
        prayers.append(p)
        n = sum(len(s["verses"]) for s in p["sections"])
        print(f"  {p['slug']:34s} {n:4d} verses")
    prayers.sort(key=lambda p: (p["order"], p["slug"]))

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(STATIC, OUT)
    pages = {"index.html": render_home(prayers)}
    for p in prayers:
        pages[f"{p['slug']}.html"] = render_prayer(p)

    css_js = (OUT / "css/style.css").read_bytes() + (OUT / "js/app.js").read_bytes()
    version = hashlib.sha1(css_js + "".join(pages.values()).encode()).hexdigest()[:10]
    for name, content in pages.items():
        (OUT / name).write_text(content.replace("{V}", version), encoding="utf-8")

    assets = sorted(
        str(p.relative_to(OUT)).replace("\\", "/")
        for p in OUT.rglob("*") if p.is_file() and p.name != "sw.js"
    )
    sw = (OUT / "sw.js").read_text(encoding="utf-8")
    sw = sw.replace("__VERSION__", version).replace("__ASSETS__", json.dumps(["./"] + assets, ensure_ascii=False))
    (OUT / "sw.js").write_text(sw, encoding="utf-8")
    print(f"Built {len(prayers)} prayers into {OUT}  (version {version})")


if __name__ == "__main__":
    main()
