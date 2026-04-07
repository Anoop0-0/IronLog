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
})

const workoutSchema=new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    exercises:[exerciseSchema]
},{timestamps:true})

export default mongoose.model('Workout',workoutSchema)