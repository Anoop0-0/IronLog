// ── personal-record detection for a newly logged set ──────────────────
// Judged against every set logged for this exercise *before* this one —
// earlier sessions and earlier sets in today's session alike. Two kinds:
//
//   'weight' — heavier than any weight ever lifted for this exercise
//   'reps'   — more reps than ever done at this exact weight
//
// Comparisons are strictly greater-than: matching an old record isn't a
// new one. The two kinds turn out to be mutually exclusive — a weight
// heavier than everything before it has by definition never been
// attempted, so there's no rep count at it to beat — but the return type
// is a list anyway, so this stays open to other kinds of record later.
export const WEIGHT_PR = 'weight'
export const REPS_PR   = 'reps'

export const detectSetAchievements = (previousSets, reps, weight) => {
  const achievements = []

  // first set of a brand-new exercise beats a nonexistent record, which
  // is trivially true but also genuinely the heaviest you've lifted for
  // it — and it can only ever happen once per exercise
  const heaviestEver = previousSets.reduce((max, s) => Math.max(max, s.weight), 0)
  if (weight > heaviestEver) achievements.push(WEIGHT_PR)

  // a rep record only means something when there's a real prior attempt
  // at this weight to beat. Without this guard, the *first* set at any
  // new weight would count — including a sub-max weight you simply
  // hadn't tried before, which isn't an achievement at all. When the
  // weight itself is a new best, WEIGHT_PR already says so.
  const setsAtThisWeight = previousSets.filter(s => s.weight === weight)
  if (setsAtThisWeight.length > 0) {
    const bestRepsAtWeight = setsAtThisWeight.reduce((max, s) => Math.max(max, s.reps), 0)
    if (reps > bestRepsAtWeight) achievements.push(REPS_PR)
  }

  return achievements
}
