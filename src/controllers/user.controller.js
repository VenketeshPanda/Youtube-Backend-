import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadFileOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    //Take form data from req.body
    const {username,password,email,fullName} = req.body
    console.log(email);

    //Validation
    if([fullname,password,email,username].some((field)=>field?.trim()==="")){ //Check if no fields are empty
        throw new apiError(400,"All fields are mandatory!!")
    }
    //Check if the user is present in the DB
    const existingUser = await User.findOne({
        $or:[{username},{email}]   //We check is a user with the same username & password is present
    })
    
    if(existingUser){
        throw new apiError(409,"User with email or username already exists")
    }

    //Check if avatar and cover image is present in the req.files
    const avatarLocalPath = req.files?.avatar[0]?.path //This comes from multer middleware
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    //Since avatar is mandatory, we check if it is present, if not we throw error
    if(!avatarLocalPath) throw new apiError(400,"Avatar mandatory!")
    

    //Else we upload using Cloudinary util
    const uploadedAvatar = await uploadFileOnCloudinary(avatarLocalPath)
    const uploadedCoverImage = await uploadFileOnCloudinary(coverImageLocalPath)

    //We check if the avatar is uploaded in the cloudinary
    if(!uploadedAvatar)  throw new apiError(400,"Avatar mandatory!")


    const user = await User.create({
        fullName,
        avatar: uploadedAvatar.url,
        coverImage: uploadedCoverImage?.url || "",   //Check if cover image is present else null(not mandatory)
        email,
        password,
        username:username.toLowerCase()
    })

    //We check if the user is created and while doing so we not take password to send the response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"    //This is to omit the fields from the object
    )

    //If user is not created
    if(!createdUser){
        throw new apiError(500,"Something went wrong while registering a user")
    }
    
    //If user is created then we send the response
    return res.status(201).json(new apiResponse(200,createdUser,"User registered successfully!"))
})

export {registerUser}