// require('dotenv').config()
import dotenv from "dotenv"
import connectDB from "./db/dbConnection.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Process started at ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.log("Connection failed in index.js",error)
})