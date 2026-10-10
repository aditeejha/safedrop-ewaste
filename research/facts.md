# SafeDrop eWaste: verified facts

Compiled 2026-10-11. Each figure below was checked against a saved copy of the source in `research/raw/facts/` or `research/raw/web/`. Text was extracted with `research/scripts/extract_text.py`. Machine-readable version: `facts.json` (verified items only). Section H lists the claims that could not be verified.

Confidence key: **High** = primary or official source, exact text seen. **Medium** = official but old, indirect or not India-specific. Derived numbers are labelled **(derived)**. They are not in the JSON.

---

## A. India's scale

| # | Figure | Exact quote / table row | Source | Confidence |
|---|---|---|---|---|
| A1 | **1,397,955.59 t** e-waste generated, FY 2024-25 | "2024-2025 \| 13,97,955.59" (Total e-waste generated [tonnes/annum]) | PIB / MoEFCC, *Parliamentary Question: Electronic Waste Management* (Lok Sabha US Q3592), 11 Aug 2025. https://pib.gov.in/PressReleasePage.aspx?PRID=2155124 | High |
| A2 | **1,254,286.55 t**, FY 2023-24 | "2023-2024 \| 12,54,286.55" | Same as A1; repeated in PIB 2147876 | High |
| A3 | **70.71%** of e-waste generated was collected, dismantled and recycled or disposed in FY 2024-25 (**61.94%** in FY 2023-24) | "Percentage (%) of e-waste waste collected, dismantled and recycled / disposed … 2023-2024 \| 12,54,286.55 \| 61.94 … 2024-2025 \| 13,97,955.59 \| 70.71" | PIB / MoEFCC, *Parliament Question: E-waste processing management* (Rajya Sabha), 24 Jul 2025. https://pib.gov.in/PressReleasePage.aspx?PRID=2147876 | High |
| A3b | **(derived)** About **988,000 t** processed in FY 2024-25 | 70.71% × 1,397,955.59 = 988,494 t. The same release's state-wise "Quantity of E-Waste processed (MT)" rows sum to 988,479 t, which matches. FY 2023-24: 776,930 t | PIB 2147876 (my arithmetic) | High (derived) |
| A4 | CPCB method | "CPCB estimates the e-waste generation at national level based on the countrywide sales data provided by the registered producers, and average life of notified electrical and electronic equipment (EEE)" | PIB 2147876 | High |
| A5 | **322 registered recyclers** and **72 refurbishers** (as on 09.02.2025) | "Currently there are 322 nos. of recyclers and 72 nos. of refurbishers registered with CPCB…" | PIB / MoEFCC, *Management of Growing E-waste in the Country* (Rajya Sabha US Q1006), 13 Feb 2025. https://pib.gov.in/PressReleasePage.aspx?PRID=2102701 | High |
| A6 | Recycler capacity **2,208,918.064 MT/yr**; refurbisher capacity **92,042.18 MT/yr** | "The reported processing capacity of 322 registered recyclers as on 09.02.2025 is 22,08,918.064 MT per annum and processing capacity of 72 registered refurbishers is 92,042.18 MT per annum." | PIB 2102701 | High |
| A7 | Recyclers in **19 States**. UP has the most (125 in FY 2024-25) | "The registered e-waste Recyclers are presently located in 19 States." | PIB 2147876 | High |
| A7b | **(derived)** The state-wise "Registered Recycler" table sums to **446** for FY 2024-25 and **291** for FY 2023-24 | Sum of the state rows | PIB 2147876 | Medium. This conflicts with "322 as on 09.02.2025". The table likely counts all registrations during the year. In the app, quote 322 with its date. |
| A8 | **GEM 2024: India generated 4,137 million kg (about 4.1 Mt) in 2022, 2.9 kg/capita; 59.6 million kg documented as formally collected and recycled** | Annex 2 row: "India Asia 4137 2,9 59,6 Communication with Assocham India … Yes Yes Yes No" (decimal commas in original) | ITU and UNITAR, *The Global E-waste Monitor 2024*, p. 126. https://ewastemonitor.info/the-global-e-waste-monitor-2024/ (PDF: https://api.globalewaste.org/publications/file/297/Global-E-waste-Monitor-2024.pdf) | High (figure). The 59.6 Mkg "documented" figure cites Assocham communication and GEM 2020, so it is far below CPCB's own figures. |
| A9 | India is the **3rd-largest** generator in the GEM 2024 country table | China 12,066; United States 7,188; India 4,137 (million kg) | GEM 2024 Annex 2 | High (rank derived from the table) |
| A10 | Global: **62 billion kg** in 2022 (7.8 kg/capita); **22.3%** formally collected and recycled | "In 2022, the world produced 62 billion kg of e-waste (7.8 kg per capita), of which 13.8 billion kg (1.7 kg per capita) were documented as formally collected, for a global formally documented collection and recycling rate of 22.3 per cent." | GEM 2024, p. 28 | High |
| A11 | Informal sector: **"more than 90 per cent"** | "…it is the unorganized sector which is currently handling more than 90 per cent of the e-waste generated in the country." | Rajya Sabha Secretariat (Research Unit, LARRDIS), *E-Waste in India*, June 2011, p. 107. https://cms.rajyasabha.nic.in/UploadedFiles/ElectronicPublications/E-Waste_in_india.pdf | Medium. Official, but **15 years old** and predates EPR. Always show "(2011)". |

