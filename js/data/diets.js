// Diet templates by cuisine and diet type. A template is a day of eating built
// around a morning training session. The generator scales portions to the
// calorie and protein targets it computes from the profile.
//
// Each item lists protein (g) and kcal for the portion described so the day can
// be summed and shown honestly. Numbers are typical values, not lab values.

export const CUISINES = {
  south_indian: { name: 'South Indian' },
  north_indian: { name: 'North Indian' },
  generic: { name: 'Simple, any kitchen' },
};

// A "protein portion" is roughly 25 g of protein. The daily tracker counts these.
export const PROTEIN_PORTIONS = [
  { text: '1 scoop whey in 250 ml milk', diet: ['nonveg', 'egg', 'veg'] },
  { text: '3 whole eggs', diet: ['nonveg', 'egg'] },
  { text: '150 g cooked chicken, fish, lamb or shrimp', diet: ['nonveg'] },
  { text: '200 g curd (thick, not diluted)', diet: ['nonveg', 'egg', 'veg'] },
  { text: '100 g paneer', diet: ['nonveg', 'egg', 'veg'] },
  { text: '1 large bowl of thick dal (about 300 ml) with a glass of milk', diet: ['nonveg', 'egg', 'veg'] },
  { text: '150 g tofu or 1 cup cooked soya chunks', diet: ['veg'] },
];

// Meal templates. `slot` is when it happens relative to a morning workout.
// Options are keyed by diet type; the first matching option is used.
export const MEAL_TEMPLATES = {
  south_indian: [
    { slot: 'pre', time: 'Before the gym', name: 'Pre-workout',
      options: { any: [
        { text: '1 banana and a glass of water. Coffee if you normally have it.', protein: 1, kcal: 100 },
      ] } },
    { slot: 'post', time: 'Right after the gym', name: 'Post-workout',
      options: { any: [
        { text: '1 scoop whey in 250 ml milk', protein: 33, kcal: 300 },
      ] } },
    { slot: 'breakfast', time: 'Breakfast, about 8:30', name: 'Breakfast',
      options: {
        nonveg: [
          { text: '3-egg omelette or 3 boiled eggs, with 3 idli or 1 dosa and chutney', protein: 27, kcal: 520 },
        ],
        egg: [
          { text: '3-egg omelette or 3 boiled eggs, with 3 idli or 1 dosa and chutney', protein: 27, kcal: 520 },
        ],
        veg: [
          { text: '200 g curd with poha or upma, plus a handful of roasted chana', protein: 22, kcal: 520 },
        ],
      } },
    { slot: 'lunch', time: 'Lunch, about 1:00', name: 'Lunch',
      options: {
        nonveg: [
          { text: '300 g cooked rice or 4 rotis, chicken, fish or lamb curry with at least 150 g of meat in your portion, a vegetable or dal side, 100 g curd', protein: 50, kcal: 950 },
        ],
        egg: [
          { text: '300 g cooked rice or 4 rotis, egg curry with 3 eggs or paneer curry with 150 g paneer, a vegetable or dal side, 100 g curd', protein: 42, kcal: 950 },
        ],
        veg: [
          { text: '300 g cooked rice or 4 rotis, paneer or soya curry with 150 g in your portion, a bowl of dal, 100 g curd', protein: 40, kcal: 950 },
        ],
      } },
    { slot: 'snack', time: 'Afternoon, before the evening shift', name: 'Afternoon',
      options: {
        nonveg: [
          { text: '200 g curd with fruit, or 2 boiled eggs and a handful of peanuts', protein: 18, kcal: 300 },
        ],
        egg: [
          { text: '200 g curd with fruit, or 2 boiled eggs and a handful of peanuts', protein: 18, kcal: 300 },
        ],
        veg: [
          { text: '200 g curd with fruit, or a glass of milk with roasted chana', protein: 16, kcal: 300 },
        ],
      } },
    { slot: 'dinner', time: 'Dinner, about 8:30', name: 'Dinner',
      options: {
        nonveg: [
          { text: 'Same shape as lunch: rice or roti, curry with 150 g of meat, a vegetable side. On the veg day, dal plus 150 g paneer.', protein: 50, kcal: 900 },
        ],
        egg: [
          { text: 'Same shape as lunch: rice or roti, paneer or egg curry, a vegetable side, curd.', protein: 40, kcal: 900 },
        ],
        veg: [
          { text: 'Same shape as lunch: rice or roti, dal plus 150 g paneer or soya, a vegetable side, curd.', protein: 38, kcal: 900 },
        ],
      } },
  ],

  north_indian: [
    { slot: 'pre', time: 'Before the gym', name: 'Pre-workout',
      options: { any: [{ text: '1 banana and a glass of water.', protein: 1, kcal: 100 }] } },
    { slot: 'post', time: 'Right after the gym', name: 'Post-workout',
      options: { any: [{ text: '1 scoop whey in 250 ml milk', protein: 33, kcal: 300 }] } },
    { slot: 'breakfast', time: 'Breakfast', name: 'Breakfast',
      options: {
        nonveg: [{ text: '3-egg bhurji with 2 rotis or 2 parathas', protein: 27, kcal: 550 }],
        egg: [{ text: '3-egg bhurji with 2 rotis or 2 parathas', protein: 27, kcal: 550 }],
        veg: [{ text: 'Paneer bhurji (100 g) with 2 rotis, or 200 g curd with 2 parathas', protein: 24, kcal: 550 }],
      } },
    { slot: 'lunch', time: 'Lunch', name: 'Lunch',
      options: {
        nonveg: [{ text: '4 rotis or 300 g rice, chicken or mutton curry with 150 g of meat, a sabzi, 100 g curd', protein: 50, kcal: 950 }],
        egg: [{ text: '4 rotis or 300 g rice, egg curry with 3 eggs or paneer sabzi, dal, 100 g curd', protein: 42, kcal: 950 }],
        veg: [{ text: '4 rotis or 300 g rice, rajma or chole (large bowl), paneer sabzi with 150 g paneer, 100 g curd', protein: 40, kcal: 950 }],
      } },
    { slot: 'snack', time: 'Afternoon', name: 'Afternoon',
      options: { any: [{ text: '200 g curd or a glass of milk, with roasted chana or peanuts', protein: 18, kcal: 300 }] } },
    { slot: 'dinner', time: 'Dinner', name: 'Dinner',
      options: {
        nonveg: [{ text: 'Same shape as lunch, with 150 g of meat in the curry.', protein: 50, kcal: 900 }],
        egg: [{ text: 'Same shape as lunch, paneer or egg based.', protein: 40, kcal: 900 }],
        veg: [{ text: 'Same shape as lunch: dal, paneer or soya, sabzi, roti or rice.', protein: 38, kcal: 900 }],
      } },
  ],

  generic: [
    { slot: 'pre', time: 'Before the gym', name: 'Pre-workout',
      options: { any: [{ text: 'A banana or a slice of toast, and water.', protein: 1, kcal: 100 }] } },
    { slot: 'post', time: 'Right after the gym', name: 'Post-workout',
      options: { any: [{ text: '1 scoop whey in 250 ml milk', protein: 33, kcal: 300 }] } },
    { slot: 'breakfast', time: 'Breakfast', name: 'Breakfast',
      options: {
        nonveg: [{ text: '3 eggs any style, 2 slices of wholegrain toast, fruit', protein: 27, kcal: 500 }],
        egg: [{ text: '3 eggs any style, 2 slices of wholegrain toast, fruit', protein: 27, kcal: 500 }],
        veg: [{ text: '200 g Greek yogurt or curd with oats, nuts and fruit', protein: 24, kcal: 500 }],
      } },
    { slot: 'lunch', time: 'Lunch', name: 'Lunch',
      options: {
        nonveg: [{ text: '150 g chicken, fish or lean meat, a fist of rice, potatoes or bread, vegetables', protein: 45, kcal: 800 }],
        egg: [{ text: 'Eggs or cottage cheese (150 g), a fist of rice, potatoes or bread, vegetables', protein: 35, kcal: 800 }],
        veg: [{ text: 'Tofu, beans or lentils (large bowl), a fist of rice, potatoes or bread, vegetables', protein: 30, kcal: 800 }],
      } },
    { slot: 'snack', time: 'Afternoon', name: 'Afternoon',
      options: { any: [{ text: 'Yogurt or milk with nuts, or a second half-scoop shake', protein: 18, kcal: 300 }] } },
    { slot: 'dinner', time: 'Dinner', name: 'Dinner',
      options: {
        nonveg: [{ text: 'Same shape as lunch, 150 g of protein on the plate.', protein: 45, kcal: 800 }],
        egg: [{ text: 'Same shape as lunch.', protein: 35, kcal: 800 }],
        veg: [{ text: 'Same shape as lunch.', protein: 30, kcal: 800 }],
      } },
  ],
};

