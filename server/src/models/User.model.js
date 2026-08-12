import mongoose from "mongoose";
const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        minlength:3},
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    password: {
  type: String,
  required: false,  
  minlength: 6,
}  ,
    googleId: {
  type: String,
  default: null,
},
    resetPasswordTokenHash: {
  type: String,
  default: null,
},
    resetPasswordExpires: {
  type: Date,
  default: null,
}
},{timestamps:true})

userSchema.index({ resetPasswordTokenHash: 1 })

export default mongoose.model('User',userSchema)