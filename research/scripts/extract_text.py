import sys, os, re, html
import pdfplumber

src = sys.argv[1]
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    p = os.path.join(src, name)
    base, ext = os.path.splitext(name)
    dst = os.path.join(out, base + ".txt")
    try:
        if ext.lower() == ".pdf":
            parts = []
            with pdfplumber.open(p) as pdf:
                for i, page in enumerate(pdf.pages):
                    t = page.extract_text() or ""
                    parts.append(f"\n=== PAGE {i+1} ===\n{t}")
            text = "".join(parts)
        elif ext.lower() in (".html", ".htm"):
            raw = open(p, encoding="utf-8", errors="replace").read()
            raw = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", raw)
            raw = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>|</tr>|</h\d>|</td>", "\n", raw)
            raw = re.sub(r"<[^>]+>", " ", raw)
            text = html.unescape(raw)
            text = re.sub(r"[ \t\r\f\v]+", " ", text)
            text = re.sub(r"\n\s*\n+", "\n", text)
        else:
            continue
        with open(dst, "w", encoding="utf-8") as f:
            f.write(text)
        print(name, len(text))
    except Exception as e:
        print("ERR", name, e)
