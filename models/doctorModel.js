import mongoose from "mongoose";
const doctorSchema= new mongoose.Schema(
    {
        name: {type: String , required: true},
        email: {type: String , required: true, unique: true},
        password: {type: String , required: true},
        image: {type: String , required: true},
        speciality: {type: String , required: true},
        degree: {type: String , required: true},
        experience: {type: String , required: true},
        about: {type: String , required: true},
        available: {type: Boolean , default: true},
        fees: {type: Number , required: true},
        address: {type: Object , required: true},
        date: {type: Number , required: true},
        slots_booked:{type:Object, default: {}},
    },{minimize: false}
)

const doctorModel = mongoose.models.doctor ||mongoose.model("doctor", doctorSchema)
export default doctorModel;
// This code defines a Mongoose schema for a doctor model in a MongoDB database.
// The schema includes fields for the doctor's name, email, password, image, speciality, degree, experience, about section, availability status, fees, address, date of registration, and slots booked.