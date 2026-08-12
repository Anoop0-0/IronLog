import mongoose from "mongoose";

const setSchema=new mongoose.Schema({
    reps:{type:Number,required:true},
    weight:{type:Number,required:true},
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

export default mongoose.model('Workout',workoutSchema)