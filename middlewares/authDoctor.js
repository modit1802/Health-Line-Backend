import jwt from 'jsonwebtoken';
// Middleware to check if the user
const authDoctor= async(req,res,next)=>{
    try {
        const {dtoken}= req.headers
        if (!dtoken) {
            return res.json({success: false, message: "Authentication token is required"});
        }
        const token_decode= jwt.verify(dtoken, process.env.JWT_SECRET);
        req.doctor=token_decode;
        
        next()
        
    } catch (error) {
        console.error("Error adding doctor:", error.message);
        console.error(error.stack); // full trace

        res.json({success: false, message: error.message});
    }
}
export default authDoctor;