# שועלינגו — תוכנית שלב 4: מסחר ועולם

## תקציר בעברית (למשתמש)

**מה השלב מוסיף** (לפי `SPEC.md`, "שלבי בנייה" 4, ו"מסחר" ו"התקדמות בזמן היעדרות" באפיון):

1. **מבקרים במחנה.** סוחרים נודדים (mercātor) ויצורי יער (avis — ציפור, vulpēs — שועל זקן, ursus — דוב) מגיעים מדי כמה שעות, גם כשהאפליקציה סגורה. כל אחד מביא **בקשה כתובה בלטינית**, למשל *Aquam volō. Prō aquā duo ligna dō.* = "אני רוצה מים. תמורת מים אני נותן שני עצים".
2. **מסחר בשלושה צעדים:**
   - (א) להבין מה הוא מבקש: שאלת הבנה קצרה.
   - (ב) לענות בלטינית מאריחים: *Aquam tibi dō.* (אני נותן לך מים).
   - (ג) מאוחר יותר אפשר גם **הצעה נגדית**: *Prō aquā tria ligna volō!* כאן מתרגלים מספרים והתאמה: *ūnum lignum / duo ligna / tria ligna*.
3. **השהייה גם במסחר:** שלוש טעויות עם אותו מבקר, והוא הולך לנוח לשעתיים, כמו בשיעורים.
4. **אירועים בעולם:**
   - **ירח מלא** אמיתי, לפי לוח השנה: לחשי אור וצל זולים יותר, ויצורי לילה מבקרים.
   - **חורף** בחודשים דצמבר עד פברואר: האש נשרפת מהר יותר, והגינה מייצרת פחות.
   - **סערה** בערך פעם בשבוע (tempestās): המבנים מייצרים פחות, ואין מבקרים.

   לכל אירוע יש לחש שעוזר מולו, כך שהלימוד הוא גם הפתרון. האירועים עדינים, ואף אחד מהם לא מעניש.
5. **שלוש יחידות חדשות (10–12):**
   - **10:** "אני" בפועל (*dō, volō, accipiō*), *prō* + יחסת האמצעי, והמספרים 1–3.
   - **11:** יצורי היער.
   - **12:** מזג אוויר ועונות.

**החלטות שצריך לאשר לפני שמתחילים** (בסעיף 2 למטה, עם ברירות מחדל):
- **מילים מחוץ ל-DCC:** *mercātor, vulpēs, ursus, lupus, nix, frīgus*.
- **קצב המבקרים.**
- **אורך השהייה של מבקר.**
- **שעון:** שעון ישראל, או שעון הטלפון.

---

## Technical spec (for the implementing model)

> You are implementing stage 4 of Shualingo. Read this whole document first. It is written to be
> followed literally. Where it says DEFAULT, use that value unless the user chose otherwise.

### 0. Before you write any code

1. Read `CLAUDE.md` (project rules and every decision so far), `SPEC.md` (sections "מסחר",
   "התקדמות בזמן היעדרות", "כישלון והשהייה", "שלבי בנייה"), `PROGRESS.md`, and `content/SCHEMA.md`.
2. The user is **not a programmer**. Talk to them in **plain Hebrew**, no jargon.
3. `CLAUDE.md` requires: **show the plan and wait for approval before a new stage**. Present
   section 2 ("Decisions") to the user in Hebrew, get answers, record them in `CLAUDE.md`
   under a new heading "החלטות שלב 4", then start.
4. Work on the session's designated git branch. Commit after each numbered step in section 9 with a clear
   English message. Never put AI model names in code, commits or PRs. Push when a step is green.
5. Run `npm test` and `npx tsc --noEmit` after every step. Both must pass before committing.

### 1. Orientation: how the code works today (stages 1–3)

Read these files before changing anything; reuse their patterns.

