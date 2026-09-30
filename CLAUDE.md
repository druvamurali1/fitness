# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A personal-trainer web app for Druva (the owner, a complete beginner to training). Claude acts as the trainer: it designed the intake interview, will design the program and diet from the answers, and builds the app that delivers and tracks them. The app must also onboard any other beginner from scratch through an in-app intake, but Druva's profile is the first and best-tested path.

Status (2026-09-30): v0.1 built and walked through in the browser. Druva's intake answers are recorded in `docs/intake-questions.md`; his generated program and diet are in `docs/program.md` and `docs/diet.md`. Equipment photos are in the repo root (`IMG_4262.HEIC` to `IMG_4271.HEIC`). Everything below is decided and should not be re-litigated without the owner asking.

## Commands

```bash
npm start      # node serve.js 8080, then open http://localhost:8080
npm test       # node --test tests/*.test.js (generator only, no browser needed)
```

No build step, no dependencies. ES modules need a server; opening `index.html` from the filesystem will not work. `.claude/launch.json` has a `gym` config for the in-app browser preview. The service worker is skipped on localhost so edits show on reload; on any other host it caches everything, so bump `CACHE` in `sw.js` when shipping changes.

To test a screen quickly: open the app, choose "Load Druva's profile" on the welcome screen. To go home and test as another person: Plan tab, "Home: switch person or add someone". To start over: Plan tab, "Erase this person's data", or clear the `gym.people.v1` key in localStorage.

## How to work with the owner

- Be blunt. The owner asked for honest critique, not encouragement. Say when an idea is wrong and why.
- Think like a user of the app in the gym: one hand, phone, sweaty, no patience for ceremony. The owner has never trained with a barbell: every exercise must be explained, every abbreviation spelled out, and the workout letter is never the headline.
- Do not build the program before the intake answers exist. Ask for missing answers instead of guessing.
- Do not prescribe exercises the gym does not have (see `docs/equipment.md`).

## Product decisions (already made)

- Workouts are a sequence (Workout A, B, C rotating), never tied to weekdays. Miss a day, nothing breaks; next gym day shows the next workout. No make-up or double sessions.
- The daily checklist is short and tied to logging: warm-up, each exercise with weight x reps per set, cooldown, protein. Ticking an exercise happens by logging its sets. No filler steps like "get into the gym".
- Track compliance and progress separately. Compliance is sessions done vs planned per week. Progress is load on the main lifts over time, weekly average of daily morning bodyweight, waist measurement, and photos every 4 weeks.
- Diet is tracked as three daily yes/no signals (protein target hit, meals on plan, water), not calorie counting. Protein target is roughly 1.6 to 2 g per kg bodyweight, set by the generator.
- No streaks. Weekly targets hit is the consistency metric.
- Beginner default is 3 full-body days; 4 is upper/lower; 5 adds easy cardio days, never a fifth lifting day for a beginner. Sessions are 45 to 60 minutes.
- Scalability: the intake interview lives in the app as onboarding. A rule-based generator maps answers to a program: goal -> rep ranges and diet template; days per week -> split; injuries -> exercise removals and swaps; available equipment -> barbell, dumbbell, or machine variant of each movement; cuisine -> diet template (South Indian is first-class, generic is the fallback).
- Health screening red flags (diagnosed heart condition, uncontrolled blood pressure, doctor-imposed limits, recent surgery, unexplained pain) stop the generator and tell the user to see a doctor or a human trainer. The generator handles common beginners only and must say so.
- Phone-first, works offline, no accounts, no server. Data in localStorage with one-tap export and import as JSON.

## Architecture

Vanilla HTML, CSS and ES modules. The one hard rule: program content lives in `js/data/` and never in a view.

