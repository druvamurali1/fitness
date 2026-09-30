// Turns an intake profile into a concrete plan. Pure functions, no DOM, no
// storage, so it runs under `node --test` and in the browser unchanged.

import { EXERCISES, PATTERN_PREFERENCE } from './data/exercises.js';
import { TEMPLATES, REP_RANGES, BODY_TARGETS, REST_SECONDS, WARMUP, COOLDOWN, CARDIO_DAY } from './data/programs.js';
import { MEAL_TEMPLATES, DIET_RULES, PROTEIN_PORTIONS, CUISINES } from './data/diets.js';
import { RED_FLAGS, CAUTIONS } from './data/intake.js';

const LEVEL = { novice: 0, detrained: 1, experienced: 2 };

// Bump when the plan's shape or the data behind it changes; stored plans are
// rebuilt from the profile on load when the version differs.
export const PLAN_VERSION = 4;

export function checkRedFlags(profile) {
  return RED_FLAGS.filter(f => f.test(profile)).map(f => f.text);
}

export function generatePlan(profile, { today } = {}) {
  const flags = checkRedFlags(profile);
  if (flags.length) return { blocked: true, redFlags: flags };

  const p = normalise(profile);
  const hasLoad = ['barbell', 'dumbbells', 'machines', 'cables'].some(e => p.equipment.includes(e));
  const capped = p.daysPerWeek >= 5 && p.experience !== 'experienced';
  const days = capped ? 4 : p.daysPerWeek;
  const templateId = !hasLoad ? 'bodyweight_2' : days <= 2 ? 'full_body_2' : days === 3 ? 'full_body_3' : days === 4 ? 'upper_lower_4' : 'five_day';
  const template = TEMPLATES[templateId];
  const extraCautions = capped ? ['You asked for five lifting days. Until you have six months of steady training behind you, five is more recovery debt than progress, so the program uses four. The fifth day is easy cardio.'] : [];

  const workouts = template.workouts.map(w => buildWorkout(w, p));
  const fallback = TEMPLATES.bodyweight_2.workouts.map(w => buildWorkout(w, { ...p, equipment: [] }));

  return {
    version: PLAN_VERSION,
    mode: 'plan',
    createdAt: today || new Date().toISOString().slice(0, 10),
    targetPerWeek: capped ? 4 : p.trainingDays.length,
    splitId: templateId,
    splitName: template.name,
    splitDescription: template.description,
    trainingDays: capped ? p.trainingDays.slice(0, 4) : p.trainingDays,
    cardioDays: capped ? [...new Set([...p.cardioDays, ...p.trainingDays.slice(4)])].sort() : p.cardioDays,
    workouts,
    fallback,
    fallbackName: TEMPLATES.bodyweight_2.name,
    fallbackDescription: TEMPLATES.bodyweight_2.description,
    cardio: CARDIO_DAY,
    warmup: WARMUP,
    cooldown: COOLDOWN,
    progression: progressionRules(p),
    diet: buildDiet(p),
    cautions: [...extraCautions, ...CAUTIONS.filter(c => c.test(p)).map(c => c.text)],
    notes: p.notes || [],
    equipmentNotes: p.equipmentNotes || {},
    units: p.units,
  };
}

function normalise(profile) {
  const p = { ...profile };
  p.daysPerWeek = Number(p.daysPerWeek || 3);
  p.mealsPerDay = Number(p.mealsPerDay || 3);
  p.sessionMinutes = Number(p.sessionMinutes || 60);
  p.vegDays = Number(p.vegDays || 0);
  p.alcoholPerWeek = Number(p.alcoholPerWeek || 0);
  p.equipment = p.equipment || [];
  p.pain = p.pain || [];
  p.conditions = p.conditions || [];
  p.trainingDays = (p.trainingDays || [1, 3, 5]).map(Number).sort();
  p.daysPerWeek = p.trainingDays.length; // the days chosen decide the split
  p.cardioDays = (p.cardioDays || []).map(Number).sort();
  p.units = p.units || { load: 'lb', body: 'kg' };
  p.experience = p.experience || 'novice';
  p.goal = p.goal || 'health';
  return p;
}

// ── Workouts ────────────────────────────────────────────────────