| Area | Files | Key ideas |
| --- | --- | --- |
| Content | `content/*.json`, `src/content/index.ts`, `src/content/types.ts` | All content is JSON. `words.json` is **generated** by `python3 pipeline/build_content.py` from DCC + kaikki + `pipeline/curated/words.json` — never edit `words.json` by hand. `lookupForm(form)` maps a written form to a word id. |
| Save | `src/game/state.ts`, `src/storage/migrations.ts` | `SaveState` with `saveVersion` (currently **3**). Every shape change bumps the version and adds `MIGRATIONS[oldVersion]`. `migrate()` also fills missing fields from `newSave()`. |
| Time | `src/game/actions.ts` → `tick(save, now)` | Everything time-based is **lazy and pure**: `accrueProduction` → `pauseFire` → `burnFire` → `dropExpiredEffects`. All functions take `now` (epoch ms). Never use `Date.now()` inside `src/game`, `src/learning`, `src/magic`. |
| Suspension | `src/game/tasks.ts` | Generic task ids: `lesson:…`, `spell:…`. Add `trade:…`. `recordFailure` / `recordSuccess` / `taskStatus`. Constants `FAILURES_BEFORE_SUSPENSION` (3), `SUSPENSION_HOURS` (2) in `src/config.ts`. |
| Spells | `src/magic/effects.ts` (`applyEffect`, `effectStatus`), `src/magic/grammar.ts` (`analyze`, `keysFor`), `src/magic/lab.ts` | One place for all effects. Grammar engine checks slot ↔ case agreement and adjective agreement. Reuse `keysFor` for any "which form is this" question. |
| Mistakes | `src/learning/diagnose.ts` | `diagnoseTokens(expected, given)` explains form mistakes in Hebrew. **Use it for trade replies** instead of writing a new explainer. |
| Camp | `src/game/buildings.ts`, `src/game/camp.ts`, `src/art/CampScene.tsx`, `src/art/buildingsArt.ts`, `src/ui/screens/CampScreen.tsx` | Scene is 192×144 canvas; clickable spots are `SPOTS` + HTML overlays (`overlays` prop) for bubbles/plots/speech. |
| UI feedback | `src/ui/feedback/sfx.ts` (`play('correct' …)`), `src/ui/components/ElementIcon.tsx` | Synthesized sounds + vibration. |
| Accessibility rule | `CLAUDE.md` "צבעוניות ושחור-לבן" | The user's phone is in **black-and-white mode**. Never convey information by colour alone: use shapes, ✓/✗, border style (double / solid / dashed), text. |
| Tests | `src/**/*.test.ts` (vitest) | Pure-logic tests with fixed `T0`. Content tests in `src/content/content.test.ts` check every Latin token in exercises is a known form (macrons included). |

Known pitfalls (learned the hard way):
- `npm` needs `.npmrc` `legacy-peer-deps=true` (already present). Don't remove it.
- Playwright is pre-installed; `require('playwright')` works. Don't install browsers.
- In Playwright, elements with an infinite CSS animation (e.g. `.bubble`) need `click({ force: true })`.
- A fresh app writes its first save to IndexedDB ~150 ms after load; wait ~800 ms before editing IndexedDB in a test.
- Hebrew + Latin mixing: wrap Latin in `<La text=…>` (clickable words) or `dir="ltr"` spans.
- Latin forms in content must match `words.json` exactly, **with macrons** (`aquā`, `lignō`). The content test will fail otherwise — that's intended.
- There are **23 lessons** today (units 1–5 have 3 lessons, units 6–9 have 2).

### 2. Decisions to confirm with the user (ask in Hebrew; DEFAULTs in bold)

