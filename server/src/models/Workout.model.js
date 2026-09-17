import mongoose from "mongoose";

const setSchema=new mongoose.Schema({
    reps:{type:Number,required:true},
    weight:{type:Number,required:true},
    // records earned when this set was logged ('weight' / 'reps'). Stored
    // rather than recomputed on read because an achievement is relative to
    // what came before it — once later sets beat it, the fact that it was
    // a record *at the time* is no longer derivable from the data.
    achievements:{type:[String],default:[]},
})

const exerciseSchema=new mongoose.Schema({
    name:{type:String,required:true},
    bodyPart:{type:String,required:true},
    notes:{type:String,default:""},
    sets:[setSchema]
},{_id:false})

const workoutSchema=new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    exercises:[exerciseSchema]
},{timestamps:true})

// every controller queries by this exact pair (getWorkouts, getTodayWorkout,
// the contest leaderboard aggregation) — without it Mongo collection-scans
// as workout history grows
workoutSchema.index({ userId: 1, createdAt: -1 })

// the record lookup on every saved set, and the per-exercise history
// screen. Multikey on exercises.name. Without it, judging one set means
// walking every workout the user has ever logged — invisible at four
// workouts, and squarely on the path that has to feel instant at four
// hundred.
workoutSchema.index({ userId: 1, 'exercises.name': 1, createdAt: -1 })

export default mongoose.model('Workout',workoutSchema)