// Plain-language rules that go with the plan. Some are conditional on the
// profile; the generator filters them.
export const DIET_RULES = [
  { id: 'protein_first', text: 'Protein on the plate at every meal before anything else. Rice and roti are fine; they are not the problem.', when: () => true },
  { id: 'third_meal', text: 'Two meals a day cannot hold enough protein to build muscle. Breakfast after the gym is the meal that was missing.', when: p => p.goal === 'muscle' && p.mealsPerDay <= 2 },
  { id: 'weigh', text: 'Weigh yourself every morning after the bathroom, before food. The app averages the week; single days mean nothing.', when: () => true },
  { id: 'takeout', text: 'Takeout is fine once or twice a week. Biryani: order chicken or mutton and add raita. Pizza, burgers, chicken tenders: they count as a meal, not extra.', when: () => true },
  { id: 'alcohol_weekend', text: 'Beer on the weekend only, two at most per evening. Alcohol on training nights undoes part of the session.', when: p => p.alcoholPerWeek > 0 },
  { id: 'nicotine', text: 'Nicotine suppresses appetite, which works against gaining. Every step down helps the plan, not just your lungs.', when: p => p.nicotine },
  { id: 'water', text: 'Water: 3 to 4 litres a day. You already do this. Keep it.', when: p => p.waterOk },
  { id: 'water_more', text: 'Water: aim for 3 litres a day. Keep a bottle at the desk.', when: p => !p.waterOk },
  { id: 'sleep', text: 'Muscle is built while you sleep. Under 7 hours and the program stalls no matter how well you train. A 5 AM alarm means lights out by 10.', when: () => true },
  { id: 'veg_day', text: 'On the vegetarian day, protein comes from paneer, dal, curd and the shake. Plan it, or it becomes a rice day.', when: p => p.vegDays > 0 },
  { id: 'deficit', text: 'You are eating a little less than you burn. Protein stays high so the weight lost is fat, not muscle. Expect 0.25 to 0.5 kg a week down.', when: p => p.goal === 'fat_loss' },
  { id: 'surplus', text: 'You are eating a little more than you burn. Expect 0.25 to 0.5 kg a week up. Faster than that is fat; slow it down.', when: p => p.goal === 'muscle' },
];
