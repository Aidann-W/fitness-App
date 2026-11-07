# AI fitness app — hackathon specification

## Status and goal
This is the active product plan. It supersedes the crowded-gym concept in `crowded-gym-spec.md`, which remains historical context only. Planning does not authorize implementation or publication.

Build a free-to-use, mobile-friendly strength-training web app for beginner and intermediate gym users. Users generate today's workout, understand exercise choices, complete and log sets, and review progress. Distinctive extras follow only after the core works.

Team: three people with a little HTML, JavaScript, and Python experience. Gemini key available. Deadline: November 8, 2026, 11 a.m. America/New_York. Reviewed ceremony slides say create the Devpost entry before 9 a.m.; select prize tracks explicitly.

## Confirmed decisions
- AI generates workouts and explains exercise choices.
- Generation inputs: saved goal, beginner/intermediate experience, equipment, duration, and today's muscle focus.
- Suggest muscle focus with a simple rule based on recent completed workouts; permit manual override.
- Active workout supports editable weight/reps, completing sets, a rest timer, exercise instructions, and “Why this exercise?” explanations.
- Show previous logged weight when available; otherwise user enters it. Do not invent personalized starting loads.
- Supabase stores profiles and workout history, with email/password sign-in.
- Include a progress dashboard with history and a simple strength trend.
- Visual direction: cool blue-gray with monochrome workout photography, rounded cards, clear hierarchy, and mobile-friendly navigation.
- Supabase project has not been created. Framework/hosting preferences were not specified by the user.

## Observed project context
The repository now contains a `website/` Next.js/React/TypeScript scaffold with Gemini and Supabase dependencies, a Gemini utility, and a generate-routine route. File presence is not proof that those integrations work; implementation must inspect them before editing. Reuse this scaffold unless a concrete blocker warrants a change. Follow `website/AGENTS.md`, including reading relevant installed Next.js guides before writing code. No separate Python backend is proposed.

## Proposed defaults
These implementation details are recommendations, not separately confirmed requirements:
- Goal choices: strength, muscle building, general fitness. Duration: 15/30/45/60 minutes. Start with a concise equipment checklist.
- Focus choices: full body, upper body, lower body, push, pull. No completed history suggests full body. Otherwise choose the broad focus least recently trained, with a deterministic tie-break and a visible explanation. This is a scheduling heuristic, not a measured recovery score.
- Let users choose lb or kg, store the unit with every set, and normalize values for comparisons. Prefill from the latest completed set for the same exercise, converted to the current unit and labeled as previous performance.
- Use a curated catalog of approximately 20–30 exercises with stable IDs, equipment, primary muscles, instructions, and optional licensed images. AI selects catalog entries; it does not invent exercises.
- An exercise swap is a stretch feature. Automatic crowded-gym adaptation and buddy workflows are not baseline requirements.
- No subscriptions/paywall for the demo. Long-term AI operating costs and funding are unresolved; free access does not imply zero operating cost.

## Main user flows
### Account and profile
Sign up or sign in with email/password. Show email-confirmation guidance when required by project configuration. Save goal, experience, equipment, preferred duration, and weight unit. Allow later editing and sign-out. Provide understandable authentication errors. Password reset is desirable but may follow the demonstrated core.

### Generate today's workout
Dashboard presents a suggested focus with manual override, session settings, and Generate action. A single pending request disables repeat submission. Server receives validated inputs and requests a structured routine from Gemini using allowed exercise IDs. Show exercises, sets, reps, rest duration, instructions, and short personalized rationale. Users start the routine or regenerate before starting; regeneration must not overwrite an active logged session without an explicit choice.

### Complete a session
Exercise cards or an exercise detail view expose editable reps and load, set completion, instructions, and rationale. Completing a set persists its actual values and starts the rest timer. Timer can be skipped or adjusted and does not cover logging controls. Use a target end timestamp so backgrounding does not freeze elapsed rest. Completed sets can be corrected or unchecked.

Save an active session and allow resume after refresh/sign-in. Finishing a partially completed session preserves only actual completed work for progress calculations. Keep the planned workout for reference. Prevent duplicate submissions of the same set or session finish.

### Review progress
Show completed workout history with date, focus, and completed sets; allow opening a session detail. Dashboard includes workouts completed this week and an exercise-selectable strength chart. Proposed chart metric: maximum logged load per session for that exact exercise, with reps visible in the tooltip/detail. Label the metric explicitly; it is not proof of a strength increase when reps or technique differ. Never combine different exercises or unconverted units. Empty history invites the first workout; a single point does not imply a trend. No fabricated stats, calories, heart rate, or recovery scores.

## Screens and visual requirements
1. Authentication and concise profile setup.
2. Home: today's workout or resume state, generation settings, focus suggestion, recent activity.
3. Active workout: clear current exercise, set table, completion controls, compact timer, instructions/rationale.
4. Progress/history: real summaries, exercise trend, session details.
5. Profile/settings, which can be a compact sheet rather than a separate full screen.

