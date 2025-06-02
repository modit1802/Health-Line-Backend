import validator from 'validator';
import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Api to register a new user

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({ success: false, message: "Please fill all the fields" });
        }

        //validating email and password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters long" });
        }

        //hashing the user password
        const salt = await bcrypt.genSalt(8);
        const hashedPassword = await bcrypt.hash(password, salt);
        //save user to database

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newuser = await userModel(userData);
        const user = await newuser.save();

        //create a token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        res.json({ success: true, token })

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({ success: false, message: "Please fill all the fields" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        //check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, message: "Invalid credentials" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });

    }
}

// Api to get user profile data

const getProfile = async (req, res) => {
    try {
        const { userId } = req.user.id;
        const userData = await userModel.findById(req.user.id).select('-password')
        res.json({ success: true, userData })

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !address || !dob || !gender) {
            return res.json({ success: false, message: "Data missing" });
        }

        // Update user basic info (parsing address assuming it's a JSON string)
        await userModel.findByIdAndUpdate(userId, {
            name,
            phone,
            address: JSON.parse(address),
            dob,
            gender,
        });

        // If image file exists, upload and update image URL
        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
                resource_type: "image",
            });
            const imageUrl = imageUpload.secure_url;
            await userModel.findByIdAndUpdate(userId, { image: imageUrl });
        }

        // Send success response
        res.json({ success: true, message: "Profile updated successfully" });

    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
//Api to book an appointment

const bookAppointment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { docId, slotDate, slotTime } = req.body;
        const docData = await doctorModel.findById(docId).select('-password');

        if (!docId || !slotDate || !slotTime) {
            return res.json({ success: false, message: "All fields are required" });
        }
        if (!docData.available) {
            return res.json({ success: false, message: "Doctor is not available" });
        }
        let slots_booked = docData.slots_booked;

        //check if slot available or not
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: "Slot already booked" });
            } else {
                //if slot is available then book the appointment
                slots_booked[slotDate].push(slotTime);
            }
        }
        else {
            slots_booked[slotDate] = [];
            slots_booked[slotDate].push(slotTime);
        }

        //update doctor slots_booked
        const userData = await userModel.findById(userId).select('-password');
        delete docData.slots_booked;
        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now(),
        }

        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // update doctor slots_booked
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        const userName = userData.name
        const userEmail = userData.email
        const userSlotDate = slotDate
        const userSlotTime = slotTime
        const userDoctor = docData.name
        const userPaymentStatus = docData.payment

        const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        const slotDateFormat = (slotDate) => {
            const dateArray = slotDate.split('_')
            return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
        }

        const paymentText = userPaymentStatus ? "Paid" : "Pending";
        const paymentInstructions = userPaymentStatus
            ? ""
            : `<p><strong>Note:</strong> You can pay online via the <a href="https://health-line-plus.com" target="_blank">Health-Line+ website</a> or in cash at the hospital during your visit.</p>`;

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.EMAIL_PASS
            }
        })

        const logoURL = 'https://res.cloudinary.com/dfph32nsq/image/upload/v1748760472/logo_pw176p.png'
        const mailOptions = {
            from: '"Health-Line+" <moditgrover2003.iii@gmail.com>',
            to: userEmail,
            subject: 'Your Appointment Confirmation - Health-Line+',
            html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #5F6FFF; padding: 20px; text-align: center;">
                <img src=${logoURL} alt="Health-Line+" style="height: 50px; margin-bottom: 10px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Confirmed</h1>
            </div>
            <div style="padding: 25px;">
                <p style="font-size: 18px;">Hi <strong>${userName}</strong>,</p>
                <p style="font-size: 16px;">Thank you for choosing <strong>Health-Line+</strong>. Your appointment details are as follows:</p>

                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Doctor</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userDoctor}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Date</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${slotDateFormat(userSlotDate)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Time</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userSlotTime}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Payment Status</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${paymentText}</td>
                    </tr>
                </table>

                ${userPaymentStatus ? "" : `
                    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffecb5;">
                        <p style="margin: 0;"><strong>Note:</strong> You can pay securely online via our <a href="https://health-line-plus.com" style="color: #0c5460; text-decoration: underline;" target="_blank">Health-Line+ website</a> or directly in cash when you visit the hospital.</p>
                    </div>
                `}

                <p style="margin-top: 25px;">We look forward to seeing you. If you have any questions, feel free to reply to this email.</p>
                <p style="color: #888; font-size: 14px;">Warm regards,<br>Team Health-Line+</p>
            </div>
            <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                © ${new Date().getFullYear()} Health-Line+ | All rights reserved.
            </div>
        </div>
    </div>
    `
        };


        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent to user')
        } catch (error) {
            console.log(error);

        }

        res.json({ success: true, message: "Appointment booked successfully" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });

    }
}

// api to get user appointment for frontend my appointment page

const listAppointment = async (req, res) => {
    try {
        const userId = req.user.id;
        const appointments = await appointmentModel.find({ userId })
        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to cancel appointment

const cancelAppointment = async (req, res) => {
    try {
        const userId = req.user.id
        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)
        // verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: "You are not authorized to cancel this appointment" })
        }
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot

        const { docId, slotDate, slotTime } = appointmentData
        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked
        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: "Appointment cancelled successfully" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const createPaymentIntent = async (req, res) => {
    try {
        const { amount } = req.body; // amount in rupees
        const userId = req.user.id;

        if (!amount) {
            return res.status(400).json({ success: false, message: "Amount is required" });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'USD',
                    product_data: {
                        name: 'Appointment Payment',
                        metadata: { userId }
                    },
                    unit_amount: amount * 100,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL||process.env.VERCEL_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}`,
        });

        res.json({
            success: true,
            sessionId: session.id
        });
    } catch (error) {
        console.error("Stripe Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
const verifyPayment = async (req, res) => {
    const { session_id } = req.body; // Changed from req.query to req.body
    const userId = req.user.id;
    if (!session_id) {
        return res.status(400).json({ success: false, message: 'Missing session_id in request body' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            // Update DB, mark appointment as paid
            await appointmentModel.findOneAndUpdate(
                { userId, payment: false, cancelled: false },
                { $set: { payment: true, sessionId: session_id } },
                { sort: { date: -1 } }
            );

            res.json({ success: true, message: 'Payment verified' });
        } else {
            res.status(400).json({ success: false, message: 'Payment not completed' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


const paymentReceipt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.body;
        const updatedAppointment = await appointmentModel.findOne(
            { userId, payment: true, cancelled: false },
            {},
            { sort: { date: -1 } }
        ).populate("docId").populate("userId");

        const userData = await userModel.findById(userId).select('-password');

        if (!updatedAppointment) {
            return res.status(404).json({ success: false, message: 'No paid appointment found' });
        }



        const appointmentData = await appointmentModel.findOne({
            userId,
            payment: true,
            sessionId: session_id,
        });

        if (!appointmentData) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found with this session ID",
            });
        }


        const userEmail = userData.email;
        const userName = userData.name;
        const doctorName = appointmentData.docData.name;
        const appointmentDate = updatedAppointment.slotDate;
        const appointmentTime = updatedAppointment.slotTime;
        const amount = updatedAppointment.amount;

        if (!userEmail) {
            console.error('No user email found for appointment:', updatedAppointment);
            return res.status(400).json({ success: false, message: 'User email not found' });
        }

        const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedDate = () => {
            const parts = appointmentDate.split('_');
            return `${parts[0]} ${months[+parts[1]]} ${parts[2]}`;
        };

        const logoURL = 'https://res.cloudinary.com/dfph32nsq/image/upload/v1748760472/logo_pw176p.png'; // Your logo URL

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.EMAIL_PASS
            },
        });

        const mailOptions = {
            from: '"Health-Line+" <moditgrover2003.iii@gmail.com>',
            to: userEmail, // MUST be defined and valid email
            subject: 'Your Payment Receipt - Health-Line+',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="background-color: #5F6FFF; padding: 15px; border-radius: 10px 10px 0 0; text-align: center;">
            <img src="${logoURL}" alt="Health-Line+" style="height: 40px; vertical-align: middle;" />
            <h2 style="color: white; margin: 10px 0;">Payment Receipt</h2>
          </div>
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We’ve received your payment for your upcoming appointment. Here are the details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr><td><strong>Doctor</strong></td><td>${doctorName}</td></tr>
            <tr><td><strong>Date</strong></td><td>${formattedDate()}</td></tr>
            <tr><td><strong>Time</strong></td><td>${appointmentTime}</td></tr>
            <tr><td><strong>Amount Paid</strong></td><td>USD ${amount}</td></tr>
            <tr><td><strong>Status</strong></td><td style="color: green;"><strong>Paid</strong></td></tr>
          </table>
          <div style="margin: 20px 0; padding: 10px; background: #e8f5e9; border-left: 5px solid #4caf50;">
            <strong>Note:</strong> This receipt confirms that your payment has been successfully processed via Health-Line+.
          </div>
          <p>Thank you for trusting <strong>Health-Line+</strong>. We look forward to serving you.</p>
          <p style="color: #777;">Warm regards,<br/>Team Health-Line+</p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Payment receipt email sent successfully' });
    } catch (err) {
        console.error('Error in paymentReceipt:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};



export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, createPaymentIntent, verifyPayment, paymentReceipt };