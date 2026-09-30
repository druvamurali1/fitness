# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A personal-trainer web app for Druva (the owner, a complete beginner to training). Claude acts as the trainer: it designed the intake interview, will design the program and diet from the answers, and builds the app that delivers and tracks them. The app must also onboard any other beginner from scratch through an in-app intake, but Druva's profile is the first and best-tested path.

Status (end of 2026-09-30): live at https://druvamurali1.github.io/fitness/ and in daily use from 2026-10-02 (Druva's first real session is Friday 2 Oct, Workout A). Everything below is decided and should not be re-litigated without the owner asking. Druva's interview answers are in `docs/intake-questions.md`; his generated program and diet are in `docs/program.md` and `docs/diet.md` (regenerate with `node scripts/write-docs.js`). Equipment photos are in the folder root, git-ignored.

## Where we left off (read this first tomorrow)

Built and live today, in order: interview and generator; guided sessions with exercise pages and verified videos; multi-person home screen; self-driven mode; design pass on every tab; hosting; 2 to 5 lifting days picked as weekdays; cardio on lifting days; input validation; same-movement fallbacks with one-tap swaps; floor presses for gyms without a bench; lighter week with stall detection; end-of-session pain check that rebuilds the plan; labelled Done buttons.

Open items, none started:
- Druva has not yet trained with the app. First real feedback comes after Friday 2 Oct. Expect wording and layout notes from the gym floor.
- Staged diet (trainer's recommendation, not in the app): weeks 1 and 2 add only the shake and the 4:30 protein; breakfast from week 3. The app still shows the full six-meal day from day one.
- Deadlift at 3 × 5 as an option if his back rounds at reps 7 and 8. Decide after his first two sessions.
- Sleep rule (under 6.5 h: two sets, no added weight; under 6 h: walk instead, not a miss) is advice only, not in the app.
- Eight of 45 exercise videos are from less-known channels (see `js/data/videos.js`); fine for form, could be upgraded.
- The in-app test browser holds test people "Druva" and "Guest" with fake sessions; it is not his phone.
- `docs/program.md` and `docs/diet.md` are local only (docs/ is git-ignored).

## Commands

```bash
npm start      # node serve.js 8080, then open http://localhost:8080
npm test       # node --test tests/*.test.js (generator only, no browser needed)
```

No build step, no dependencies. ES modules need a server; opening `index.html` from the filesystem will not work.

Hosted at https://druvamurali1.github.io/fitness/ from the public GitHub repository `druvamurali1/fitness` (GitHub Pages, `main` branch, root). Deploy is `git push`; Pages rebuilds in about a minute. The service worker is network-first with a 4 s timeout, so an online phone gets the new files on its next open and reloads itself once when the new worker takes over; the cache is only for offline. Still bump `CACHE` in `sw.js` on every push so stale entries are dropped, and run `npm test`. The repository is public: `.gitignore` keeps the gym photos, `docs/` and `.claude/` out, and `js/data/profiles.js` must never carry health details, the "why now" text or personal notes. `.claude/launch.json` has a `gym` config for the in-app browser preview. The service worker is skipped on localhost so edits show on reload; on any other host it caches everything, so bump `CACHE` in `sw.js` when shipping changes.

To test a screen quickly with Druva's profile: open `#setup/druva` (the preset is never shown on the home screen; a stranger must not see another person's name there). To go home and test as another person: Plan tab, "Home: switch person or add someone". To start over: Plan tab, "Erase this person's data", or clear the `gym.people.v1` key in localStorage.

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
- Lifting days are picked as weekdays (2 to 5 of them); the count is derived, never asked. Beginner default is 3 full-body days; 2 is full-body A/B; 4 is upper/lower; 5 (upper, lower, push, pull, legs) only for `experience === 'experienced'`, otherwise the generator caps at 4 and moves the extra day to cardio with a caution. Cardio days may overlap lifting days. Sessions are 45 to 60 minutes.
- Scalability: the intake interview lives in the app as onboarding. A rule-based generator maps answers to a program: goal -> rep ranges and diet template; days per week -> split; injuries -> exercise removals and swaps; available equipment -> barbell, dumbbell, or machine variant of each movement; cuisine -> diet template (South Indian is first-class, generic is the fallback).
- Every plan exercise carries `alts`: up to three same-movement fallbacks the person's gym, level and injuries allow, in the order a trainer would reach for them, ending with the bodyweight version. `swapped(planEx, altId)` builds the in-session replacement (slot's sets and rest, fallback's tool, cues and start weight; rep range from the fallback when it is bodyweight or timed). A swap is per session (`session.swaps`), logged under the fallback's own id so the original's history stays honest. Every movement pattern must have at least one loaded and one bodyweight exercise in the catalogue so no slot is left without a fallback.
- Lighter week: `needsLighterWeek()` suggests one when two main/secondary lifts are stalled (`isStalled`: three sessions at one weight without hitting the top of the range) or after six weeks with ten or more hard sessions since the plan started or the last lighter week. Accepting sets `doc.deload = { from, until }`; sessions started in that window carry `deload: true`, use `lighterLoad()` (70 percent, plate steps, never under the bar) and two sets, and are skipped by `exerciseHistory()` so they never feed progression.
- Pain check: the finish card asks "Anything hurt?" once per plan-mode session (`session.pain`, `session.painAsked`; Finish refuses to complete until answered). `recurringPain()` turns a joint reported in two of the last three sessions into `profile.pain`, the plan is rebuilt in place (same `createdAt`) and `doc.notice` explains it on Today.
- The self-driven door asks once whether the person has trained with weights; a "no" shows a nudge toward the plan but never blocks.
- Per-exercise notes (`items[id].note`, last one shown back next time), personal records (`personalRecords()` on finish, stored as `session.prs`; first attempt is a baseline, never a record), a finish summary in the Today band (minutes, sets, volume), body measurements beyond waist (`chestCm`, `armCm`, `thighCm`, `hipsCm` on the day record; "Measure today" on any day), saved routines in self-driven mode (`doc.routines`, start from Today), and muscle/equipment filters in the picker and the library. Social features, leaderboards and volume-as-headline were considered against Hevy and rejected on purpose (see docs/decisions.md).
- Health screening red flags (diagnosed heart condition, uncontrolled blood pressure, doctor-imposed limits, recent surgery, unexplained pain) stop the generator and tell the user to see a doctor or a human trainer. The generator handles common beginners only and must say so.
- Phone-first, works offline, no accounts, no server. Data in localStorage with one-tap export and import as JSON.