| # | Question | DEFAULT |
| --- | --- | --- |
| D1 | Words outside the DCC list, needed for the story: `mercātor` (merchant), `vulpēs` (fox), `ursus` (bear), `lupus` (wolf), `nix` (snow), `frīgus` (cold). Add as documented exceptions like `lignum`? | **Yes**, with `exception_reason` |
| D2 | How often a visitor arrives | **One every 6 hours**, at most one waiting at a time |
| D3 | How long a visitor waits before leaving | **24 hours** |
| D4 | Seasons/full moon by which clock | **The phone's local time** (Israel → northern-hemisphere seasons: winter = Dec–Feb) |
| D5 | Storm frequency | **About 1 day in 7**, decided per calendar day by a fixed formula (same for everyone, testable) |
| D6 | Trade mistakes count toward suspension? | **Yes** (SPEC lists "עסקת מסחר" explicitly): 3 failures → that visitor type rests `SUSPENSION_HOURS` |

Record the answers in `CLAUDE.md` → "החלטות שלב 4" and the numbers in `src/config.ts`.

### 3. New vocabulary and units (step 1)

Add words to `pipeline/curated/words.json` (fields as in existing entries: `id, pos, dcc_headword, meaning_he, element, family{en,he,note_he}, expressions, quotes?, tags?, deck?`). Then run `python3 pipeline/build_content.py` and check the output has forms, `pron_he` and `origin` for every new word.

DCC status (checked against `pipeline/sources/dcc_core.csv`):

| Word | DCC headword (exact) | Use |
| --- | --- | --- |
| volō (want) | `volō velle voluī` | trade requests |
| accipiō (receive/take) | `accipiō -cipere -cēpī -ceptum` | replies, `accipe!` |
| prō (+abl, in return for) | `prō` | offers |
| ūnus / duo / trēs | `ūnus -a -um`, `duo duae duo`, `trēs tria` | quantities |
| pretium (price) | `pretium -ī n.` | flavour, lessons |
| avis (bird) | `avis -is f.` | creature visitor |
| tempestās (storm, weather) | `tempestas -tātis f.` (note: DCC spells it without the macron) | event |
| plēnus (full) | `plēnus -a -um` | lūna plēna |
| semper, numquam, hodiē, satis, magis | as in DCC | lessons, trade talk |
| mercātor, vulpēs, ursus, lupus, nix, frīgus | **not in DCC** → `dcc_headword: null` + `exception_reason` (only if D1 = yes) | visitors, events |

Notes:
- `duo`/`trēs` may come from kaikki with unusual form keys (numerals). Inspect `content/words.json` after the build. If keys like `nom.pl.n` are present, the grammar engine can use them; if not, add the needed forms to the counter-offer number table in `src/world/numbers.ts` (section 6.4) rather than editing generated JSON.
- Assign `element` (spell cost) by meaning, as before. Add `tags`: visitors `["person"]` or `["creature"]`.
- Add a deck to `content/decks.json` only if you add ≥ 9 extra common words; otherwise skip.

**Units** (append to `content/units.json`, same exercise schema; 2 lessons × 8 exercises each; every unit uses ≥ 4 exercise types):

- `u10` "אני נותנת, אני רוצה — מסחר": present 1st person singular (`dō, volō, accipiō, habeō`), `prō` + ablative, numbers 1–3 with neuter agreement (`ūnum lignum, duo ligna, tria ligna`). New rules in `content/rules.json`: `pres-1sg` ("‎-ō = אני"), `pro-abl`, `numbers-1-3`.
- `u11` "יצורי היער": `avis, vulpēs, ursus, lupus` (+ reuse `canis, equus` from the Animalia deck — they are already words). Rule: none new required; reuse acc/dat/abl drills.
- `u12` "מזג אוויר ועונות": `tempestās, nix, frīgus, plēnus, hiems, lūna, semper, numquam, hodiē`. Rule `adj-agree-3` if you use 3rd-declension adjectives.
- `u10` has `"requires": { "building": "turris" }`? **No** — keep units sequential (no building gate). Visitors unlock when `u10-l1` is completed (section 6.3).

Content tests already enforce known forms, known rules and introduced-before-used words. Add `expect(units).toHaveLength(12)` in `src/content/content.test.ts`.

### 4. New content files (step 2)

