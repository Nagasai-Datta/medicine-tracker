# Medicine tracker

A one-tap medicine log for an iPhone. Each medicine gets a big card that is red until it has been
taken today and green once it has. Every dose is written to a permanent record that can never be
edited or deleted.

It is built for one person, used every day, on one phone. That shapes most of the decisions below:
big buttons, as few choices as possible on the daily screen, and a record that cannot be changed by
accident.

- **Frontend:** React 18 + Vite, installed to the iPhone home screen as a web app
- **Backend:** none of our own. The app talks straight to **Supabase** (hosted Postgres + Auth)
- **Hosting:** Vercel, deployed from GitHub
- **Security:** Supabase Row Level Security (RLS) policies in the database

For first-time setup from zero (creating the Supabase project, keys, the login, the first deploy), see
[`SETUP.md`](SETUP.md). This README explains how the app works and how to change it.

---

## Contents

1. [What she sees](#1-what-she-sees)
2. [How the app decides colours](#2-how-the-app-decides-colours)
3. [The Override button](#3-the-override-button)
4. [The record (ledger)](#4-the-record-ledger)
5. [Editing, archiving and deleting medicines](#5-editing-archiving-and-deleting-medicines)
6. [How it is built](#6-how-it-is-built)
7. [Database and security](#7-database-and-security)
8. [Project files](#8-project-files)
9. [Running it locally](#9-running-it-locally)
10. [Testing safely](#10-testing-safely)
11. [Deploying](#11-deploying)
12. [Branches and versions](#12-branches-and-versions)
13. [Where to change things](#13-where-to-change-things)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. What she sees

One screen, top to bottom:

1. **A card for every medicine in use.**
2. **Add a medicine**: a name and how many times a day (1 to 6).
3. **Record**: a tab per medicine showing the last 21 days, with **Edit** underneath.

There is no sign-up screen and no sign-out button, on purpose. The login is created once in the
Supabase dashboard, typed in once, and the session refreshes itself.

### Taking a dose

1. She taps **I am taking it now** on a red card.
2. A dialog says **Press done only after you have swallowed the tablet** with **Done** and **Go back**.
3. **Done** saves the dose with the current time. The card updates straight away.

A second tap on a slow phone is ignored, and the dose id is generated on the phone, so a retry can
never create two doses.

---

## 2. How the app decides colours

There are two different ideas of "a day" in the app, and they are kept apart on purpose. Both live
in `src/day.js`, and nothing else in the app does date maths.

| Function | Day starts at | Used for |
|---|---|---|
| `dayKey()` | **6am** (`DAY_START_HOUR`) | Card colour, dose counts, dose numbers |
| `calendarDayKey()` | **Midnight** | Which date a dose is filed under in the record |

So a dose taken at 9pm keeps the card green all night, and the card turns red again at 6am. A dose at
12:30am still counts towards the day before for the card, but the record files it under the real
date it happened.

All times are pinned to `Asia/Kolkata`, whatever time zone the phone is set to.

### Card states

For a medicine taken twice a day:

| Doses counted today | Card |
|---|---|
| 0 of 2 | All red, "Not taken", "Last taken ..." line, take button |
| 1 of 2 | Green, "1 of 2 today", with a red strip "1 more to take today" and a take button |
| 2 of 2 | All green, "Taken", and a small **Override** button |

A once-a-day medicine goes straight from red to green.

Card state is **never stored**. It is worked out every time from the dose rows (minus any
overridden ones) in `src/useLedger.js`. When the app comes back to the front (iOS suspends it rather
than reloading), it re-reads everything, so a card never stays green from yesterday.

---

## 3. The Override button

This is for when **Done** was pressed by accident. Only a fully green card has an Override button.
The button is deliberately small and plain, and it opens a dialog with **Go back** before anything
happens.

The dialog offers one choice per dose, always counting back from the most recent:

| Doses a day | Choices |
|---|---|
| 1 | Override |
| 2 | Override last 1 dose, Override all 2 doses |
| 3 | Override last 1 dose, Override last 2 doses, Override all 3 doses |
| ... | ... up to 6 |

After an override:

- The card stops counting those doses: red "Not taken" if all were overridden, the red strip if
  only some were. She can then take the dose again normally.
- "Last taken" on a red card ignores overridden doses.
- There is **no limit** on how many overrides can happen.
- The 6am reset works exactly as before.

### Nothing is deleted

An override does **not** touch the dose. It adds a row to a separate `dose_overrides` table that
says "do not count dose X on the card". The dose stays in `dose_events` and in the record forever,
marked as overridden. Both tables only ever get new rows (see [section 7](#7-database-and-security)).

### If the override table does not exist

If `migration-add-override.sql` has not been run, the app notices the table is missing and behaves
exactly like the version before overrides: no Override button, everything else unchanged. Any other
error (a network drop, for example) is shown like every other error, rather than quietly counting an
overridden dose again.

---

## 4. The record (ledger)

Under **Record**, each medicine has a tab showing the last 21 days, newest first, starting from the
day the medicine was added.

Each dose is on its own line with a small **dose number**: which dose of the day it was (1st, 2nd,
...). Overridden doses are greyed out and tagged with how many times that dose number had been
overridden that day:

```
Tue 30 Sep    8:00 am₁
              2:00 pm₂ (overridden 1)
              4:00 pm₂ (overridden 2)
              9:00 pm₂
```

That reads: dose 1 at 8am. Dose 2 was pressed by accident at 2pm and overridden, pressed by accident
again at 4pm and overridden again, then really taken at 9pm.

- Days with nothing show **No entry** in red.
- If a day has fewer counted doses than it should, a red **(1 of 2)** is shown. Overridden doses are
  not counted.
- Dose numbers use the 6am day, the same as the card, so "dose 2" in the record is the dose that
  made the card read "2 of 2".

### How dose numbers are worked out

In `src/doses.js`, a dose's number is 1 plus the doses before it that same day that were **still
counting when it was taken**. A dose that had already been overridden no longer counted, so the dose
taken again afterwards gets the same number as the one it replaced. This is why overrides store
their own time (`overridden_at`).

---

## 5. Editing, archiving and deleting medicines

These are under **Record → (medicine tab) → Edit**, never on the cards, so they cannot be hit by
accident on the daily screen.

| Action | What happens | Undo? |
|---|---|---|
| **Rename** | Changes the name. | Rename again |
| **Archive** | Takes the card off the home screen. Its record stays readable under the **Archived** toggle. No dose is touched. | "Put it back in use" |
| **Delete permanently** | Removes the medicine **and every dose and override it has**. The confirmation says how many doses will go. | **No** |

Deleting a whole medicine is the only way anything ever leaves the record.

---

## 6. How it is built

```
iPhone (home-screen web app)
   │  React app, static files served by Vercel
   │
   └──► Supabase
          ├─ Auth          one email + password login
          └─ Postgres      medications, dose_events, dose_overrides
                           protected by Row Level Security
```

There is no server of our own. The browser talks to Supabase directly using the **publishable key**,
which is designed to be public and ends up in the JavaScript bundle. The key grants nothing on its
own. The RLS policies in the database decide what the logged-in user can read and write.

Data flow:

- **On open and on every return to the app:** fetch medicines, the last ~23 days of doses and their
  overrides, all at the same time (`load()` in `src/useLedger.js`).
- **Taking a dose:** insert one row into `dose_events`, then update the screen straight away.
- **Overriding:** insert rows into `dose_overrides`, update the screen, then re-fetch so the screen
  matches the database.
- **Everything shown** (card colours, counts, dose numbers) is worked out from those rows. Nothing
  derived is stored.

---

## 7. Database and security

Schema: [`schema.sql`](schema.sql) (the full thing, for a new project). Migrations for an existing
project: [`migration-add-delete.sql`](migration-add-delete.sql) and
[`migration-add-override.sql`](migration-add-override.sql).

### Tables

**`medications`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Generated on the phone |
| `user_id` | uuid | Defaults to the logged-in user |
| `name` | text | |
| `doses_per_day` | smallint | 1 to 6 |
| `active` | boolean | `false` = archived |
| `created_at` | timestamptz | The record starts from this day |

**`dose_events`**: one row per dose taken

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Generated on the phone, so a retry cannot duplicate |
| `user_id` | uuid | |
| `medication_id` | uuid | Deleting the medicine deletes these (cascade) |
| `taken_at` | timestamptz | Phone time when Done was pressed |
| `created_at` | timestamptz | Server time |

**`dose_overrides`**: one row per overridden dose

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Generated on the phone |
| `user_id` | uuid | |
| `dose_event_id` | uuid | **Unique**: a dose can only be overridden once. Cascades with its dose |
| `overridden_at` | timestamptz | Phone time, so it compares cleanly with `taken_at` |
| `created_at` | timestamptz | Server time |

### Who can do what (RLS)

| Table | Read | Add | Change | Delete |
|---|---|---|---|---|
| `medications` | own | own | own | own |
| `dose_events` | own | own | **nobody** | **nobody** |
| `dose_overrides` | own | own doses only | **nobody** | **nobody** |

`dose_events` and `dose_overrides` are **append-only in the database itself**, not just in the app.
There is no update or delete policy, so not even the owner's account can rewrite them. The only way a
dose or override disappears is deleting its whole medicine, which Postgres cascades.

### Logins

Users live in Supabase's own `auth.users` table (**Authentication → Users** in the dashboard). Each row
in the tables above points to a user by `user_id`, so each login only ever sees its own data.

---

## 8. Project files

```
index.html                 Page shell, iPhone home-screen meta tags
public/manifest.json       Home-screen app name, icon, colours
public/icon-180.png        iPhone icon
public/icon-512.png

src/main.jsx               Entry point
src/App.jsx                Login gate, the main screen, which dialog is open
src/config.js              Every setting and every word she reads
src/day.js                 All date maths: dayKey, calendarDayKey, formatting
src/db.js                  Every Supabase call
src/useLedger.js           Loads data, works out card state, actions
src/doses.js               Dose numbers and override counts for the record
src/styles.css             All styling; colours are variables at the top

src/components/
  MedicineCard.jsx         One card (red / partial / green + Override)
  ConfirmDialog.jsx        "Press done only after..." dialog
  OverrideDialog.jsx       Override choices + Go back
  AddMedicine.jsx          Add form (name + doses a day)
  Ledger.jsx               Record tabs, day rows, dose lines
  EditMedicine.jsx         Rename / archive / delete
  Login.jsx                Email + password

schema.sql                 Full database schema for a new project
migration-add-delete.sql   Adds the delete policy (projects created before delete existed)
migration-add-override.sql Adds dose_overrides (projects created before overrides existed)
SETUP.md                   First-time setup, step by step
.env.example               The two environment variables the app needs
```

---

## 9. Running it locally

You need Node.js and a `.env` file in the project folder (never committed; `.gitignore` excludes it):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
npm install     # first time only
npm run dev     # starts on http://localhost:5173
```

The terminal also prints a `http://192.168.x.x:5173` address. Open that on a phone on the same wifi
to test on a real device. Restart `npm run dev` after editing `.env`; Vite does not reload it.

`npm run build` makes the production files in `dist/`. `npm run preview` serves them locally.

> **Your local app uses the real database.** Anything you press locally ends up in her real record.
> See the next section.

---

## 10. Testing safely

Doses and overrides cannot be removed, so never test on her real medicines. Two safe ways:

**A test login (safest).** In Supabase go to **Authentication → Users → Add user → Create new
user**, use any email, and tick **Auto Confirm User**. Log in with it locally. Because of RLS it starts
empty and cannot see or touch her data. Delete the user when finished, and everything it created goes
with it.

**A throwaway medicine.** Add a medicine called `TEST`, try things, then delete it with
**Edit → Delete permanently**, which removes its doses and overrides too. Her phone shows the TEST
card while it exists, so do this when she is not using the app.

---

## 11. Deploying

Vercel is linked to the GitHub repo, so **pushing to `main` deploys automatically**. Pushes to other
branches only make preview links, and her app is not affected.

1. Run any new migration in **Supabase → SQL Editor** first. The app copes if you forget, because
   new features stay hidden until their table exists.
2. `git push origin main`
3. Vercel → **Deployments**: the new one shows **Ready** in a minute or two.
4. On her phone, swipe the app fully closed and reopen it. There is no service worker, so she gets
   the new version straight away.

**Rolling back:** Vercel → Deployments → the previous one → **Instant Rollback**.

The two `VITE_` variables must be set in Vercel → Project → Settings → Environment Variables. If
they are set for Production only, preview links show a blank page, which is harmless.

---

## 12. Branches and versions

| Branch | What it is |
|---|---|
| `main` | What is live on Vercel |
| `v1` | The app before overrides: one-tap log, record, add / rename / archive / delete |
| `v2` | v1 + Override, dose numbers in the record, 1 to 6 doses a day, popups pinned to the screen |

### What v2 changed

- **Override** button and dialog on green cards (`MedicineCard.jsx`, `OverrideDialog.jsx`, `App.jsx`)
- **`dose_overrides`** table (`migration-add-override.sql`, `schema.sql`)
- Cards stop counting overridden doses (`useLedger.js`, `db.js`)
- Record: one dose per line, dose numbers, "(overridden n)" tags (`Ledger.jsx`, `doses.js`)
- Add form offers **1 to 6** doses a day (`config.js`). The database already allowed up to 6.
- Popups are pinned to the **screen** (`position: fixed`), not the top of the page. Before this, a
  popup opened from a card lower down the page could appear above the visible screen.

Workflow for a new version: branch from `main` (for example `git checkout -b v3`), change and test,
push the branch, then merge into `main` and push.

---

## 13. Where to change things

| To change | File | Where |
|---|---|---|
| The 6am reset hour | `src/config.js` | `DAY_START_HOUR` |
| Time zone | `src/config.js` | `TIME_ZONE` |
| Days of history in the record | `src/config.js` | `LEDGER_DAYS` |
| Doses-a-day choices | `src/config.js` | `DOSE_OPTIONS` (the database allows 1 to 6) |
| Any word she reads | `src/config.js` | `TEXT` |
| Colours | `src/styles.css` | `:root` at the top |
| Size of the big status text | `src/styles.css` | `--mt-status-size` |
| Minimum button height | `src/styles.css` | `--mt-tap-height` |
| Database queries | `src/db.js` | whole file |
| Card logic | `src/useLedger.js` | the `cards` map near the bottom |
| Dose numbers in the record | `src/doses.js` | `numberDoses` |

---

## 14. Troubleshooting

**Blank screen or "Invalid API key".** `.env` is missing or misnamed, or the dev server was not
restarted after editing it. On Vercel, check the two environment variables.

**Login fails with "Invalid login credentials".** Wrong password, or the user was created without
**Auto Confirm User**.

**Forgot the password.** Supabase never shows passwords, and the reset email is no use because the
app has no "choose a new password" screen. Set a new one in **SQL Editor** instead. Copy the UID from
**Authentication → Users**:

```sql
update auth.users
set encrypted_password = extensions.crypt('NEW-PASSWORD', extensions.gen_salt('bf'))
where id = 'USER-UID-HERE'
returning id, email;
```

It should return exactly 1 row. Only the password changes, and all data stays linked to the same
UID. Phones that are already logged in stay logged in.

**Password reset emails point to `localhost:3000`.** That is Supabase's default **Site URL**. You can
change it under **Authentication → URL Configuration**, but the app does not use these emails.

**The app shows nothing but Table Editor shows rows.** Table Editor ignores RLS. Check that the rows'
`user_id` matches the user you are logged in as.

**No Override button.** It only shows on fully green cards, and only after
`migration-add-override.sql` has been run.

**A dose after midnight appears under the next date.** That is by design: the record files doses
under their real date, while the card and dose numbers use the 6am day
([section 2](#2-how-the-app-decides-colours)).

**Supabase free tier pause.** A free project pauses after 7 days with no requests. Daily use prevents
it. If it happens, the dashboard has a Restore button and no data is lost.
