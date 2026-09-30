// The intake interview, as the onboarding flow renders it. Same questions a
// trainer asks a new client. Health screening cannot be skipped and can stop the
// flow: see RED_FLAGS.

export const INTAKE_STEPS = [
  { id: 'about', title: 'About you', intro: 'The basics a trainer needs before anything else.',
    fields: [
      { key: 'name', label: 'Your name', type: 'text', required: true },
      { key: 'age', label: 'Age', type: 'number', min: 14, max: 90, required: true },
      { key: 'sex', label: 'Sex', type: 'choice', options: [['male', 'Male'], ['female', 'Female']], required: true },
      { key: 'heightCm', label: 'Height', type: 'height', required: true },
      { key: 'weightKg', label: 'Current weight', type: 'weight', required: true },
      { key: 'activity', label: 'What do you do all day?', type: 'choice', required: true, options: [
        ['sedentary', 'Mostly sitting'], ['light', 'On my feet some of the day'], ['active', 'Physical work'] ] },
      { key: 'sleepHours', label: 'Hours of sleep on a typical night', type: 'number', min: 3, max: 12, step: 0.5, required: true },
    ] },

  { id: 'goal', title: 'The goal', intro: 'You can want all of these. Which one wins when they conflict?',
    fields: [
      { key: 'goal', label: 'In six months, what matters most?', type: 'choice', required: true, options: [
        ['muscle', 'Build muscle and weigh more'], ['strength', 'Get stronger'], ['fat_loss', 'Lose fat'], ['health', 'General health and energy'] ] },
      { key: 'targetWeightKg', label: 'Target weight, if you have one', type: 'weight', required: false },
      { key: 'why', label: 'Why now? What changed?', type: 'textarea', required: false },
    ] },

  { id: 'health', title: 'Health screening', intro: 'Answer honestly. Some answers mean you see a doctor before you see a barbell.',
    fields: [
      { key: 'pain', label: 'Current pain or past injuries', type: 'multi', options: [
        ['knee', 'Knees'], ['lower_back', 'Lower back'], ['shoulder', 'Shoulders'], ['neck', 'Neck'], ['wrist', 'Wrists'], ['elbow', 'Elbows'] ] },
      { key: 'conditions', label: 'Diagnosed conditions', type: 'multi', options: [
        ['diabetes', 'Diabetes or pre-diabetes'], ['bp', 'High blood pressure'], ['heart', 'Heart condition'], ['asthma', 'Asthma'], ['thyroid', 'Thyroid'] ] },
      { key: 'meds', label: 'Regular medication', type: 'yesno', required: true },
      { key: 'surgery', label: 'Surgery in the last two years', type: 'yesno', required: true },
      { key: 'doctorLimit', label: 'Has a doctor told you not to exercise, or to limit it?', type: 'yesno', required: true },
    ] },

  { id: 'start', title: 'Where you are starting from', intro: 'This decides how fast the program moves you to the barbell.',
    fields: [
      { key: 'experience', label: 'Training history', type: 'choice', required: true, options: [
        ['novice', 'Never trained with weights'], ['detrained', 'Trained before, stopped over six months ago'], ['experienced', 'Training regularly in the last six months'] ] },
      { key: 'pushups', label: 'Push-ups you can do with good form', type: 'number', min: 0, max: 100, required: true },
      { key: 'hangSeconds', label: 'Seconds you can hang from a bar', type: 'number', min: 0, max: 120, required: false },
      { key: 'stairs', label: 'Out of breath after two flights of stairs?', type: 'yesno', required: true },
    ] },

  { id: 'schedule', title: 'Schedule', intro: 'Pick the days you will actually show up, not the days you wish you would.',
    fields: [
      { key: 'daysPerWeek', label: 'Lifting days per week', type: 'choice', required: true, options: [
        ['3', 'Three (recommended for the first year)'], ['4', 'Four'] ] },
      { key: 'trainingDays', label: 'Which days?', type: 'days', required: true },
      { key: 'cardioDays', label: 'Easy cardio days, if any', type: 'days', required: false },
      { key: 'timeOfDay', label: 'When?', type: 'choice', required: true, options: [['morning', 'Morning'], ['midday', 'Midday'], ['evening', 'Evening']] },
      { key: 'sessionMinutes', label: 'Minutes per session', type: 'choice', required: true, options: [['45', '45'], ['60', '60'], ['75', '75']] },
      { key: 'travel', label: 'Do you travel for work?', type: 'yesno', required: true },
    ] },

  { id: 'equipment', title: 'Equipment', intro: 'Tick everything your gym has. The program only uses what you tick.',
    fields: [
      { key: 'equipment', label: 'Available', type: 'multi', options: [
        ['barbell', 'Barbell with a rack'], ['dumbbells', 'Dumbbells'], ['bench', 'Adjustable bench'], ['cables', 'Cable machine'],
        ['machines', 'Weight machines (pulldown, row, press, leg curl)'], ['leg_press', 'Leg press'], ['pullup_bar', 'Pull-up bar'], ['cardio', 'Rower, bike or treadmill'] ] },
      { key: 'dumbbellMax', label: 'Heaviest dumbbell', type: 'load', required: false },
    ] },

  { id: 'food', title: 'Food', intro: 'The plan fits your kitchen, not the other way round.',
    fields: [
      { key: 'dietType', label: 'What do you eat?', type: 'choice', required: true, options: [
        ['nonveg', 'Meat, fish and eggs'], ['egg', 'Eggs and dairy, no meat'], ['veg', 'Vegetarian'] ] },
      { key: 'cuisine', label: 'What does home cooking look like?', type: 'choice', required: true, options: [
        ['south_indian', 'South Indian'], ['north_indian', 'North Indian'], ['generic', 'Something else'] ] },
      { key: 'mealsPerDay', label: 'Meals on a normal day', type: 'choice', required: true, options: [['2', 'Two'], ['3', 'Three'], ['4', 'Four or more']] },
      { key: 'vegDays', label: 'Vegetarian days per week (if you eat meat)', type: 'number', min: 0, max: 7, required: false },
      { key: 'whey', label: 'Willing to use a whey protein shake?', type: 'yesno', required: true },
      { key: 'waterOk', label: 'Do you already drink 3 litres of water a day?', type: 'yesno', required: true },
      { key: 'alcoholPerWeek', label: 'Alcoholic drinks per week', type: 'number', min: 0, max: 50, required: true },
      { key: 'nicotine', label: 'Do you smoke or vape?', type: 'yesno', required: true },
    ] },

  { id: 'mindset', title: 'Mindset', intro: 'Last three. They shape how the app talks to you.',
    fields: [
      { key: 'quitReason', label: 'If you have started before, what made you stop?', type: 'textarea', required: false },
      { key: 'tone', label: 'When you miss a week, the app should be', type: 'choice', required: true, options: [
        ['silent', 'Silent'], ['plain', 'Matter-of-fact'], ['loud', 'In my face'] ] },
    ] },
];