## Architecture

Vanilla HTML, CSS and ES modules. The one hard rule: program content lives in `js/data/` and never in a view.

- `js/data/exercises.js`: the catalogue. Each exercise has a movement `pattern`, required `equipment`, minimum experience `level`, `avoidIf` pain areas, start load and increment in lb, and three cues. `PATTERN_PREFERENCE` is the ordered list the generator walks for each pattern; first exercise that passes equipment, level and contraindication checks wins. An optional `target` fixes the rep range regardless of goal (used for chin-up negatives).
- `js/data/programs.js`: split templates as workouts of slots (`pattern` + `role` + `sets`). Roles map to rep ranges by goal in `REP_RANGES`; bodyweight and timed work use `BODY_TARGETS`. `bodyweight_2` is the no-equipment fallback and also becomes the main program when the gym has nothing.
- `js/data/diets.js`: meal templates per cuisine with options per diet type, each carrying protein and kcal; `DIET_RULES` are conditional on the profile; `PROTEIN_PORTIONS` define what one 25 g tap means in the Week tab.
- `js/data/intake.js`: the interview schema the onboarding renders, plus `RED_FLAGS` (stop the flow) and `CAUTIONS` (shown on the plan).
- `js/data/profiles.js`: saved profiles loadable from the welcome screen. Druva's is the reference profile; `tests/generator.test.js` asserts his exact program. A profile's `equipmentNotes` (keyed by equipment) are the "where it is in your gym" text on exercise pages. Any person can write their own note and attach their own photo from the exercise page (`profile.equipmentNotes[key]`, `doc.equipmentPhotos[key]`); the preset notes are only a head start for Druva.
- `js/data/exercises-more.js` and `js/data/howto-more.js`: the library expansion (161 exercises in total), merged into `EXERCISES` and `HOWTO`. Every exercise carries `muscles: { primary, secondary }`; `muscleGroup()` in `today.js` maps those to the seven filter groups (chest, back, shoulders, arms, legs, core, cardio). New equipment keys (smith, kettlebells, trap_bar, ...) are listed in the interview.
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
- `.donebtn` inside a `.setrow`: the set-done control is a button that says "Done", and the whole row turns yellow with a ✓ in the tag when pressed. The earlier hollow-pin control was dropped because the owner could not tell a set had been captured; do not bring back unlabelled toggles for anything that logs. Motion is limited to row expansion and the timer; all of it is off under `prefers-reduced-motion`.

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

## Working agreements with the owner

- He tests on his phone and reports from the gym; every change ships by `git push` and the phone picks it up on the next open (network-first service worker, auto-reload).
- Every visible change gets checked in the in-app browser at phone width before pushing; screenshots, not assumptions.
- Anything that logs uses a labelled button. Anything counted uses pips. Every screen opens with the floor band and its numbers.
- Trainer voice: blunt, plain words, push back on the plan when the science says so, and say which parts are his to do.

## Known gaps

- Photos live in localStorage; at roughly 60 KB each that is fine for years of monthly photos but a bulk import would hit the quota.
- The generator is a rule-based beginner trainer. It refuses red-flag cases and does not plan for advanced lifters, rehab, or competition.
- No cloud sync. Export and import is the migration path between devices.
