import fs from "fs";
import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadFileOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:auto})
        console.log("File has been uploaded in cloudinary",response.url);
        return response;
    } catch (error) {
        fs.unlink(localFilePath);
        return null;
    }
}

export {uploadFileOnCloudinary}