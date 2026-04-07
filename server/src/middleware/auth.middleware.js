import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

export const protect=async(req,res,next)=>{
    try{
        //get token from header
        const authHeader=req.headers.authorization
        if(!authHeader || !authHeader.startsWith('Bearer')){
            return res.status(401).json({message:'Not authorized'})
        }
        const token=authHeader.split(' ')[1]

        //verify token
        const decoded=jwt.verify(token,process.env.JWT_SECRET)

        //attach user to request
        req.user=await User.findById(decoded.id).select('-password')
        if(!req.user){
            return res.status(401).json({message:'User not found'})
        }
        next()
    }catch(error){
        res.status(401).json({message:'Token invalid or expired'})
    }
}