function buildWorkout(w, p) {
  const used = new Set();
  const exercises = [];
  w.slots.forEach(slot => {
    const id = slot.force || pickExercise(slot.pattern, p, used);
    if (!id) return; // nothing in this gym fills the slot; the workout is shorter, not broken
    used.add(id);
    const i = exercises.length;
    const ex = EXERCISES[id];
    const measure = (ex.loadType === 'time' || ex.pattern === 'grip') ? 'seconds' : 'reps';
    const [min, max] = targetRange(ex, slot.role, p.goal, measure);
    exercises.push({
      slot: i + 1,
      exerciseId: id,
      name: ex.name,
      role: slot.role,
      sets: slot.sets,
      repMin: min, repMax: max,
      measure,
      loadType: ex.loadType,
      startLoadLb: ex.start ? ex.start.lb : null,
      incrementLb: ex.increment ? ex.increment.lb : null,
      restSeconds: REST_SECONDS[slot.role] || 60,
      cues: ex.cues,
      alts: alternatives(id, slot.pattern, p, used),
    });
  });
  return { id: w.id, name: w.name, focus: w.focus || w.name, exercises };
}

function pickExercise(pattern, p, used) {
  const prefs = PATTERN_PREFERENCE[pattern] || [];
  for (const id of prefs) {
    if (used.has(id)) continue;
    if (isAllowed(id, p)) return id;
  }
  // Last resort: any bodyweight exercise of this pattern, even if already used.
  return prefs.find(id => EXERCISES[id].equipment.length === 0 && isAllowed(id, p)) || null;
}

// Up to three fallbacks for an exercise: same movement pattern, different
// tool, in the order a trainer would reach for them. Always ends with the
// bodyweight version if there is one, so there is something to do when
// everything is taken.
export function alternatives(id, pattern, p, used = new Set()) {
  const prefs = PATTERN_PREFERENCE[pattern] || [];
  const same = Object.keys(EXERCISES).filter(k => EXERCISES[k].pattern === EXERCISES[id]?.pattern && !prefs.includes(k));
  const pool = [...prefs, ...same].filter(k => k !== id && !used.has(k) && isAllowed(k, p));
  const body = pool.find(k => EXERCISES[k].equipment.length === 0);
  const picked = pool.filter(k => k !== body).slice(0, body ? 2 : 3);
  if (body) picked.push(body);
  return picked.map(k => ({ id: k, name: EXERCISES[k].name }));
}

// Build the plan entry for a swapped-in exercise: the original slot's sets,
// reps and rest, the fallback's own tool, cues and starting weight.
export function swapped(planEx, altId) {
  const ex = EXERCISES[altId];
  const measure = (ex.loadType === 'time' || ex.pattern === 'grip') ? 'seconds' : 'reps';
  const range = ex.target || (measure === 'seconds' ? BODY_TARGETS.time[planEx.role] : ex.loadType === 'body' ? BODY_TARGETS.body[planEx.role] : [planEx.repMin, planEx.repMax]);
  return { ...planEx, exerciseId: altId, name: ex.name, measure, loadType: ex.loadType, startLoadLb: ex.start ? ex.start.lb : null, incrementLb: ex.increment ? ex.increment.lb : null, cues: ex.cues, repMin: range[0], repMax: range[1], swappedFrom: planEx.swappedFrom || planEx.exerciseId, alts: (planEx.alts || []).filter(a => a.id !== altId) };
}

export function isAllowed(id, p) {
  const ex = EXERCISES[id];
  if (!ex) return false;
  if (!ex.equipment.every(e => p.equipment.includes(e))) return false;
  if (ex.level > (LEVEL[p.experience] ?? 0)) return false;
  if (ex.avoidIf.some(a => p.pain.includes(a))) return false;
  return true;
}

function targetRange(ex, role, goal, measure) {
  if (ex.target) return ex.target;
  if (measure === 'seconds') return BODY_TARGETS.time[role] || [30, 45];
  if (ex.loadType === 'body') return BODY_TARGETS.body[role] || [8, 15];
  if (role === 'core' || role === 'grip') return BODY_TARGETS.body[role];
  return (REP_RANGES[goal] || REP_RANGES.health)[role];
}

