import jwt from 'jsonwebtoken';
// Middleware to check if the user
const authUser= async(req,res,next)=>{
    try {
        const {token}= req.headers
        if (!token) {
            return res.json({success: false, message: "Authentication token is required"});
        }
        const token_decode= jwt.verify(token, process.env.JWT_SECRET);
        req.user=token_decode;
        
        next()
        
    } catch (error) {
        console.error("Error adding doctor:", error.message);
        console.error(error.stack); // full trace

        res.json({success: false, message: error.message});
    }
}
export default authUser;