// Any of these true: stop and send the person to a doctor or a human trainer.
export const RED_FLAGS = [
  { test: p => p.conditions?.includes('heart'), text: 'A diagnosed heart condition needs a doctor\'s clearance before a strength program. Ask, then come back.' },
  { test: p => p.doctorLimit, text: 'A doctor has told you to limit exercise. This app only handles healthy beginners. Get the limits in writing and work with a human trainer.' },
  { test: p => p.surgery, text: 'Surgery in the last two years needs a clearance from the surgeon or a physiotherapist before loading the area. Ask, then come back.' },
  { test: p => p.conditions?.includes('bp') && p.meds, text: 'Medicated high blood pressure is usually fine to train with, but confirm with your doctor first. Ask, then come back.' },
  { test: p => p.age >= 65 && p.experience === 'novice', text: 'Starting strength training after 65 is a very good idea and needs a person watching your first sessions. Find a trainer for the first month.' },
];

// Softer warnings that appear on the plan but do not stop the flow.
export const CAUTIONS = [
  { test: p => p.conditions?.includes('diabetes'), text: 'Diabetes: keep a fast carbohydrate in your bag during sessions and do not train fasted until you know how your sugar responds.' },
  { test: p => p.conditions?.includes('asthma'), text: 'Asthma: inhaler in the gym bag, longer warm-up, stop if the chest tightens.' },
  { test: p => p.sleepHours < 7, text: 'Under 7 hours of sleep. This is the first thing to fix; the program will stall without it.' },
  { test: p => (p.pain?.length || 0) > 0, text: 'The program avoids exercises that load the areas you flagged. If anything hurts during a set, stop the set. Pain is not a signal to push through.' },
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