- `js/data/exercises.js`: the catalogue. Each exercise has a movement `pattern`, required `equipment`, minimum experience `level`, `avoidIf` pain areas, start load and increment in lb, and three cues. `PATTERN_PREFERENCE` is the ordered list the generator walks for each pattern; first exercise that passes equipment, level and contraindication checks wins. An optional `target` fixes the rep range regardless of goal (used for chin-up negatives).
- `js/data/programs.js`: split templates as workouts of slots (`pattern` + `role` + `sets`). Roles map to rep ranges by goal in `REP_RANGES`; bodyweight and timed work use `BODY_TARGETS`. `bodyweight_2` is the no-equipment fallback and also becomes the main program when the gym has nothing.
- `js/data/diets.js`: meal templates per cuisine with options per diet type, each carrying protein and kcal; `DIET_RULES` are conditional on the profile; `PROTEIN_PORTIONS` define what one 25 g tap means in the Week tab.
- `js/data/intake.js`: the interview schema the onboarding renders, plus `RED_FLAGS` (stop the flow) and `CAUTIONS` (shown on the plan).
- `js/data/profiles.js`: saved profiles loadable from the welcome screen. Druva's is the reference profile; `tests/generator.test.js` asserts his exact program. A profile's `equipmentNotes` (keyed by equipment) are the "where it is in your gym" text on exercise pages. Any person can write their own note and attach their own photo from the exercise page (`profile.equipmentNotes[key]`, `doc.equipmentPhotos[key]`); the preset notes are only a head start for Druva.
- `js/data/howto.js`: per-exercise instructions for a beginner (what, where, setup, how, feel, mistakes) and `setsText()`. Every exercise in the catalogue must have an entry.
- `js/data/videos.js`: one verified YouTube id per exercise. Verify with `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json` before adding; never guess an id.
- Two modes. `plan.mode === 'plan'` is the generated program; `plan.mode === 'free'` is self-driven (`freePlan(profile)` in the generator: targets only, no workouts). Views branch on the mode; `plan.targetPerWeek` is the weekly session target in both. Free sessions have `source: 'free'`, an `order` array, and can include `custom:<slug>` exercise ids stored in `doc.customExercises`.
- `js/generator.js`: `PLAN_VERSION` is bumped whenever the plan shape or the data behind it changes; `app.js` silently rebuilds a stored plan whose version differs (merging the latest preset fields if the profile came from one). `generatePlan(profile)` returns `{ blocked, redFlags }` or a plan with workouts, fallback, diet, progression text, cautions. `suggestNext(planExercise, history)` is the progression rule (top of range on every set: add increment; two sessions under the bottom at the same load: minus 10 percent). `energyTargets` is Mifflin-St Jeor with a goal delta. All pure; loads are canonical lb internally, bodyweight canonical kg, converted only in views.
- `js/store.js`: one JSON document per person under localStorage key `gym.people.v1` (`{ active, people: { id: doc } }`; the old single-person `gym.plan.v1` is adopted on first load). The welcome screen is the home screen: it lists saved people to continue as, plus the interview for someone new. Each document has `profile`, `plan`, `sessions`, `days` (keyed by ISO date: protein, meals, water, beers, sleep, weightKg, waistCm, cardio), `photos`, `settings`. `nextWorkout()` is completed-session count modulo rotation length, which is how "sequence, not weekday" is implemented. Bump `VERSION` and extend `migrate()` when the shape changes.
- `js/app.js`: hash router. Views are functions `(root, ctx)` that set `innerHTML` and attach a delegated click handler via `delegate()` in `js/views/ui.js`; every store change re-renders the current view. Per-view UI state (expanded rows, selected day) lives in a module-level object so it survives re-renders.
- `js/views/today.js` owns the first-run "How this works" screen (`settings.sawIntro`), the idle view, the session in two modes (guided one-exercise-at-a-time, or the whole list) and the rest timer (module state, rendered into `#dock`). `js/views/exercise.js` is the per-exercise page at `#exercise/<id>`. `js/views/words.js` holds the plain-language notation helpers used by every screen. `week.js` owns the day picker and the diet counters. `progress.js` owns the SVG charts (`js/charts.js`, single series only) and photos (resized to 720 px JPEG data URLs). `plan.js` owns settings, export and import.
- `css/app.css`: tokens on `:root`, dark mode under `prefers-color-scheme` guarded by `:root:not([data-theme="light"])` and again under `[data-theme="dark"]`. Lists use rules, not cards. The yellow accent is reserved for done states and the primary action.