#### 4.1 `content/visitors.json`
```json
{ "visitors": [
  { "id": "mercator", "word": "mercator", "kind": "merchant", "name_he": "סוחר נודד",
    "sprite": "merchant", "night_only": false, "min_lesson": "u10-l1",
    "wants": ["aqua", "terra", "ignis", "aer"], "offers": ["fuel", "terra", "aqua", "aether"],
    "greeting_la": "Salvē, vulpēs!", "greeting_he": "שלום לך, שועלה!" },
  { "id": "avis", "word": "avis", "kind": "creature", "name_he": "ציפור", "sprite": "bird",
    "night_only": false, "min_lesson": "u11-l1", "wants": ["aqua"], "offers": ["aer", "song"] },
  { "id": "vulpes", "word": "vulpes", "kind": "creature", "name_he": "שועל זקן", "sprite": "oldfox",
    "night_only": false, "min_lesson": "u11-l1", "wants": ["lux", "ignis"], "offers": ["hint", "aether"] },
  { "id": "ursus", "word": "ursus", "kind": "creature", "name_he": "דוב", "sprite": "bear",
    "night_only": false, "min_lesson": "u11-l2", "wants": ["fuel", "terra"], "offers": ["terra", "aqua"] },
  { "id": "lupus", "word": "lupus", "kind": "creature", "name_he": "זאב", "sprite": "wolf",
    "night_only": true, "min_lesson": "u11-l2", "wants": ["umbra", "aether"], "offers": ["umbra", "lux"] }
] }
```
- `wants` / `offers` items are element ids, or the special goods `"fuel"` (fire fuel units), `"song"` (`applyEffect({type:'song'})`), `"hint"` (`applyEffect({type:'hint'})`).
- `night_only: true` → may only arrive on a full-moon night (section 5).

#### 4.2 `content/trade_phrases.json` — the Latin a deal is written in
Deals are **generated** from templates so every sentence uses only taught grammar. Each template has slots filled from the deal; the generator must produce forms that exist in `words.json` (validate in a test).
```json
{ "requests": [
  { "id": "want-give", "la": "{WANT_ACC} volō. Prō {WANT_ABL} {N_OFFER} {OFFER_ACC} dō.",
    "he": "אני רוצה {WANT_HE}. תמורת {WANT_HE} אני נותן {N_OFFER_HE} {OFFER_HE}." }
  ],
  "replies": {
    "accept": { "la": "{WANT_ACC} tibi dō.", "he": "אני נותנת לך {WANT_HE}." },
    "decline": { "la": "Nōn dō.", "he": "אני לא נותנת." },
    "counter": { "la": "Prō {WANT_ABL} {N_COUNTER} {OFFER_ACC_N} volō!", "he": "תמורת {WANT_HE} אני רוצה {N_COUNTER_HE} {OFFER_HE}!" }
  },
  "goods_words": { "fuel": "lignum", "aqua": "aqua", "terra": "terra", "ignis": "ignis", "aer": "aer",
                   "aether": "aether", "lux": "lux", "umbra": "umbra", "song": "carmen", "hint": "verbum" } }
```
Slot meanings: `{WANT_ACC}` = accusative singular of the wanted good's word (`aquam`); `{WANT_ABL}` = ablative singular (`aquā`); `{OFFER_ACC}` = accusative of the offered good, **plural when N ≥ 2** (`ligna`); `{N_OFFER}` = numeral agreeing in gender and case with that word (`ūnum` / `duo` / `tria` for neuter, `ūnam` / `duās` / `trēs` for feminine accusative). Build these in code (section 6.4), not in JSON.

