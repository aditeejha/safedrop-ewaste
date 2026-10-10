import collections
import json
import os
import random
import re
import sys

import openpyxl
import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_recyclers import STATES, collapse

PIN_REGION = {
    "1": {"Delhi", "Haryana", "Punjab", "Himachal Pradesh", "Jammu and Kashmir", "Ladakh", "Chandigarh"},
    "2": {"Uttar Pradesh", "Uttarakhand"},
    "3": {"Rajasthan", "Gujarat", "Dadra and Nagar Haveli and Daman and Diu"},
    "4": {"Maharashtra", "Madhya Pradesh", "Chhattisgarh", "Goa"},
    "5": {"Andhra Pradesh", "Telangana", "Karnataka"},
    "6": {"Tamil Nadu", "Kerala", "Puducherry", "Lakshadweep"},
    "7": {"West Bengal", "Odisha", "Assam", "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram",
          "Nagaland", "Sikkim", "Tripura", "Andaman and Nicobar Islands"},
    "8": {"Bihar", "Jharkhand"},
}

FILES = [
    ("recyclers.json", "recyclers_registration_granted_list", "RecyclerID"),
    ("refurbishers.json", "refurbishers_registration_granted_list", "RefurbisherID"),
]


def squash(text):
    return re.sub(r"\s+", "", text or "").upper()


def main():
    raw_dir = sys.argv[1]
    out_dir = sys.argv[2]
    failures = 0
    for out_name, raw_base, id_col in FILES:
        records = json.load(open(os.path.join(out_dir, out_name), encoding="utf-8"))
        raw = json.load(open(os.path.join(raw_dir, raw_base + ".json"), encoding="utf-8"))["content"]
        wb = openpyxl.load_workbook(os.path.join(raw_dir, raw_base + ".xlsx"), read_only=True)
        xrows = list(wb.worksheets[0].iter_rows(values_only=True))
        xby_id = {str(r[0]).strip(): dict(zip(xrows[0], r)) for r in xrows[1:]}
        with pdfplumber.open(os.path.join(raw_dir, raw_base + ".pdf")) as pdf:
            pdf_text = squash("".join(p.extract_text() or "" for p in pdf.pages).replace("&amp;", "&"))

        print(f"\n## {out_name}: {len(records)} records (raw JSON {len(raw)}, XLSX {len(xrows) - 1})")
        ids = [r["id"] for r in records]
        dup = [i for i, c in collections.Counter(ids).items() if c > 1]
        bad_pin = [r["id"] for r in records if r["pincode"] and not re.fullmatch(r"[1-9]\d{5}", r["pincode"])]
        bad_state = [r["id"] for r in records if r["state"] not in STATES]
        region = [(r["id"], r["pincode"], r["state"]) for r in records
                  if r["pincode"] and r["state"] not in PIN_REGION.get(r["pincode"][0], set())]
        print(f"duplicate ids: {dup}\nbad pincodes: {bad_pin}\nbad states: {bad_state}")
        print(f"pincode/state region mismatches ({len(region)}): {region}")
        failures += len(dup) + len(bad_pin) + len(bad_state)

        raw_by_key = {(collapse(i["companyName"]), collapse(i["address"]), i["ctoUnderCapacity"]): i for i in raw}
        rng = random.Random(20261011)
        print("\nspot-check (10 random):")
        for r in rng.sample(records, 10):
            x = xby_id[r["cpcbId"]]
            src = raw_by_key[(r["name"], collapse(r["address"]), r["capacityTpa"])]
            checks = {
                "xlsx.name": collapse(x["Company Name"]) == r["name"],
                "xlsx.address": collapse(x["Address"]).replace("&amp;", "&") == collapse(r["address"]),
                "xlsx.district": collapse(x["District"]) == r["district"],
                "xlsx.state": collapse(x["State"]).upper() == r["state"].upper(),
                "xlsx.capacity": float(x["Capacity under CTO (MT/Year)"]) == r["capacityTpa"],
                "json.phone": collapse(src.get("contact")) == r["phone"],
                "json.email": collapse(src.get("email")) == r["email"],
                "pdf.id+name": squash(r["cpcbId"] + r["name"]) in pdf_text or squash(r["cpcbId"]) in pdf_text,
                "pdf.capacity": squash(str(r["capacityTpa"])) in pdf_text,
                "address.pincode": r["pincode"] is None or r["pincode"] in r["address"],
                "address.city": r["city"] is None or r["city"] in r["address"],
            }
            bad = [k for k, ok in checks.items() if not ok]
            failures += len(bad)
            print(f"  {'OK ' if not bad else 'BAD'} {r['cpcbId']:>8} {r['name'][:40]:40} | {r['district']}, {r['state']} "
                  f"| pin {r['pincode']} | city {r['city']} | {r['capacityTpa']} TPA {bad or ''}")

        print("\nper state:")
        for state, n in collections.Counter(r["state"] for r in records).most_common():
            print(f"| {state} | {n} |")
        print("\ncoverage:")
        for key in records[0]:
            n = sum(1 for r in records if r[key] not in (None, "", []))
            print(f"| `{key}` | {n} | {100 * n / len(records):.1f}% |")
        total = sum(r["capacityTpa"] or 0 for r in records)
        print(f"\ntotal capacity: {total:,.1f} TPA")
    print(f"\nFAILURES: {failures}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
