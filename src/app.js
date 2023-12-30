import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:"16kb"})) //Limit the data of a json //Data from the forms
app.use(express.urlencoded({extended: true,limit:"16kb"}))
app.use(express.static("public")) //To store the images etc in the server
app.use(cookieParser()) //To access the cookies of the user's browser and do CRUD on them 

export {app}