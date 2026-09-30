import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, suggestNext, energyTargets, checkRedFlags, PLAN_VERSION } from '../js/generator.js';
import { PROFILES } from '../js/data/profiles.js';

const druva = PROFILES.druva;

test('Druva gets the designed three-day program', () => {
  const plan = generatePlan(druva, { today: '2026-10-01' });
  assert.equal(plan.blocked, undefined);
  assert.equal(plan.splitId, 'full_body_3');
  const ids = plan.workouts.map(w => w.exercises.map(e => e.exerciseId));
  assert.deepEqual(ids[0], ['back_squat', 'db_bench_press', 'lat_pulldown', 'leg_curl', 'db_curl', 'plank']);
  assert.deepEqual(ids[1], ['deadlift', 'overhead_press', 'seated_cable_row', 'db_walking_lunge', 'triceps_pushdown', 'dead_hang']);
  assert.deepEqual(ids[2], ['romanian_deadlift', 'incline_db_press', 'chin_up_negative', 'leg_extension', 'face_pull', 'hanging_knee_raise']);
  const squat = plan.workouts[0].exercises[0];
  assert.deepEqual([squat.repMin, squat.repMax, squat.sets, squat.startLoadLb], [6, 8, 3, 45]);
  assert.equal(plan.fallback.length, 2);
  assert.equal(plan.version, PLAN_VERSION);
  assert.equal(plan.workouts[0].focus, 'Legs, chest and back');
  assert.ok(plan.equipmentNotes.barbell.includes('Torque'));
});

test('Druva diet: surplus, protein 130 g, South Indian non-veg, third meal rule present', () => {
  const plan = generatePlan(druva);
  assert.equal(plan.diet.proteinG, 130);
  assert.ok(plan.diet.calories >= 2500 && plan.diet.calories <= 2800, `calories ${plan.diet.calories}`);
  assert.ok(plan.diet.meals.some(m => m.slot === 'breakfast' && /egg/i.test(m.text)));
  assert.ok(plan.diet.rules.some(r => /Two meals a day/.test(r)));
  assert.ok(plan.diet.rules.some(r => /weekend/.test(r)));
  assert.ok(plan.diet.dayTotals.protein >= plan.diet.proteinG);
});

test('knee pain removes squats and lunges, bar-less gym gets dumbbells', () => {
  const p = { ...druva, pain: ['knee'], equipment: ['dumbbells', 'bench', 'cables'] };
  const plan = generatePlan(p);
  const all = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseId));
  assert.ok(!all.includes('back_squat') && !all.includes('goblet_squat') && !all.includes('db_walking_lunge'));
  assert.ok(all.includes('dumbbell_rdl'));
});

test('novice with nothing gets a bodyweight program and no barbell', () => {
  const plan = generatePlan({ ...druva, experience: 'novice', equipment: [] });
  assert.equal(plan.splitId, 'bodyweight_2');
  const all = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseId));
  assert.ok(all.includes('push_up') && all.includes('bodyweight_squat'));
  // A gym with only dumbbells still gets a full program, with unfillable slots dropped.
  const db = generatePlan({ ...druva, equipment: ['dumbbells', 'bench'] });
  assert.equal(db.splitId, 'full_body_3');
  assert.ok(db.workouts.every(w => w.exercises.length >= 4));
});

test('days per week pick the split; beginners are capped at four', () => {
  assert.equal(generatePlan({ ...druva, daysPerWeek: 2, trainingDays: [1, 4] }).splitId, 'full_body_2');
  assert.equal(generatePlan({ ...druva, daysPerWeek: 4, trainingDays: [1, 2, 4, 5] }).splitId, 'upper_lower_4');
  const five = generatePlan({ ...druva, daysPerWeek: 5, trainingDays: [1, 2, 3, 4, 5] });
  assert.equal(five.splitId, 'upper_lower_4');
  assert.deepEqual(five.trainingDays, [1, 2, 3, 4]);
  assert.ok(five.cardioDays.includes(5));
  assert.ok(five.cautions.some(c => /five lifting days/i.test(c)));
  const pro = generatePlan({ ...druva, experience: 'experienced', daysPerWeek: 5, trainingDays: [1, 2, 3, 4, 5] });
  assert.equal(pro.splitId, 'five_day');
  assert.equal(pro.workouts.length, 5);
  // Cardio on a lifting day is allowed.
  const both = generatePlan({ ...druva, cardioDays: [1, 3] });
  assert.deepEqual(both.cardioDays, [1, 3]);
});

test('red flags block', () => {
  assert.equal(generatePlan({ ...druva, doctorLimit: true }).blocked, true);
  assert.equal(checkRedFlags({ ...druva, conditions: ['heart'] }).length, 1);
});

test('fat loss cuts calories and keeps protein up', () => {
  const t = energyTargets({ ...druva, goal: 'fat_loss', weightKg: 90 });
  assert.ok(t.delta < 0);
  assert.equal(t.proteinG, 200);
});

test('progression: up on top of range, hold otherwise, down after two misses', () => {
  const ex = { startLoadLb: 45, incrementLb: 10, sets: 3, repMin: 6, repMax: 8, loadType: 'barbell' };
  assert.deepEqual(suggestNext(ex, []), { loadLb: 45, reason: 'start' });
  const good = { weightLb: 65, sets: [{ reps: 8, done: true }, { reps: 8, done: true }, { reps: 8, done: true }] };
  assert.deepEqual(suggestNext(ex, [good]), { loadLb: 75, reason: 'up' });
  const meh = { weightLb: 75, sets: [{ reps: 8, done: true }, { reps: 7, done: true }, { reps: 6, done: true }] };
  assert.deepEqual(suggestNext(ex, [good, meh]), { loadLb: 75, reason: 'same' });
  const miss = { weightLb: 75, sets: [{ reps: 5, done: true }, { reps: 4, done: true }, { reps: 4, done: true }] };
  assert.equal(suggestNext(ex, [good, miss]).reason, 'same');
  assert.deepEqual(suggestNext(ex, [good, miss, miss]), { loadLb: 70, reason: 'down' });
});

test('self-driven plan has targets and no workouts', async () => {
  const { freePlan } = await import('../js/generator.js');
  const p = freePlan({ name: 'Test', weightKg: 80, daysPerWeek: 4, dietType: 'veg' });
  assert.equal(p.mode, 'free');
  assert.equal(p.targetPerWeek, 4);
  assert.equal(p.diet.proteinG, 130);
  assert.equal(p.workouts.length, 0);
  assert.ok(p.diet.proteinPortions.some(x => /tofu/i.test(x)));
  assert.equal(freePlan({ name: 'T', proteinG: 150 }).diet.proteinG, 150);
});

test('absurd body numbers are clamped before the calorie maths', () => {
  const t = energyTargets({ ...druva, weightKg: 5, heightCm: 900, age: 3 });
  assert.ok(t.calories > 1200 && t.calories < 4500, `calories ${t.calories}`);
  const u = energyTargets({ ...druva, weightKg: 'shdvcoih', heightCm: NaN });
  assert.ok(u.proteinG >= 100 && u.proteinG <= 160, `protein ${u.proteinG}`);
});
