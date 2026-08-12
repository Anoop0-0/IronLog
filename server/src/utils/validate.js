// Guards against NoSQL-injection via query-operator objects (e.g. a client
// sending { "email": { "$ne": null } } instead of a real string). Mongoose
// doesn't cast operator objects on String paths — it passes them straight
// through to MongoDB — so every field that ends up directly inside a query
// filter (not just a write) must be checked with this before use.
export const isNonEmptyString = (val) =>
  typeof val === 'string' && val.trim().length > 0

// generous upper bounds — enough headroom for real lifts/reps while still
// rejecting negative values, zero, and obvious garbage/typo input
export const MAX_WEIGHT_KG = 2000
export const MAX_REPS      = 1000

const isValidPositiveNumber = (value, max) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n <= max
}

// returns an error message string if the set is invalid, or null if it's fine
export const validateSet = (reps, weight) => {
  if (!isValidPositiveNumber(reps, MAX_REPS)) {
    return `Reps must be a number between 1 and ${MAX_REPS}`
  }
  if (!isValidPositiveNumber(weight, MAX_WEIGHT_KG)) {
    return `Weight must be a number between 1 and ${MAX_WEIGHT_KG}`
  }
  return null
}
