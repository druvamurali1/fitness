// Saved profiles that can be loaded instead of running the interview. Only
// training-relevant fields live here; this file is published with the app.

export const PROFILES = {
  druva: {
    name: 'Druva',
    age: 30, sex: 'male', heightCm: 173, weightKg: 63,
    activity: 'sedentary', sleepHours: 7,
    goal: 'muscle', targetWeightKg: 71,
    pain: [], conditions: [], meds: false, surgery: false, doctorLimit: false,
    experience: 'detrained', pushups: 20, hangSeconds: 8, stairs: false,
    daysPerWeek: 3, trainingDays: [1, 3, 5], cardioDays: [2, 4], timeOfDay: 'morning', sessionMinutes: 60, travel: true,
    equipment: ['barbell', 'dumbbells', 'bench', 'cables', 'machines', 'pullup_bar', 'cardio'], dumbbellMax: { lb: 50 },
    dietType: 'nonveg', cuisine: 'south_indian', mealsPerDay: 2, vegDays: 1, whey: true, waterOk: true,
    alcoholPerWeek: 4, nicotine: true,
    quitReason: 'No proper guidance.',
    tone: 'plain',
    units: { load: 'lb', body: 'kg' },
    equipmentNotes: {
      barbell: 'The black Torque rack under the TV, with the mirror behind it. The bar is already on it and the plates hang on the sides. The adjustable bench lives inside it.',
      bench: 'The bench inside the Torque rack, or the second adjustable bench by the dumbbell rack. The angle notches are labelled 0, 15, 30, 45.',
      dumbbells: 'The two-tier rack in the corner by the medicine balls and kettlebells. 5 lb up to about 50 lb.',
      cables: 'The tall grey Hoist Motion Cage, the frame with the heavy bag hanging off it. Two stacks, one each side. The rope and handles clip onto the carabiner; the pulley slides up and down the post and locks with the yellow pin.',
      machines: 'The grey Hoist machines by the stairs. Each does two exercises: pulldown and row, chest press and shoulder raise, leg curl and leg extension. The yellow pin sets the weight; the label on the stack tells you which.',
      pullup_bar: 'The bar across the top of the Torque rack.',
      cardio: 'The rower and the air bike along the window wall. Treadmills next to them.',
      none: 'Anywhere with a bit of floor.',
    },
    mealTimes: { pre: '4:45, before the gym', post: '6:15, straight after the gym', breakfast: 'Breakfast, 7:30 before work', lunch: 'Lunch, about 1:00', snack: '4:30, before the evening shift', dinner: 'Dinner, 9:00' },
  },
};
