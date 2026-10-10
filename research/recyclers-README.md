# CPCB registered e-waste recyclers and refurbishers

Two datasets built from the Central Pollution Control Board (CPCB) E-Waste EPR portal, `https://eprewaste.cpcb.gov.in/`. On the portal's public dashboard these are the "Recycler Registration Granted" and "Refurbisher Registration Granted" lists. Every record comes from the official list. Nothing was invented, geocoded or filled from other sources.

| File | Records | Type |
|---|---|---|
| `recyclers.json` | 419 | `"recycler"` |
| `refurbishers.json` | 154 | `"refurbisher"` |

## Sources

The API base `https://eprewaste.cpcb.gov.in/E-Waste` comes from the portal's own front-end bundle (`BASE_URL`). The endpoints are the ones its dashboard calls.

| Dataset | Format | URL |
|---|---|---|
| Recyclers | JSON (primary) | https://eprewaste.cpcb.gov.in/E-Waste/getRecyclerRegistrationGrantedList?page=1&size=1000 |
| Recyclers | PDF | https://eprewaste.cpcb.gov.in/E-Waste/getRecyclerRegistrationGrantedListDownload?fileType=pdf |
| Recyclers | XLSX | https://eprewaste.cpcb.gov.in/E-Waste/getRecyclerRegistrationGrantedListDownload?fileType=excel |
| Refurbishers | JSON (primary) | https://eprewaste.cpcb.gov.in/E-Waste/getRefurbisherRegistrationGrantList?page=1&size=1000 |
| Refurbishers | PDF | https://eprewaste.cpcb.gov.in/E-Waste/getRefurbisherRegistrationGrantListDownload?fileType=pdf |
| Refurbishers | XLSX | https://eprewaste.cpcb.gov.in/E-Waste/getRefurbisherRegistrationGrantListDownload?fileType=excel |

Raw copies are kept in `raw/`, with the HTTP response headers in `*.headers.txt` beside each file. On 2026-10-11 both JSON endpoints were fetched again and were byte-identical (same MD5) to the saved copies. The PDF and XLSX files are generated on request, so their bytes change with each download. Their contents match the JSON (see the checks below).

## Date

None of the files shows an "as on" date. `sourceDate` is therefore the **download date, 2026-10-10**. The HTTP `Date` header reads `Sat, 10 Oct 2026 18:00:35 GMT` (23:30 IST). The PDF `CreationDate` (`2026-10-10 23:30 +05:30`) records when the file was generated, not an "as on" date. The portal list is live, so re-run the scripts to refresh it.

## Method

- `scripts/build_recyclers.py raw .`: reads the JSON (`content[]`, checking that `totalElements` equals the row count and that `last` is true). It joins every row to the XLSX on (name, address, district, state, capacity) and fails on any row that doesn't match, so all 573 rows are cross-checked. Then it writes the two output files.
- `scripts/check_recyclers.py raw .`: checks that ids are unique, that pincodes are `^[1-9]\d{5}$` and that states use official names. It also checks each pincode's first digit against its state's postal region (0 mismatches). Finally it spot-checks 10 random records per file (fixed seed) against the XLSX, the raw JSON and the PDF text. All 20 passed, with 0 failures.
- Run them as `python -I scripts/<name>.py raw .` from `D:\safedrop-ewaste\research`.

### Field mapping

