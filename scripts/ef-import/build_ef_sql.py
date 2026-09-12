#!/usr/bin/env python3
"""
Build the SQL that populates ef_datasets / ef_factors / ef_unit_conversions /
ef_haul_definitions from the published factor workbooks.

Python rather than Node because openpyxl reads the .xlsx files without adding a
dependency to the app's package.json — this is a one-off build tool, not app code.

Usage:
    python3 scripts/ef-import/build_ef_sql.py [--src DIR] [--out DIR]

Default source is ../../EF relative to the repo root (where the owner keeps the
workbooks). The generated SQL is applied with the Supabase MCP, one migration per
file; the SQL itself is not committed (it is large and fully derived from these
workbooks plus this script).

Source datasets:
  Global_Grid_EF_Master_*.xlsx    the owner's grid library — country defaults,
                                  history, and sub-national / utility overrides
  ghg-conversion-factors-*.xlsx   UK DEFRA/DESNZ 2025 full set
  ghg-emission-factors-hub-*.xlsx US EPA GHG Emission Factors Hub 2025
  SupplyChainGHGEmissionFactors_*_CO2e_*.csv  US EPA / USEEIO v1.3.0 spend factors

Conventions the schema depends on, applied here:
  * boundary separates what a factor measures. A grid factor (location_based), its
    T&D losses (t_and_d) and its upstream fuel cycle (wtt) are three rows, never
    one, so they cannot be added into Scope 2 by accident.
  * factor_year is parsed for resolution; factor_year_label keeps the publisher's
    own wording ("varies (mainly 2021-22)", "IEA 2025 ed.") verbatim.
  * "kWh (Gross CV)" becomes the plain `kWh` denominator because gross CV is the
    basis DEFRA specifies for company reporting; net CV is kept as `kWh_net`.
  * GWP set is AR5 throughout — both DEFRA 2025 and EPA Hub 2025 publish AR5, and
    mixing AR6 GWPs into AR5 CO2e factors would make an inventory incoherent.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import uuid
from pathlib import Path

import openpyxl

# Stable dataset ids, so re-running the import updates rather than duplicates.
NS = uuid.UUID("6f6d1f3e-0c2a-4b3a-9a9b-1f7d5b8c2a11")


def ds_id(publisher: str, name: str, version: str) -> str:
    return str(uuid.uuid5(NS, f"{publisher}|{name}|{version}"))


# --------------------------------------------------------------------------- #
# SQL helpers
# --------------------------------------------------------------------------- #

def q(v) -> str:
    """One SQL literal."""
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    s = str(v).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


FACTOR_COLS = [
    "dataset_id", "domain", "activity", "subtype", "variant", "activity_key",
    "scope", "category", "boundary", "geo_kind", "geo_code", "geo_label",
    "factor_year", "factor_year_label", "value", "unit_numerator", "unit_denominator",
    "value_co2", "value_ch4", "value_n2o", "gas_basis", "reliability", "status",
    "is_default", "source_name", "source_url", "boundary_note", "notes", "naics_code",
]


def insert_factors(rows: list[dict], chunk: int = 300) -> str:  # kept for ad-hoc SQL dumps
    """Multi-row INSERTs, chunked so no single statement gets unwieldy."""
    out = []
    for i in range(0, len(rows), chunk):
        part = rows[i:i + chunk]
        vals = ",\n  ".join(
            "(" + ", ".join(q(r.get(c)) for c in FACTOR_COLS) + ")" for r in part
        )
        out.append(
            f"insert into public.ef_factors ({', '.join(FACTOR_COLS)}) values\n  {vals}\n"
            "on conflict (dataset_id, domain, activity_key, boundary, geo_code, unit_denominator, factor_year, variant)\n"
            "do update set value = excluded.value, value_co2 = excluded.value_co2,\n"
            "  value_ch4 = excluded.value_ch4, value_n2o = excluded.value_n2o,\n"
            "  activity = excluded.activity, subtype = excluded.subtype,\n"
            "  reliability = excluded.reliability, status = excluded.status,\n"
            "  source_name = excluded.source_name, source_url = excluded.source_url,\n"
            "  boundary_note = excluded.boundary_note, notes = excluded.notes;"
        )
    return "\n\n".join(out)


def insert_dataset(d: dict) -> str:
    cols = ["id", "publisher", "name", "version", "publication_year", "gwp_set",
            "citation", "source_url", "licence", "notes", "precedence"]
    return (
        f"insert into public.ef_datasets ({', '.join(cols)}) values\n  ("
        + ", ".join(q(d.get(c)) for c in cols)
        + ")\non conflict (client_id, publisher, name, version) do update set\n"
        "  publication_year = excluded.publication_year, gwp_set = excluded.gwp_set,\n"
        "  citation = excluded.citation, source_url = excluded.source_url,\n"
        "  notes = excluded.notes, precedence = excluded.precedence;"
    )


# --------------------------------------------------------------------------- #
# Normalisation
# --------------------------------------------------------------------------- #

def slug(s: str) -> str:
    s = str(s).strip().lower()
    s = s.replace("&", " and ").replace("+", " plus ").replace("%", " pct ")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return re.sub(r"_+", "_", s).strip("_")


# DEFRA / EPA unit strings -> the denominator the app matches on.
UNITS = {
    "tonnes": "t", "tonne": "t", "kg": "kg", "litres": "L", "litre": "L",
    "cubic metres": "m3", "cubic metre": "m3", "million litres": "Ml",
    "kwh (net cv)": "kWh_net", "kwh (gross cv)": "kWh", "kwh": "kWh",
    "gj": "GJ", "mwh": "MWh",
    "passenger.km": "pkm", "passenger km": "pkm", "tonne.km": "tkm",
    "km": "km", "miles": "mi", "nights": "night",
    "room per night": "night", "per fte working hour": "fte_hour",
    "kg co2(e)/kwh": "kWh",
}


def unit_of(raw) -> str | None:
    if raw is None:
        return None
    key = str(raw).strip().lower()
    if key in UNITS:
        return UNITS[key]
    # e.g. "kg CO2e/2022 USD, purchaser price"
    if "usd" in key:
        return "USD"
    return str(raw).strip()


# Column-group headings, shortened. DEFRA writes some as a sentence; the slug of that
# sentence is unusable as a lookup value, and the full wording is on the source sheet.
VARIANT_ALIASES = {
    "emissions including only kyoto products": "kyoto",
    "emissions including only non-kyoto products": "non_kyoto",
    "total emissions including non-kyoto products": "total",
    "incineration with energy recovery": "energy_recovery",
    "primary material production": "primary",
    "open-loop source": "open_loop_source",
    "closed-loop source": "closed_loop_source",
    "with rf": "with_rf",
    "without rf": "without_rf",
}


def variant_of(raw) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    key = str(raw).strip().lower()
    return VARIANT_ALIASES.get(key, slug(raw))


def gwp_alias(name: str) -> str:
    """DEFRA writes R410A, EPA and the capture form write R-410A. One canonical slug."""
    return slug(str(name).replace("-", ""))


ISO3_TO_ISO2 = {
    "BHR": "BH", "KWT": "KW", "OMN": "OM", "QAT": "QA", "SAU": "SA", "ARE": "AE",
    "AFG": "AF", "ARM": "AM", "AZE": "AZ", "BGD": "BD", "BTN": "BT", "BRN": "BN",
    "KHM": "KH", "CHN": "CN", "GEO": "GE", "IND": "IN", "IDN": "ID", "IRN": "IR",
    "IRQ": "IQ", "ISR": "IL", "JPN": "JP", "JOR": "JO", "KAZ": "KZ", "KGZ": "KG",
    "LAO": "LA", "LBN": "LB", "MYS": "MY", "MDV": "MV", "MNG": "MN", "MMR": "MM",
    "NPL": "NP", "PRK": "KP", "PAK": "PK", "PSE": "PS", "PHL": "PH", "SGP": "SG",
    "KOR": "KR", "LKA": "LK", "SYR": "SY", "TWN": "TW", "TJK": "TJ", "THA": "TH",
    "TLS": "TL", "TUR": "TR", "TKM": "TM", "UZB": "UZ", "VNM": "VN", "YEM": "YE",
    "ALB": "AL", "AND": "AD", "AUT": "AT", "BLR": "BY", "BEL": "BE", "BIH": "BA",
    "BGR": "BG", "HRV": "HR", "CYP": "CY", "CZE": "CZ", "DNK": "DK", "EST": "EE",
    "FIN": "FI", "FRA": "FR", "DEU": "DE", "GRC": "GR", "HUN": "HU", "ISL": "IS",
    "IRL": "IE", "ITA": "IT", "XKX": "XK", "LVA": "LV", "LIE": "LI", "LTU": "LT",
    "LUX": "LU", "MLT": "MT", "MDA": "MD", "MCO": "MC", "MNE": "ME", "NLD": "NL",
    "MKD": "MK", "NOR": "NO", "POL": "PL", "PRT": "PT", "ROU": "RO", "RUS": "RU",
    "SMR": "SM", "SRB": "RS", "SVK": "SK", "SVN": "SI", "ESP": "ES", "SWE": "SE",
    "CHE": "CH", "UKR": "UA", "GBR": "GB", "VAT": "VA",
    "DZA": "DZ", "AGO": "AO", "BEN": "BJ", "BWA": "BW", "BFA": "BF", "BDI": "BI",
    "CPV": "CV", "CMR": "CM", "CAF": "CF", "TCD": "TD", "COM": "KM", "CIV": "CI",
    "COD": "CD", "DJI": "DJ", "EGY": "EG", "GNQ": "GQ", "ERI": "ER", "SWZ": "SZ",
    "ETH": "ET", "GAB": "GA", "GMB": "GM", "GHA": "GH", "GIN": "GN", "GNB": "GW",
    "KEN": "KE", "LSO": "LS", "LBR": "LR", "LBY": "LY", "MDG": "MG", "MWI": "MW",
    "MLI": "ML", "MRT": "MR", "MUS": "MU", "MAR": "MA", "MOZ": "MZ", "NAM": "NA",
    "NER": "NE", "NGA": "NG", "COG": "CG", "RWA": "RW", "STP": "ST", "SEN": "SN",
    "SYC": "SC", "SLE": "SL", "SOM": "SO", "ZAF": "ZA", "SSD": "SS", "SDN": "SD",
    "TZA": "TZ", "TGO": "TG", "TUN": "TN", "UGA": "UG", "ZMB": "ZM", "ZWE": "ZW",
    "ATG": "AG", "ARG": "AR", "BHS": "BS", "BRB": "BB", "BLZ": "BZ", "BOL": "BO",
    "BRA": "BR", "CAN": "CA", "CHL": "CL", "COL": "CO", "CRI": "CR", "CUB": "CU",
    "DMA": "DM", "DOM": "DO", "ECU": "EC", "SLV": "SV", "GRD": "GD", "GTM": "GT",
    "GUY": "GY", "HTI": "HT", "HND": "HN", "JAM": "JM", "MEX": "MX", "NIC": "NI",
    "PAN": "PA", "PRY": "PY", "PER": "PE", "KNA": "KN", "LCA": "LC", "VCT": "VC",
    "SUR": "SR", "TTO": "TT", "USA": "US", "URY": "UY", "VEN": "VE",
    "AUS": "AU", "FJI": "FJ", "KIR": "KI", "MHL": "MH", "FSM": "FM", "NRU": "NR",
    "NZL": "NZ", "PLW": "PW", "PNG": "PG", "WSM": "WS", "SLB": "SB", "TON": "TO",
    "TUV": "TV", "VUT": "VU",
}

# Sub-national grids and utilities in the Grid Master's override sheet.
GRID_CODES = {
    ("United Arab Emirates", "Dubai / DEWA"): ("AE-DEWA", "utility"),
    ("United Arab Emirates", "Abu Dhabi / EWEC"): ("AE-EWEC", "utility"),
    ("Malaysia", "Peninsular"): ("MY-PENINSULAR", "grid"),
    ("Malaysia", "Sabah"): ("MY-SABAH", "grid"),
    ("Malaysia", "Sarawak"): ("MY-SARAWAK", "grid"),
    ("Indonesia", "Jamali grid"): ("ID-JAMALI", "grid"),
    ("Australia", "NSW + ACT"): ("AU-NSW-ACT", "subdivision"),
    ("Australia", "Victoria"): ("AU-VIC", "subdivision"),
    ("Australia", "Queensland"): ("AU-QLD", "subdivision"),
    ("Australia", "South Australia"): ("AU-SA", "subdivision"),
    ("Australia", "WA – SWIS"): ("AU-WA-SWIS", "grid"),
    ("Australia", "WA – NWIS"): ("AU-WA-NWIS", "grid"),
    ("Australia", "Tasmania"): ("AU-TAS", "subdivision"),
    ("Australia", "NT – DKIS"): ("AU-NT-DKIS", "grid"),
    ("Canada", "British Columbia"): ("CA-BC", "subdivision"),
    ("Canada", "Alberta"): ("CA-AB", "subdivision"),
    ("Canada", "Saskatchewan"): ("CA-SK", "subdivision"),
    ("Canada", "Manitoba"): ("CA-MB", "subdivision"),
    ("Canada", "Ontario"): ("CA-ON", "subdivision"),
    ("Canada", "Quebec"): ("CA-QC", "subdivision"),
    ("Canada", "New Brunswick"): ("CA-NB", "subdivision"),
    ("Canada", "Nova Scotia"): ("CA-NS", "subdivision"),
    ("Canada", "Prince Edward Island"): ("CA-PE", "subdivision"),
    ("Canada", "Newfoundland & Labrador"): ("CA-NL", "subdivision"),
    ("Canada", "Yukon"): ("CA-YT", "subdivision"),
    ("Canada", "Northwest Territories"): ("CA-NT", "subdivision"),
    ("Canada", "Nunavut"): ("CA-NU", "subdivision"),
    ("Pakistan", "Karachi / K-Electric"): ("PK-KE", "utility"),
}

# Grade -> row status. The Grid Master is explicit that B-/C/Hold are usable only
# with their warning attached, never as equal-confidence production factors.
GRADE_STATUS = {"A+": "production", "A": "production", "A-": "production",
                "B+": "production", "B": "production", "B-": "provisional",
                "C": "provisional", "Hold": "hold"}


def parse_year(raw) -> tuple[int | None, str | None]:
    """Grid Master years read '2024', 'IEA 2025 ed.', 'FY2024-25', 'varies (mainly 2021-22)'."""
    if raw is None:
        return None, None
    label = str(raw).strip()
    if not label or label.upper() == "N/A":
        return None, label or None
    years = [int(m.group(0)) for m in re.finditer(r"(?:19|20)\d{2}", label)]
    return (max(years) if years else None), label


# --------------------------------------------------------------------------- #
# Source 1 — the owner's Global Grid EF Master
# --------------------------------------------------------------------------- #

GRID_DS = {
    "id": ds_id("Hotel Optimizer", "Global Grid EF Master", "2026-09-12"),
    "publisher": "Hotel Optimizer",
    "name": "Global Grid EF Master",
    "version": "2026-09-12",
    "publication_year": 2026,
    "gwp_set": "mixed",
    "citation": "Global Electricity Emission Factor Master — consolidated national, sub-national and utility grid factors with reliability grading.",
    "licence": "Internal",
    "notes": "Location-based Scope 2 only. Grid EF, T&D and upstream are separate boundaries and must not be summed into Scope 2. Market-based factors are excluded by design.",
    "precedence": 10,
}


def grid_rows(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out: list[dict] = []

    def sheet(name):
        ws = wb[name]
        it = ws.iter_rows(values_only=True)
        hdr = list(next(it))
        return [dict(zip(hdr, r)) for r in it if any(c is not None for c in r)]

    def emit(*, geo_kind, geo_code, geo_label, year_raw, grid, td, upstream, cat3,
             reliability, status, source_name, source_url, note, gas_basis, is_default):
        fy, fy_label = parse_year(year_raw)
        rel = (reliability or "").strip() or None
        st = status or GRADE_STATUS.get(rel or "", "production")
        base = dict(
            dataset_id=GRID_DS["id"], domain="electricity", activity="Grid electricity",
            subtype=None, variant=None, activity_key="electricity_grid",
            geo_kind=geo_kind, geo_code=geo_code, geo_label=geo_label,
            factor_year=fy, factor_year_label=fy_label,
            unit_numerator="kgCO2e", unit_denominator="kWh",
            gas_basis=gas_basis or "CO2e", reliability=rel, status=st,
            is_default=is_default, source_name=source_name, source_url=source_url,
            boundary_note=note,
        )
        if isinstance(grid, (int, float)):
            out.append({**base, "scope": 2, "category": None, "boundary": "location_based",
                        "value": float(grid)})
        if isinstance(td, (int, float)):
            out.append({**base, "scope": 3, "category": "cat3", "boundary": "t_and_d",
                        "value": float(td),
                        "notes": "Grid transmission and distribution losses. Scope 3 Cat 3 — never added into Scope 2."})
        if isinstance(upstream, (int, float)):
            out.append({**base, "scope": 3, "category": "cat3", "boundary": "wtt",
                        "value": float(upstream),
                        "notes": "Upstream fuel cycle for purchased electricity. Scope 3 Cat 3."})
        # A combined Cat.3 factor is stored only when the split is unavailable, so the
        # two can never be double counted.
        if isinstance(cat3, (int, float)) and not isinstance(td, (int, float)) \
           and not isinstance(upstream, (int, float)):
            out.append({**base, "scope": 3, "category": "cat3", "boundary": "wtt",
                        "variant": "combined_td_and_upstream", "value": float(cat3),
                        "notes": "Combined T&D + upstream, as published; the split was not available."})

    missing_iso = set()
    for r in sheet("Current Defaults"):
        iso3 = (r.get("ISO3") or "").strip()
        iso2 = ISO3_TO_ISO2.get(iso3)
        if not iso2:
            missing_iso.add(f"{iso3} ({r.get('Country')})")
            continue
        emit(geo_kind="country", geo_code=iso2, geo_label=r.get("Country"),
             year_raw=r.get("Factor Year"), grid=r.get("Recommended Grid EF"),
             td=r.get("T&D EF"), upstream=r.get("Upstream EF"),
             cat3=r.get("Cat.3 Electricity EF"), reliability=r.get("Reliability"),
             status=None, source_name=r.get("Primary Source"), source_url=r.get("Source URL"),
             note=r.get("Grid EF Boundary"), gas_basis=r.get("Gas Basis"), is_default=True)
    if missing_iso:
        sys.exit(f"ISO3 codes with no ISO2 mapping: {sorted(missing_iso)}")

    name_to_iso2 = {}
    for r in sheet("Current Defaults"):
        iso2 = ISO3_TO_ISO2.get((r.get("ISO3") or "").strip())
        if iso2:
            name_to_iso2[str(r.get("Country")).strip()] = iso2

    for r in sheet("Historical EF"):
        country = str(r.get("Country") or "").strip()
        geo = str(r.get("Geography / Grid") or "National").strip()
        code, kind = GRID_CODES.get((country, geo), (name_to_iso2.get(country), "country"))
        if not code:
            continue
        emit(geo_kind=kind, geo_code=code, geo_label=f"{country} — {geo}",
             year_raw=r.get("Factor Year"), grid=r.get("Grid EF"), td=r.get("T&D EF"),
             upstream=r.get("Upstream EF"), cat3=r.get("Calculated Cat.3 EF"),
             reliability=r.get("Reliability"), status=None,
             source_name=r.get("Primary Source"), source_url=r.get("Source URL"),
             note=r.get("Boundary"), gas_basis=r.get("Gas Basis"), is_default=True)

    for r in sheet("Regional Overrides"):
        country = str(r.get("Country") or "").strip()
        geo = str(r.get("Geography / Grid") or "").strip()
        code, kind = GRID_CODES.get((country, geo), (None, None))
        if not code:
            sys.stderr.write(f"  ! no grid code for override {country} / {geo}\n")
            continue
        emit(geo_kind=kind, geo_code=code, geo_label=f"{country} — {geo}",
             year_raw=r.get("Factor Year"), grid=r.get("Grid EF"), td=r.get("T&D EF"),
             upstream=r.get("Upstream EF"), cat3=r.get("Calculated Cat.3 EF"),
             reliability=r.get("Reliability"), status=None,
             source_name=r.get("Primary Source"), source_url=r.get("Source URL"),
             note=r.get("Notes"), gas_basis="CO2e", is_default=True)

    wb.close()

    # Historical EF and Regional Overrides overlap: the same utility-year appears in
    # both. Keep the later occurrence, which is the override sheet — that is the row
    # the methodology says takes priority when the site grid is known.
    dedup: dict[tuple, dict] = {}
    for r in out:
        dedup[(r["activity_key"], r["boundary"], r["geo_code"],
               r["unit_denominator"], r["factor_year"], r.get("variant"))] = r
    return list(dedup.values())


# --------------------------------------------------------------------------- #
# Source 2 — UK DEFRA 2025 full set
# --------------------------------------------------------------------------- #

DEFRA_DS = {
    "id": ds_id("UK DESNZ/DEFRA", "GHG Conversion Factors for Company Reporting", "2025 v1"),
    "publisher": "UK DESNZ/DEFRA",
    "name": "GHG Conversion Factors for Company Reporting",
    "version": "2025 v1",
    "publication_year": 2025,
    "gwp_set": "AR5",
    "citation": "UK Government GHG Conversion Factors for Company Reporting, 2025, full set.",
    "source_url": "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    "licence": "Open Government Licence v3.0",
    "notes": "Gross CV basis is stored as the plain kWh denominator; net CV is kept separately as kWh_net. The 2025 set publishes no overseas electricity factors — use the Grid Master for non-UK grids.",
    "precedence": 20,
}

# sheet -> (domain, scope, category, boundary, note)
DEFRA_SHEETS: dict[str, tuple] = {
    "Fuels":                         ("fuel",        1, None,   "combustion", None),
    "Bioenergy":                     ("bioenergy",   1, None,   "combustion", "Fossil portion only; the biogenic CO2 is in 'Outside of scopes'."),
    "Refrigerant & other":           ("refrigerant", 1, None,   "gwp",        "100-year GWP, IPCC AR5."),
    "Passenger vehicles":            ("vehicle",     1, None,   "combustion", "Vehicles owned or controlled by the reporting organisation."),
    "Delivery vehicles":             ("vehicle",     1, None,   "combustion", "Vans and HGVs owned or controlled by the reporting organisation."),
    "UK electricity":                ("electricity", 2, None,   "location_based", "UK grid only."),
    "Heat and steam":                ("heat",        2, None,   "location_based", None),
    "WTT- fuels":                    ("fuel",        3, "cat3", "wtt",        None),
    "WTT- bioenergy":                ("bioenergy",   3, "cat3", "wtt",        None),
    "Transmission and distribution": ("electricity", 3, "cat3", "t_and_d",    "Grid losses. Never added into Scope 2."),
    "WTT- UK electricity":           ("electricity", 3, "cat3", "wtt",        None),
    "WTT- heat and steam":           ("heat",        3, "cat3", "wtt",        None),
    "Water supply":                  ("water",       3, "cat1", "lifecycle",  "Mains supply as a purchased upstream service."),
    "Water treatment":               ("water",       3, "cat1", "lifecycle",  "Water returned to the sewer."),
    "Material use":                  ("material",    3, "cat1", "lifecycle",  "Cradle-to-gate for procured materials."),
    "Waste disposal":                ("waste",       3, "cat5", "disposal",   "End-of-life treatment. Avoided virgin production is not credited."),
    "Business travel- air":          ("travel",      3, "cat6", "combustion", None),
    "WTT- business travel- air":     ("travel",      3, "cat6", "wtt",        "Upstream of travel fuel; DEFRA reports this within Cat 6."),
    "Business travel- sea":          ("travel",      3, "cat6", "combustion", None),
    "WTT- business travel- sea":     ("travel",      3, "cat6", "wtt",        "Upstream of travel fuel; DEFRA reports this within Cat 6."),
    "Business travel- land":         ("travel",      3, "cat6", "combustion", None),
    "WTT- pass vehs & travel- land": ("travel",      3, "cat6", "wtt",        "Report under Cat 3 instead when the fuel was bought for a company-owned vehicle."),
    "Freighting goods":              ("freight",     3, "cat4", "combustion", None),
    "WTT- delivery vehs & freight":  ("freight",     3, "cat4", "wtt",        None),
    "Hotel stay":                    ("hotel_stay",  3, "cat6", "lifecycle",  "Per room-night for stays outside the reporting organisation's own estate."),
    "Homeworking":                   ("homeworking", 3, "cat7", "lifecycle",  None),
    "Outside of scopes":             ("other",       3, None,   "out_of_scope", "Biogenic CO2 — disclosed outside the scopes, never netted into them."),
}

# Countries named in DEFRA's Hotel stay sheet -> ISO2.
HOTEL_COUNTRIES = {
    "UK": "GB", "UK (London)": "GB-LND", "Australia": "AU", "Austria": "AT",
    "Argentina": "AR", "Belgium": "BE", "Brazil": "BR", "Canada": "CA", "Chile": "CL",
    "China": "CN", "Colombia": "CO", "Czech Republic": "CZ", "Egypt": "EG", "Fiji": "FJ",
    "Finland": "FI", "France": "FR", "Germany": "DE", "Greece": "GR", "Hong Kong": "HK",
    "India": "IN", "Indonesia": "ID", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
    "Japan": "JP", "Jordan": "JO", "Malaysia": "MY", "Maldives": "MV", "Mexico": "MX",
    "Netherlands": "NL", "New Zealand": "NZ", "Norway": "NO", "Oman": "OM", "Panama": "PA",
    "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
    "Romania": "RO", "Russia": "RU", "Saudi Arabia": "SA", "Singapore": "SG",
    "Slovakia": "SK", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES",
    "Sri Lanka": "LK", "Sweden": "SE", "Switzerland": "CH", "Taiwan": "TW",
    "Thailand": "TH", "Turkey": "TR", "United Arab Emirates": "AE", "USA": "US",
    "Vietnam": "VN",
}


def defra_rows(path: Path) -> tuple[list[dict], list[dict], list[dict]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    factors: list[dict] = []
    conversions: list[dict] = []
    hauls: list[dict] = []

    for sheet_name, (domain, scope, category, boundary, snote) in DEFRA_SHEETS.items():
        ws = wb[sheet_name]
        grid = [list(r) for r in ws.iter_rows(values_only=True)]
        # Every table in the sheet starts with an "Activity" header row that also
        # carries at least one "kg CO2e" column.
        heads = []
        for i, r in enumerate(grid):
            txt = [str(c).strip().lower() for c in r if c is not None]
            if txt and txt[0] == "activity" and any("kg co2e" in t for t in txt):
                heads.append(i)
        if not heads:
            sys.stderr.write(f"  ! {sheet_name}: no table found\n")
            continue

        seen_keys: dict[tuple, int] = {}
        for hi in heads:
            hdr = [None if c is None else str(c).strip() for c in grid[hi]]
            parent = [None if c is None else str(c).strip() for c in grid[hi - 1]] if hi else []
            low = [(h or "").lower() for h in hdr]
            # Column roles
            i_unit = next((j for j, h in enumerate(low) if h in ("unit", "units")), None)
            i_year = next((j for j, h in enumerate(low) if h == "year"), None)
            # The second label column: Fuel / Type / Waste type / Material / Country / Haul
            label_cols = [j for j, h in enumerate(low)
                          if h in ("fuel", "type", "waste type", "material", "country", "haul", "emission", "class")]
            co2e_cols = [j for j, h in enumerate(low) if h == "kg co2e"]
            comp = {"co2": [j for j, h in enumerate(low) if "of co2 per unit" in h],
                    "ch4": [j for j, h in enumerate(low) if "of ch4 per unit" in h],
                    "n2o": [j for j, h in enumerate(low) if "of n2o per unit" in h]}
            if i_unit is None or not co2e_cols:
                continue

            stop = next((h for h in heads if h > hi), len(grid))
            activity = None
            carried: dict[int, str] = {}
            for r in grid[hi + 1:stop]:
                if all(c is None for c in r):
                    continue
                if r[0] is not None and str(r[0]).strip():
                    txt0 = str(r[0]).strip()
                    # Skip the FAQ prose that follows every DEFRA table
                    if len(txt0) > 90 or txt0.lower().startswith(("faq", "how do i", "i am ", "for ", "please ", "this ")):
                        continue
                    activity = txt0
                # Second-level labels carry down when merged
                for j in label_cols:
                    if j < len(r) and r[j] is not None and str(r[j]).strip():
                        carried[j] = str(r[j]).strip()
                unit = unit_of(r[i_unit]) if i_unit < len(r) else None
                if not unit or not activity:
                    continue
                fy, fy_label = (None, None)
                if i_year is not None and i_year < len(r):
                    fy, fy_label = parse_year(r[i_year])
                if fy is None:
                    fy, fy_label = 2025, "2025"

                subtype = " / ".join(carried[j] for j in sorted(carried) if j in carried) or None
                for j in co2e_cols:
                    if j >= len(r) or not isinstance(r[j], (int, float)):
                        continue
                    variant = None
                    if parent:
                        # the column-group label sits above the first column of its block
                        for k in range(j, -1, -1):
                            if k < len(parent) and parent[k]:
                                variant = variant_of(parent[k])
                                break
                    key_base = slug(subtype or activity)
                    if domain == "refrigerant":
                        key_base = gwp_alias(subtype or activity)
                    key = key_base
                    sig = (key, variant, unit, fy)
                    if sig in seen_keys:
                        key = f"{slug(activity)}_{key_base}"
                        sig = (key, variant, unit, fy)
                        if sig in seen_keys:
                            continue  # a genuine duplicate line in the sheet
                    seen_keys[sig] = 1

                    geo_kind, geo_code, geo_label = "global", "GLOBAL", None
                    if domain == "hotel_stay":
                        c = HOTEL_COUNTRIES.get(subtype or "")
                        if c:
                            geo_kind, geo_code, geo_label = ("subdivision" if "-" in c else "country"), c, subtype
                        else:
                            continue  # a country listed with no published value
                    elif domain in ("electricity", "heat") and sheet_name.endswith("electricity"):
                        geo_kind, geo_code, geo_label = "country", "GB", "United Kingdom"
                    elif sheet_name == "Transmission and distribution" and "UK" in str(subtype or ""):
                        geo_kind, geo_code, geo_label = "country", "GB", "United Kingdom"

                    def comp_at(kind):
                        cols = comp[kind]
                        near = [c for c in cols if c > j and c <= j + 3]
                        return r[near[0]] if near and near[0] < len(r) and isinstance(r[near[0]], (int, float)) else None

                    factors.append(dict(
                        dataset_id=DEFRA_DS["id"], domain=domain, activity=activity,
                        subtype=subtype, variant=variant, activity_key=key,
                        scope=scope, category=category, boundary=boundary,
                        geo_kind=geo_kind, geo_code=geo_code, geo_label=geo_label,
                        factor_year=fy, factor_year_label=fy_label,
                        value=float(r[j]), unit_numerator="kgCO2e", unit_denominator=unit,
                        value_co2=comp_at("co2"), value_ch4=comp_at("ch4"), value_n2o=comp_at("n2o"),
                        gas_basis="CO2e", reliability="A+", status="production", is_default=True,
                        source_name="UK DESNZ/DEFRA 2025", source_url=DEFRA_DS["source_url"],
                        boundary_note=snote,
                        notes=None if unit != "kWh_net" else "Net calorific value basis.",
                    ))

    # Fuel properties -> unit conversions (litres/kg <-> kWh needs a fuel-specific CV)
    ws = wb["Fuel properties"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    for r in rows:
        fuel = r[1] if len(r) > 1 else None
        if not fuel or not isinstance(r[2] if len(r) > 2 else None, (int, float)):
            continue
        year = int(r[2])
        vals = {"net_cv_gj_t": r[3], "gross_cv_gj_t": r[4], "density_kg_m3": r[5],
                "litres_per_tonne": r[6], "net_kwh_kg": r[7], "gross_kwh_kg": r[8],
                "net_kwh_l": r[9], "gross_kwh_l": r[10]}
        add = [
            ("kg", "kWh", vals["gross_kwh_kg"], "gross_cv"),
            ("kg", "kWh_net", vals["net_kwh_kg"], "net_cv"),
            ("L", "kWh", vals["gross_kwh_l"], "gross_cv"),
            ("L", "kWh_net", vals["net_kwh_l"], "net_cv"),
            ("t", "L", vals["litres_per_tonne"], "density"),
            ("m3", "kg", vals["density_kg_m3"], "density"),
        ]
        for frm, to, v, basis in add:
            if isinstance(v, (int, float)) and v:
                conversions.append(dict(from_unit=frm, to_unit=to, factor=float(v),
                                        fuel=str(fuel).strip(), basis=basis, year=year,
                                        notes="UK DESNZ/DEFRA 2025 fuel properties."))

    # Plain unit conversions
    for frm, to, f in [("t", "kg", 1000), ("Ml", "m3", 1000), ("L", "m3", 0.001),
                       ("MWh", "kWh", 1000), ("GJ", "kWh", 277.777778), ("mi", "km", 1.609344),
                       ("lb", "kg", 0.45359237), ("short_ton", "t", 0.90718474)]:
        conversions.append(dict(from_unit=frm, to_unit=to, factor=f, fuel=None, basis=None,
                                year=None, notes="Standard unit conversion."))

    # Haul definitions
    ws = wb["Haul definition"]
    for r in ws.iter_rows(values_only=True):
        if r[0] and r[1] and r[2] and str(r[2]).strip() in ("Domestic", "Short Haul", "Long Haul", "International"):
            hauls.append(dict(dataset_id=DEFRA_DS["id"], territory=str(r[0]).strip(),
                              iso3=str(r[1]).strip(), haul=str(r[2]).strip()))

    wb.close()
    return factors, conversions, hauls


# --------------------------------------------------------------------------- #
# Source 3 — US EPA GHG Emission Factors Hub 2025 (eGRID + GWP)
# --------------------------------------------------------------------------- #

EPA_DS = {
    "id": ds_id("US EPA", "GHG Emission Factors Hub", "2025"),
    "publisher": "US EPA",
    "name": "GHG Emission Factors Hub",
    "version": "2025",
    "publication_year": 2025,
    "gwp_set": "AR5",
    "citation": "US EPA Emission Factors for Greenhouse Gas Inventories, January 2025.",
    "source_url": "https://www.epa.gov/climateleadership/ghg-emission-factors-hub",
    "licence": "US Government work",
    "notes": "Imported: Table 6 eGRID subregions (converted from lb/MWh to kgCO2e/kWh, with the grid gross loss rate as a separate t_and_d row) and Tables 11-12 GWPs. The US stationary and mobile combustion tables are not loaded — DEFRA covers those activities and no property reports in US units yet.",
    "precedence": 20,
}

LB_TO_KG = 0.45359237
AR5 = {"CH4": 28.0, "N2O": 265.0}


def epa_rows(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = [list(r) for r in wb["Emission Factors Hub"].iter_rows(values_only=True)]
    out: list[dict] = []

    # ---- Table 6: eGRID subregions (lb/MWh -> kgCO2e/kWh) ----
    for r in rows[338:406]:
        acro = r[2] if len(r) > 2 else None
        name = r[3] if len(r) > 3 else None
        if not acro or not isinstance(r[4] if len(r) > 4 else None, (int, float)):
            continue
        co2, ch4, n2o = r[4], r[5], r[6]
        loss = r[10] if len(r) > 10 else None
        # lb/MWh -> kg/kWh, then CH4/N2O to CO2e on AR5
        kg_kwh = lambda lb: (float(lb) * LB_TO_KG) / 1000.0
        co2e = kg_kwh(co2) + kg_kwh(ch4 or 0) * AR5["CH4"] + kg_kwh(n2o or 0) * AR5["N2O"]
        base = dict(
            dataset_id=EPA_DS["id"], domain="electricity", activity="Grid electricity",
            subtype=str(name).strip() if name else None, variant=None,
            activity_key="electricity_grid", geo_kind="grid",
            geo_code=f"US-{str(acro).strip()}", geo_label=f"United States — {name}",
            factor_year=2023, factor_year_label="eGRID2023 (EPA Hub 2025)",
            unit_numerator="kgCO2e", unit_denominator="kWh", gas_basis="CO2e",
            reliability="A+", status="production", is_default=True,
            source_name="US EPA GHG Emission Factors Hub 2025, Table 6",
            source_url=EPA_DS["source_url"],
        )
        out.append({**base, "scope": 2, "category": None, "boundary": "location_based",
                    "value": round(co2e, 8), "value_co2": round(kg_kwh(co2), 8),
                    "value_ch4": round(kg_kwh(ch4 or 0) * AR5["CH4"], 10),
                    "value_n2o": round(kg_kwh(n2o or 0) * AR5["N2O"], 10),
                    "boundary_note": "Total output rate, location-based."})
        if isinstance(loss, (int, float)) and loss:
            # A loss rate of L means delivered kWh carry L/(1-L) of extra generation.
            grossed = co2e * (float(loss) / (1.0 - float(loss)))
            out.append({**base, "scope": 3, "category": "cat3", "boundary": "t_and_d",
                        "value": round(grossed, 8),
                        "boundary_note": f"Derived from the published grid gross loss rate of {float(loss) * 100:.1f}%.",
                        "notes": "Scope 3 Cat 3 grid losses. Never added into Scope 2."})

    # ---- Tables 11 and 12: GWPs, pure gases then ASHRAE blends ----
    def gwp_block(lo, hi, kind):
        for r in rows[lo:hi]:
            name = r[2] if len(r) > 2 else None
            val = r[3] if len(r) > 3 else None
            if kind == "blend":
                name, val = (r[2] if len(r) > 2 else None), (r[3] if len(r) > 3 else None)
            if not name or not isinstance(val, (int, float)):
                continue
            label = str(name).strip()
            if label.lower().startswith(("ashrae", "industrial", "source", "note")):
                continue
            formula = str(r[3]).strip() if kind == "pure" and len(r) > 3 and isinstance(r[3], str) else None
            gwp = r[4] if kind == "pure" and len(r) > 4 and isinstance(r[4], (int, float)) else val
            if not isinstance(gwp, (int, float)):
                continue
            out.append(dict(
                dataset_id=EPA_DS["id"], domain="refrigerant",
                activity=label, subtype=formula, variant=None,
                activity_key=gwp_alias(label), scope=1, category=None, boundary="gwp",
                geo_kind="global", geo_code="GLOBAL", geo_label=None,
                factor_year=2025, factor_year_label="IPCC AR5 (EPA Hub 2025)",
                value=float(gwp), unit_numerator="kgCO2e", unit_denominator="kg",
                gas_basis="CO2e", reliability="A+", status="production",
                is_default=False,  # DEFRA's refrigerant sheet is the primary source
                source_name=f"US EPA GHG Emission Factors Hub 2025, Table {11 if kind == 'pure' else 12}",
                source_url=EPA_DS["source_url"],
                boundary_note="100-year GWP, IPCC AR5.",
                notes="ASHRAE blend." if kind == "blend" else None,
            ))

    gwp_block(522, 556, "pure")
    gwp_block(559, 591, "blend")
    wb.close()
    return out


# --------------------------------------------------------------------------- #
# Source 4 — US EPA / USEEIO supply-chain spend factors
# --------------------------------------------------------------------------- #

USEEIO_DS = {
    "id": ds_id("US EPA", "Supply Chain GHG Emission Factors", "v1.3.0 NAICS USD2022"),
    "publisher": "US EPA",
    "name": "Supply Chain GHG Emission Factors",
    "version": "v1.3.0 NAICS USD2022",
    "publication_year": 2024,
    "gwp_set": "AR5",
    "citation": "US EPA Supply Chain GHG Emission Factors v1.3.0, by NAICS-6, kgCO2e per 2022 USD.",
    "source_url": "https://catalog.data.gov/dataset/supply-chain-greenhouse-gas-emission-factors-v1-3-by-naics-6",
    "licence": "US Government work",
    "notes": "The with-margins column is loaded: invoice spend is a purchaser price, which includes wholesale, retail and transport margins. USD 2022 basis — spend in another currency or year needs deflating and converting first.",
    "precedence": 30,
}


def useeio_rows(path: Path) -> list[dict]:
    out: list[dict] = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            code = (row.get("2017 NAICS Code") or "").strip()
            title = (row.get("2017 NAICS Title") or "").strip()
            with_m = row.get("Supply Chain Emission Factors with Margins")
            if not code or not with_m:
                continue
            try:
                val = float(with_m)
            except ValueError:
                continue
            out.append(dict(
                dataset_id=USEEIO_DS["id"], domain="spend", activity=title,
                subtype=None, variant=None, activity_key=f"naics_{code}",
                scope=3, category="cat1", boundary="lifecycle",
                geo_kind="country", geo_code="US", geo_label="United States",
                factor_year=2022, factor_year_label="USD 2022",
                value=val, unit_numerator="kgCO2e", unit_denominator="USD",
                gas_basis="CO2e", reliability="B+", status="production", is_default=True,
                source_name="US EPA Supply Chain GHG Emission Factors v1.3.0",
                source_url=USEEIO_DS["source_url"],
                boundary_note="Cradle-to-gate, purchaser price (with margins).",
                notes="Environmentally-extended input-output factor. US economy basis; use only where a supplier-specific or product-average factor is unavailable.",
                naics_code=code,
            ))
    return out


# --------------------------------------------------------------------------- #

def main() -> None:
    root = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(root.parent / "EF"))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent / "out"))
    args = ap.parse_args()

    src, out = Path(args.src), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    def one(pattern: str) -> Path:
        hits = sorted(src.glob(pattern))
        if not hits:
            sys.exit(f"no file matching {pattern} in {src}")
        return hits[0]

    print("Grid Master …")
    g = grid_rows(one("Global_Grid_EF_Master_*.xlsx"))
    print(f"  {len(g)} factor rows")

    print("DEFRA 2025 …")
    d, conv, haul = defra_rows(one("ghg-conversion-factors-*.xlsx"))
    for c in conv:
        c["dataset_id"] = DEFRA_DS["id"]
    print(f"  {len(d)} factors, {len(conv)} conversions, {len(haul)} haul rows")

    print("EPA Hub …")
    e = epa_rows(one("ghg-emission-factors-hub-*.xlsx"))
    print("USEEIO …")
    u = useeio_rows(one("SupplyChainGHGEmissionFactors_*_CO2e_*.csv"))
    print(f"  EPA {len(e)} rows, USEEIO {len(u)} rows")

    # The loader (load.mjs) upserts this through the REST API as a super admin, so the
    # rows go in under the same RLS the app runs on. Reference data of this size does not
    # belong inline in a migration.
    (out / "ef-library.json").write_text(json.dumps({
        "datasets": [GRID_DS, DEFRA_DS, EPA_DS, USEEIO_DS],
        "factors": g + d + e + u,
        "conversions": conv,
        "hauls": haul,
    }, indent=None, allow_nan=False))

    # Quality scan — anything that looks like the parser picked up prose instead of a
    # factor, or produced a key nothing could resolve.
    allrows = g + d + e + u
    # NAICS titles are legitimately long, so the prose check does not apply to them.
    suspect = [r for r in allrows
               if (r["domain"] != "spend" and len(str(r["activity"])) > 70)
               or len(r["activity_key"]) > 64 or not r["activity_key"]]
    if suspect:
        print(f"\n!! {len(suspect)} suspect rows:")
        for r in suspect[:10]:
            print(f"   {r['domain']:12} {r['activity_key'][:40]:40} {str(r['activity'])[:60]}")
    dupes: dict[tuple, int] = {}
    for r in allrows:
        k = (r["dataset_id"], r["domain"], r["activity_key"], r["boundary"], r["geo_code"],
             r["unit_denominator"], r["factor_year"], r.get("variant"))
        dupes[k] = dupes.get(k, 0) + 1
    clashing = {k: n for k, n in dupes.items() if n > 1}
    if clashing:
        print(f"\n!! {len(clashing)} colliding signatures (last write wins on insert):")
        for k in list(clashing)[:6]:
            print(f"   {k[1]:12} {k[2][:30]:30} {k[3]:14} {k[4]:12} {k[6]} {k[7]}")

    total = len(allrows)
    print(f"\nTotal factor rows: {total}")
    for f in sorted(out.glob("*.json")):
        print(f"  {f.name:28} {f.stat().st_size / 1024:8.0f} KB")


if __name__ == "__main__":
    main()
