import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";

//helpers
const generateToken=(userId)=>
    jwt.sign(
        {id:userId},
        process.env.JWT_SECRET,
        {expiresIn:process.env.JWT_EXPIRES_IN}
        
    )

//register
export const register=async(req,res,next)=>{
    try{
        const{username,email,password}=req.body

        //check if user already exists
        const existing=await User.findOne({$or:[{username},{email}]})
       if (existing) {
        return res.status(400).json({
        message: existing.email === email
          ? 'Email already in use'
          : 'Username already taken'
      })
    }
    //hash password
    const hashedPassword=await bcrypt.hash(password,12)

    //create user
    const user=await User.create({
        username,
        email,
        password:hashedPassword
    })

    //generate token
    const token=generateToken(user._id)

    res.status(201).json({
        token,
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
    }catch(error){
        next(error)
    }

}

//login

export const login =async(req,res,next)=>{
    try{
        const{email,password}=req.body

        //find user by email
        const user =await User.findOne({email})
        if(!user){
            return res.status(401).json({message:'Invalid email or password'})
        
        }
        //compare password with hashed version
        const isMatch=await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(401).json({message:'Invalid email or password'})
        }
        const token=generateToken(user._id)
        res.json({
            token,
            user:{
                id:user._id,
                username:user.username,
                email:user.email
            }
        })
    }catch(error){
        next(error)
    }

}

        
    