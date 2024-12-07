import { asyncHanlder } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHanlder( async (req, res) => {  // Here the data will be coming with the request(req) in the body
    // Steps to register a user -
    // get user details from frontend
    // validation of the data e.g. the data is not empty and is of correct format
    // check if the user already exits -> form username or email
    // check for avatar and images -> if available upload them on cloudinary -> check if the required images(avatar) are successfully uploaded on cloudinarry or not
    // Create a User Object -> and create entry in DB -> this will return a response
    // Remove password and refresh token from the response
    // Check that the user is created or not -> if created return the response

    
    // retrieve details from the request of the user
    const {fullName, username, email, password} = req.body;
    
    // Check if any of the field is empty
    if(
        [fullName, username, email, password].some((field) => {
            field?.trim() === "";
        })
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check is the the user have entered email address in the email field or not
    if(!email.includes("@")) {
        throw new ApiError(400, "Please enter your email address");
    }

    // Check if the user already exists or not
    const exitingUser = await User.findOne({  // findOne returns the user which it will encounter first and having the same username or password
        $or: [{ username }, { email }]  // by this '$or' we can check for both the fields at same time. This will return true if any one of the fields matches with any existing user
    });

    if(exitingUser) {
        throw new ApiError(409, "A User with username or email address already exists");
    }

    const avatarLocalPath =  req.files?.avatar?.[0]?.path;  // this files method is given by multer the files method gives the files that are uploaded with the request
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;    // here '[0]' is used because the coverImage returns an array of all the files uploaded as the avatar even though we have specified the maxCout to 1 but still it will be an array. And we have to access the first file uploaded as the avatar and cover image

    // Check if the avatar file is uploaded
    if(!avatarLocalPath) {
        throw new ApiError(400, "Upload the your avatar");
    }
    
    // Now upload the cover image on Clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    // Check if the avatart is successfully upoloaded or not -> just for confirmation
    if(!avatar) {
        throw new ApiError(400, "Try uploading your avatar again");
    }

    // Creating the User
    const user = await User.create({  // '.create' -> creates the user in db
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""  // Check if the coverImage is uploaded. If it is uploaded then only store its url otherwise store a empty string in it
    });

    // Here checking if the user is created or not
    const createdUser = await User.findById(user._id).select(  // This select method selects some fields from the user -> By default all the fields are selected
        "-password -refreshToken"  // This will remove the password and the refreshToken
    );

    if(!createdUser) {
        throw new ApiError(500, "Error occured while registering the User");
    }

    // Now send reesponse

    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
    
} );

export { registerUser }