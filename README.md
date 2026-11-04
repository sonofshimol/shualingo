# שועלינגו

אפליקציה חינמית ללימוד לטינית מאפס. כל שיעור מזין משחק אסטרטגיה איטי: שועלה קוסמת מקימה מחנה ביער, ולטינית היא שפת הקסם של העולם.

- האפיון: [`SPEC.md`](SPEC.md)
- ההחלטות והנחיות לפיתוח: [`CLAUDE.md`](CLAUDE.md)
- מה נעשה ומה נשאר: [`PROGRESS.md`](PROGRESS.md)
- מבנה קובצי התוכן: [`content/SCHEMA.md`](content/SCHEMA.md)

## הרצה

```bash
npm install
npm run dev        # http://localhost:5173/shualingo/
npm test
npm run build
```

הקובץ `content/words.json` נבנה מהמקורות (DCC ו-kaikki.org) על ידי `npm run content` (Python 3, בלי ספריות נוספות).

## רישיונות התוכן

אוצר המילים מ-DCC Latin Core Vocabulary (CC BY-SA). נטיות, הגייה ומילים קרובות מוויקימילון דרך kaikki.org (CC BY-SA). חזרה מרווחת עם ts-fsrs (MIT).