| Field | Source / rule |
|---|---|
| `id` | slug of `name` + `district`. Where two records collide (15 records: 6 slugs), the CPCB portal id is appended. |
| `cpcbId` | Extra field: the portal's numeric "RecyclerID"/"RefurbisherID" from the XLSX/PDF. It is a record id, **not** a registration certificate number. |
| `name`, `district` | `companyName`, `district`, with whitespace trimmed and collapsed. District names are kept as the portal gives them (e.g. "Gurgaon", "Raigarh(MH)", "Bangalore"). |
| `address` | `address` exactly as printed. It is only trimmed, with the 7 literal `&amp;` decoded to `&`. |
| `state` | `state` (e.g. "UTTAR PRADESH") mapped to its official name ("Uttar Pradesh"). |
| `city` | The trailing locality the portal appends to the address (after a double space, before the pincode or district). It is kept only when it is a clean place name (letters only, at most 3 words, no "Dist/Tal/Village/Post"). It is never normalised, so spellings are as printed (e.g. "MEERUT", "Bengaluru"). Otherwise it is null. |
| `pincode` | The 6-digit number at the end of the address. Failing that, the only distinct 6-digit number in the address. Otherwise null. |
| `capacityTpa` | `ctoUnderCapacity`, which is "Capacity under CTO (MT/Year)", the capacity under the state board's Consent to Operate. |
| `phone`, `email` | Recyclers only: `contact` and `email` from the official JSON API. All 419 phones are 10 digits. |
| `status` | Extra field. Refurbishers: "Approved by CPCB Authority" (all of them). Recyclers: not provided, so null. |
| `operationsDisabled` | Extra field: the portal's `isRecyclerOperationsDisabled`. It is `true` for 6 recyclers and null where the portal omits it. |
| `registrationNo`, `validUpto`, `categories` | **Not in any source file. Always null.** |
| `source`, `sourceDate` | The JSON endpoint above, and 2026-10-10. |

## Field coverage

| Field | Recyclers (419) | Refurbishers (154) |
|---|---|---|
| id, cpcbId, name, address, state, district, capacityTpa, type, source, sourceDate | 100% | 100% |
| pincode | 100% | 20.1% (31) |
| city | 95.2% (399) | 26.0% (40) |
| phone, email | 100% | 0% (not published) |
| status | 0% | 100% |
| operationsDisabled | 1.4% (6, all `true`) | 0% |
| registrationNo, validUpto, categories | 0% | 0% |

Total capacity under CTO: 4,354,166.6 TPA (recyclers) and 177,767.3 TPA (refurbishers).

## Records per state

| State | Recyclers | Refurbishers |
|---|---|---|
| Uttar Pradesh | 118 | 13 |
| Maharashtra | 65 | 71 |
| Karnataka | 49 | 37 |
| Haryana | 44 | 4 |
| Gujarat | 39 | 3 |
| Telangana | 22 | 1 |
| Rajasthan | 18 | 9 |
| Tamil Nadu | 18 | 3 |
| West Bengal | 9 | 2 |
| Madhya Pradesh | 9 | 0 |
| Punjab | 8 | 1 |
| Uttarakhand | 5 | 1 |
| Himachal Pradesh | 4 | 0 |
| Andhra Pradesh | 3 | 0 |
| Jharkhand | 2 | 0 |
| Kerala | 2 | 0 |
| Delhi | 1 | 8 |
| Assam | 1 | 1 |
| Bihar | 1 | 0 |
| Chhattisgarh | 1 | 0 |
| **Total** | **419** | **154** |

## Caveats

- **No registration number, validity date or EEE categories.** The public list doesn't publish them. They would have to come from each unit's certificate, so they are null rather than guessed.
- **Phone and email** for recyclers appear only in the portal's JSON API, not in its PDF/XLSX exports. They are business contacts the applicant entered. The refurbisher list has none.
- **One record is one registration, not one company.** Some companies appear more than once (separate units or registrations). Examples are Pegasus Environment LLP (5 records in Bulandshahr) and Taj Computer Solutions (3). Near-duplicate spellings are kept as published (e.g. "WEEE PRO" and "WEEE-PRO" Resource Recovery Solutions).
- **6 recyclers have `operationsDisabled: true`** on the portal: Aksha Recycling (Muzaffarnagar), BRP Infotech (Ghaziabad, Hapur), Endeavor Recyclers (Rohtak) and WEEE Pro x2 (Bulandshahr). The app should probably hide or flag them.
- **The address text is entered by the applicant.** It contains typos, mixed case and repeated localities. Pincodes are taken as printed and were not checked against India Post. All of them pass the first-digit/state check, but at least one doesn't match its district: MEHER WASTE SOLUTIONS lists district Pune with pin 400029, a Mumbai pin.
- **City is parsed from the address**, so it is the weakest field. It is null when the trailing locality is missing or not clean (most refurbisher addresses have no separate locality or pincode). Spellings aren't normalised: "Bangalore", "Bengaluru" and "Bangaluru" all occur.
- **District names follow the portal's master list**, which uses some older names (Gurgaon, Bangalore, Raigarh(MH) for Raigad).
- **`capacityTpa` is consented capacity**, not actual throughput.
- **No geocoding was done.**
