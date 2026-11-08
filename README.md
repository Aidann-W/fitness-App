# CumulusFit ☁️🏋️

**A little stronger. A little higher.**

CumulusFit is a strength-training web app for beginner and intermediate lifters. Gemini builds your workout, swaps exercises when the gym is busy, and plans gym time around your calendar. Every set you log syncs to the cloud, so your progress follows you to any device.

**HackRPI 2026** · Theme: **In the Clouds** · Prize track: **Best Use of Gemini API**

> **Live demo:** _add the deployed link here_

---

## The idea

Most people who start lifting quit for the same few reasons. They don't know what to do, the machine they planned on is taken, they can't tell whether they're improving, and they never fit the gym into their week.

CumulusFit covers each of those:

| Problem | What CumulusFit does |
|---|---|
| "I don't know what workout to do." | Gemini builds a routine from your goal, experience, equipment, time, and focus. |
| "The squat rack is taken." | Gemini swaps in an exercise that trains the same muscles with equipment you have. |
| "Am I actually getting stronger?" | Every set is logged. You see last time's numbers, a next-session target, and a strength chart. |
| "I can't find time to go." | Import your calendar and Gemini picks gym times around your classes and work. |

---

## How it fits "In the Clouds"

- **Your training lives in the cloud.** Routines, every logged set, and your gym schedule sync through Supabase. Create an account and the same data appears on your phone and laptop.
- **The AI runs in the cloud.** Gemini handles workout generation, exercise swaps, and weekly planning on the server.
- **It still works with a weak signal.** If the cloud can't be reached mid-workout, completed sets are kept on the device and retried. Routines and history load from a local copy.
- **It looks the part.** The design is pale sky blues with soft clouds. The weekly stats count every pound lifted as a foot climbed and show the cloud layer you've reached. For example, 9,100 lb is altocumulus height.

---

## How we use Gemini

Gemini (`gemini-3.5-flash` through the `@google/genai` SDK) powers three features. Each call runs on the server and asks for structured JSON with a response schema, and the app checks the result before using it.

1. **Routine generation.** Goal, experience, equipment, session length, and focus go in. A titled routine comes out, with sets, reps, rest, and a coaching note for each exercise.
2. **Exercise swap.** Tell it what's wrong ("the leg press is taken"). Gemini returns one replacement that trains the same muscles with the same movement pattern, without repeating anything already in the workout.
3. **Weekly gym schedule.** Gemini gets your busy times as clock times, your gym hours, how many days you want, preferred time of day, and free-text notes like "no gym on Sundays". It returns a session time for each day with a one-line reason.

**Built to hold up in a live demo:**
- If `gemini-3.5-flash` is overloaded or slow, the request retries once on `gemini-3.5-flash-lite`.
- The server checks every suggested gym time against your busy blocks, gym hours, and a 15-minute travel buffer. If Gemini comes up short, a built-in planner fills the remaining days so you still get a schedule.
- Gemini routes only answer signed-in users, so the API key's quota can't be drained by anonymous scripts.

---

## Features
- Dashboard: Display a summary of your workouts, with different features such as a "Resume" button to continue workouts in progress. It also displays the your next workout along with pathways to the different pathways towards creating your own workout.
- Training: Allows users to set their own workout plan or utilize AI to creating their own workout plan. Displays an excerise plan which users can edit number of sets, reps, rest, and number of excercises. If a user begins a new workout  and previously recorded a workout the website will display what they did in the past and what they have upcoming for their workout.
- My routines: Displays the different plans a user has for their workout highlighting the different muscles and goals the user aims to be achieving through their workout.
- Activity: Displays the different sets you have logged and the your progress on your different roles. 
- Schedule: Users can upload their calendars and the AI can use this to map out what times are optimal for the user to start their workout and allows the user to export these changes to their own calendar.
- Saving Progress: Allows users to save their progress by logging in which allows htem ot keep track of their own workouts and progress
- Swap: Allows users to swap out excercises if different machines are not available allowing users to still achieve progress on their workout without using those unavailable machines.
- Mobile: Interface is compatible on mobile devices allowing users to have even greater access to the website
- Rest Timer: After a rep of an excercise is logged as being complete their is a built in rest timer ensuring that users rest for the approriate amount of time
- Weekly Stats: Displays the amount of weight that the user has lifted per week allowing the user to track their progress
### Plan
- **Create with AI.** A short form, then a Gemini-built routine.
- **Build your own.** Start from a blank routine. The exercise field autocompletes from a built-in catalog of 133 exercises, 6 per page. Browse by split (upper, lower, push, pull, legs, core) or by muscle, or type any custom exercise.
- **Edit anything.** Name, description, exercises, sets, reps, and rest. Changes save automatically.
- **Presets.** Hypertrophy Push Day and Vertical Jump & Leg Power. Editing a preset saves your own copy.

