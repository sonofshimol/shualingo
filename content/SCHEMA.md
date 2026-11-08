# סכמת התוכן — קובצי ה-JSON של שועלינגו

כל התוכן של האפליקציה נמצא בתיקייה הזאת, נפרד מהקוד. האפליקציה רק קוראת את הקבצים (הם נארזים בתוכה, ולכן עובדים גם בלי אינטרנט).
הטיפוסים המדויקים נמצאים ב-`src/content/types.ts`, ובדיקות אוטומטיות ב-`src/content/content.test.ts` תופסות טעויות (מילה לא מוכרת, כלל שלא קיים, תשובה שלא מופיעה באפשרויות וכו').

| קובץ | מי כותב אותו | מה יש בו |
| --- | --- | --- |
| `words.json` | **נוצר על ידי הצינור** (`pipeline/build_content.py`). לא לערוך ביד | המילון |
| `units.json` | ביד | יחידות, שיעורים ותרגילים |
| `rules.json` | ביד | כללי דקדוק |
| `spells.json` | ביד | לחשים |
| `elements.json` | ביד | האלמנטים |
| `buildings.json` | ביד | המבנים במחנה |
| `ranks.json` | ביד | הדרגות של השועלה |
| `decks.json` | ביד | חפיסות משחק המילים (שלב 3) |
| `verbs.json` | ביד | מה כל פועל צריך במעבדה (שלב 3) |
| `lab_effects.json` | ביד | מה כל צירוף במעבדה עושה (שלב 3) |
| `garbles.json` | ביד | לחשים משובשים: מה קורה ומה ההסבר (שלב 3) |
| `forest.json` | ביד | האזורים החשוכים ביער (שלב 3) |

כדי לשנות מילה (פירוש בעברית, מילים קרובות, ביטויים) עורכים את `pipeline/curated/words.json` ומריצים `npm run content`.

---

## words.json — המילון

```jsonc
{
  "_meta": { "sources": [ /* מקורות ורישיונות */ ] },
  "words": [ { /* מילה */ } ]
}
```

| שדה | סוג | מקור | הסבר |
| --- | --- | --- | --- |
| `id` | מחרוזת | curated | מזהה קבוע בלי סימני תנועה (`aqua`, `affero`) |
| `lemma` | מחרוזת | kaikki | צורת המילון עם סימני אורך (`afferō`) |
| `dictionary_form` | מחרוזת | DCC / curated | הערך המלא במילון (`aqua -ae f.`) |
| `pos` | `noun` / `verb` / `adj` / `pron` / `conj` / `adv` / `prep` | curated | חלק דיבר |
| `meaning_he` | מחרוזת | curated | הפירוש בעברית |
| `meaning_en` | מחרוזת | DCC | הפירוש באנגלית |
| `ipa` | מחרוזת או null | kaikki | הגייה קלאסית משוחזרת |
| `dcc_rank` | מספר או null | DCC | המקום ברשימת השכיחות. null רק לחריגה מתועדת |
| `dcc_group` | מחרוזת או null | DCC | קבוצה סמנטית |
| `exception_reason` | מחרוזת או null | curated | למה מילה מחוץ ל-DCC נכנסה (חובה כש-`dcc_rank` הוא null) |
| `element` | `terra` / `aqua` / `aer` / `ignis` / `aether` | curated | האלמנט שהמילה עולה בלחש |
| `forms` | אובייקט | kaikki | כל הצורות, לפי מפתחות (ראו למטה) |
| `family` | אובייקט | curated + kaikki | מילים קרובות לפי שפה, והערה (ראו למטה) |
| `expressions` | מערך | curated | ביטויים מוכרים: `{ "text", "meaning_he" }` |
| `etymology_en` | מחרוזת או null | kaikki | האטימולוגיה המלאה מוויקימילון (באנגלית, לשימוש עתידי) |
| `gender`, `declension` | `m`/`f`/`n`, 1–5 | kaikki | לשמות עצם בלבד: מין ונטייה (המעבדה בודקת התאמת שם תואר) |
| `deck` | מחרוזת | curated | חפיסה במשחק המילים (`decks.json`); בלי `deck` המילה שייכת ליחידות |
| `origin` | אובייקט או null | kaikki (או curated) | שרשרת המקור: `{hedge_he, unknown, steps: [{lang, lang_he, term, gloss_en}]}`, מהחדש לישן |
| `pron_he` | מערך | נגזר מ-IPA | הגייה בעברית לפי הברות: `{t, stress, long}` (t = אותיות עם ניקוד) |
| `quotes` | מערך | curated | ציטוטים מפורסמים: `{text, author_he, meaning_he}` |
| `tags` | מערך | curated | תגיות משמעות למעבדה: `resource`, `plant`, `building`, `person`, `divine`, `self`, `element`, `light`, `dark`, `spirit`, `song`, `force`, `gift`, `place` |

**מפתחות ב-`forms`:**

- שמות עצם וכינויי גוף: `<יחסה>.<מספר>`. יחסות: `nom` (נושא), `gen`, `dat` (נתינה), `acc` (מושא), `abl`, `voc`. מספר: `sg` / `pl`. לדוגמה `acc.sg` = `aquam`.
- שמות תואר: מוסיפים מין: `nom.sg.f` = `magna` (`m`, `f`, `n`).
- פעלים: `pres.3sg` = `portat`, `pres.3pl` = `portant` (גוף 1–3, `sg`/`pl`), `imp.2sg` = `portā` (ציווי), `inf` = `portāre`.

**`family`:** מפתח לכל שפה, וערכו רשימת מילים: `en` אנגלית, `he` עברית, `es` ספרדית, `it` איטלקית, `fr` צרפתית, `pt` פורטוגזית, `ro` רומנית, `ca` קטלאנית. בנוסף `note_he`, הערה קצרה על הקשר בין המילים.
אנגלית ועברית נכתבות ביד. השפות הרומאניות נלקחות אוטומטית מוויקימילון, אלא אם נכתבו ביד ב-curated (רשימה שנכתבה ביד, גם ריקה `[]`, גוברת על האוטומטית).

**שדות נוספים ב-`pipeline/curated/words.json` בלבד:** `origin` (עוקף את המקור האוטומטי), `ipa` (רק כשאין בוויקימילון), `dcc_headword` (הערך המדויק ברשימת DCC, או null), `kaikki_pos` (כשוויקימילון מסווג אחרת, למשל `particle` ל-`nōn`), `kaikki_nth` (איזה ערך לקחת כשיש כמה מילים זהות באותו חלק דיבר), `respell` (תיקון כתיב לספרי לימוד, למשל `[["stēll", "stell"]]`).

---

## units.json — יחידות, שיעורים ותרגילים

```jsonc
{ "units": [ {
  "id": "u1",
  "title_he": "מי? יחסת הנושא",
  "subtitle_he": "…",
  "dooge": "Lessons IV–V …",          // השיעורים המקבילים בספר של D'Ooge
  "words": ["silva", "terra", …],      // מזהים מ-words.json, כ-10 מילים
  "lessons": [ {
    "id": "u1-l1",                       // ייחודי בכל הקורס
    "title_he": "…",
    "rules_intro": ["nom-sg-1"],         // כללים שמוצגים לפני השיעור
    "exercises": [ /* תרגילים */ ]
  } ]
} ] }
```

השיעורים נפתחים לפי הסדר בקובץ. יחידה עם `"requires": { "building": "bibliotheca" }` נשארת נעולה עד שהמבנה נבנה. כל המילים הלטיניות בתרגילים חייבות להיות צורות שקיימות ב-`words.json`, כולל סימני האורך. הבדיקות מוודאות את זה.

**שדות משותפים לכל התרגילים** (כולם רשות): `rules` (רשימת מזהי כללים שהתרגיל מתרגל, לחזרה המרווחת) ו-`explain_he` (הסבר שמוצג אחרי תשובה שגויה; אם אין, מוצג ההסבר של הכלל הראשון).
המילים שהתרגיל מתרגל מחושבות אוטומטית מהטקסט הלטיני.

### 1. התאמת זוגות — `match`
```json
{ "type": "match", "words": ["silva", "terra", "aqua", "puella"] }
```
המילים מוצגות בצורת המילון שלהן, מול הפירוש בעברית.

### 2. בחירה מרובה — `choice`
```json
{ "type": "choice", "direction": "la-he", "prompt": "Silva magna est.",
  "answer": "היער גדול.", "distractors": ["היער קטן.", "הירח גדול."] }
```
`direction`: `la-he` (לטינית ← עברית) או `he-la` (עברית ← לטינית; אז `answer` ו-`distractors` בלטינית). שדה רשות `prompt_la`: רמז לטיני מעל שאלה בעברית.

### 3. בניית משפט מאריחים — `build`
```json
{ "type": "build", "prompt_he": "הנערה קוראת לאישה.",
  "answer": ["puella", "fēminam", "vocat"], "any_order": true,
  "extra": ["fēmina", "puellam"] }
```
האריחים באותיות קטנות, בלי פיסוק: האות הגדולה והפיסוק (מסוף `prompt_he`) מתווספים בתצוגה. `any_order: true` מקבל כל סדר, כי בלטינית הסיומת קובעת ולא המקום. `alternatives` (רשות) הוא רשימה של סדרים נוספים שמתקבלים כשהסדר כן חשוב. `extra` הם אריחים מטעים.

### 4. זיהוי תפקיד לפי סיומת — `role`
```json
{ "type": "role", "sentence": "Fēmina puellae aquam dat.", "target": 1,
  "answer": "indirect", "translation_he": "האישה נותנת מים לנערה." }
```
`target` הוא מספר המילה במשפט (מתחילים מ-0). `answer`: `subject` (מי עושה), `object` (את מי), `indirect` (למי), `means` (במה / עם מה — יחסת האמצעי). `options` (רשות) מגביל את האפשרויות, למשל לפני שלמדו נתינה.

### 5. השלמת סיומת — `ending`
```json
{ "type": "ending", "before": "Fēmina", "stem": "lūn", "after": "spectat.",
  "answer": "am", "options": ["a", "am", "ae"], "translation_he": "האישה מסתכלת על הירח." }
```
המשפט המלא הוא `before` + `stem` + `answer` + `after`. אם `after` מתחיל בסימן פיסוק, אין רווח לפניו.

---

## rules.json — כללי דקדוק

```json
{ "id": "acc-sg-1", "title_he": "…", "explain_he": "…",
  "examples": [{ "la": "Puella aquam portat.", "he": "הנערה נושאת מים." }],
  "drill": { "form": "acc.sg", "prompt_he": "את מי? (מושא, יחיד)" } }
```
כל כלל הוא כרטיס בחזרה המרווחת. `drill` (רשות) מאפשר למנוע החזרה לייצר תרגיל: "באיזו צורה של מילה מוכרת עונים על השאלה הזאת?". בלי `drill`, החזרה משתמשת בדוגמה הראשונה.

## spells.json — לחשים

```json
{ "id": "gather-wood", "school": "basic", "text": "Lignum mihi affer!", "meaning_he": "הבא לי עצים!",
  "answer": ["lignum", "mihi", "affer"], "any_order": true, "extra": ["lignō", "tibi", "affert"],
  "effect": { "type": "gather", "resource": "fuel", "amount": 3 },
  "unlocked_by": "u3-l3", "explain_he": "…", "effect_he": "…" }
```
המחיר לא נכתב ביד: כל מילה ב-`answer` עולה יחידה אחת של ה-`element` שלה ב-`words.json`. בלחשי בנייה ודרגה מתווספים החומרים של המבנה או הדרגה. `unlocked_by` הוא השיעור שמכניס את הלחש לספר הלחשים. `requires` (רשות): `{ "rank": "maga" }` או `{ "building": "turris" }`.

סוגי `effect`:
- `{ "type": "gather", "resource": "fuel", "amount": 3 }` — עצים למדורה.
- `{ "type": "build", "building": "hortus" }` — בונה מבנה, או משדרג אותו ברמה.
- `{ "type": "grow", "reward": {…}, "final_reward": {…} }` — מגדל את העץ שלב אחד.
- `{ "type": "light", "hours": 12 }` — אור שמכפיל את הייצור.
- `{ "type": "rank" }` — עלייה לדרגה הבאה (לפי ranks.json).

## elements.json — אלמנטים

```json
{ "id": "terra", "name_he": "אדמה", "mystic": false, "stage": 1, "color": "#79c447",
  "symbol_he": "▽ עם קו", "source_he": "…", "use_he": "…" }
```
חמשת האלמנטים הבסיסיים פעילים משלב 1. האלמנטים המיסטיים (`lux`, `umbra`, `spiritus`) מוגדרים כבר עכשיו עם `stage: 3`.

## buildings.json — מבנים

```json
{ "id": "focus", "name_la": "focus", "name_he": "אח המחנה", "description_he": "…",
  "stage": 1, "initial": true, "unlocked_by": "u3-l3" }
```
`initial: true` הם המבנים שקיימים במחנה מההתחלה (מדורה, אוהל ומעגל לחשים). שדות נוספים:
- `produces`: `{ "element": "terra", "every_hours": 2, "needs_fire": false }` — יחידה אחת בכל `every_hours` שעות, גם כשהאפליקציה סגורה. `needs_fire` — רק בזמן שהמדורה בוערת.
- `build_cost`: חומרים לבנייה, נוסף על מחיר המילים בלחש.
- `upgrade_costs`: רשימת חומרים לרמה 2, 3 וכו'.
- `unlocks`: `{ "unit": "u6" }` — תוכן שהמבנה פותח.

## ranks.json — דרגות

```json
{ "id": "maga", "name_he": "קוסמת", "order": 1, "description_he": "…", "unlocks_he": "…",
  "cost": { "aether": 3 }, "requires": { "buildings": ["turris"], "all_lessons": false } }
```
עולים בדרגה בלחש `Mē mūtā!`. `cost` מתווסף למחיר הלחש. `requires` הם תנאים שחייבים להתקיים.

---

## שלב 3: משחק המילים ומעבדת הלחשים

### decks.json
```json
{ "id": "natura", "name_la": "Natura", "name_he": "טבע ונוף", "element": "aqua" }
```
המילים של חפיסה הן כל המילים ב-`words.json` עם `"deck": "natura"`.

### verbs.json
```json
{ "id": "do", "object": "required", "recipient": "optional", "verb_he": "תן" }
```
`object` / `recipient`: `required`, `optional` או `none`. רק פעלים שמופיעים כאן זמינים במעבדה.

### lab_effects.json
```json
{ "id": "water-tree", "verb": "do", "object": { "word": "aqua" }, "recipient": { "word": "arbor" },
  "effect": { "type": "grow", "reward": { "terra": 2 }, "final_reward": { "aether": 2 } },
  "name_he": "להשקות את העץ", "hint_he": "העץ צמא.", "requires": { "rank": "maga" }, "extra_cost": { "lux": 1 } }
```
הכלל הראשון שמתאים מנצח. `object` ו-`recipient` הם `{ "word": … }` או `{ "tag": … }`; `recipient: null` = חייב להיות ריק; `"any"` = לא משנה. `effect.building: "$object"` = לבנות את המבנה שבמשבצת "את מה?".

סוגי `effect` נוספים בשלב 3: `timed` (`kind`: `fire-guard`, `garden-boost`, `shade`; `hours`), `conjure` (`element`, `amount`), `offering` (`reward`, פעם ביום), `friend`, `song`, `hint`, `reveal`.

### garbles.json
```json
{ "id": "recipient-acc", "rule": "dat-sg-1", "animation": "steam",
  "title_he": "…", "effect_he": "…{word}…", "explain_he": "{wrong} … {right}" }
```
`id` הוא סוג השגיאה שהמנוע מזהה. `rule` נכנס לחזרה (Again). בטקסטים: `{word}` המילה, `{wrong}` הצורה שנכתבה, `{right}` הצורה הנכונה.

### forest.json
```json
{ "id": "west", "name_he": "…", "find_he": "…", "reward": { "terra": 6, "aqua": 4 } }
```
כל `Lūcem silvae dā!` חושף את האזור הבא ברשימה.