#### 4.3 `content/events.json`
```json
{ "events": [
  { "id": "full-moon", "word": "luna", "name_la": "Lūna plēna", "name_he": "ירח מלא",
    "description_he": "הירח מלא. לחשי אור וצל זולים יותר (umbra/lux אחד פחות), ויצורי לילה מבקרים.",
    "modifiers": { "mystic_discount": 1, "night_visitors": true }, "counter_spell": null },
  { "id": "winter", "word": "hiems", "name_la": "Hiems", "name_he": "חורף",
    "description_he": "קר ביער: האש נשרפת מהר פי 1.5, והגינה מייצרת חצי.",
    "modifiers": { "burn_multiplier": 1.5, "production": { "hortus": 0.5 } }, "counter_spell": "guard-fire" },
  { "id": "storm", "word": "tempestas", "name_la": "Tempestās", "name_he": "סערה",
    "description_he": "סערה! המבנים מייצרים חצי, ומבקרים לא מגיעים היום.",
    "modifiers": { "production_all": 0.5, "no_visitors": true }, "counter_spell": "shade" }
] }
```
`counter_spell` = id of an existing rule in `content/lab_effects.json` whose timed effect cancels the event's penalty while active: `fire-guard` cancels `burn_multiplier`; `shade` cancels `production_all` and `production` penalties. Implement the cancel inside the world modifiers (section 6.2). Events never take elements away.

Document all three files in `content/SCHEMA.md` (Hebrew, like the existing sections).

### 5. Calendar (pure, deterministic)