**Why CPCB (1.40 Mt) and GEM (4.1 Mt) differ:** CPCB counts only the 106 notified Schedule I EEE, using registered producers' sales and average life. GEM models all EEE across 54 UNU-KEYs from trade statistics. Show them as separate figures and never add them. For "India generated X", prefer the CPCB number, since it is the government figure.

---

## B. Hoarding and reasons

| # | Figure | Exact quote | Survey details | Source | Confidence |
|---|---|---|---|---|---|
| B1 | **46.5%** of young adults in New Delhi keep obsolete phones stored at home. Only **3.8%** take them to a recycling centre. **11.2%** sell them to scrap dealers ("kawariwalas"). **20.0%** give them away | Table 8: "I keep it stored at home 483 46.5 … I give it to someone for free … 208 20.0 … I sell it to the scrap dealers or 'kawariwalas' … 116 11.2 … I leave it at the store when buying a new one 99 9.5 … I take it to the recycling center 39 3.8 … I dispose it with normal household/mixed waste 6 .6 … Missing 88 8.5 … Total 1039" | n = 1,039, ages 18-22, New Delhi; questionnaire with respondent-driven snowball sampling | Borthakur A. & Singh P., "Understanding consumers' perspectives of electronic waste in an emerging economy: a case study of New Delhi, India", *Energy, Ecology & Environment*, published 12 Feb 2022, doi:10.1007/s40974-022-00242-9. https://pmc.ncbi.nlm.nih.gov/articles/PMC8853223/ | High. Peer-reviewed and India-specific. Not nationally representative: students and young adults, snowball sample |
| B2 | About **5.3 billion** of about **16 billion** phones expected to become waste in 2022 | "Experts expect roughly 5.3 billion mobile / smartphones will drop out of use this year." | Expert estimate, not survey data | WEEE Forum, *International E-waste Day: Of ~16 Billion Mobile Phones…*, 13 Oct 2022. https://weee-forum.org/ws_news/of-16-billion-mobile-phones-possessed-worldwide-5-3-billion-will-become-waste-in-2022/ | Medium (an estimate in a press release) |
| B3 | Average European household: **74** e-products, **13** hoarded (9 working, 4 broken). Phones rank **4th** among hoarded small EEE | "…of 8,775 European households in six countries … the average household contains 74 e-products … 13 are being hoarded (9 of them unused but working, 4 broken)." | WEEE Forum members' surveys, June to Sept 2022; 8,775 households in Portugal, Netherlands, Italy, Romania, Slovenia, plus a separate UK survey; consolidated by UNITAR SCYCLE | WEEE Forum, 13 Oct 2022 (same URL) | High (for Europe). **Not India** |
| B4 | Reasons for hoarding (Europe): might use again **46%**, plan to sell or give away 15%, sentimental 13%, might have future value 9%, don't know how to dispose 7%, **sensitive data 2%** | "Top 5 reasons for hoarding WEEE of any kind, Europe: I might use it again in the future (46%) … Presence of sensitive data (2%)" | Same survey | WEEE Forum, 13 Oct 2022 | High. Data fear was a **minor** reason in Europe |
| B5 | UK: **52%** keep old handsets. Of those who keep one: backup **43%**, security/data worry **26%**, don't know or never get round to it 25%, **don't know how to wipe data 19%**, too much hassle 16% | "A quarter (26%) are worried about security and don't want others to access their data. … One in five Britons (19%) don't know how to wipe their data" | YouGov Custom Research; n = 3,119 UK mobile owners; online, 29 Apr to 4 May 2024; weighted to UK adults | YouGov, *What do Britons do with their old phones? Half of them keep it*, 2024. https://yougov.com/en-gb/articles/50080-what-do-britons-do-with-their-old-phones-half-of-them-keep-it | High (for the UK). **UK only, not India** |

