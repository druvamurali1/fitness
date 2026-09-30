// Program templates. A template is a list of workouts; each workout is a list of
// slots. A slot names a movement pattern and a role. The generator fills each
// slot with a concrete exercise and turns the role into sets and a rep range.
//
// role: main (the big lift of the day), secondary, accessory, core, grip
// Days per week decides the split; the split never changes mid-plan.

export const TEMPLATES = {
  full_body_3: {
    name: 'Full body, three days',
    description: 'Three sessions a week, every muscle every session, a rest day between each. The best option for anyone in their first year.',
    rotation: true,
    workouts: [
      { id: 'A', name: 'Squat day', focus: 'Legs, chest and back', slots: [
        { pattern: 'squat', role: 'main', sets: 3 },
        { pattern: 'horizontal_push', role: 'secondary', sets: 3 },
        { pattern: 'vertical_pull', role: 'secondary', sets: 3 },
        { pattern: 'knee_flexion', role: 'accessory', sets: 2 },
        { pattern: 'elbow_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_static', role: 'core', sets: 3 },
      ]},
      { id: 'B', name: 'Deadlift day', focus: 'Hips, shoulders and back', slots: [
        { pattern: 'hinge', role: 'main', sets: 3 },
        { pattern: 'vertical_push', role: 'secondary', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'lunge', role: 'accessory', sets: 2 },
        { pattern: 'elbow_extension', role: 'accessory', sets: 2 },
        { pattern: 'grip', role: 'grip', sets: 3 },
      ]},
      { id: 'C', name: 'Press day', focus: 'Hamstrings, chest and arms', slots: [
        { pattern: 'hinge_light', role: 'main', sets: 3 },
        { pattern: 'horizontal_push_incline', role: 'secondary', sets: 3 },
        { pattern: 'vertical_pull_hard', role: 'secondary', sets: 3 },
        { pattern: 'knee_extension', role: 'accessory', sets: 2 },
        { pattern: 'rear_delt', role: 'accessory', sets: 2 },
        { pattern: 'core_dynamic', role: 'core', sets: 3 },
      ]},
    ],
  },

  full_body_2: {
    name: 'Full body, two days',
    description: 'Two sessions a week, every muscle both times. The least that still builds strength and muscle; good for a packed week.',
    rotation: true,
    workouts: [
      { id: 'A', name: 'Squat day', focus: 'Legs, chest and back', slots: [
        { pattern: 'squat', role: 'main', sets: 3 },
        { pattern: 'horizontal_push', role: 'secondary', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'hinge_light', role: 'accessory', sets: 2 },
        { pattern: 'elbow_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_static', role: 'core', sets: 3 },
      ]},
      { id: 'B', name: 'Deadlift day', focus: 'Hips, shoulders and back', slots: [
        { pattern: 'hinge', role: 'main', sets: 3 },
        { pattern: 'vertical_push', role: 'secondary', sets: 3 },
        { pattern: 'vertical_pull', role: 'secondary', sets: 3 },
        { pattern: 'lunge', role: 'accessory', sets: 2 },
        { pattern: 'elbow_extension', role: 'accessory', sets: 2 },
        { pattern: 'core_dynamic', role: 'core', sets: 3 },
      ]},
    ],
  },

  upper_lower_4: {
    name: 'Upper / lower, four days',
    description: 'Two upper-body and two lower-body sessions a week. More volume per muscle than three full-body days; needs four reliable mornings.',
    rotation: true,
    workouts: [
      { id: 'U1', name: 'Upper 1', focus: 'Chest, back and arms', slots: [
        { pattern: 'horizontal_push', role: 'main', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'vertical_push', role: 'secondary', sets: 3 },
        { pattern: 'vertical_pull', role: 'secondary', sets: 3 },
        { pattern: 'elbow_flexion', role: 'accessory', sets: 2 },
        { pattern: 'elbow_extension', role: 'accessory', sets: 2 },
      ]},
      { id: 'L1', name: 'Lower 1', focus: 'Legs and trunk', slots: [
        { pattern: 'squat', role: 'main', sets: 3 },
        { pattern: 'hinge_light', role: 'secondary', sets: 3 },
        { pattern: 'lunge', role: 'accessory', sets: 2 },
        { pattern: 'knee_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_static', role: 'core', sets: 3 },
      ]},
      { id: 'U2', name: 'Upper 2', focus: 'Shoulders, back and grip', slots: [
        { pattern: 'vertical_push', role: 'main', sets: 3 },
        { pattern: 'vertical_pull_hard', role: 'secondary', sets: 3 },
        { pattern: 'horizontal_push_incline', role: 'secondary', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'rear_delt', role: 'accessory', sets: 2 },
        { pattern: 'grip', role: 'grip', sets: 3 },
      ]},
      { id: 'L2', name: 'Lower 2', focus: 'Hips, legs and trunk', slots: [
        { pattern: 'hinge', role: 'main', sets: 3 },
        { pattern: 'squat', role: 'secondary', sets: 3 },
        { pattern: 'knee_extension', role: 'accessory', sets: 2 },
        { pattern: 'knee_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_dynamic', role: 'core', sets: 3 },
      ]},
    ],
  },

  five_day: {
    name: 'Upper, lower, push, pull, legs',
    description: 'Five sessions a week for someone already training. Two full upper and lower days, then push, pull and legs. Needs five reliable days and good sleep.',
    rotation: true,
    workouts: [
      { id: 'U', name: 'Upper', focus: 'Chest, back and shoulders', slots: [
        { pattern: 'horizontal_push', role: 'main', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'vertical_push', role: 'secondary', sets: 3 },
        { pattern: 'vertical_pull', role: 'secondary', sets: 3 },
        { pattern: 'rear_delt', role: 'accessory', sets: 2 },
      ]},
      { id: 'L', name: 'Lower', focus: 'Legs and trunk', slots: [
        { pattern: 'squat', role: 'main', sets: 3 },
        { pattern: 'hinge_light', role: 'secondary', sets: 3 },
        { pattern: 'lunge', role: 'accessory', sets: 2 },
        { pattern: 'knee_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_static', role: 'core', sets: 3 },
      ]},
      { id: 'P', name: 'Push', focus: 'Chest, shoulders and triceps', slots: [
        { pattern: 'vertical_push', role: 'main', sets: 3 },
        { pattern: 'horizontal_push_incline', role: 'secondary', sets: 3 },
        { pattern: 'horizontal_push', role: 'secondary', sets: 3 },
        { pattern: 'elbow_extension', role: 'accessory', sets: 3 },
      ]},
      { id: 'Q', name: 'Pull', focus: 'Back, biceps and grip', slots: [
        { pattern: 'vertical_pull_hard', role: 'main', sets: 3 },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3 },
        { pattern: 'rear_delt', role: 'accessory', sets: 2 },
        { pattern: 'elbow_flexion', role: 'accessory', sets: 3 },
        { pattern: 'grip', role: 'grip', sets: 3 },
      ]},
      { id: 'G', name: 'Legs', focus: 'Hips, legs and trunk', slots: [
        { pattern: 'hinge', role: 'main', sets: 3 },
        { pattern: 'squat', role: 'secondary', sets: 3 },
        { pattern: 'knee_extension', role: 'accessory', sets: 2 },
        { pattern: 'knee_flexion', role: 'accessory', sets: 2 },
        { pattern: 'core_dynamic', role: 'core', sets: 3 },
      ]},
    ],
  },

  // Travel / no-equipment fallback. Two workouts, alternate them.
  bodyweight_2: {
    name: 'No equipment',
    description: 'For hotel rooms and weeks away. Two workouts, alternate them. Needs a floor, a chair and a backpack.',
    rotation: true,
    workouts: [
      { id: 'T1', name: 'Travel 1', focus: 'Legs, chest and back, no equipment', slots: [
        { pattern: 'squat', role: 'main', sets: 3, force: 'bodyweight_squat' },
        { pattern: 'horizontal_push', role: 'secondary', sets: 3, force: 'push_up' },
        { pattern: 'vertical_pull', role: 'secondary', sets: 3, force: 'backpack_row' },
        { pattern: 'lunge', role: 'accessory', sets: 3, force: 'split_squat' },
        { pattern: 'core_static', role: 'core', sets: 3, force: 'plank' },
      ]},
      { id: 'T2', name: 'Travel 2', focus: 'Hips, shoulders and arms, no equipment', slots: [
        { pattern: 'hinge', role: 'main', sets: 3, force: 'glute_bridge' },
        { pattern: 'vertical_push', role: 'secondary', sets: 3, force: 'pike_push_up' },
        { pattern: 'horizontal_pull', role: 'secondary', sets: 3, force: 'inverted_row' },
        { pattern: 'elbow_extension', role: 'accessory', sets: 3, force: 'bench_dip' },
        { pattern: 'core_dynamic', role: 'core', sets: 3, force: 'dead_bug' },
      ]},
    ],
  },
};

