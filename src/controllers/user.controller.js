import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadFileOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false}) //Save will save all the fields, we want only refreshToken,
                                                    //For that we use ^^ 
        return {accessToken,refreshToken}
    } catch (error) {
        throw new apiError(500,'Something went wrong while generating refresh/access token')
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //Take form data from req.body
    const { username, password, email, fullName } = req.body
    // console.log(email,password,username,fullName);

    //Validation
    if ([fullName, password, email, username].some((field) => field?.trim() === "")) { //Check if no fields are empty
        throw new apiError(400, "All fields are mandatory!!")
    }
    //Check if the user is present in the DB
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]   //We check is a user with the same username & password is present
    })

    if (existingUser) {
        throw new apiError(409, "User with email or username already exists")
    }
    // console.log(req.files);
    //Check if avatar and cover image is present in the req.files
    console.log(req.files.avatar[0].path);
    const avatarLocalPath = req.files?.avatar[0].path //This comes from multer middleware
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    //Since avatar is mandatory, we check if it is present, if not we throw error
    if (!avatarLocalPath) throw new apiError(400, "Avatar mandatory from multer!")
    console.log(avatarLocalPath);

    //Else we upload using Cloudinary util
    const uploadedAvatar = await uploadFileOnCloudinary(avatarLocalPath)
    const uploadedCoverImage = await uploadFileOnCloudinary(coverImageLocalPath)


    //We check if the avatar is uploaded in the cloudinary
    if (!uploadedAvatar) throw new apiError(400, "Avatar mandatory from cloudinary!")


    const user = await User.create({
        fullName,
        avatar: uploadedAvatar.url,
        coverImage: uploadedCoverImage?.url || "",   //Check if cover image is present else null(not mandatory)
        email,
        password,
        username: username.toLowerCase()
    })

    //We check if the user is created and while doing so we not take password to send the response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"    //This is to omit the fields from the object
    )

    //If user is not created
    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering a user")
    }

    //If user is created then we send the response
    return res.status(201).json(new apiResponse(200, createdUser, "User registered successfully!"))
})

const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password} = req.body
    if(!(email || username)){
        throw new apiError(400,"Email or Username is mandatory!")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new apiError(404,"User doesn't exists")
    }

    const isPasswordValid = user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new apiError(401,"Password incorrect!")
    }

    const {refreshToken,accessToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {  //By setting these, the cookies are very secure, the frontend cannot change these
        httpOnly : true, //It can only be updated from the backend
        secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedUser,accessToken,refreshToken //data field in API response
            },
            "User logged in successfully!"
        ) 
    )
        
})

const logOutUser = asyncHandler(async(req,res)=>{
    //We have to remove the refresh and access tokens in order to actually log the user out
    //We need user data inorder to log that user out, for that we need to use a custom middleware
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined //We can set any data from the user
            }
        },{
            new: true //We used it in previous projects as well
        }
    )

    const options = {  //By setting these, the cookies are very secure, the frontend cannot change these
        httpOnly : true, //It can only be updated from the backend
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiResponse(200,{},"User Logged out successfully!"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = User.findById(decodedToken._id)
    
        if(!user){
            throw new apiError(401,"Invalid refresh token!")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401,"Refresh token is expired/used")
        }
    
        const options={
            httpOnly:true,
            secure: true
        }
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newRefreshToken)
        .json(new apiResponse(
            200,
            {accessToken,refreshToken: newRefreshToken},
            "Access token refreshed!"
        ))
    
    } catch (error) {
        throw new apiError(401,error?.message || "Invalid refresh token")
    }
})

export { registerUser,loginUser,logOutUser,refreshAccessToken }