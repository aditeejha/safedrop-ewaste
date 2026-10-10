import sys
import re
import json
import hashlib
import pdfplumber

pdf_path = sys.argv[1]
out_path = sys.argv[2]

materials = {
    "Desktop CPUs": r"Desktop CPUs",
    "Portable Electronic Devices": r"Portable Electronic Devices",
    "Flat-Panel Displays": r"Flat-panel Displays",
    "CRT Displays": r"CRT Displays",
    "Electronic Peripherals": r"Electronic Peripherals",
    "Hard-Copy Devices": r"Hard-[Cc]opy Devices",
    "Mixed Electronics": r"Mixed Electronics",
}
num = r"(\([\d.]+\)|-?[\d.]+|NA|-)"


def to_number(tok):
    if tok in ("NA", "-"):
        return None
    if tok.startswith("("):
        return -float(tok.strip("()"))
    return float(tok)


with pdfplumber.open(pdf_path) as pdf:
    pages = {i + 1: (p.extract_text() or "") for i, p in enumerate(pdf.pages)}


def find_page(title):
    hits = [n for n, t in pages.items() if title in t]
    if not hits:
        raise SystemExit("missing exhibit: " + title)
    return hits


def rows_after(page_numbers, title, ncols):
    text = ""
    started = False
    for n in page_numbers:
        t = pages[n]
        if not started:
            if title not in t:
                continue
            t = t[t.index(title):]
            started = True
        text += "\n" + t
    found = {}
    for key, pat in materials.items():
        m = re.search(r"^" + pat + r"\s+" + r"\s+".join([num] * ncols) + r"\s*$", text, re.M)
        if not m:
            raise SystemExit(f"row not found: {key} in {title}")
        found[key] = [to_number(g) for g in m.groups()]
    return found


t77 = "Exhibit 7-7: Energy Impacts for Recycling"
t711 = "Exhibit 7-11: Energy Impacts for Landfilling"
t712 = "Exhibit 7-12: Net Energy Impacts from Source Reduction and MSW Management Options"
p77 = find_page(t77)[0]
p711 = find_page(t711)[0]
p712 = find_page(t712)[0]

rec = rows_after(range(p77, p77 + 2), t77, 3)
lf = rows_after(range(p711, p711 + 2), t711, 3)
net = rows_after(range(p712, p712 + 2), t712, 6)

result = {}
for key in materials:
    r77 = rec[key][2]
    l711 = lf[key][2]
    sr, r712, comb, comp, ad, l712 = net[key]
    if r77 != r712 or l711 != l712:
        raise SystemExit(f"exhibit mismatch for {key}: 7-7={r77} 7-12={r712} 7-11={l711} 7-12={l712}")
    result[key] = {"recycling": r712, "landfilling": l712}
    print(f"{key:30s} rec {r712:8.2f}  landfill {l712:5.2f}  | 7-7 process {rec[key][0]} transport {rec[key][1]} | 7-11 transport {lf[key][0]} utility {lf[key][1]} | SR {sr} comb {comb}")

def pdf_page_label(n):
    m = re.search(r"\n(7-\d+)\s*$", pages[n])
    return m.group(1) if m else "?"

print("pages: 7-7 on PDF p", p77, pdf_page_label(p77), "| 7-11 on PDF p", p711, "| 7-12 on PDF p", p712)
e712_pages = [n for n in range(p712, p712 + 2)
              if re.search(r"^Desktop CPUs" + r"\s+" + r"\s+".join([num] * 6) + r"\s*$",
                           pages[n][pages[n].index(t712):] if t712 in pages[n] else pages[n], re.M)]
e77_pages = [n for n in range(p77, p77 + 2) if "Desktop CPUs" in pages[n]]
e711_pages = [n for n in range(p711, p711 + 2) if "Desktop CPUs" in pages[n]]
print("electronics rows: 7-7 PDF p", e77_pages, [pdf_page_label(n) for n in e77_pages],
      "| 7-11 PDF p", e711_pages, [pdf_page_label(n) for n in e711_pages],
      "| 7-12 PDF p", e712_pages, [pdf_page_label(n) for n in e712_pages])

