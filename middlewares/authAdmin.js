import jwt from 'jsonwebtoken';
// Middleware to check if the user is an admin
const authAdmin= async(req,res,next)=>{
    try {
        const {atoken}= req.headers;
        if (!atoken) {
            return res.json({success: false, message: "Authentication token is required"});
        }
        const token_decode= jwt.verify(atoken, process.env.JWT_SECRET);
        if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.json({success: false, message: "You are not authorized to access this resource"});
        }
        next()
        
    } catch (error) {
        console.error("Error adding doctor:", error.message);
        console.error(error.stack); // full trace

        res.json({success: false, message: "Something went wrong, please try again later"});
    }
}
export default authAdmin;