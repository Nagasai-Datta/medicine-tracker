# Medicine tracker

A one-tap medicine log for a phone. No backend server: the React app talks to
Supabase directly, so the only things you deploy are static files.

---

## 1. Scaffold the project

Save `setup.sh` to your Desktop, then in Terminal:

```bash
cd ~/Desktop
bash setup.sh
```

That creates `~/Desktop/medicine-tracker` with every file, the two app icons,
and runs `npm install`. It stops there because the next part needs your
Supabase keys.

---

## 2. Supabase, from zero

Supabase is a hosted Postgres database with an HTTP API in front of it. Coming
from MongoDB Atlas:

| Atlas | Supabase |
|---|---|
| Cluster | Project |
| Collection | Table |
| Document | Row |
| Connection string, kept on a server | Publishable key, safe to ship in the browser |
| Data Explorer | Table Editor |
| No equivalent | Row Level Security (RLS) |

The thing with no Atlas equivalent is the important one. In Atlas you hide the
connection string because whoever holds it owns the database. Supabase gives
the browser a **publishable key** instead. That key is designed to be public
and it will sit in your JavaScript bundle where anyone can read it. It grants nothing
on its own. Every table starts with all access denied, and the RLS policies in
`schema.sql` are what decide who can read and write which rows. That is the
whole reason this app needs no backend.

### 2a. Create the project

1. Go to supabase.com and sign in.
2. **New project**. Name it anything. Pick region **Mumbai** or **Singapore**.
3. It gives you a database password. You will not need it for this app, but
   save it somewhere anyway.
4. Wait about two minutes for it to finish provisioning.

### 2b. Create the tables

1. In the left sidebar click **SQL Editor**.
2. Click **New query**.
3. Open `schema.sql` from the project folder, copy all of it, paste it in.
4. Click **Run** (or Cmd+Enter).

You should see "Success. No rows returned". That is correct, it was a create
statement, not a select.

To check: left sidebar, **Table Editor**. You should see `medications` and
`dose_events`, both empty.

### 2c. Create the one login account

1. Left sidebar, **Authentication**.
2. **Users** tab, then **Add user** → **Create new user**.
3. Put in your own email and a password you choose. Write the password down,
   you will type it into her phone once.
4. Tick **Auto Confirm User**. Without this Supabase waits for an email
   confirmation and the login will fail.
5. Create user.

That is the only account that will ever exist. There is no sign-up screen in
the app, on purpose.

### 2d. Get your two keys

Supabase changed this in 2026. There is no longer a **Settings > API** page,
and the key is no longer a long string starting with `eyJ`. If a tutorial
tells you otherwise it was written for the old keys.

Easiest way:

1. At the top of your project dashboard click **Connect**.
2. Pick the framework tab, then copy the **Project URL** and the
   **publishable key**. It looks like `sb_publishable_...`.

If you would rather see every key your project has:

1. Left sidebar, **Project Settings** (the gear at the bottom).
2. Click **API Keys**.
3. Copy the **publishable** key. If the project does not have one yet, create
   it on that page first.

The Project URL is also shown under **Project Settings > Data API**.

Do **not** copy a **secret** key (`sb_secret_...`) or the legacy
`service_role` key. Those bypass every RLS policy and have no place in a
frontend. The publishable key is the one that is meant to be public.

If your project is older and only shows legacy `anon` and `service_role`
keys, the `anon` key still works and goes in the same place. It is being
retired at the end of 2026, so prefer the publishable key if you have both.

### 2e. Put them in the project

Create a file called `.env` in `~/Desktop/medicine-tracker` (same level as
`package.json`):

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Two gotchas: the variable names must start with `VITE_` or the app cannot see
them, and Vite does not hot reload this file, so restart the dev server after
you edit it.

---

## 3. Run it

```bash
cd ~/Desktop/medicine-tracker
npm run dev
```

Terminal prints two addresses. The one that looks like
`http://192.168.x.x:5173` is reachable from your phone if the phone is on the
same wifi. Open it on her iPhone and you are testing on the real device before
deploying anything.

Sign in with the email and password from step 2c, then use **Add a medicine**
twice. Pick how many times a day each one is taken.

---

## 4. Deploy

```bash
npm run build
```

Then:

1. Push the folder to a GitHub repo. `.gitignore` already excludes `.env`, so
   your keys do not go up.
2. On vercel.com, **Add New → Project**, import the repo. Vercel detects Vite
   on its own.
3. Before deploying, open **Environment Variables** and add the same two
   `VITE_` variables from your `.env`.
4. Deploy.

No server, no Render, no Hugging Face.

---

## 5. On her phone

Open the deployed URL in **Safari** (not Chrome, only Safari can install to
the home screen on iOS). Sign in once. Then **Share** → **Add to Home
Screen**.

She gets the green pill icon, no address bar, no browser chrome. The session
is stored in localStorage and refreshes itself, so she will not see the login
screen again. There is deliberately no sign out button anywhere in the app.

