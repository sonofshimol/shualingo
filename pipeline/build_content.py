#!/usr/bin/env python3
"""Build content/words.json for Shualingo.

Sources (downloaded once, cached in pipeline/sources/):
  * DCC Latin Core Vocabulary (CSV)      -> frequency rank, English definition, part of speech
  * kaikki.org Wiktionary extract (JSONL) -> forms, classical IPA, etymology, Romance descendants
  * pipeline/curated/words.json           -> Hebrew meanings, English/Hebrew relatives, expressions

Run:  python3 pipeline/build_content.py           (uses cache when present)
      python3 pipeline/build_content.py --refresh (re-download everything)

Standard library only. The app never runs this; it only reads the JSON it produces.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "pipeline" / "sources"
CURATED = ROOT / "pipeline" / "curated" / "words.json"
OUT = ROOT / "content" / "words.json"

DCC_URL = "https://dcc.dickinson.edu/latin-core-list.csv?page&_format=csv"
KAIKKI_URL = "https://kaikki.org/dictionary/Latin/meaning/{a}/{ab}/{word}.jsonl"
USER_AGENT = "shualingo-content-pipeline/1.0 (free educational app)"

ELEMENTS = {"terra", "aqua", "aer", "ignis", "aether"}
POS_VALUES = {"noun", "verb", "adj", "pron", "conj", "adv", "prep"}
ROMANCE_LANGS = ["es", "it", "fr", "pt", "ro", "ca"]
MAX_PER_LANG = 3

CASES = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc",
         "ablative": "abl", "vocative": "voc"}
NUMBERS = {"singular": "sg", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}


# ---------------------------------------------------------------- utilities

def clean_latin(text: str) -> str:
    """Normalise a Latin word from Wiktionary.

    A vowel marked both long and short (e.g. 'egō̆', 'mihī̆') may be either; textbooks
    print it plain, so both marks are dropped. A lone breve is dropped too.
    """
    decomposed = unicodedata.normalize("NFD", text)
    out: list[str] = []
    i = 0
    while i < len(decomposed):
        ch = decomposed[i]
        marks = []
        j = i + 1
        while j < len(decomposed) and unicodedata.combining(decomposed[j]):
            marks.append(decomposed[j])
            j += 1
        if "̆" in marks:  # breve present -> anceps or short: print plain
            marks = [m for m in marks if m not in ("̆", "̄")]
        out.append(ch + "".join(marks))
        i = j
    return unicodedata.normalize("NFC", "".join(out))


def strip_macrons(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def fetch(url: str, dest: Path, refresh: bool) -> Path:
    if dest.exists() and not refresh:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                dest.write_bytes(response.read())
            time.sleep(0.3)  # be polite to free services
            return dest
        except Exception as error:  # noqa: BLE001 - report and retry any network error
            wait = 2 ** (attempt + 1)
            print(f"  ! {url}: {error} (retry in {wait}s)", file=sys.stderr)
            time.sleep(wait)
    raise SystemExit(f"Could not download {url}")


# ---------------------------------------------------------------- DCC

def load_dcc(refresh: bool) -> dict[str, dict]:
    path = fetch(DCC_URL, SOURCES / "dcc_core.csv", refresh)
    with path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return {row["Headword"].strip(): row for row in rows}


# ---------------------------------------------------------------- kaikki

def kaikki_entries(lemma: str, refresh: bool) -> list[dict]:
    word = strip_macrons(lemma).lower()
    url = KAIKKI_URL.format(a=word[0], ab=word[:2], word=word)
    path = fetch(url, SOURCES / "kaikki" / f"{word}.jsonl", refresh)
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def pick_entry(entries: list[dict], pos: str, lemma: str, nth: int = 0) -> dict:
    """The nth entry with the wanted part of speech that is a real lemma (not only 'form of').

    nth (curated "kaikki_nth") picks between homographs, e.g. liber 'book' vs Līber the god.
    """
    for entry in entries:
        if entry.get("pos") != pos:
            continue
        senses = entry.get("senses", [])
        if senses and all("form_of" in s or "alt_of" in s for s in senses):
            continue
        if nth > 0:
            nth -= 1
            continue
        return entry
    raise SystemExit(f"kaikki has no '{pos}' lemma entry for '{lemma}'")


def canonical(entry: dict) -> str:
    for form in entry.get("forms", []):
        if "canonical" in form.get("tags", []):
            return clean_latin(form["form"])
    return entry["word"]


def form_key(tags: set[str], pos: str) -> str | None:
    if pos in ("noun", "pron", "adj"):
        case = next((CASES[t] for t in tags if t in CASES), None)
        number = next((NUMBERS[t] for t in tags if t in NUMBERS), None)
        if not case or not number:
            return None
        if pos == "adj":
            gender = next((GENDERS[t] for t in tags if t in GENDERS), None)
            return f"{case}.{number}.{gender}" if gender else None
        return f"{case}.{number}"
    if pos == "verb":
        if "passive" in tags or "active" not in tags or "present" not in tags:
            return None
        if "infinitive" in tags:
            return "inf"
        person = next((PERSONS[t] for t in tags if t in PERSONS), None)
        number = next((NUMBERS[t] for t in tags if t in NUMBERS), None)
        if not person or not number:
            return None
        if "indicative" in tags:
            return f"pres.{person}{number}"
        if "imperative" in tags and "future" not in tags:
            return f"imp.{person}{number}"
    return None


def extract_forms(entry: dict, pos: str) -> dict[str, str]:
    forms: dict[str, str] = {}
    for form in entry.get("forms", []):
        if form.get("source") not in ("declension", "conjugation", "inflection"):
            continue
        key = form_key(set(form.get("tags", [])), pos)
        if key and key not in forms:  # the first listed variant is the standard one
            value = clean_latin(form["form"])
            if value and value != "—" and not value.startswith("-"):
                forms[key] = value
    return dict(sorted(forms.items()))


def extract_ipa(entry: dict) -> str | None:
    for sound in entry.get("sounds", []):
        if "Classical-Latin" in sound.get("tags", []) and sound.get("ipa"):
            return sound["ipa"]
    return None


def extract_descendants(entry: dict) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {lang: [] for lang in ROMANCE_LANGS}

    def walk(nodes: list[dict]) -> None:
        for node in nodes:
            lang = node.get("lang_code")
            word = node.get("word")
            usable = word and not word.startswith("-") and not word.endswith("-") and "," not in word
            if lang in found and usable and word not in found[lang] and len(found[lang]) < MAX_PER_LANG:
                found[lang].append(word)
            walk(node.get("descendants", []))

    walk(entry.get("descendants", []))
    return {lang: words for lang, words in found.items() if words}


def first_gloss(entry: dict) -> str:
    for sense in entry.get("senses", []):
        if sense.get("glosses"):
            return sense["glosses"][0]
    return ""


# ---------------------------------------------------------------- build

def validate_curated(item: dict) -> None:
    missing = [key for key in ("id", "pos", "meaning_he", "element", "family") if key not in item]
    if missing:
        raise SystemExit(f"curated word {item.get('id')} is missing {missing}")
    if item["element"] not in ELEMENTS:
        raise SystemExit(f"curated word {item['id']}: unknown element {item['element']}")
    if item["pos"] not in POS_VALUES:
        raise SystemExit(f"curated word {item['id']}: unknown pos {item['pos']}")
    if item.get("dcc_headword") is None and not item.get("exception_reason"):
        raise SystemExit(f"curated word {item['id']}: not in DCC, so it needs exception_reason")


def build_word(item: dict, dcc: dict[str, dict], refresh: bool) -> dict:
    validate_curated(item)
    headword = item.get("dcc_headword")
    row = None
    if headword is not None:
        row = dcc.get(headword)
        if row is None:
            close = [h for h in dcc if strip_macrons(h).startswith(strip_macrons(item["id"]))]
            raise SystemExit(f"DCC headword '{headword}' not found. Close matches: {close[:5]}")

    kaikki_pos = item.get("kaikki_pos", item["pos"])  # Wiktionary sometimes classifies differently
    entry = pick_entry(kaikki_entries(item["id"], refresh), kaikki_pos, item["id"], item.get("kaikki_nth", 0))
    # Curated lists win: Wiktionary trees contain archaic and dialect forms, so a
    # language listed in curated/words.json (even as []) replaces the automatic one.
    family = dict(item["family"])
    family.update({lang: words for lang, words in extract_descendants(entry).items()
                   if lang not in family})

    lemma = canonical(entry)
    forms = extract_forms(entry, item["pos"])
    # Optional textbook respelling, e.g. Wiktionary's hidden-quantity "stēlla" -> D'Ooge's "stella".
    for old, new in item.get("respell", []):
        lemma = lemma.replace(old, new)
        forms = {key: value.replace(old, new) for key, value in forms.items()}

    return {
        "id": item["id"],
        "lemma": lemma,
        "dictionary_form": item.get("dictionary_form") or headword,
        "pos": item["pos"],
        "meaning_he": item["meaning_he"],
        "meaning_en": row["Definition"].strip() if row else first_gloss(entry),
        "ipa": extract_ipa(entry),
        "dcc_rank": int(row["Frequency Rank"]) if row else None,
        "dcc_group": row["Semantic Group"].strip() if row else None,
        "exception_reason": item.get("exception_reason"),
        "element": item["element"],
        "forms": forms,
        "family": family,
        "expressions": item.get("expressions", []),
        "etymology_en": entry.get("etymology_text"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="download sources again")
    args = parser.parse_args()

    curated = json.loads(CURATED.read_text(encoding="utf-8"))["words"]
    ids = [w["id"] for w in curated]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate ids in curated/words.json")

    print(f"DCC core list ...")
    dcc = load_dcc(args.refresh)
    words = []
    for item in curated:
        print(f"  {item['id']}")
        words.append(build_word(item, dcc, args.refresh))

    output = {
        "_meta": {
            "generated_by": "pipeline/build_content.py — do not edit by hand",
            "sources": [
                {"name": "DCC Latin Core Vocabulary", "url": "https://dcc.dickinson.edu/latin-core-list1",
                 "license": "CC BY-SA 3.0"},
                {"name": "Wiktionary via kaikki.org", "url": "https://kaikki.org/dictionary/Latin/",
                 "license": "CC BY-SA 4.0"},
            ],
        },
        "words": words,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(words)} words)")


if __name__ == "__main__":
    main()
