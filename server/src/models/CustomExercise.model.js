import mongoose from "mongoose";

const customExerciseSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:     { type: String, required: true, trim: true },
    bodyPart: { type: String, required: true },
}, { timestamps: true })

// a user shouldn't end up with two custom exercises with the same name
// (case-insensitive) — the picker offers "add" only when there's no
// existing match, but this is the backend backstop
customExerciseSchema.index({ userId: 1, name: 1 })

export default mongoose.model('CustomExercise', customExerciseSchema)
