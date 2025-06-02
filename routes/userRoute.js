import express from 'express';
import {registerUser,loginUser, getProfile, updateProfile,bookAppointment, listAppointment, cancelAppointment, createPaymentIntent, verifyPayment, paymentReceipt}  from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';
const userRouter=express.Router();
// Route to register a new user
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/get-profile',authUser,getProfile);
userRouter.post('/update-profile',upload.single('image'),authUser,updateProfile);
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/create-payment-intent',authUser,createPaymentIntent)
userRouter.post('/verify-payment',authUser,verifyPayment)
userRouter.post('/payment-reciept',authUser,paymentReceipt)
export default userRouter;