### Train
- **Live workout mode.** Enter weight and reps for each set and tap Done. Sets save as you go.
- **Rest timer.** Starts after each set, with +30s and Skip, and keeps time if you leave the page.
- **Resume anywhere.** Refresh mid-workout and you're back where you were.
- **Swap mid-workout** when equipment is taken.

### Track
- **Last time.** Every exercise shows what you lifted in your previous workout.
- **Next-session targets.** For example, "Target: 155 lb × 6 · You hit 8 reps on every set, so add 5 lb." Targets use double progression: add reps until you top the planned range, then add 5 lb. The next workout fills in the target weight and reps, and the app never invents a weight for an exercise you haven't done.
- **Strength chart.** Your heaviest set each workout, per exercise, with hover or tap details and a table view.
- **Weekly stats.** Pounds lifted in the last 7 days, plus the cloud-layer altitude.
- **Recent workouts.** Date, sets, and exercises.

### Schedule
- **Import your calendar** as an `.ics` file from Google Calendar, Apple Calendar, or Outlook. Only busy times are used. Event names never leave your device.
- **Plan my week with AI.** Choose days per week, session length, gym hours, preferred time of day, and notes.
- **Edit by hand.** Add, move, or remove gym sessions on any day.
- **Export.** Download an `.ics` file for any calendar app, or use one-click "Add to Google Calendar" links.
- Optional direct Google Calendar connection using availability-only access. It needs a Google OAuth client ID (see setup).

### Accounts, sync, and install
- **No sign-up needed to start.** Every visitor gets an anonymous account, so judges can try the app immediately.
- **Save your progress.** Add an email and password at any time. Your existing workouts move into the account and sync to other devices.
- **Install as an app.** Add it to your home screen on Android or iPhone and it opens full screen like a native app.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API routes (Node.js 20) |
| Database & auth | Supabase: PostgreSQL with row-level security, anonymous plus email/password auth |
| AI | Google Gemini API (`@google/genai`): `gemini-3.5-flash`, with `gemini-3.5-flash-lite` as fallback |
| Calendar | `ical.js` for reading `.ics` files, Google Calendar FreeBusy API (optional) |
| Install | Web app manifest with home-screen icons |

### Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│ BROWSER                                                              │
│ Home · Workout mode · Exercise picker · Progress chart · Schedule    │
│ Local copy of routines, history, and the active workout              │
│ .ics parsing happens here, so only busy times are ever sent          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ fetch('/api/…') with the user's Supabase token
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ NEXT.JS API ROUTES                                                   │
│ /api/generate-routine   ──▶ Gemini: build a routine                  │
│ /api/modify-routine     ──▶ Gemini: swap one exercise                │
│ /api/plan-schedule      ──▶ Gemini: plan gym times, then validate    │
│ /api/routines           ──▶ Supabase: routines                       │
│ /api/set-logs           ──▶ Supabase: completed sets                 │
│ /api/schedule           ──▶ Supabase: planned gym sessions           │
└──────────────────────────────────────────────────────────────────────┘
```

API routes query Supabase as the signed-in user, so row-level security limits everyone to their own routines, sets, and gym sessions.

---

## Privacy and security

- Row-level security on every table. We tested that one account can't read, change, or delete another's data.
- The Gemini API key stays on the server. The browser only gets Supabase's public key, which is restricted by those row-level security policies.
- Calendar files are read in the browser. Only start and end times of busy blocks are kept, and they aren't stored in the database.
- The direct Google Calendar connection requests availability only (`calendar.freebusy`), never event details.

---

## Running it locally

**Requirements:** Node.js 20+, a Supabase project, a Gemini API key.

1. **Install**
   ```bash
   cd website
   npm install
   ```
2. **Environment.** Copy `website/.env.example` to `website/.env.local` and fill in:
   ```bash
   GEMINI_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   # Optional
   GEMINI_MODEL=gemini-3.5-flash
   GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=   # shows "Connect Google Calendar"
   ```
3. **Supabase**
   - Run `website/supabase/schema.sql` in the SQL Editor. It is safe to run again.
   - Under Authentication, turn on **anonymous sign-ins** and turn off **Confirm email**.
4. **Start**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

**Demo data.** Create an account in the app, put its email at the top of `website/supabase/seed-demo.sql`, and run that file in the SQL Editor. You get four weeks of progressive workouts, a saved Pull Day routine, and planned gym sessions. Running it again replaces only its own rows.

---

## Known limitations

- Weights are in pounds only.
- The direct Google Calendar connection needs a Google Cloud OAuth client, and only listed test users can connect until Google verifies the app. Uploading an `.ics` file works for everyone.
- All-day calendar events such as birthdays are ignored when finding busy times.
- No offline service worker. The app needs a connection to load, though a workout in progress survives a dropped connection.

---
## Website Address
- https://fitness-app-phi-gold.vercel.app/dashboard
## Team

Built at HackRPI 2026 by Aidan Warren, Cooper Lam, and Pavel DeSouza.
