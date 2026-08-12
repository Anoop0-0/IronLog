import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";
import Workout from "../models/Workout.model.js";
import Contest from "../models/Contest.model.js";
import { OAuth2Client } from 'google-auth-library'
import { isNonEmptyString } from '../utils/validate.js'
import { sendEmail } from '../utils/email.js'

//helpers
const generateToken=(userId)=>
    jwt.sign(
        {id:userId},
        process.env.JWT_SECRET,
        {expiresIn:process.env.JWT_EXPIRES_IN}

    )

const publicUser = (user) => ({
    id:          user._id,
    username:    user.username,
    email:       user.email,
    hasPassword: !!user.password,
})

//register
export const register=async(req,res,next)=>{
    try{
        const{username,email,password}=req.body

        if(!isNonEmptyString(username) || username.trim().length < 3){
            return res.status(400).json({message:'Username must be at least 3 characters'})
        }
        if(!isNonEmptyString(email) || !/^\S+@\S+\.\S+$/.test(email)){
            return res.status(400).json({message:'A valid email is required'})
        }
        if(!isNonEmptyString(password) || password.length < 6){
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
        user: publicUser(user)
    })
    }catch(error){
        next(error)
    }

}

//login

export const login =async(req,res,next)=>{
    try{
        const{email,password}=req.body

        if(!isNonEmptyString(email) || !isNonEmptyString(password)){
            return res.status(401).json({message:'Invalid email or password'})
        }

        //find user by email
        const user =await User.findOne({email})
        if(!user || !user.password){
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
            user: publicUser(user)
        })
    }catch(error){
        next(error)
    }

}


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body

    if (!isNonEmptyString(token)) {
      return res.status(400).json({ message: 'Google login failed' })
    }

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
      user: publicUser(user)
    })
  } catch (err) {
    next(err)
  }
}

// ── forgot password — request a reset link ────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    if (!isNonEmptyString(email)) {
      return res.status(400).json({ message: 'A valid email is required' })
    }

    const user = await User.findOne({ email })

    // always respond the same way whether or not the account exists —
    // otherwise this endpoint becomes an email-enumeration oracle
    const genericResponse = {
      message: 'If an account with that email exists, a reset link has been sent'
    }

    if (!user) {
      return res.json(genericResponse)
    }

    const rawToken  = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.resetPasswordTokenHash = tokenHash
    user.resetPasswordExpires   = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetLink  = `${clientUrl}/reset-password/${rawToken}`

    await sendEmail({
      to:      user.email,
      subject: 'Reset your IRONLOG password',
      text:    `Reset your password using this link (valid for 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    })

    res.json(genericResponse)
  } catch (err) {
    next(err)
  }
}

// ── reset password using the emailed token ────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    if (!isNonEmptyString(token)) {
      return res.status(400).json({ message: 'Reset token is required' })
    }
    if (!isNonEmptyString(password) || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires:   { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' })
    }

    user.password = await bcrypt.hash(password, 12)
    user.resetPasswordTokenHash = null
    user.resetPasswordExpires   = null
    await user.save()

    // log them straight in — same shape as login/register
    const jwtToken = generateToken(user._id)
    res.json({ token: jwtToken, user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

// ── change password (logged in) ────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // accounts created via Google may have no real password yet — allow
    // them to set one for the first time without a "current password" check
    if (user.password) {
      if (!isNonEmptyString(currentPassword)) {
        return res.status(400).json({ message: 'Current password is required' })
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' })
      }
    }

    user.password = await bcrypt.hash(newPassword, 12)
    await user.save()

    res.json({ message: 'Password updated' })
  } catch (err) {
    next(err)
  }
}

// ── update profile (username / email) ─────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body
    const updates = {}

    if (username !== undefined) {
      if (!isNonEmptyString(username) || username.trim().length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' })
      }
      updates.username = username.trim()
    }

    if (email !== undefined) {
      if (!isNonEmptyString(email) || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' })
      }
      updates.email = email.trim().toLowerCase()
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' })
    }

    const existing = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [
        ...(updates.username ? [{ username: updates.username }] : []),
        ...(updates.email    ? [{ email:    updates.email    }] : []),
      ],
    })
    if (existing) {
      return res.status(400).json({
        message: existing.email === updates.email
          ? 'Email already in use'
          : 'Username already taken'
      })
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

// ── delete account ─────────────────────────────────────
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id

    await Workout.deleteMany({ userId })
    // leave contests intact for other participants — just remove this user
    await Contest.updateMany(
      { 'participants.userId': userId },
      { $pull: { participants: { userId } } }
    )
    await User.findByIdAndDelete(userId)

    res.json({ message: 'Account deleted' })
  } catch (err) {
    next(err)
  }
}