sha = hashlib.sha256(open(pdf_path, "rb").read()).hexdigest()
print("sha256", sha)

doc = {
    "unit": "million Btu per short ton",
    "source": {
        "title": "Documentation Chapters for Greenhouse Gas Emission, Energy and Economic Factors Used in the Waste Reduction Model (WARM) Version 16 - Management Practices Chapters, Chapter 7: Energy Impacts",
        "publisher": "U.S. Environmental Protection Agency, Office of Resource Conservation and Recovery",
        "date": "December 2023",
        "url": "https://www.epa.gov/system/files/documents/2024-01/warm_management_practices_v16_dec.pdf",
        "landing_page": "https://www.epa.gov/warm/documentation-chapters-greenhouse-gas-emission-energy-and-economic-factors-used-waste",
        "table": "Exhibit 7-12: Net Energy Impacts from Source Reduction and MSW Management Options (Million Btu/Ton), columns 'Recycling' and 'Landfilling' (electronics rows on chapter page 7-15, PDF page %d). Cross-checked against Exhibit 7-7 column (d) Net Energy (chapter page 7-8, PDF page %d) and Exhibit 7-11 column (d) Net Energy (chapter page 7-14, PDF page %d)." % (e712_pages[0], e77_pages[0], e711_pages[0]),
        "local_copy": "research/raw/facts/warm_management_practices_v16_dec.pdf",
        "local_copy_sha256": sha,
    },
    "materials": result,
    "conversion": {
        "kwh_per_million_btu": 293.07107,
        "derivation": "1 Btu_IT = 1055.05585262 J exactly (NIST SP 811 footnote 9); 1 kWh = 3.6e6 J exactly (NIST SP 811 Appendix B.8). 1e6 x 1055.05585262 / 3.6e6 = 293.07107 kWh. Consistent with EIA's rounded factor 1 kWh = 3,412 Btu.",
        "sources": [
            "https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes",
            "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8",
            "https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php",
        ],
    },
    "notes": (
        "Values copied exactly from EPA's table; EPA prints negatives in parentheses, recorded here as negative numbers. "
        "Negative = net energy saved (Exhibit 7-12 note: 'Negative energy impacts = Energy savings'). "
        "Recycling is per short ton COLLECTED for recycling (chapter footnote 35), and it is a full-product credit: "
        "Exhibit 7-7 splits it into recycled-input process-energy credit plus transportation energy. "
        "Electronics landfilling is 0.27 everywhere; it is transport to the landfill only, with no landfill-gas energy credit (NA). "
        "WARM's 'energy saved by recycling vs landfilling' is the difference recycling minus landfilling (method of Exhibit 7-2), "
        "e.g. Desktop CPUs -21.21 - 0.27 = -21.48 million Btu/short ton; the app has to do that arithmetic itself, because EPA prints no per-material difference table for electronics (Exhibit 7-1 is a chart only). "
        "EPA rounds the components separately, so they do not always add up: Hard-Copy Devices process (7.90) + transport (0.02) prints as net (7.91). Use the printed net value. "
        "Unit is the US short ton (2,000 lb). "
        "The Electronics chapter (EPA-530-R-23-022) does not tabulate energy factors; it says energy results follow the Energy Impacts chapter. "
        "The same Exhibit 7-12 also gives combustion and source-reduction values (e.g. source reduction for Portable Electronic Devices -163.36; CRT Displays source reduction NA). "
        "The EPA landing page also lists this PDF as the 'Management Practices Chapter'. Energy Impacts is chapter 7 inside it; EPA publishes no standalone Energy Impacts PDF and no separate v16 factors spreadsheet on that page."
    ),
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(doc, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("wrote", out_path)