// Rep ranges by goal and role. [min, max]. Core and grip are seconds or reps of
// bodyweight work, handled separately.
export const REP_RANGES = {
  muscle:   { main: [6, 8],  secondary: [8, 10],  accessory: [10, 12] },
  strength: { main: [3, 5],  secondary: [6, 8],   accessory: [8, 10] },
  fat_loss: { main: [8, 10], secondary: [10, 12], accessory: [12, 15] },
  health:   { main: [8, 10], secondary: [10, 12], accessory: [12, 15] },
};

// Bodyweight and timed work uses its own targets regardless of goal.
export const BODY_TARGETS = {
  body: { main: [8, 15], secondary: [8, 15], accessory: [10, 20], core: [8, 12], grip: [8, 15] },
  time: { core: [30, 45], grip: [10, 40], main: [30, 45], secondary: [30, 45], accessory: [30, 45] },
};

// Rest between sets, seconds.
export const REST_SECONDS = { main: 120, secondary: 90, accessory: 60, core: 45, grip: 60 };

export const WARMUP = [
  { id: 'cardio', text: '5 minutes easy on the rower or air bike. Breathing harder, not gasping.' },
  { id: 'mobility', text: '10 bodyweight squats, 10 arm circles each way, 10 hip hinges with hands on hips.' },
  { id: 'ramp', text: 'Two lighter sets of the first exercise before the working sets: half the weight for 8, then three-quarters for 5.' },
];

export const COOLDOWN = [
  { id: 'walk', text: '3 minutes easy walking or slow cycling to bring the heart rate down.' },
  { id: 'stretch', text: 'Hold each for 30 seconds: hamstrings, hip flexors, chest in a doorway, lats hanging from the bar.' },
];

export const CARDIO_DAY = {
  name: 'Easy cardio',
  text: '20 minutes on the rower, air bike or treadmill at a pace where you could hold a conversation. Or a 30-minute walk outside. This is recovery, not a workout; do not go hard.',
};
