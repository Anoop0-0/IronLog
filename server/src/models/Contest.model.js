import mongoose from "mongoose";

const participantSchema=new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    username:{type:String},
    weight:{type:Number,default:0},
    reps:{type:Number,default:0},
})

const contestSchema=new mongoose.Schema({
    name:{type:String,required:true},
    exercise:{type:String,required:true},
    metric:{type:String,default:'heaviest_lift'},
    startDate:{type:Date,required:true},
    endDate:{type:Date,required:true},
    inviteCode:{type:String,required:true,unique:true},
   createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
   participants:[participantSchema],
   
},{timestamps:true})

export default mongoose.model('Contest',contestSchema)