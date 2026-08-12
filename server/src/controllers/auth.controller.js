import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";
import { OAuth2Client } from 'google-auth-library'

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

        if(!username || username.trim().length < 3){
            return res.status(400).json({message:'Username must be at least 3 characters'})
        }
        if(!email || !/^\S+@\S+\.\S+$/.test(email)){
            return res.status(400).json({message:'A valid email is required'})
        }
        if(!password || password.length < 6){
            return res.status(400).json({message:'Password must be at least 6 characters'})
        }

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


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body

    // get user info from Google using access token
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const googleUser = await response.json()

    if (!googleUser.email) {
      return res.status(400).json({ message: 'Google login failed' })
    }

    // check if user already exists
    let user = await User.findOne({ email: googleUser.email })

    if (!user) {
      // create new user from Google data
      user = await User.create({
        username: googleUser.name?.replace(/\s+/g, '_').toLowerCase()
                  || googleUser.email.split('@')[0],
        email:    googleUser.email,
        password: await bcrypt.hash(Math.random().toString(36), 12),
        googleId: googleUser.sub,
      })
    }

    const jwtToken = generateToken(user._id)

    res.json({
      token: jwtToken,
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
      }
    })
  } catch (err) {
    next(err)
  }
}
        
    