**SafeDrop eWaste takeaway:** The best evidence on data-privacy fear is the UK figure (26% worry about data, 19% don't know how to wipe). The verified India figure is the storage behaviour (46.5% keep old phones), not the reasons behind it. Do not present the UK percentages as Indian.

---

## C. Law

**E-Waste (Management) Rules, 2022**: G.S.R. 801(E), dated **2 Nov 2022**; **in force 1 Apr 2023**; supersedes the 2016 Rules. Source: Gazette text hosted by CPCB, https://cpcb.gov.in/uploads/Projects/E-Waste/e-waste_rules_2022.pdf (identical to egazette 239987, https://egazette.gov.in/WriteReadData/2022/239987.pdf). Quote: "New Delhi, the 2nd November 2022 G.S.R. 801(E) … (2) They shall come into force from the 1st day of April, 2023." Confidence: High.

- **Scope:** "106 Electrical and Electronic Equipment (EEE) listed in Schedule-I … including discarded mobile phones, computers and UPS systems" (PIB 2155124, 11 Aug 2025).
- **Registration (Rule 4):** manufacturers, producers, refurbishers and recyclers must register on the CPCB portal. "(4) The entities registered under sub-rule (1) shall not deal with any unregistered manufacturer, producer, recycler and refurbisher." SafeDrop eWaste should therefore route only to CPCB-portal-registered recyclers.
- **Bulk consumer (Rule 3(1)(b), Rule 8):** "any entity which has used at least one thousand units of electrical and electronic equipment listed in Schedule I, at any point of time in the particular Financial Year and includes e-retailer". Duty: "shall ensure that e-waste generated by them shall be handed over only to the registered producer, refurbisher or recycler."
- **Individual consumers:** the 2022 Rules define no "consumer" (only "bulk consumer") and give individual households no duty. This is based on a full-text search of the English Gazette text (High). Contrast: the Battery Rules 2022 do impose consumer duties (below).
- **EPR (Rule 3(1)(m), Schedule III):** "responsibility of any producer … for meeting recycling targets as per Schedule-III and Schedule-IV, only through registered recyclers". Targets by weight, as % of EEE placed on the market in year Y-X (X = average life):

  | Year | Target |
  |---|---|
  | 2023-24 | 60% |
  | 2024-25 | 60% |
  | 2025-26 | 70% |
  | 2026-27 | 70% |
  | 2027-28 onwards | 80% |

- **2024 amendment:** G.S.R. 164(E), 8 Mar 2024 (https://egazette.gov.in/WriteReadData/2024/252788.pdf). It sets an EPR certificate price band: "highest and lowest price … equal to hundred per cent and thirty per cent, respectively of the environmental compensation". It also adds Rule 9A, which allows return-filing deadlines to be relaxed by up to nine months. The note says the Rules were last amended earlier by G.S.R. 534(E), 24 Jul 2023 (text not reviewed).

**Schedule I codes** (exact item names from the Gazette):

| Device | Code | Schedule I item text |
|---|---|---|
| Mobile phone | **ITEW15** | "Cellular telephones" (also ITEW20 "Phablets", ITEW12 "Telephones", ITEW14 "Cordless telephones") |
| Laptop | **ITEW3** | "Personal Computing: Laptop Computers (Central Processing unit with input and output devices)"; ITEW4 "Notebook Computers"; ITEW5 "Notepad Computers" |
| Desktop | **ITEW2** | "Personal Computing: Personal Computers (Central Processing unit with input and output devices)" |
| Tablet | **ITEW19** | "Tablets, I-PAD" |
| Printer | **ITEW6** | "Printers including cartridges" (ITEW21 "Scanners", ITEW7 "Copying Equipment") |
| Monitor | **CEEW6** | "Screen, Electronic Photo frames, Electronic Display Panel, Monitors" |
| TV | **CEEW1** | "Television sets (including sets based on Liquid Crystal Display and light Emitting Diode Technology)" |
| Router | **ITEW22** | "Routers" |
| Modem | **ITEW26** | "Modems" |
| Other useful codes | ITEW24 "UPS", ITEW27 "Electronic data storage devices", CEEW19 "Digital camera", TLSEW2 "Hand-held video games consoles" | |
| Chargers | **not listed by name** | Rule 2 applies to Schedule I EEE "including their components, consumables, parts and spares which make the product operational". The Rules do not say whether a loose charger falls under this. Do not cite a code. |

**Loose lithium batteries are covered by the Battery Waste Management Rules, 2022, not the E-Waste Rules.**
- E-Waste Rules Rule 2(a): the rules "shall not apply to - (a) waste batteries as covered under the Battery Waste Management Rules, 2022".
- The Battery Rules are S.O. 3984(E), dated 22 Aug 2022 and published in the Gazette of India Extraordinary No. 3810 on **24 Aug 2022** (PIB 2155124 gives 24 Aug 2022 as the notification date). They took effect on publication. https://egazette.gov.in/WriteReadData/2022/238351.pdf
- Scope: they apply to "Producer, dealer, consumer, entities involved in collection…" and "all types of batteries regardless of chemistry, shape, volume, weight, material composition and use."
- Portable battery: "Battery that is sealed, less than five kilograms, not made for industrial purposes, electric vehicle or to be used as an Automotive Battery".
- **Consumer duty (Rule 5):** "(i) to discard Waste Battery separately from other waste streams especially from mixed waste, domestic waste streams; (ii) to ensure that Waste Battery are disposed off in an environment friendly manner by giving it to an entity engaged in collection or refurbishment or recycling".
- Rule 4(3): "Waste Battery collected by the Producer shall be sent for recycling or refurbishing and shall not be sent for landfilling or incineration."

Confidence: High.

---

## D. Material recovery (EPA / USGS)

- **EPA quote** (*Electronics Donation and Recycling*, US EPA, last updated 19 Dec 2025, https://www.epa.gov/recycle/electronics-donation-and-recycling):
  > "In 2006, U.S. Geological Survey estimated that: Recycling one million laptops saves the energy equivalent to the electricity used by more than 3,500 U.S. homes in a year. For every million cell phones we recycle, 35 thousand pounds of copper, 772 pounds of silver, 75 pounds of gold and 33 pounds of palladium can be recovered."
- **Cross-check against the primary source:** USGS Fact Sheet 2006-3097, *Recycled Cell Phones - A Treasure Trove of Valuable Metals* (July 2006), https://pubs.usgs.gov/fs/2006/3097/fs2006-3097.pdf.
  - Table 1 gives per-phone metal content for a typical 113 g phone, "exclusive of batteries and charger (Nokia, 2005)":

    | Metal | g per phone |
    |---|---|
    | Copper | 16 |
    | Silver | 0.35 |
    | Gold | 0.034 |
    | Palladium | 0.015 |
    | Platinum | 0.00034 |

  - Multiplying by 1 million phones gives 16 t Cu = 35,274 lb, 0.35 t Ag = 772 lb, 0.034 t Au = 75 lb and 0.015 t Pd = 33 lb, which matches EPA exactly.
  - Confidence: **High** for the phone metals.
- **Laptop energy claim:** EPA publishes it, but it is **not in the USGS fact sheet** EPA attributes it to, which covers phones only. Cite it as an EPA statement. Confidence: Medium. The underlying calculation was not traced.
- **Caveats for app use:** The figures are recoverable contents of 2005-era phones, not recovery rates achieved by Indian recyclers. Say "can be recovered", as EPA does.

---

## E. WARM v16 electronics factors

Source: US EPA, *Documentation for Greenhouse Gas Emission and Energy Factors Used in the Waste Reduction Model (WARM): Electronics*, **Version 16, December 2023**, EPA-530-R-23-022, Exhibit 1-5 "Net Emissions for Electronics under Each Materials Management Option (MTCO2E/Short Ton)". https://www.epa.gov/system/files/documents/2023-12/warm_electronics_v16_dec.pdf (file size matches the saved copy).

**Units:** metric tonnes CO2-equivalent per **short ton** (2,000 lb = 907.18 kg) of material managed. Parentheses in the original mean negative values, i.e. net emission reductions.

| WARM v16 material | Recycling | Landfilling | Combustion | Source reduction |
|---|---|---|---|---|
| Desktop CPUs | **-1.49** | **0.02** | -0.66 | -20.86 |
| Portable Electronic Devices | **-1.06** | **0.02** | 0.65 | -29.83 |
| Flat-Panel Displays | **-0.99** | **0.02** | 0.03 | -24.19 |
| CRT Displays | **-0.57** | **0.02** | 0.45 | NA |
| Electronic Peripherals | **-0.36** | **0.02** | 2.08 | -10.32 |
| Hard-Copy Devices | **-0.56** | **0.02** | 1.20 | -7.65 |
| Mixed Electronics | **-0.90** | **0.02** | 0.34 | -20.79 |
| *Personal Computers* | not a WARM v16 material | | | |

Category definitions (WARM v16 text):
- Portable electronic devices are "laptops, e-readers, tablets, smart phones, and basic mobile phones".
- Flat-panel displays are LED/LCD/plasma TVs and LED/LCD monitors.
- Peripherals are keyboards and mice.
- Hard-copy devices are printers and multi-function devices.

Confidence: High (figures). Caveat: these are US-grid, US-system factors. Label them "based on US EPA WARM v16" in the app.

**(derived)** Recycling instead of landfilling avoids (landfill minus recycling, MTCO2E per short ton):

| Material | Avoided |
|---|---|
| Portable devices | 1.08 |
| Desktop CPUs | 1.51 |
| Flat panels | 1.01 |
| Mixed electronics | 0.92 |

To convert to kg CO2e per kg, multiply by 1000/907.18. For example, portable devices: 1.08 × 1.1023 ≈ 1.19 kg CO2e per kg of device.

The WARM v15 PDF in `raw/facts` is truncated ("Unexpected EOF") and was not used.

---

## F. Typical device weights (for when a recycler has not weighed the item)

Standard source: Forti V., Baldé C.P., Kuehr R. (2018), *E-waste Statistics: Guidelines on Classification, Reporting and Indicators*, 2nd ed., United Nations University (GEM 2024 Annex 1 says its unit-to-weight conversion uses "the average weight data per appliance type … published in the E-waste Statistics Guidelines"). The UNU repository blocked automated download, so the table was verified in **two independent official reproductions that agree on every row checked**:

1. UNEP SDG portal, *Annex V. Indication of average weight of electric and electronic equipment for EU-28 (kg/piece)*: https://sdgs.unep.org/article/annex-v-indication-average-weight-electric-and-electronic-equipment-eu-28-kgpiece
2. Government of Western Australia, DWER, *Fact sheet: E-waste ban - Estimating the weight of e-waste* (2024), "per-unit default factors": https://wa.gov.au/system/files/2024-08/e-waste-ban_fact-sheet-estimating-the-weight.pdf

The 2016 column is used (latest).

| UNU-KEY | Category | kg/unit |
|---|---|---|
| 0306 | Mobile phones (incl. smartphones) | **0.09** |
| 0303 | Laptops (incl. tablets) | **1.26** |
| 0302 | Desktop PCs (excl. monitors, accessories) | **8.77** |
| 0304 | Printers (scanners, multifunctionals, faxes) | **10.32** |
| 0309 | Flat panel monitors (LCD, LED) | **5.5** |
| 0308 | CRT monitors | **22.0** |
| 0408 | Flat panel TVs (LCD, LED, plasma) | **10.2** |
| 0407 | CRT TVs | **33.2** |
| 0301 | Small IT (routers, mice, keyboards, external drives) | **0.40** |
| 0305 | Telecom (cordless phones, answering machines) | **0.45** |
| 0401 | Small consumer electronics (headphones, remotes) | 0.39 |
| 0402 | Portable audio/video (e-readers, MP3) | 0.23 |
| 0406 | Cameras | 0.29 |
| 0702 | Game consoles | 0.48 |

Notes:
- Tablets share a key with laptops (1.26 kg), so a tablet alone will be overestimated.
- These are EU-28 averages.
- Older cross-check: USGS 2006 used 113 g for a typical 2005 phone (excl. battery and charger).
- Chargers: the closest key is 0201 "Other small household equipment (… adapters)" at 0.99 kg, which is too broad for a phone charger. **No verified charger weight.**

Confidence: High.

---

## G. Hazards

**Lithium-ion batteries**: US EPA, *Used Lithium-Ion Batteries*, last updated 20 Mar 2026, https://www.epa.gov/recycle/used-lithium-ion-batteries. Confidence: High.
> "Lithium-ion batteries and devices containing these batteries should NOT go in household garbage or recycling bins."
> "…if the battery or electronic device that contains the battery is disposed of in the trash or placed in the municipal recycling bin with household recyclables such as plastic, paper or glass, it may become damaged or crushed in transport or from processing and sorting equipment, creating a fire hazard."
> "Handling precautions: Place each battery or device containing a battery in a separate plastic bag. Place non-conductive tape (e.g., electrical tape) over the battery's terminals. … Even used batteries can have enough energy to injure or start fires."
> "Due to the increase of fires at recycling and waste facilities across the country, industry groups have worked together to develop the 'Avoid the Spark. Be Battery Safety Smart.' campaign."

**Health impacts of informal processing**: WHO fact sheet *Electronic waste (e-waste)*, **1 October 2024**, https://www.who.int/news-room/fact-sheets/detail/electronic-waste-(e-waste). Confidence: High.
> "When e-waste is recycling using unsound activities, it can release up to 1000 different chemical substances into the environment, including known neurotoxicants such as lead."
> "Open burning and heating are considered the most hazardous activities due to the toxic fumes created."
> "Informal e-waste recycling activities may have several adverse health effects. Children and pregnant women are particularly vulnerable."

Listed effects:
> "adverse neonatal outcomes, including increased rates of stillbirth and premature birth; neurodevelopment, learning and behaviour outcomes, especially associated with lead released through informal e-waste recycling activities; reduced lung and respiratory function and increased asthma incidence"

> "The International Labour Organization (ILO) estimates that 16.5 million children were working in the industrial sector in 2020"

(That figure is for the whole industrial sector, not e-waste alone.)

---

## H. Unverified or excluded (not in facts.json)

- **"95% of India's e-waste is handled by the informal sector"**: no primary source found. The only official figure found is the Rajya Sabha 2011 "more than 90 per cent" (A11).
- **YouGov 2024 India survey on old phones**: the saved YouGov file is a **UK** survey. No India YouGov study was verified. India storage data comes from the New Delhi peer-reviewed survey (B1).
- **India-specific data-privacy fear percentage**: not found in any verified source.
- **WARM "Personal Computers" factor**: not a material type in WARM v16. The v15 PDF on disk is corrupt, so the older PC factor was not checked.
- **Charger Schedule I code and charger weight**: chargers are not listed by name in Schedule I, and no standard per-unit weight was found.
- **Origin of EPA's laptop energy figure**: EPA attributes it to USGS 2006, but the linked USGS fact sheet does not contain it. It is kept only as an EPA quote (D3).
- **GEM 2024 exact release date**: not stated in the PDF text. Cited as "2024".
- **YouGov article publication day**: not in the saved HTML. The fieldwork dates (29 Apr to 4 May 2024) are verified.
- Manufacturer spec-sheet weights were not collected, because the UNU standard table covers every requested category.
