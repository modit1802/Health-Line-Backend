import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import connectDB from './config/mongodb.js';
import connectcloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';
import bodyParser from 'body-parser';

// app config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectcloudinary();
// middleware
app.use(cors());
app.use(bodyParser.json())
app.use(express.json());
app.use('/api/admin',adminRouter)
app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)
// routes
app.get('/', (req, res) => {
  res.send('API is working great');
}); 

app.listen(port,()=>{console.log(`Server is running on port ${port}`);
})  