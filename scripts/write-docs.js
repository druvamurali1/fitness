// Regenerates docs/program.md and docs/diet.md for Druva from the live data
// layer, so the readable copies never drift from what the app builds.
// Run: node scripts/write-docs.js
import { writeFileSync } from 'node:fs';
import { generatePlan } from '../js/generator.js';
import { PROFILES } from '../js/data/profiles.js';
import { DAY_NAMES } from '../js/data/intake.js';

const p = generatePlan(PROFILES.druva);
const lb = x => x == null ? 'bodyweight' : x + ' lb';
const today = new Date().toISOString().slice(0, 10);

let md = `# Druva's program\n\nGenerated ${today} by scripts/write-docs.js from the data in js/data and the profile in js/data/profiles.js. The app builds the same thing; this file is the readable copy.\n\n`;
md += `## Shape\n\n- ${p.splitName}. ${p.splitDescription}\n- Lifting: ${p.trainingDays.map(d => DAY_NAMES[d]).join(', ')}, 5 AM, about an hour.\n- Easy cardio: ${p.cardioDays.map(d => DAY_NAMES[d]).join(' and ')} (optional, can also follow a lifting session). ${p.cardio.text}\n- Workouts rotate ${p.workouts.map(w => w.id).join(', ')} in order regardless of the day. A missed day is skipped, never made up.\n\n`;
md += `## Every session\n\nWarm-up:\n${p.warmup.map(w => '- ' + w.text).join('\n')}\n\nCool-down:\n${p.cooldown.map(w => '- ' + w.text).join('\n')}\n\nEnd of session: the app asks "Anything hurt?". The same joint twice in three sessions rebuilds the plan around it.\n\n`;
for (const w of p.workouts) {
  md += `## Workout ${w.id}: ${w.focus}\n\n| # | Exercise | Sets × target | Start | Rest | If it's taken or missing |\n|---|---|---|---|---|---|\n`;
  for (const e of w.exercises) md += `| ${e.slot} | ${e.name} | ${e.sets} × ${e.repMin}–${e.repMax}${e.measure === 'seconds' ? ' s' : ''} | ${lb(e.startLoadLb)} | ${e.restSeconds} s | ${e.alts.map(a => a.name).join(' → ') || '–'} |\n`;
  md += '\n';
}
md += `## Progression\n\n${p.progression.map((r, i) => (i + 1) + '. ' + r).join('\n')}\n\n`;
md += `## ${p.fallbackName} (travel)\n\n${p.fallbackDescription}\n\n`;
for (const w of p.fallback) md += `**${w.id}**: ${w.exercises.map(e => `${e.name} ${e.sets}×${e.repMin}–${e.repMax}${e.measure === 'seconds' ? ' s' : ''}`).join('; ')}\n\n`;
if (p.cautions.length) md += `## Cautions\n\n${p.cautions.map(c => '- ' + c).join('\n')}\n\n`;
writeFileSync('docs/program.md', md);

const d = p.diet;
let dm = `# Druva's diet\n\nGenerated ${today} by scripts/write-docs.js for a muscle-gain goal at 63 kg, South Indian non-vegetarian, training at 5 AM. The app shows the same plan under the Plan tab.\n\n`;
dm += `## Targets\n\n| | |\n|---|---|\n| Calories a day | ${d.calories} (burns about ${d.tdee}) |\n| Protein a day | ${d.proteinG} g, about ${d.proteinPortionTarget} portions of 25 g |\n| Water | ${d.waterL} L or more |\n| Alcohol | ${d.alcoholRule} |\n| Weight | ${d.weightTargetKg} kg target, gaining 0.25 to 0.5 kg a week |\n\n`;
dm += `## A day of eating\n\n| When | What | Protein | kcal |\n|---|---|---|---|\n${d.meals.map(m => `| ${m.time} | ${m.text} | ${m.protein} g | ${m.kcal} |`).join('\n')}\n\n${d.dayTotals.protein} g protein, about ${d.dayTotals.kcal} kcal. ${d.adjustments.join(' ')}\n\n`;
dm += `## Trainer's staging (not yet in the app)\n\nWeeks 1 and 2: keep brunch and dinner, add the post-workout shake and the 4:30 protein before the evening shift. That alone takes protein from roughly 80 g to 130 g. Breakfast comes in week 3 once the shake is automatic.\n\n`;
dm += `## What counts as one protein portion\n\n${d.proteinPortions.map(x => '- ' + x).join('\n')}\n\n## Rules\n\n${d.rules.map(x => '- ' + x).join('\n')}\n\n## Tracking\n\nProtein portions, meals and water as tap-to-fill pips in the Week tab; beers on weekends; sleep; a one-line note. Weigh every morning; the app averages the week. Waist on Sundays. Photos every four weeks.\n`;
writeFileSync('docs/diet.md', dm);
console.log('wrote docs/program.md and docs/diet.md');