function progressionRules(p) {
  const inc = p.units.load === 'kg' ? '2.5 kg on a barbell, 2.5 kg per dumbbell, one plate on a stack' : '5 lb on a barbell upper-body lift, 10 lb on squat and deadlift, 5 lb per dumbbell, one plate on a stack';
  return [
    'Every exercise has a rep range. Do every set inside it.',
    `When every set hits the top of the range, add weight next session: ${inc}.`,
    'If you miss the bottom of the range on two sessions in a row, take 10% off and build back up.',
    p.experience === 'novice'
      ? 'First four sessions of each workout: find your weights. Start lighter than you think and stop each set with about 3 reps in the tank.'
      : 'First two sessions of each workout: find your weights. Start with the suggested load and stop each set with about 3 reps in the tank.',
    'Rest 2 minutes after the main lift, 90 seconds after the second and third, 60 seconds after the rest. The timer runs it.',
    'Bodyweight and timed work: when you hit the top of the range on every set, make it harder next time (slower, a pause at the bottom, or the harder variation in the cues).',
  ];
}

// ── Diet ────────────────────────────────────────────────────────

export function energyTargets(p) {
  p = { ...p, weightKg: clampNum(p.weightKg, 30, 250, 70), heightCm: clampNum(p.heightCm, 120, 230, 170), age: clampNum(p.age, 14, 90, 30) };
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const mult = { sedentary: 1.45, light: 1.6, active: 1.75 }[p.activity] || 1.45;
  const tdee = bmr * mult;
  const delta = { muscle: 400, strength: 200, fat_loss: -400, health: 0 }[p.goal] || 0;
  const calories = Math.round((tdee + delta) / 50) * 50;
  const perKg = { muscle: 2.0, strength: 2.0, fat_loss: 2.2, health: 1.6 }[p.goal] || 1.6;
  const proteinG = Math.ceil((p.weightKg * perKg) / 5) * 5;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, proteinG, delta };
}

function buildDiet(p) {
  const t = energyTargets(p);
  const template = MEAL_TEMPLATES[p.cuisine] || MEAL_TEMPLATES.generic;
  let meals = template.map(m => {
    const opts = m.options[p.dietType] || m.options.any || m.options.veg;
    const o = opts[0];
    return { slot: m.slot, name: m.name, time: m.time, text: o.text, protein: o.protein, kcal: o.kcal, optional: m.slot === 'pre' || m.slot === 'snack' };
  });
  if (!p.whey) {
    meals = meals.map(m => m.slot === 'post'
      ? { ...m, text: p.dietType === 'veg' ? '250 ml milk and 200 g curd' : '3 boiled eggs and a glass of milk', protein: 25, kcal: 300 }
      : m);
  }
  if (p.mealTimes) {
    meals = meals.map(m => p.mealTimes[m.slot] ? { ...m, time: p.mealTimes[m.slot] } : m);
  }
  if (p.timeOfDay !== 'morning') {
    meals = meals.map(m => m.slot === 'post' ? { ...m, time: 'Right after training' } : m.slot === 'pre' ? { ...m, time: 'An hour before training' } : m);
  }

  // Fit the day to the calorie target and say so in plain words.
  let adjustments = [];
  const total = () => meals.reduce((a, m) => a + m.kcal, 0);
  const gaining = p.goal === 'muscle' || p.goal === 'strength';
  if (!gaining && total() > t.calories * 1.08) {
    meals = meals.filter(m => m.slot !== 'snack');
    adjustments.push('The afternoon meal is out; protein still comes from the other meals.');
  }
  const over = total() - t.calories;
  if (over > t.calories * 0.08) {
    adjustments.push(gaining
      ? `The full day adds up to about ${total()} kcal, a little over the ${t.calories} target. That is fine while gaining. If the weekly average climbs faster than 0.5 kg, cut the rice or roti at dinner by a third and keep every gram of protein.`
      : `The day adds up to about ${total()} kcal against a target of ${t.calories}. Shrink the rice or roti at lunch and dinner by a third; keep every gram of protein.`);
  } else if (over < -t.calories * 0.08) {
    adjustments.push(`The day adds up to about ${total()} kcal against a target of ${t.calories}. Add a handful of nuts to the afternoon meal and a little more rice at dinner.`);
  } else {
    adjustments.push(`The day adds up to about ${total()} kcal against a target of ${t.calories}. On target.`);
  }

  const proteinTotal = meals.reduce((a, m) => a + m.protein, 0);
  const rules = DIET_RULES.filter(r => r.when(p)).map(r => r.text);
  const portions = PROTEIN_PORTIONS.filter(x => x.diet.includes(p.dietType)).map(x => x.text);

  return {
    cuisine: CUISINES[p.cuisine]?.name || 'Simple',
    dietType: p.dietType,
    calories: t.calories,
    tdee: t.tdee,
    proteinG: t.proteinG,
    waterL: 3,
    meals,
    dayTotals: { kcal: total(), protein: proteinTotal },
    adjustments,
    rules,
    proteinPortions: portions,
    proteinPortionTarget: Math.round(t.proteinG / 25),
    mealsTarget: meals.filter(m => !m.optional).length,
    alcoholRule: p.alcoholPerWeek > 0 ? 'Weekend only, two at most.' : null,
    weightTargetKg: p.targetWeightKg || null,
    weeklyRateKg: p.goal === 'muscle' ? [0.25, 0.5] : p.goal === 'fat_loss' ? [-0.5, -0.25] : [0, 0],
  };
}