Use cool pale backgrounds, dark slate text, restrained blue accents, rounded surfaces, and monochrome fitness photography. Reserve photography for useful context and key cards; logging takes visual priority during a session. Use original layouts inspired by references, not copied assets. Mobile bottom navigation: Home, Progress, Profile; active workout remains resumable. Minimum touch targets around 44px, readable labels, keyboard support, visible focus, and no color-only completion states.

Visual references:
- https://www.cosmos.so/e/1201604612
- https://www.cosmos.so/e/1121426528
- https://www.cosmos.so/e/152500289
- https://www.cosmos.so/e/407933117

## Data and integration plan
Suggested tables:
- profiles: auth user ID, goal, experience, equipment, preferred duration, unit.
- exercises: stable ID, name, equipment, muscles, instructions, image reference.
- workouts: ID, owner ID, status (planned/active/completed), settings snapshot, focus, start/finish timestamps.
- workout_exercises: workout ID, exercise ID, position, planned sets/reps/rest, rationale.
- workout_sets: workout exercise ID, set index, actual reps/load/unit, completed timestamp.

Enforce user ownership for all private records using Supabase row-level security, including child records. Test with two accounts. Catalog can be read-only shared data. Keep Gemini calls server-side; do not expose Gemini or Supabase privileged keys in client code. A client publishable Supabase key still requires correct access policies. Verify authenticated ownership server-side for routes accessing user data.

Validate AI output: known exercise IDs, available equipment, sensible bounded sets/reps/rest, no duplicate exercise entries, bounded explanation length, and a coherent requested focus. Application computes estimated duration from planned work/rest; label it approximate. Reject invalid output and keep existing session intact. Use a clearly labeled catalog-based starter routine if generation is unavailable, or offer retry. Check exact current SDK/model usage against official documentation during implementation.

## Failure and edge behavior
- Gemini timeout/quota/invalid response: show retry; preserve settings and any existing workout; never fake a live response.
- Database save failure: retain edits locally for retry, show unsaved status, and do not imply cloud persistence succeeded.
- No equipment combination supports a routine: explain and offer revising equipment/focus rather than hallucinating a machine.
- Duplicate clicks/retries: use stable set/session IDs and upsert or equivalent duplicate protection.
- No history: full-body focus default, empty progress state, blank initial loads.
- Interrupted workout: resume saved state; never silently mark incomplete sets completed.
- Unsupported medical/injury request: do not generate diagnosis or rehabilitation advice.

## Build order and team ownership
Assign human owners by preference:
- A: onboarding, dashboard, workout screen, mobile styling, integration coordination.
- B: Gemini route, validation, catalog-based generation contract and explanations.
- C: Supabase setup/schema/access policies, persistence/history queries, progress dashboard. A helps connect database operations to screens.

First agree on shared workout/set types. Use sample data to develop the UI while API and database work proceed independently.

Milestones (relative, because current team availability is unconfirmed):
1. First hour: app runs locally; Supabase project created; email/password sign-in works; one real server-side Gemini request works.
2. Next 2–3 hours: vertical slice from profile to generated workout to saved completed set. Test it with a real account before extra styling.
3. Next 2–3 hours: finish/resume session, history, timer, explanations, focus heuristic.
4. Next 1–2 hours: progress chart and cohesive mobile design; deploy and test on a phone.
5. Reserve at least two final hours for failure testing, access-policy checks, demo recording, submission, and fixes. Plan sleep/breaks explicitly. Devpost entry must exist before 9 a.m.; stop coding at 11 a.m.

If behind, simplify visual flourishes and chart controls before cutting the working workout/log/history flow. Keep confirmed requirements visible as unfinished rather than silently declaring them complete.

## Acceptance criteria
- A new user signs in, saves a profile, and generates a live Gemini workout from their settings.
- Routine uses catalog exercises and available equipment; each exercise has instructions and a rationale.
- Focus suggestion reflects completed history and can be overridden.
- User edits weight/reps, completes a set, uses/skips rest, resumes after refresh, and finishes the workout.
- Previous load appears for a repeated exercise; first-time exercises do not get invented starting loads.
- History and dashboard update from completed data; the exercise chart uses consistent units and clear labels.
- Two accounts cannot read or modify each other's profiles, workouts, or sets.
- API/save failures are visible, recoverable, and preserve existing work.
- Main flow works on a phone without horizontal scrolling or obscured inputs.
- No real API keys are committed or exposed in browser-delivered code.

## Stretch features after acceptance criteria pass
Choose at most one: exercise swapping, conversational workout edits, post-session AI recap grounded in logs, or progression suggestions grounded in prior performance. Revisit differentiation with time remaining; none is required for the first build.

## Open decisions
App name, hosting provider/account, exact Gemini model/quota, Supabase project configuration, licensed imagery source, teammate ownership and hours. These do not require more product interviewing before starting the core.