## Design

Palette from the gym photos: chalk `#EDEFEA`, rubber-floor charcoal `#23272B`, Hoist selector-pin yellow `#F2C21B`, chrome grey, carpet rust for missed and warning states. One typeface, Bricolage Grotesque, condensed and heavy for workout letters and set numbers. Phone first, 600 px column, bottom tabs with drawn SVG glyphs; left rail at 900 px and up. Copy is matter-of-fact and in the trainer's voice; no streaks, no cheerleading.

Two signature elements, and they are the only places the design is loud:
- `.hero.floor`: the charcoal band at the top of Today and the welcome screen (the rubber floor), with the workout letter in chalk, the primary button, and during a session a strip of set segments that fill yellow.
- `.pin`: the set-done control, drawn as a weight-stack selector pin (bar plus knob). Hollow when pending; filled yellow and slid 6 px home when pressed. Motion is limited to this, row expansion, and the timer; all of it is off under `prefers-reduced-motion`.

- `.wk-strip` on Week: seven columns inside the floor band, a tall block per day for the workout and two small blocks for protein and water. Filled yellow when done, rust outline for a missed lifting day, chrome outline for a planned one, chalk ring on the selected day.
- `.pip`: tappable circles for counted targets (protein portions, meals, water, beers). Tap the n-th pip to set the count to n; tap the last filled one to step back. Same hole-and-pin look as the set control. Use pips for any small integer target; use a stepper only for real numbers (weight, reps, sleep).
- `.stats`: numbers first, label under, three to a row. Every tab's floor band carries its headline numbers this way (Week: sessions; Progress: weight, waist, workouts; Plan: days, kcal, protein).
- `.tag`: the stamped plate tag. Set numbers, workout letters (`.tag.big`), slot numbers in the Today preview, and the initial on the home screen's people list all use it.
- `.mark` on Today's preview rows says what you'll lift and whether it moved: dashed for new, yellow for up, rust for down.
- Plan is one page with `.chips` that scroll to sections (Workouts, Food, Rules, Settings); workouts are `.wo` blocks, the day of eating is a `.meals` timeline.
- `.cmp`: a label with two values side by side (Progress's four-weeks-ago-and-now, an exercise page's last few sessions). Use it wherever two numbers are compared; not a table.
- The exercise page's band carries the plan's numbers for that movement (sets × range, start load, rest); the video poster is the first thing under it.
- The guided session card repeats those three numbers in `.stats.compact`, followed by a `.howto` row (video thumbnail, "How to do it", where it is) and the set grid. Warm-up, each exercise and finish share the `.wo-head` tag-and-title header.
- Interview steps, the review, the blocked screen and the four-question setup all open with the floor band: Back top-left, "Part n of 8" top-right, the step title as the headline, and a `.stack` strip for progress. The review groups answers by part with an Edit link that jumps to that part.

Everything else stays quiet: rules instead of cards, no shadows, no all-caps labels, no decorative gradients. The interview steps on the welcome screen are numbered because they are a sequence; do not add numbering elsewhere. Show controls only when they apply (beers on Friday to Sunday, waist on Sunday).

## Docs

- `docs/intake-questions.md`: the trainer interview and Druva's answers. Also the spec for the onboarding flow.
- `docs/equipment.md`: inventory from the photos, including what is missing.
- `docs/decisions.md`: the reasoning behind the product decisions above, for anyone who wants to challenge them.
- `docs/program.md`, `docs/diet.md`: readable copies of the generator's output for Druva. Regenerate them if the data layer or his profile changes (the snippet that wrote them is in the session history; a `scripts/` version is a reasonable next step).

## Known gaps

- Photos live in localStorage; at roughly 60 KB each that is fine for years of monthly photos but a bulk import would hit the quota.
- The generator is a rule-based beginner trainer. It refuses red-flag cases and does not plan for advanced lifters, rehab, or competition.
- No cloud sync. Export and import is the migration path between devices.
