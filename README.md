# Gym Plan

A personal-trainer web app. It interviews you the way a trainer would, builds a program and a diet from your answers and your gym's equipment, and then gives you a checklist for every session, a weekly consistency view, and monthly progress.

No accounts, no server. Everything lives in the browser on the device you use it on. Export a backup from the Plan tab before switching phones.

## Use it

https://druvamurali1.github.io/fitness/ on a phone. Add it to the home screen; it works offline after the first load.

## Run it locally

```bash
npm start
```

Then open http://localhost:8080. Any static file host works for a real deployment (the app is plain HTML, CSS and ES modules). On a phone, open the hosted URL in Safari or Chrome and choose "Add to Home Screen"; it then works offline.

## Test the generator

```bash
npm test
```

## Layout

- `index.html`, `css/app.css`: the shell and design tokens.
- `js/data/`: exercises, program templates, diet templates, the intake questions, saved profiles. Editing the program means editing these.
- `js/generator.js`: intake answers in, plan out. Pure functions.
- `js/store.js`: one JSON document in localStorage.
- `js/views/`: onboarding, Today, Week, Progress, Plan.
- `docs/`: the interview, the equipment inventory, the decisions, and the readable program and diet.