// ── Progression from logged history ─────────────────────────────
// history: array of past logged exercise entries, oldest first:
//   { weightLb, sets: [{ reps, done }] }
// Returns the load (lb) to suggest next, plus why.

export function suggestNext(planEx, history) {
  const start = planEx.startLoadLb;
  if (start == null) return { loadLb: null, reason: 'bodyweight' };
  const done = history.filter(h => h.sets.some(s => s.done));
  if (!done.length) return { loadLb: start, reason: 'start' };
  const last = done[done.length - 1];
  const inc = planEx.incrementLb || 5;
  const allTop = last.sets.length >= planEx.sets && last.sets.every(s => s.done && s.reps >= planEx.repMax);
  if (allTop) return { loadLb: last.weightLb + inc, reason: 'up' };
  const missed = h => h.sets.some(s => s.done && s.reps < planEx.repMin) || h.sets.filter(s => s.done).length < planEx.sets;
  const prev = done[done.length - 2];
  if (missed(last) && prev && missed(prev) && prev.weightLb === last.weightLb) {
    const step = planEx.loadType === 'barbell' ? 5 : (planEx.loadType === 'stack' ? 5 : 5);
    const down = Math.max(start, Math.round((last.weightLb * 0.9) / step) * step);
    return { loadLb: down, reason: 'down' };
  }
  return { loadLb: last.weightLb, reason: 'same' };
}

// ── Self-driven mode ─────────────────────────────────────────────
// No program. The person logs whatever they do; the app keeps the same
// tracking, with targets they set themselves.

export function freePlan(profile, { today } = {}) {
  const p = { ...profile };
  const weightKg = Number(p.weightKg) || 70;
  const proteinG = Number(p.proteinG) || Math.ceil((weightKg * 1.6) / 5) * 5;
  const dietType = p.dietType || 'nonveg';
  return {
    version: PLAN_VERSION,
    mode: 'free',
    createdAt: today || new Date().toISOString().slice(0, 10),
    targetPerWeek: Number(p.daysPerWeek) || 3,
    trainingDays: [], cardioDays: [],
    splitName: 'Your own routine',
    splitDescription: 'No program. You decide what to do each day; the app keeps the record.',
    workouts: [], fallback: [], fallbackName: '', fallbackDescription: '',
    cardio: CARDIO_DAY, warmup: WARMUP, cooldown: COOLDOWN,
    progression: ['Nobody is telling you when to add weight. A simple rule if you want one: when every set of an exercise feels easy, add a little next time.'],
    diet: {
      cuisine: '', dietType, calories: null, tdee: null, proteinG, waterL: 3, meals: [], dayTotals: null, adjustments: [], rules: [],
      proteinPortions: PROTEIN_PORTIONS.filter(x => x.diet.includes(dietType)).map(x => x.text),
      proteinPortionTarget: Math.max(1, Math.round(proteinG / 25)),
      mealsTarget: Number(p.mealsPerDay) || 3,
      alcoholRule: null, weightTargetKg: p.targetWeightKg || null, weeklyRateKg: [0, 0],
    },
    cautions: [], notes: [], equipmentNotes: p.equipmentNotes || {}, units: p.units || { load: 'lb', body: 'kg' },
  };
}

function clampNum(v, lo, hi, dflt) { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }
