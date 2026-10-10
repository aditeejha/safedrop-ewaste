import sys
import pdfplumber

src = sys.argv[1]
dst = sys.argv[2]
parts = []
with pdfplumber.open(src) as pdf:
    for i, page in enumerate(pdf.pages):
        t = page.extract_text() or ""
        parts.append(f"\n=== PAGE {i+1} ===\n{t}")
with open(dst, "w", encoding="utf-8") as f:
    f.write("".join(parts))
print(dst, sum(len(p) for p in parts))