---

## 6. How the app decides colours

Two separate notions of "day", both in `src/day.js`, deliberately kept apart:

- `dayKey()` rolls over at **6am** and drives **card colour only**. A dose at
  9pm keeps the card green through the night; it turns red at 6am.
- `calendarDayKey()` rolls over at **real midnight** and drives the **ledger
  only**. A dose is always filed under the actual date it happened.

Card states, for a medicine with `doses_per_day = 2`:

| Doses taken | Card |
|---|---|
| 0 of 2 | All red, "Not taken", take button |
| 1 of 2 | Green body reading "1 of 2 today", red strip underneath with the take button |
| 2 of 2 | All green, "Taken", no button |

For `doses_per_day = 1` there is no middle state, it goes straight from red to
green.

A fully green card also has a small **Override** button. See section 10.

---

## 7. Where to change things

| What you want to change | File | Where in it |
|---|---|---|
| The 6am reset hour | `src/config.js` | `DAY_START_HOUR` |
| Timezone the day is pinned to | `src/config.js` | `TIME_ZONE` |
| Days of history in the ledger | `src/config.js` | `LEDGER_DAYS` |
| Dose counts offered in the add form | `src/config.js` | `DOSE_OPTIONS` |
| Any word she reads | `src/config.js` | `TEXT` |
| Green, red, every colour | `src/styles.css` | `:root` at the top |
| Size of the big status text | `src/styles.css` | `--mt-status-size` |
| Minimum button height | `src/styles.css` | `--mt-tap-height` |
| Every database query | `src/db.js` | whole file |
| Card state logic | `src/useLedger.js` | the `cards` map at the bottom |
| Dose numbers in the record | `src/doses.js` | `numberDoses` |

`DAY_START_HOUR` is read in exactly one function. Nothing else in the app does
date maths, everything asks `dayKey()` or `calendarDayKey()`, so changing that
one number changes the whole app consistently.

---

## 8. Archiving and deleting

Both are in the app now, under **Record → Edit** for whichever medicine tab is
selected. They are deliberately not on the cards, so she cannot hit them on
the screen she uses daily.

- **Archive** sets `active = false`. The card leaves the home screen and the
  medicine moves under the **Archived** toggle in the record, where its whole
  history is still readable. Reversible with "Put it back in use". No dose
  row is touched.
- **Delete permanently** removes the medication row, and the foreign key
  cascade takes every one of its dose rows with it. The confirm tells you how
  many doses you are about to destroy. There is no undo.

Delete needs one policy that the first version of `schema.sql` did not have.
If you created your tables before this, run `migration-add-delete.sql` once in
the SQL editor. A fresh `schema.sql` already includes it.

Note that individual doses still cannot be edited or removed. `dose_events`
has no update or delete policy. The only way anything leaves that table is
deleting a whole medicine on purpose.

## 9. When something does not work

**"Invalid API key" or a blank screen.** The `.env` file is missing, misnamed,
or the dev server was not restarted after you created it.

**Login fails with "Invalid login credentials".** You did not tick Auto
Confirm User in step 2c. Delete the user and create it again with the box
ticked.

**The app shows nothing but Table Editor shows rows.** This is the classic
one. Table Editor runs as an admin and ignores RLS, so rows always look
visible there. If the app cannot see them, your policies or the `user_id` on
those rows are wrong, not your query. Check that the rows' `user_id` matches
the user you are signed in as.

**Free tier pause.** Supabase pauses a free project after 7 days with zero
requests. She opens the app daily, so this will not happen. If it ever does,
the dashboard has a Restore button and no data is lost.

---

## 10. Override

For when **Done** was pressed by accident. A fully green card has a small
**Override** button. It opens a dialog with **Go back**, and one choice per
dose, always counting back from the most recent:

| Doses a day | Choices |
|---|---|
| 1 | Override |
| 2 | Override last 1 dose, Override all 2 doses |
| 3 | Override last 1 dose, Override last 2 doses, Override all 3 doses |

and so on up to 6. The card drops those doses and asks again: red "Not taken"
if all were overridden, the red strip if only some were. "Last taken" on a
red card ignores overridden doses. There is no limit on overrides, and the
6am reset works exactly as before.

**Nothing is deleted or changed.** `dose_events` keeps its select and insert
policies only, so it is still append only. An override is a row in a separate
`dose_overrides` table that says "do not count this dose on the card". That
table is append only too.

**The record keeps every dose**, one per line, each with its dose number for
that 6am day. Overridden doses are greyed and tagged with how many times that
dose number had been overridden that day:

```
Tue 30 Sep    8:00 am₁
              2:00 pm₂ (overridden 1)
              4:00 pm₂ (overridden 2)
              9:00 pm₂
```

The "(1 of 2)" hint only counts doses that were not overridden.

**To turn it on**, run `migration-add-override.sql` once in the SQL editor. A
fresh `schema.sql` already includes it. Until it has been run the app works
exactly as before and the Override button simply does not appear.