File `src/world/calendar.ts`:
- `moonAge(now): number`: days since a known new moon `Date.UTC(2000, 0, 6, 18, 14)` modulo the synodic month `29.530588853` days.
- `isFullMoon(now): boolean`: `moonAge` within ±1.0 day of `29.530588853 / 2`.
- `isWinter(now): boolean`: local month ∈ {11, 0, 1} (`new Date(now).getMonth()`; December = 11), per D4.
- `isStormDay(dayKey: string): boolean`: deterministic hash of the day string (e.g. FNV-1a 32-bit) `% 7 === 0` (D5). Use `dayKey` from `src/game/state.ts`.
- `activeEvents(now): EventDef[]`: the events active at `now`.
- `splitByDay(from, to): {from, to, dayKey}[]`: splits a time interval at local midnights (needed so offline time across several days gets each day's events).

Tests (`src/world/calendar.test.ts`): a known full-moon timestamp (e.g. `Date.UTC(2024, 0, 25, 18, 0)` is within a day of a full moon) returns true; a known new moon returns false; winter on 15 Jan, not on 15 Jul; `isStormDay` is stable for the same key and true for roughly 1/7 of 700 consecutive days (between 70 and 130); `splitByDay` covers the interval exactly.

### 6. Game logic (pure functions, all take `now`)

#### 6.1 Save v4 (`src/game/state.ts`, `src/storage/migrations.ts`)
Bump `SAVE_VERSION` to 4. Add to `SaveState`:
```ts
world: {
  /** When the world modifiers last ran (so offline time is counted exactly once). */
  lastWorldAt: number;
  visitor: VisitorState | null;      // at most one waiting visitor (D2)
  nextArrivalAt: number;             // epoch ms
  friendship: Record<string, number>;// successful trades per visitor id
  seenEvents: string[];              // event ids the player has been told about (for the banner)
};
stats: { …existing, trades: number, counterOffers: number };
```
```ts
interface VisitorState {
  id: string;            // visitors.json id
  arrivedAt: number;
  leavesAt: number;      // arrivedAt + VISITOR_STAY_HOURS (D3)
  deal: Deal;
  step: 'request' | 'understood' | 'done';
}
interface Deal {
  want: { good: string; amount: number };   // good = element id | 'fuel'
  offer: { good: string; amount: number };  // amount 1..3
  requestLa: string; requestHe: string;     // rendered from trade_phrases.json
  seed: number;
}
```
Migration `3 → 4`: `world = { lastWorldAt: <camp.lastProductionAt or createdAt>, visitor: null, nextArrivalAt: <same> + VISITOR_INTERVAL_HOURS*H, friendship: {}, seenEvents: [] }`, `stats.trades = 0`, `stats.counterOffers = 0`. Add a migration test (copy the existing v1 test in `src/game/stage2.test.ts` and extend it with a v3 save).

#### 6.2 World modifiers in `tick` (`src/world/modifiers.ts`)
Change `tick()` in `src/game/actions.ts` to:
```
accrueProduction(camp, now, productionFactor)   // new optional parameter
→ applyWorldToFire(camp, save.world.lastWorldAt, now)   // speeds up the fire in winter
→ pauseFire → burnFire → dropExpiredEffects
→ world.lastWorldAt = now
→ advanceVisitors(save, now)                     // 6.3
```
- `productionFactor(buildingId, from, to, camp): number` returns the **time-weighted** multiplier over `[from, to]` using `splitByDay`: for each segment, factor = 1 × (`production[buildingId]` or 1) × (`production_all` or 1), but **1** during any part of the segment covered by an active `shade` timed effect (counter spell). `accrueProduction` multiplies the elapsed ms by this factor (keep the existing light/garden-boost handling).
- `applyWorldToFire(camp, from, to)`: extra burn time `Σ segment_ms × (burn_multiplier − 1)` for winter segments, excluding time covered by `fire-guard` or `shade`; move `camp.lastBurnAt` **back** by that extra (the mirror of `pauseFire`). Only when `fuel > 0`.
- Tests: 24 h in winter with 6 fuel burns more than 24 h in summer; with `fire-guard` active the whole time, winter burns 0; storm halves 4 h of `hortus` production; shade cancels it; a 3-day offline gap that crosses one storm day applies the storm only to that day.

#### 6.3 Visitors (`src/world/visitors.ts`)
- `visitorsUnlocked(save)`: `save.lessons['u10-l1']` exists.
- `advanceVisitors(save, now)`:
  1. If a visitor is waiting and `now >= leavesAt` → remove it (it leaves; **no penalty**).
  2. While `nextArrivalAt <= now` and no visitor waiting and unlocked: pick a visitor for the arrival time `t = nextArrivalAt`:
     skip if `isStormDay(dayKey(t))`; eligible = visitors whose `min_lesson` is done, not suspended (`taskStatus(tasks['trade:'+id], t)`), and (`night_only` → `isFullMoon(t)`); choose with a seeded PRNG from `t` (reuse `seeded` from `src/art/draw.ts` or write `mulberry32`); build its `Deal` (6.4); `leavesAt = t + VISITOR_STAY_HOURS*H`. Then `nextArrivalAt += VISITOR_INTERVAL_HOURS*H`.
  3. If several intervals passed while away, only the **last** arrival matters (at most one waiting); fast-forward `nextArrivalAt` past `now`.
- `understandOptions(deal)` → 3 Hebrew options for "מה הוא מבקש?": the right one (`requestHe`) plus two distractors generated by swapping want/offer, or changing the number. Deterministic from `deal.seed`.
- `answerUnderstanding(save, choiceIndex, now)` → right: `step = 'understood'`; wrong: `recordFailure(tasks, 'trade:'+id, now)`; if it locks, the visitor leaves (set `visitor = null`). Rate the words in the request in FSRS (Good/Again), like lessons.
- `replyToDeal(save, kind: 'accept'|'decline', tiles: string[], now)`:
  - Expected tiles = the rendered reply sentence split into words (lower-case, no punctuation). Use `tilesMatch({answer, any_order: true}, tiles)` from `src/learning/exercises.ts`.
  - Wrong → `recordFailure`, return `diagnoseTokens(expected, tiles)` messages for the UI (same Hebrew explanations as lessons).
  - Accept + correct → check `canAfford` for `want` (fuel: `camp.fuel >= amount`); pay want, receive offer (`fuel` → `addFuel`; elements → `addElements`; `song`/`hint` → `applyEffect`); `friendship[id]++`; `recordSuccess`; `stats.trades++`; visitor leaves.
  - Decline + correct → visitor leaves politely; no exchange; counts as success for suspension.
  - Can't afford → outcome `'poor'` (not a failure), visitor stays.
- **Counter-offer** (available when `friendship[id] >= 2`, SPEC "בהמשך גם לנסח הצעה נגדית"): `counterOffer(save, n: 1|2|3, numeralForm: string, nounForm: string, now)`:
  - Grammar check with `src/world/numbers.ts`: the numeral must agree with the offered noun (gender, case = accusative, number: 1 → singular, 2–3 → plural) and the noun must be accusative of the right number. On error → failure + Hebrew explanation, e.g. "duo lignum — duo דורש רבים: duo ligna".
  - Acceptance rule: the visitor accepts if `n ≤ deal.offer.amount + 1` (asks for at most one more); otherwise it says "Nimis!" ("יותר מדי!"), no failure, try again. On accept: exchange with the new amount; `stats.counterOffers++`.
- `tradeTask(id)` = `'trade:' + id` (add next to `lessonTask`/`spellTask` in `src/game/tasks.ts`).

#### 6.4 Numbers (`src/world/numbers.ts`)
Hard-code the agreement table (do not rely on kaikki for numerals):
```ts
// accusative forms by gender
export const NUMERAL_ACC = {
  1: { m: 'ūnum', f: 'ūnam', n: 'ūnum' },
  2: { m: 'duōs', f: 'duās', n: 'duo' },
  3: { m: 'trēs', f: 'trēs', n: 'tria' },
} as const;
export const NUMERAL_HE = { 1: 'אחד', 2: 'שניים', 3: 'שלושה' } as const; // pick gender-correct Hebrew in UI if needed
```
`renderOffer(wordId, n)` returns `"duo ligna"` etc. using `NUMERAL_ACC[n][gender]` and the noun's `acc.sg` / `acc.pl`. Tests: lignum (n) 1/2/3 → ūnum lignum / duo ligna / tria ligna; aqua (f) 2 → duās aquās; agreement errors are detected.

### 7. UI (step by step, Hebrew strings, black-and-white safe)

1. **Camp scene** (`CampScene.tsx`, `buildingsArt.ts`): add a spot `visitor` at the path entrance (e.g. `{x: 150, y: 104, w: 18, h: 18}`, adjust so it doesn't overlap `fons`). Draw simple original pixel sprites per `sprite` id (merchant with a backpack, bird, old grey fox, bear, wolf). Overlay a speech bubble `!` (shape, not colour) when a visitor waits; tap → open `VisitorSheet`.
2. **Event visuals**: storm = diagonal rain pixels + darker sky; winter = snow pixels on the ground + white tree tops; full moon = draw the moon as a full disc (today it's a crescent). Add an event banner card on `CampScreen` (icon + `name_la` + `name_he` + `description_he` + which spell helps). Show each event's banner prominently the first time (`world.seenEvents`).
3. **`src/ui/screens/VisitorSheet.tsx`** (a `Sheet`):
   - Header: visitor `name_he` + clickable Latin name (`<La>`), greeting.
   - Step "request": the Latin request in large text (`<La>` so every word opens its card), then the question "מה הוא מבקש?" with the 3 options (`option` buttons, same classes as lessons so ✓/✗ + borders work in grayscale).
   - Step "understood": "מה עונים?" → two buttons "להסכים" / "לסרב", then a `TileBuilder` (reuse `src/ui/exercises/TileBuilder.tsx`) with the reply tiles + 2–3 distractor forms (wrong case / wrong person: e.g. `aqua`, `dat`). Check button → result with `diagnoseTokens` messages on error.
   - If `friendship ≥ 2`: a third button "הצעה נגדית" → number picker (1–3) + two ending wheels (reuse `Wheel` from `LabScreen.tsx` — export it) for the numeral and the noun.
   - Countdown "יעזוב בעוד …" (`Countdown` from `src/ui/components/common.tsx`).
   - Sounds: `play('correct' | 'wrong' | 'harvest')` on outcomes.
4. **Path screen**: no change except the new units.
5. **Settings → "איך המשחק עובד"**: add one line each for visitors and events.

### 8. Tests and verification

Unit tests (vitest), all with fixed `T0`:
- `src/world/calendar.test.ts` (section 5).
- `src/world/modifiers.test.ts` (section 6.2).
- `src/world/visitors.test.ts`: no visitor before `u10-l1`; arrival after 6 h; leaves after 24 h with no penalty; storm day → no arrival; `night_only` only on full moon; understanding right/wrong; 3 wrong → `trade:<id>` suspended and visitor gone; accept pays and receives correctly (fuel and elements); decline; poor; counter-offer agreement error explained; counter-offer accepted within +1, "Nimis" beyond; friendship gates counter-offers.
- `src/world/numbers.test.ts` (section 6.4).
- Content: every request/reply rendered for every visitor × goods × amount combination uses only forms that `lookupForm(form, true)` finds (iterate all combinations).
- Migration v3 → v4 test.

End-to-end (Playwright, phone size `devices['iPhone 13']`), as in previous stages: inject a save with lessons up to `u10-l1` done and `world.nextArrivalAt` in the past → reload → a visitor bubble appears → understand (right) → reply with tiles (first wrong, check the Hebrew diagnosis, then right) → elements changed. Repeat with `html { filter: grayscale(1) }` and check the visitor bubble, options and banner are still distinguishable. Take screenshots for the user.

### 9. Order of work (commit after each step; tests green each time)

1. Decisions (section 2) → `CLAUDE.md`, `src/config.ts` constants: `VISITOR_INTERVAL_HOURS`, `VISITOR_STAY_HOURS`, `STORM_ONE_IN_DAYS`.
2. Vocabulary + units 10–12 + rules (section 3) → pipeline run → content tests.
3. Content files `visitors.json`, `trade_phrases.json`, `events.json` + types in `src/content/types.ts` + loaders in `src/content/index.ts` + `SCHEMA.md`.
4. `calendar.ts` + tests.
5. Save v4 + migration + tests.
6. `modifiers.ts` wired into `tick` + tests (all existing tests must still pass).
7. `numbers.ts` + `visitors.ts` + tests.
8. UI: scene sprites + events visuals + banner.
9. UI: `VisitorSheet` (request → understanding → reply → counter-offer).
10. E2E run + screenshots; update `PROGRESS.md` (new "שלב 4" table), `CLAUDE.md` ("הגדרות משחק בשלב 4"), `content/SCHEMA.md`; push; tell the user in plain Hebrew what changed and offer a pull request (create it only if they say yes).

### 10. Definition of done

- [ ] All decisions recorded; constants in `src/config.ts`.
- [ ] 3 new units (6 lessons), every Latin form valid; `npm test` green; `npx tsc --noEmit` clean; `npm run build` succeeds.
- [ ] Visitors arrive/leave lazily and deterministically, also across offline time; storms block arrivals; wolves only on full moons.
- [ ] Trade: understanding question, tile reply with precise Hebrew diagnosis on mistakes, exchange, suspension after 3 failures, counter-offers with numeral agreement after 2 successful trades.
- [ ] Events: full moon (real lunar phase), winter (Dec–Feb), storm (~1/7 days); mild effects; counter spells cancel penalties; banners; scene visuals.
- [ ] Save v4 migration keeps all stage 1–3 progress.
- [ ] Works in black-and-white (no colour-only information), at phone width, offline.
- [ ] Docs updated (`CLAUDE.md`, `PROGRESS.md`, `content/SCHEMA.md`).

### 11. Out of scope for stage 4

- Battles (stage 5) and the esoteric layer (stage 6: tarot, close-reading of Tabula Smaragdina).
- Real-world weather APIs: everything must work offline and deterministically.
- Any server, account or ads (SPEC: free, no server).
