// shared by Progress and Profile's personal-records lists — both let you
// tap a PR to jump straight to that exercise's Graphs tab. bodyPart has
// to come along in state: ExerciseDetail treats "no entry logged today
// AND no bodyPart in state" as not-found, and a PR is very often for an
// exercise you haven't done today.
export const navigateToExerciseGraphs = (navigate, pr) => {
  navigate(`/log/${encodeURIComponent(pr.exercise)}`, {
    state: { initialTab: 2, bodyPart: pr.bodyPart },
  })
}
