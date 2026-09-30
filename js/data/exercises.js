// Exercise catalogue. Adding an exercise is adding an entry here; the generator
// picks by movement pattern, equipment, experience and contraindications.
//
// pattern:     which slot in a workout template this can fill
// equipment:   what must be available (all listed items required)
// level:       minimum experience: 0 novice, 1 detrained/returning, 2 experienced
// avoidIf:     pain areas that rule this exercise out
// start:       suggested starting load, per unit; null = bodyweight
// increment:   how much to add when the top of the rep range is hit on all sets
// loadType:    'barbell' | 'dumbbell' (per hand) | 'stack' | 'body' | 'time'
// target:      optional fixed [min, max] that overrides the goal-based range
// cues:        3 form cues, spoken like a trainer standing next to you

export const EXERCISES = {
  // ── Squat pattern ─────────────────────────────────────────────
  back_squat: {
    name: 'Back squat', pattern: 'squat', equipment: ['barbell'], level: 1,
    avoidIf: ['knee', 'lower_back'], loadType: 'barbell',
    start: { lb: 45, kg: 20 }, increment: { lb: 10, kg: 5 },
    cues: ['Bar on the upper back, elbows down, chest up.', 'Sit between your heels until thighs pass parallel.', 'Drive the floor away; knees track over toes.'],
    alt: 'goblet_squat',
  },
  goblet_squat: {
    name: 'Goblet squat', pattern: 'squat', equipment: ['dumbbells'], level: 0,
    avoidIf: ['knee'], loadType: 'dumbbell',
    start: { lb: 25, kg: 12 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Hold one dumbbell against your chest.', 'Elbows inside the knees at the bottom.', 'Stand tall, squeeze glutes at the top.'],
  },
  leg_press: {
    name: 'Leg press', pattern: 'squat', equipment: ['leg_press'], level: 0,
    avoidIf: ['knee'], loadType: 'stack',
    start: { lb: 90, kg: 40 }, increment: { lb: 20, kg: 10 },
    cues: ['Feet shoulder width, mid-platform.', 'Lower until knees are at 90 degrees.', 'Never lock the knees out at the top.'],
  },
  bodyweight_squat: {
    name: 'Bodyweight squat', pattern: 'squat', equipment: [], level: 0,
    avoidIf: [], loadType: 'body', start: null, increment: null,
    cues: ['Arms forward for balance.', 'Full depth, heels down.', 'Slow on the way down, fast on the way up.'],
  },

  // ── Hinge pattern ─────────────────────────────────────────────
  deadlift: {
    name: 'Deadlift', pattern: 'hinge', equipment: ['barbell'], level: 1,
    avoidIf: ['lower_back'], loadType: 'barbell',
    start: { lb: 95, kg: 40 }, increment: { lb: 10, kg: 5 },
    cues: ['Bar over mid-foot, shins touch the bar.', 'Flat back, pull the slack out before it leaves the floor.', 'Push the floor away, finish tall. Reset every rep.'],
    alt: 'romanian_deadlift',
  },
  romanian_deadlift: {
    name: 'Romanian deadlift', pattern: 'hinge', equipment: ['barbell'], level: 1,
    avoidIf: ['lower_back'], loadType: 'barbell',
    start: { lb: 65, kg: 30 }, increment: { lb: 10, kg: 5 },
    cues: ['Soft knees, push the hips back.', 'Bar slides down the thighs to just below the knee.', 'Stop when hamstrings pull; stand up by driving hips forward.'],
  },
  dumbbell_rdl: {
    name: 'Dumbbell Romanian deadlift', pattern: 'hinge', equipment: ['dumbbells'], level: 0,
    avoidIf: ['lower_back'], loadType: 'dumbbell',
    start: { lb: 20, kg: 10 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Dumbbells brush the thighs on the way down.', 'Hips back, back flat, look at the floor a metre ahead.', 'Feel it in the hamstrings, not the lower back.'],
  },
  glute_bridge: {
    name: 'Glute bridge', pattern: 'hinge', equipment: [], level: 0,
    avoidIf: [], loadType: 'body', start: null, increment: null,
    cues: ['Heels close to your glutes.', 'Drive hips up, squeeze for one second at the top.', 'Ribs down, do not arch the lower back.'],
  },

  // ── Horizontal push ───────────────────────────────────────────
  db_bench_press: {
    name: 'Dumbbell bench press', pattern: 'horizontal_push', equipment: ['dumbbells', 'bench'], level: 0,
    avoidIf: ['shoulder'], loadType: 'dumbbell',
    start: { lb: 20, kg: 10 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Shoulder blades pinched back and down on the bench.', 'Lower to chest level, elbows about 45 degrees from the body.', 'Press up and slightly in.'],
    alt: 'machine_chest_press',
  },
  barbell_bench_press: {
    name: 'Barbell bench press', pattern: 'horizontal_push', equipment: ['barbell', 'bench'], level: 2,
    avoidIf: ['shoulder'], loadType: 'barbell',
    start: { lb: 45, kg: 20 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Eyes under the bar, feet flat.', 'Touch the lower chest, elbows tucked.', 'Never bench without a spotter or safeties.'],
  },
  incline_db_press: {
    name: 'Incline dumbbell press', pattern: 'horizontal_push', equipment: ['dumbbells', 'bench'], level: 0,
    avoidIf: ['shoulder'], loadType: 'dumbbell',
    start: { lb: 20, kg: 10 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Bench at 30 degrees, not higher.', 'Lower until the dumbbells are level with the upper chest.', 'Keep wrists stacked over elbows.'],
  },
  machine_chest_press: {
    name: 'Machine chest press', pattern: 'horizontal_push', equipment: ['machines'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 40, kg: 20 }, increment: { lb: 10, kg: 5 },
    cues: ['Handles level with the middle of the chest.', 'Press without locking the elbows.', 'Control the return for two seconds.'],
  },
  db_floor_press: {
    name: 'Dumbbell floor press', pattern: 'horizontal_push', equipment: ['dumbbells'], level: 0,
    avoidIf: ['shoulder'], loadType: 'dumbbell',
    start: { lb: 20, kg: 10 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Lie on the floor, knees bent, dumbbells over the chest.', 'Lower until the upper arms touch the floor, elbows about 45 degrees out.', 'Pause a beat on the floor, then press. No bouncing.'],
  },
  barbell_floor_press: {
    name: 'Barbell floor press', pattern: 'horizontal_push', equipment: ['barbell'], level: 1,
    avoidIf: ['shoulder'], loadType: 'barbell',
    start: { lb: 45, kg: 20 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Set the bar on the lowest hooks or safeties of the rack and lie under it.', 'Lower until the upper arms rest on the floor.', 'Pause, press. Rack it by pushing back to the hooks.'],
  },
  weighted_push_up: {
    name: 'Weighted push-up', pattern: 'horizontal_push', equipment: [], level: 0,
    avoidIf: ['wrist'], loadType: 'body', start: null, increment: null, target: [8, 12],
    cues: ['A plate on the upper back, or a loaded backpack worn on the back.', 'Chest to a fist from the floor, elbows at 45 degrees.', 'Add weight when 12 clean reps are easy. This is the loaded push-up, not the endurance one.'],
  },
  push_up: {
    name: 'Push-up', pattern: 'horizontal_push', equipment: [], level: 0,
    avoidIf: ['wrist'], loadType: 'body', start: null, increment: null,
    cues: ['Hands under shoulders, body in one line.', 'Chest to within a fist of the floor.', 'Elbows back at 45 degrees, not flared.', 'Too easy? Feet on a bench, three seconds down, or a backpack on your back.'],
  },

  // ── Vertical push ─────────────────────────────────────────────
  overhead_press: {
    name: 'Overhead press', pattern: 'vertical_push', equipment: ['barbell'], level: 1,
    avoidIf: ['shoulder', 'lower_back'], loadType: 'barbell',
    start: { lb: 45, kg: 20 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Bar on the front of the shoulders, forearms vertical.', 'Squeeze glutes so the lower back cannot arch.', 'Press up and back; head through at the top.'],
    alt: 'db_shoulder_press',
  },
  db_shoulder_press: {
    name: 'Dumbbell shoulder press', pattern: 'vertical_push', equipment: ['dumbbells'], level: 0,
    avoidIf: ['shoulder'], loadType: 'dumbbell',
    start: { lb: 15, kg: 7.5 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Seated with the bench upright if you have one.', 'Start at ear height, press until arms are straight.', 'Do not let the dumbbells drift forward.'],
  },
  pike_push_up: {
    name: 'Pike push-up', pattern: 'vertical_push', equipment: [], level: 0,
    avoidIf: ['shoulder', 'wrist'], loadType: 'body', start: null, increment: null,
    cues: ['Hips high, body in an upside-down V.', 'Lower the top of the head towards the floor.', 'Press back to the start; elbows stay in.'],
  },

  // ── Vertical pull ─────────────────────────────────────────────
  lat_pulldown: {
    name: 'Lat pulldown', pattern: 'vertical_pull', equipment: ['machines'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 70, kg: 32 }, increment: { lb: 10, kg: 5 },
    cues: ['Grip just outside shoulder width.', 'Pull the bar to the top of the chest, elbows down and back.', 'Let the arms fully straighten at the top of each rep.'],
  },
  chin_up_negative: {
    name: 'Chin-up negatives', pattern: 'vertical_pull', equipment: ['pullup_bar'], level: 1,
    avoidIf: ['shoulder', 'elbow'], loadType: 'body', start: null, increment: null, target: [3, 5],
    cues: ['Jump or step to the top, chin over the bar.', 'Lower yourself as slowly as you can, aim for 5 seconds.', 'When you can do 5 reps at 5 seconds, try a full chin-up.'],
  },
  chin_up: {
    name: 'Chin-up', pattern: 'vertical_pull', equipment: ['pullup_bar'], level: 2,
    avoidIf: ['shoulder', 'elbow'], loadType: 'body', start: null, increment: null, target: [4, 8],
    cues: ['Palms facing you, shoulder width.', 'Pull the elbows to the ribs, chin over the bar.', 'Full hang at the bottom of every rep.'],
  },
  backpack_row: {
    name: 'Backpack row', pattern: 'vertical_pull', equipment: [], level: 0,
    avoidIf: ['lower_back'], loadType: 'body', start: null, increment: null,
    cues: ['Load a backpack with books or water bottles.', 'Hinge forward, flat back, row the bag to your hip.', 'Pause one second at the top of each rep.'],
  },

  // ── Horizontal pull ───────────────────────────────────────────
  seated_cable_row: {
    name: 'Seated cable row', pattern: 'horizontal_pull', equipment: ['cables'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 50, kg: 23 }, increment: { lb: 10, kg: 5 },
    cues: ['Sit tall, knees slightly bent.', 'Pull the handle to the belly button, squeeze the shoulder blades.', 'Let the shoulders reach forward at the start of each rep.'],
  },
  machine_row: {
    name: 'Machine row', pattern: 'horizontal_pull', equipment: ['machines'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 50, kg: 23 }, increment: { lb: 10, kg: 5 },
    cues: ['Chest against the pad throughout.', 'Drive the elbows back, not the hands.', 'Slow return, no jerking the stack.'],
  },
  db_row: {
    name: 'One-arm dumbbell row', pattern: 'horizontal_pull', equipment: ['dumbbells', 'bench'], level: 0,
    avoidIf: [], loadType: 'dumbbell',
    start: { lb: 25, kg: 12 }, increment: { lb: 5, kg: 2.5 },
    cues: ['One hand and knee on the bench, back flat.', 'Row to the hip, elbow close to the body.', 'Do all reps on one side, then the other.'],
  },
  inverted_row: {
    name: 'Inverted row', pattern: 'horizontal_pull', equipment: [], level: 0,
    avoidIf: [], loadType: 'body', start: null, increment: null,
    cues: ['Under a sturdy table or a low bar, body straight.', 'Pull the chest to the edge.', 'Feet further away makes it harder.'],
  },

  // ── Single-leg / lunge ────────────────────────────────────────
  db_walking_lunge: {
    name: 'Dumbbell walking lunge', pattern: 'lunge', equipment: ['dumbbells'], level: 0,
    avoidIf: ['knee'], loadType: 'dumbbell',
    start: { lb: 15, kg: 7.5 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Long step, back knee to just above the floor.', 'Torso upright, front heel down.', 'Reps are per leg.'],
  },
  split_squat: {
    name: 'Split squat', pattern: 'lunge', equipment: [], level: 0,
    avoidIf: ['knee'], loadType: 'body', start: null, increment: null,
    cues: ['One foot forward, one back, hips square.', 'Lower straight down, back knee towards the floor.', 'Rear foot on a chair makes it much harder.'],
  },

  // ── Knee flexion / extension ──────────────────────────────────
  leg_curl: {
    name: 'Leg curl', pattern: 'knee_flexion', equipment: ['machines'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 40, kg: 18 }, increment: { lb: 10, kg: 5 },
    cues: ['Pad just above the ankles.', 'Curl fully, pause, lower for two seconds.', 'Hips stay down on the pad.'],
  },
  leg_extension: {
    name: 'Leg extension', pattern: 'knee_extension', equipment: ['machines'], level: 0,
    avoidIf: ['knee'], loadType: 'stack',
    start: { lb: 50, kg: 23 }, increment: { lb: 10, kg: 5 },
    cues: ['Knee joint lined up with the machine pivot.', 'Straighten fully, squeeze the quad for one second.', 'Lower under control, no dropping the stack.'],
  },

  // ── Arms ──────────────────────────────────────────────────────
  db_curl: {
    name: 'Dumbbell curl', pattern: 'elbow_flexion', equipment: ['dumbbells'], level: 0,
    avoidIf: ['elbow'], loadType: 'dumbbell',
    start: { lb: 15, kg: 7.5 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Elbows pinned to the sides.', 'Curl to the shoulder, lower for two seconds.', 'No swinging; if you swing, the weight is too heavy.'],
  },
  cable_curl: {
    name: 'Cable curl', pattern: 'elbow_flexion', equipment: ['cables'], level: 0,
    avoidIf: ['elbow'], loadType: 'stack',
    start: { lb: 20, kg: 9 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Low pulley, straight bar or rope.', 'Elbows pinned to the sides, curl to the shoulders.', 'Lower slowly; the cable keeps tension the whole way.'],
  },
  backpack_curl: {
    name: 'Backpack curl', pattern: 'elbow_flexion', equipment: [], level: 0,
    avoidIf: ['elbow'], loadType: 'body', start: null, increment: null,
    cues: ['Hold a loaded backpack by the top handle with both hands.', 'Elbows at your sides, curl it to chest height.', 'Three seconds down. Add books to make it harder.'],
  },
  triceps_pushdown: {
    name: 'Triceps rope pushdown', pattern: 'elbow_extension', equipment: ['cables'], level: 0,
    avoidIf: ['elbow'], loadType: 'stack',
    start: { lb: 30, kg: 14 }, increment: { lb: 10, kg: 5 },
    cues: ['Elbows tucked, upper arms still.', 'Push down and split the rope at the bottom.', 'Let the forearms come up past parallel on the return.'],
  },
  bench_dip: {
    name: 'Bench dip', pattern: 'elbow_extension', equipment: [], level: 0,
    avoidIf: ['shoulder'], loadType: 'body', start: null, increment: null,
    cues: ['Hands on a chair or bed edge behind you.', 'Lower until elbows are at 90 degrees, no lower.', 'Keep the shoulders down away from the ears.'],
  },

  // ── Shoulders / upper back health ─────────────────────────────
  face_pull: {
    name: 'Cable face pull', pattern: 'rear_delt', equipment: ['cables'], level: 0,
    avoidIf: [], loadType: 'stack',
    start: { lb: 20, kg: 9 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Rope at face height, thumbs pointing back.', 'Pull to the forehead, elbows high and wide.', 'Light weight, perfect reps. This protects the shoulders.'],
  },

  rear_delt_raise: {
    name: 'Bent-over rear delt raise', pattern: 'rear_delt', equipment: ['dumbbells'], level: 0,
    avoidIf: ['lower_back'], loadType: 'dumbbell',
    start: { lb: 8, kg: 4 }, increment: { lb: 2.5, kg: 1 },
    cues: ['Light dumbbells. Hinge forward until the chest faces the floor.', 'Raise the arms out to the sides, thumbs slightly down.', 'Pause at the top. If you have to swing, go lighter.'],
  },
  prone_y_raise: {
    name: 'Prone Y raise', pattern: 'rear_delt', equipment: [], level: 0,
    avoidIf: [], loadType: 'body', start: null, increment: null,
    cues: ['Lie face down, arms overhead in a Y, thumbs up.', 'Lift the arms off the floor by squeezing the shoulder blades down.', 'Hold two seconds. No weight needed; it is hard enough.'],
  },

  // ── Core and grip ─────────────────────────────────────────────
  plank: {
    name: 'Plank', pattern: 'core_static', equipment: [], level: 0,
    avoidIf: [], loadType: 'time', start: null, increment: null,
    cues: ['Forearms down, body in one straight line.', 'Squeeze glutes, tuck the ribs.', 'Stop the set when the hips sag.'],
  },
  side_plank: {
    name: 'Side plank', pattern: 'core_static', equipment: [], level: 0,
    avoidIf: ['shoulder'], loadType: 'time', start: null, increment: null,
    cues: ['On one forearm, elbow under the shoulder, feet stacked.', 'Lift the hips until the body is one straight line.', 'Hold, then switch sides. Log the shorter side.'],
  },
  hanging_knee_raise: {
    name: 'Hanging knee raise', pattern: 'core_dynamic', equipment: ['pullup_bar'], level: 0,
    avoidIf: ['shoulder'], loadType: 'body', start: null, increment: null,
    cues: ['Hang with straight arms.', 'Bring the knees to the chest, curl the pelvis up.', 'Lower slowly; no swinging.'],
  },
  dead_bug: {
    name: 'Dead bug', pattern: 'core_dynamic', equipment: [], level: 0,
    avoidIf: [], loadType: 'body', start: null, increment: null,
    cues: ['On your back, arms up, knees over hips.', 'Extend the opposite arm and leg, lower back pressed into the floor.', 'Slow. Reps are per side.'],
  },
  dead_hang: {
    name: 'Dead hang', pattern: 'grip', equipment: ['pullup_bar'], level: 0,
    avoidIf: ['shoulder'], loadType: 'time', start: null, increment: null,
    cues: ['Full grip, thumbs around the bar.', 'Shoulders relaxed, then pull them down slightly.', 'Hold as long as you can. Log the seconds.'],
  },
  farmer_carry: {
    name: 'Farmer carry', pattern: 'grip', equipment: ['dumbbells'], level: 0,
    avoidIf: [], loadType: 'dumbbell',
    start: { lb: 40, kg: 18 }, increment: { lb: 5, kg: 2.5 },
    cues: ['Heaviest dumbbells you can hold, one in each hand.', 'Walk tall for 30 to 40 seconds.', 'Do not let the shoulders roll forward.'],
  },
};

// For each pattern, the order in which the generator tries exercises.
// First match that passes equipment, level and contraindication checks wins.
export const PATTERN_PREFERENCE = {
  squat:            ['back_squat', 'goblet_squat', 'leg_press', 'bodyweight_squat'],
  hinge:            ['deadlift', 'romanian_deadlift', 'dumbbell_rdl', 'glute_bridge'],
  hinge_light:      ['romanian_deadlift', 'dumbbell_rdl', 'glute_bridge'],
  horizontal_push:  ['db_bench_press', 'barbell_bench_press', 'machine_chest_press', 'db_floor_press', 'barbell_floor_press', 'weighted_push_up', 'push_up'],
  horizontal_push_incline: ['incline_db_press', 'db_bench_press', 'machine_chest_press', 'db_floor_press', 'weighted_push_up', 'push_up'],
  vertical_push:    ['overhead_press', 'db_shoulder_press', 'pike_push_up'],
  vertical_pull:    ['lat_pulldown', 'chin_up_negative', 'backpack_row'],
  vertical_pull_hard: ['chin_up_negative', 'lat_pulldown', 'backpack_row'],
  horizontal_pull:  ['seated_cable_row', 'machine_row', 'db_row', 'inverted_row'],
  lunge:            ['db_walking_lunge', 'split_squat'],
  knee_flexion:     ['leg_curl', 'dumbbell_rdl', 'glute_bridge'],
  knee_extension:   ['leg_extension', 'split_squat'],
  elbow_flexion:    ['db_curl', 'cable_curl', 'backpack_curl'],
  elbow_extension:  ['triceps_pushdown', 'bench_dip'],
  rear_delt:        ['face_pull', 'rear_delt_raise', 'prone_y_raise'],
  core_static:      ['plank', 'side_plank'],
  core_dynamic:     ['hanging_knee_raise', 'dead_bug'],
  grip:             ['dead_hang', 'farmer_carry'],
};
