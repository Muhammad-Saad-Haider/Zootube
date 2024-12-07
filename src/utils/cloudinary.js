import {v2 as cloudinary} from "cloudinary"  // here we have renamed 'v2' as 'cloudinary' using this -> 'as'
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        // Upload file on Cloudinary
        const uploadResult = await cloudinary.uploader.upload(localFilePath, { // uploads the file whose path is this 'localFilePath' to Cloudinary
            resource_type: "auto"  // automatically detects the type of the file  => resource type = file type
        });

        // console.log("File uploaded on Cloudinary URL =", uploadResult.url)

        // After uploading file on cloudinary remove it from local storage
        fs.unlinkSync(localFilePath);
        
        return uploadResult;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        
        console.log("Error occured in uploading file on Cloudinary", error);

        return null;
    }
}

export { uploadOnCloudinary }