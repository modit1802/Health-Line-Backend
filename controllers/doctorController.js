import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import appointmentModel from "../models/appointmentModel.js";
const changeAvailability=async(req, res) => {
    try {
        const {docId}=req.body;
        const doctData= await doctorModel.findById(docId);
        await doctorModel.findByIdAndUpdate(docId,{available:!doctData.available});
        res.json({success:true,message:"Doctor availability changed successfully"});
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message});
    }
}

const doctorList=async(req,res)=>{
    try {
        const doctors=await doctorModel.find({}).select('-password -email');
        res.json({success:true,doctors});
    } catch (error) {
        res.json({success:false,message:error.message});
    }
}

//Api for doctor login

const loginDoctor= async(req,res)=>{
    try {
        const {email,password}=req.body;
        const doctor=await doctorModel.findOne({email});
        if (!doctor) {
            return res.json({success:false,message:"Invalid credential"})
        }

        const isMatch= await bcrypt.compare(password,doctor.password);
        if (isMatch) {
            const token=jwt.sign({id:doctor._id},process.env.JWT_SECRET)
            res.json({success:true,message:"Login successful",token});
        }
        else{
            res.json({success:false,message:"Invalid credential"})
        }

    } catch (error) {
        res.json({success:false,message:error.message});
    }
}

// API to get doctor appointments
const doctorAppointments=async (req,res) => {
    try {
        const docId= req.doctor.id;

        const appointments= await appointmentModel.find({docId})
        res.json({success:true, appointments});


    } catch (error) {
        res.json({success:false,message:error.message});
    }
}

// API to mark appointment completed for doctor panel

const appointmentComplete=async (req,res) => {
    try {
        const docId= req.doctor.id;
        const {appointmentId}= req.body;
        const appointmentData= await appointmentModel.findById(appointmentId);

        if(appointmentData && appointmentData.docId=== docId){
            await appointmentModel.findByIdAndUpdate(appointmentId,{isCompleted:true})
            return res.json({success:true,message:"Appointment completed"})
        }
        else{
            return res.json({success:false,message:"Invalid appointment"})
        }
    } catch (error) {
        res.json({success:false,message:error.message});
    }
}

// API To mark appointment cancelled for doctor panel

const appointmentCancel=async (req,res) => {
    try {
        const docId= req.doctor.id;
        const {appointmentId}= req.body;
        const appointmentData= await appointmentModel.findById(appointmentId);

        if(appointmentData && appointmentData.docId=== docId){
            await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
            return res.json({success:true,message:"Appointment cancelled"})
        }
        else{
            return res.json({success:false,message:"Cancellation Failed"})
        }
    } catch (error) {
        res.json({success:false,message:error.message});
    }
}


// API to get dashboard data for doctor panel

const doctorDashboard = async (req,res) => {
    try {
        const docId= req.doctor.id
        const appointments =await appointmentModel.find({docId})
        let earnings=0
        appointments.map((item)=>{
            if (item.isCompleted || item.payment) {
                earnings+=item.amount
            }
        })

        let patients=[];
        appointments.map((item)=>{
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })

        const dashData={
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({success:true,dashData})


    } catch (error) {
         res.json({success:false,message:error.message});
    }
}

// Api to get doctor profile 

const doctorProfile= async (req,res) => {
    try {
        const docId= req.doctor.id;
        const profileData = await doctorModel.findById(docId).select('-password')
        res.json({success:true,profileData})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message});
    }
}

// API to update doctor profile

const updateDoctorProfile= async (req,res) => {
    try {
        const docId= req.doctor.id;
        const {fees,address,available,about,experience}=req.body;
        await doctorModel.findByIdAndUpdate(docId,{fees,address,available,about,experience})
        res.json({success:true,message:'Profile updated successfully'})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message});
    }
}
export {changeAvailability,doctorList,loginDoctor,doctorAppointments,appointmentComplete,appointmentCancel,doctorDashboard,updateDoctorProfile,doctorProfile};