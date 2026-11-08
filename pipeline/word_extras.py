"""Derived word data for the word card (used by build_content.py).

1. origin(entry)      -> the word's lineage from Wiktionary's etymology, as structured steps
                         with Hebrew language names, e.g. aqua <- Proto-Italic *akʷā <- PIE *h₂ékʷeh₂.
2. pron_he(ipa, lemma) -> a Hebrew transliteration of the classical pronunciation, split into
                         syllables, each marked stressed / long, e.g. lūna -> [לוּ (stressed, long), נָה].

Both come only from the downloaded source data (no invented content). Standard library only.
"""

from __future__ import annotations

import re
import unicodedata

# ---------------------------------------------------------------------------------------- origin

LANG_HE = {
    "Proto-Indo-European": "פרוטו-הודו-אירופית",
    "Proto-Italic": "פרוטו-איטלקית",
    "Old Latin": "לטינית עתיקה",
    "Archaic Latin": "לטינית עתיקה",
    "Ancient Greek": "יוונית עתיקה",
    "Latin": "לטינית",
    "reconstructed": "צורה משוחזרת",
}
# English words the simple parser might mistake for Latin terms.
STOP = {"the", "said", "a", "an", "which", "its", "this", "that", "zero-grade", "proto-italic", "hunters", "target", "earlier", "for",
        "cognate", "mediterranean", "word", "nominative", "otherwise", "compare", "see", "stem", "form", "either", "root", "an"}
LANG_PATTERN = "|".join(sorted(map(re.escape, LANG_HE), key=len, reverse=True))

HEDGES = [
    (r"^(Perhaps|Possibly|Maybe)\b", "אולי"),
    (r"^(Probably|Likely|Most likely)\b", "כנראה"),
    (r"^Traditionally\b", "לפי ההסבר המסורתי"),
    (r"^Tentatively\b", "בהסתייגות"),
]
UNKNOWN = re.compile(r"^(Uncertain|Unknown|Of (unknown|uncertain) origin|Uncertain origin)", re.I)

STEP = re.compile(
    rf"(?:(?P<lang>{LANG_PATTERN})\s+)?(?:the root\s+|root\s+)?(?P<term>\*?[^\s,;()“”]+)"
    rf"(?:\s*\((?P<paren>[^)]*)\))?"
)


def _first_sentence(text: str) -> str:
    lines = [line for line in text.split("\n") if line.strip()]
    if lines and lines[0].startswith("Etymology tree"):
        # Skip the tree block: its lines are "Language term" without a verb.
        rest = [line for line in lines[1:] if re.search(r"\b(from|From|of|Of)\b|^(Uncertain|Unknown)", line)]
        lines = rest or lines
    first = lines[0] if lines else ""
    return re.split(r"(?<=[.;])\s", first)[0].rstrip(".;")


def _gloss(paren: str | None) -> str | None:
    if not paren:
        return None
    match = re.search(r"“([^”]+)”", paren)
    return match.group(1) if match else None


