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

const deleteFromCloudinary = async (cloudFilePath) => {
    try {
        // To extract the public ID from a Cloudinary URL, we need to understand the structure of the URL first.
        // The Cloudinary URL typically follows this pattern:
        // https://res.cloudinary.com/<cloud_name>/image/upload/<transformation_params>/<public_id>.<file_extension>
        // The public ID is the part of the URL that comes after the transformation parameters and before the file extension.
        // In this code, we'll isolate the public ID by identifying its position within the URL structure.

        const pathParts = cloudFilePath.split('/');  // spilts the path by '/' and returns a array of all the parts
        const publicId = pathParts[pathParts.length-1].split('.')[0];  // get the last part and split it by '.' This also returns a array and then get the first element of it which will be the public id
        
        const deleteResult = await cloudinary.uploader.destroy(publicId);  // this delete function of cloudinary works with only public id of the file that is to be deleted so we have to get it before deleting the file
    
        return deleteResult;
    } catch (error) {
        console.log("Error while deleting file from cloudinary, E:", error);

        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }