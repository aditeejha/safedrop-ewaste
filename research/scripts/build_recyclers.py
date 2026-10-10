import html
import json
import os
import re
import sys
import unicodedata

import openpyxl

API = "https://eprewaste.cpcb.gov.in/E-Waste"
SOURCE_DATE = "2026-10-10"

DATASETS = [
    {
        "kind": "recycler",
        "json": "recyclers_registration_granted_list.json",
        "xlsx": "recyclers_registration_granted_list.xlsx",
        "source": API + "/getRecyclerRegistrationGrantedList?page=1&size=1000",
        "out": "recyclers.json",
    },
    {
        "kind": "refurbisher",
        "json": "refurbishers_registration_granted_list.json",
        "xlsx": "refurbishers_registration_granted_list.xlsx",
        "source": API + "/getRefurbisherRegistrationGrantList?page=1&size=1000",
        "out": "refurbishers.json",
    },
]

STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]
STATE_BY_UPPER = {s.upper(): s for s in STATES}
STATE_BY_UPPER.update({"NCT OF DELHI": "Delhi", "ORISSA": "Odisha", "PONDICHERRY": "Puducherry"})

CITY_STOPWORDS = {"DIST", "DISTRICT", "TAL", "TALUK", "TALUKA", "TEHSIL", "VILLAGE", "VILL", "POST", "AT", "PO", "PS"}


def clean(value):
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    return text or None


def collapse(value):
    return re.sub(r"\s+", " ", value).strip() if value else value


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def official_state(raw):
    key = collapse(raw).upper()
    if key not in STATE_BY_UPPER:
        raise ValueError(f"unknown state {raw!r}")
    return STATE_BY_UPPER[key]


def extract_pincode(address):
    tail = re.search(r"(?<!\d)([1-9]\d{5})\s*\.?\s*$", address)
    if tail:
        return tail.group(1)
    found = set(re.findall(r"(?<!\d)([1-9]\d{5})(?!\d)", address))
    return found.pop() if len(found) == 1 else None


def is_clean_place(segment):
    if not segment or not re.fullmatch(r"[A-Za-z][A-Za-z .()-]*", segment):
        return False
    words = segment.replace(".", " ").split()
    if len(words) > 3:
        return False
    return not any(w.upper() in CITY_STOPWORDS for w in words)


def extract_city(address, district, kind):
    text = address.rstrip()
    if kind == "recycler":
        tail = re.search(r"\s+[1-9]\d{5}$", text)
        if not tail:
            return None
        text = text[: tail.start()]
    else:
        if not district or not text.endswith(" " + district):
            return None
        text = text[: -len(district)].rstrip()
    parts = re.split(r"\s{2,}", text)
    if len(parts) < 2:
        return None
    segment = parts[-1].strip()
    return segment if is_clean_place(segment) else None


def load_xlsx(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    rows = list(wb.worksheets[0].iter_rows(values_only=True))
    header = rows[0]
    return [dict(zip(header, r)) for r in rows[1:]]


def json_key(item):
    return (
        collapse(item.get("companyName")),
        collapse(item.get("address")),
        collapse(item.get("district")),
        collapse(item.get("state")),
        float(item.get("ctoUnderCapacity")),
    )


def xlsx_key(row):
    return (
        collapse(row["Company Name"]),
        collapse(row["Address"]),
        collapse(row["District"]),
        collapse(row["State"]),
        float(row["Capacity under CTO (MT/Year)"]),
    )


def build(raw_dir, spec):
    with open(os.path.join(raw_dir, spec["json"]), encoding="utf-8") as fh:
        payload = json.load(fh)
    items = payload["content"]
    if payload["totalElements"] != len(items) or not payload["last"]:
        raise ValueError(f"{spec['json']}: paging incomplete")
    xrows = load_xlsx(os.path.join(raw_dir, spec["xlsx"]))
    if len(xrows) != len(items):
        raise ValueError(f"{spec['xlsx']}: row count {len(xrows)} != {len(items)}")
    id_col = "RecyclerID" if spec["kind"] == "recycler" else "RefurbisherID"
    by_key = {}
    for row in xrows:
        by_key.setdefault(xlsx_key(row), []).append(row)

    records = []
    for item in items:
        matches = by_key.get(json_key(item))
        if not matches:
            raise ValueError(f"no xlsx row for {item.get('companyName')!r}")
        row = matches.pop(0)
        name = collapse(clean(item.get("companyName")))
        address = clean(item.get("address"))
        district = collapse(clean(item.get("district")))
        capacity = item.get("ctoUnderCapacity")
        disabled = item.get("isRecyclerOperationsDisabled")
        records.append({
            "id": None,
            "cpcbId": str(row[id_col]).strip(),
            "name": name,
            "address": address,
            "state": official_state(item.get("state")),
            "district": district,
            "city": extract_city(address, district, spec["kind"]) if address else None,
            "pincode": extract_pincode(address) if address else None,
            "capacityTpa": float(capacity) if capacity is not None else None,
            "registrationNo": None,
            "validUpto": None,
            "type": spec["kind"],
            "categories": None,
            "phone": collapse(clean(item.get("contact"))),
            "email": collapse(clean(item.get("email"))),
            "status": collapse(clean(item.get("status"))),
            "operationsDisabled": bool(disabled) if disabled is not None else None,
            "source": spec["source"],
            "sourceDate": SOURCE_DATE,
        })

    base_counts = {}
    for r in records:
        base = slugify(f"{r['name']} {r['district'] or ''}")
        base_counts[base] = base_counts.get(base, 0) + 1
        r["id"] = base
    for r in records:
        if base_counts[r["id"]] > 1:
            r["id"] = f"{r['id']}-{r['cpcbId']}"
    return records


def main():
    raw_dir = sys.argv[1]
    out_dir = sys.argv[2]
    for spec in DATASETS:
        records = build(raw_dir, spec)
        with open(os.path.join(out_dir, spec["out"]), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(records, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(spec["out"], len(records))


if __name__ == "__main__":
    main()