def _tree_steps(text: str) -> list[dict]:
    """Fallback: the 'Etymology tree' block lists ancestors, oldest first."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines or not lines[0].startswith("Etymology tree"):
        return []
    steps = []
    for line in lines[1:]:
        match = re.match(rf"^({LANG_PATTERN})\s+(\S+)$", line)
        if not match:
            break
        lang, term = match.groups()
        if lang == "Latin" or term.startswith("*-"):
            continue
        steps.append({"lang": lang, "lang_he": LANG_HE[lang], "term": re.sub(r"(der\.)?\??$", "", term), "gloss_en": None})
    return list(reversed(steps))[:3]


def origin(entry: dict) -> dict | None:
    """Structured lineage: {"hedge_he": str|None, "unknown": bool, "steps": [{lang, lang_he, term, gloss_en}]}."""
    text = entry.get("etymology_text") or ""
    if not text.strip():
        return None
    sentence = _first_sentence(text)
    if UNKNOWN.match(sentence):
        return {"hedge_he": None, "unknown": True, "steps": []}

    hedge = None
    for pattern, hebrew in HEDGES:
        if re.match(pattern, sentence):
            hedge = hebrew
    # Split the chain on "from" (From X, from Y, from the root Z).
    parts = re.split(r"\b(?:[Ff]rom|derived from|borrowed from|Borrowed from|Inherited from|inherited from)\s+", sentence)
    steps: list[dict] = []
    last_lang = None
    for part in parts[1:]:
        part = re.sub(r"^(?:earlier|the root|root|a|an|the)\s+", "", part.strip().strip(","))
        if not part or part.startswith(("oblique", "a ")):
            continue
        # Compounds: "ad- + ferō", "aedēs (building) + -ficō"
        if " + " in part.split(",")[0]:
            pieces = [STEP.match(p.strip()) for p in part.split(",")[0].split(" + ")]
            terms = [m.group("term") for m in pieces if m]
            if len(terms) >= 2 and all(t.lower() not in STOP for t in terms):
                lang = (pieces[0].group("lang") if pieces[0] else None) or "Latin"
                steps.append({"lang": lang, "lang_he": LANG_HE.get(lang, lang), "term": " + ".join(terms), "gloss_en": None})
                last_lang = lang
                continue
        match = STEP.match(part)
        if not match:
            continue
        term = re.sub(r"(der\.)?\??$", "", match.group("term").rstrip(",;"))
        if not re.search(r"\w", term) or term.lower().strip("'\"") in STOP or re.search(r"['\"]", term):
            continue
        lang = match.group("lang")
        if not lang:
            if term.startswith("*") and term.endswith("-"):
                lang = "Proto-Indo-European"          # bare roots like *weyd- are PIE
            elif term.startswith("*"):
                lang = last_lang or "reconstructed"
            else:
                lang = "Latin"
        steps.append({"lang": lang, "lang_he": LANG_HE.get(lang, lang), "term": term, "gloss_en": _gloss(match.group("paren"))})
        last_lang = lang
        if len(steps) == 3:
            break
    if not steps:
        steps = _tree_steps(text)
    if not steps:
        return None
    return {"hedge_he": hedge, "unknown": False, "steps": steps}


# ---------------------------------------------------------------------------------- pronunciation

CONSONANTS = {
    "p": "פּ", "b": "בּ", "t": "ט", "d": "ד", "k": "ק", "g": "ג", "ɡ": "ג", "f": "פ", "s": "ס", "z": "ז",
    "h": "ה", "m": "מ", "n": "נ", "ŋ": "נ", "l": "ל", "ɫ": "ל", "r": "ר", "w": "ו", "j": "י", "x": "ח",
    "θ": "ת", "β": "ב",
}
FINAL = {"מ": "ם", "נ": "ן", "פ": "ף", "כ": "ך", "צ": "ץ"}
VOWEL_BASE = {"a": "a", "ɛ": "e", "e": "e", "ɪ": "i", "i": "i", "ɔ": "o", "o": "o", "ʊ": "u", "u": "u", "y": "i", "ʏ": "i"}
PATAH, SEGOL, HIRIQ, SHVA = "ַ", "ֶ", "ִ", "ְ"


def _segments(syllable: str) -> list[tuple[str, str, set]]:
    """Splits one IPA syllable into ('C' | 'V', symbol, flags) segments."""
    out: list[tuple[str, str, set]] = []
    chars = unicodedata.normalize("NFD", syllable)
    i = 0
    while i < len(chars):
        ch = chars[i]
        i += 1
        if ch in "ˈˌ.[]/":
            continue
        flags: set = set()
        while i < len(chars) and (unicodedata.combining(chars[i]) or chars[i] in "ːʷʰ"):
            mark = chars[i]
            flags.add({"ː": "long", "ʷ": "labial", "ʰ": "asp", "̃": "nasal", "̯": "glide"}.get(mark, "other"))
            i += 1
        base = unicodedata.normalize("NFC", ch)
        if base in VOWEL_BASE:
            out.append(("V", VOWEL_BASE[base], flags))
        elif base in CONSONANTS:
            out.append(("C", base, flags))
    return out


def _render(segments: list[tuple[str, str, set]], word_final: bool, nasal_m: bool) -> tuple[str, bool]:
    onset: list[str] = []
    coda: list[str] = []
    vowels: list[tuple[str, set]] = []
    for kind, sym, flags in segments:
        if kind == "C":
            letters = [CONSONANTS[sym]] + (["ו"] if "labial" in flags else [])
            (coda if vowels else onset).extend(letters)
        else:
            vowels.append((sym, flags))
    long_ = any("long" in f for _, f in vowels)
    if not onset:
        onset = ["א"]
    # Shva on all but the last onset letter (st-, sp-, kw-).
    text = "".join(letter + SHVA for letter in onset[:-1]) + onset[-1]
    if vowels:
        main = vowels[0][0]
        glide = vowels[1][0] if len(vowels) > 1 else None
        if main == "a":
            text += PATAH
        elif main == "e":
            text += SEGOL
        elif main == "i":
            text += HIRIQ + "י"
        elif main == "o":
            text += "וֹ"
        elif main == "u":
            text += "וּ"
        if glide == "e" or glide == "i":
            text += "י"          # ae, oe, ei -> "אַי", "וֹי"
        elif glide == "u":
            text += "וּ"         # au -> "אַוּ"
        if word_final and not coda and main in ("a", "e") and not glide:
            text += "ה"          # final -a / -e: write the ה so it is read
        if any("nasal" in f for _, f in vowels):
            # IPA writes -um and -ns as nasal vowels; Hebrew readers need the letter that is spelled.
            coda = (["מ"] if nasal_m and not coda else ["נ"] + coda)
    text += "".join(coda)
    return text, long_


def pron_he(ipa: str | None, lemma: str) -> list[dict] | None:
    """Hebrew transliteration of the classical IPA: [{"t": text, "stress": bool, "long": bool}, ...]."""
    if not ipa:
        return None
    body = re.sub(r"\(.\)", "", ipa.strip("[]/ "))   # drop optional marks like (ː)
    # Syllables are separated by "." and the stress mark starts a syllable.
    pieces = re.split(r"(?=[ˈˌ])|\.", body)
    syllables = [p for p in pieces if p.strip("ˈˌ")]
    out: list[dict] = []
    ends_with_m = strip_marks(lemma).lower().endswith("m")
    for index, syl in enumerate(syllables):
        segs = _segments(syl)
        if not segs:
            continue
        last = index == len(syllables) - 1
        text, long_ = _render(segs, last, last and ends_with_m)
        if last:
            for plain, final in FINAL.items():
                if text.endswith(plain):
                    text = text[: -len(plain)] + final
        out.append({"t": text, "stress": syl.startswith("ˈ") or (len(syllables) == 1), "long": long_})
    if out and not any(s["stress"] for s in out):
        # No stress mark in the source: Latin stresses the second-to-last syllable by default.
        out[max(0, len(out) - 2)]["stress"] = True
    return out or None


def strip_marks(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c))
