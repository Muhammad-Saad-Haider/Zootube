import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // Selecting the User
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        // Adding above generated refresh token to the user (we don't want to add access token to the user so only refresh token will be added)
        user.refreshToken = refreshToken;

        // Saving the User
        await user.save({ validateBeforeSave: false });  // this save is a method given by mongoose. and the property 'validateBeforeSave' is set to false because we do not want to check validation here

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error occured while generating access and refresh token");
    }
}

const registerUser = asyncHandler( async (req, res) => {  // Here the data will be coming with the request(req) in the body
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
        $or: [{ username }, { email }]  // by this '$or' (-> this or is a MongoDB operator) we can check for both the fields at same time. This will the first user with the same username OR email obtained from req.body
    });

    if(exitingUser) {
        throw new ApiError(409, "A User with username or email address already exists");
    }

    const avatarLocalPath =  req.files?.avatar?.[0]?.path;  // this files method is given by multer the files method gives the files that are uploaded with the request
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;    // here '[0]' is used because the coverImage returns an array of all the files uploaded as the avatar even though we have specified the maxCout to 1 but still it will be an array. And we have to access the first file uploaded as the avatar and cover image

    // Check if the avatar file is uploaded
    if(!avatarLocalPath) {
        throw new ApiError(400, "Upload your avatar");
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
    
});

const loginUser = asyncHandler( async (req, res) => {
    // retrieve data from request (username or email and pass would be enough)
    // validation of the data e.g. the data is not empty and is of correct format
    // check if the user already exists
    // find the user
    // check if the password is correct
    // send access and refresh token in cookies
    
    const {email, username, password} = req.body;
    
    if(!email && !username) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(!user) {
        throw new ApiError(404, "User does not exists");
    }

    if(!await user.isPasswordCorrect(password)) {
        throw new ApiError(401, "Invalid User credentials");
    }

    // generating access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    // user that we are usign till now is the one that does not have refresh token because it was created before generating the refresh token. ->
    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken");

    // we have to send this data in cookies
    // before that we have to define some options for cookies
    const options = {
        httpOnly: true,
        secure: true  // these two lines makes the cookies to be modifiable from the server only i.e. No one can modify these.
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)  // cookie("key", value, (above options))
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            // This is a object = 'data' field
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
});

const logoutUser = asyncHandler( async (req, res) => {
    // This 'findByIdAndUpdate' method takes 3 input filter(parameter that will be used to find the user), update(the changes that are to be made), to return the updated user 'new' is set to true or we can also set returnOriginal to false
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined  // to set the 'refreshToken' to 'undefined'
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(201, {}, "User loged out")
    )
});

const refreshAccessToken = asyncHandler( async(req, res) => {  // renew acces token -> (renew session)
    const userRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!userRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    
    try {  // this try catch block is not neccessary
        const decodedToken = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) {
            throw new ApiResponse(401, "Invalid refresh token");
        }
    
        if(user.refreshToken !== userRefreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }
    
        const newTokens = await generateAccessAndRefreshToken();
        
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", newTokens.accessToken, options)
        .cookie("refreshToken", newTokens.refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changePassword = asyncHandler( async (req, res) => {
    const { oldPassword, confirmOldPassword, newPassword } = req.body;

    if(oldPassword !== confirmOldPassword) {
        throw new ApiError(401, "Password and confirm password does not match");
    }

    const user = await User.findById(req.user?._id);

    if(!user.isPasswordCorrect(oldPassword)) {
        throw new ApiError(401, "Invalid old password");
    }

    // set new password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json( new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

const updateAccountDetails = asyncHandler( async (req, res) => {
    const {fullName, email} = req.body;

    if(!fullName && !email) {
        throw new ApiError(400, "Please provide the required details that you want to change");
    }
    
    const updates = {};
    
    if(fullName) updates.fullName = fullName;
    if(email) updates.email = email;
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated")
    )
});

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) {
        throw new ApiError(400, "Try re-uploading your avatar");
    }

    const user = await User.findById(req.user?._id);

    const prevAvatar = user.avatar;

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    );

    await deleteFromCloudinary(prevAvatar);

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedUser, "Avatar changed successfully")
    )
});

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) {
        throw new ApiError(400, "Try re-uploading your cover image");
    }

    const user = await User.findById(req.user?._id);

    const prevCoverImage = user.coverImage;

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    );

    await deleteFromCloudinary(prevCoverImage);

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedUser, "Cover Image changed successfully")
    )
});

const getUserChannel = asyncHandler( async(req, res) => {
    const { username } = req.params;

    if(!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = User.aggregate([
        {
            $match: {  // to get the channel that the user is visiting
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {  // to get all the subscribers of the channel
                from: "subscriptions",  // 'Subscription' -> 'subscriptions' => in MongoDB
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ]);

    if(!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel fetched successfully")
    )
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate([
        {
            $match: {  // to select the user whom search history have to be shown
                _id: new mongoose.Types.ObjectId(req.user?._id)  // till now we are adding ID's directly because mongoose is converting it to the MongoDB ID behind the scene but in the aggregation pipelines mongoose does not convert it so we have to convert it ourself
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                forerignField: "_id",
                as: "watchHistory",
                
                pipeline: [
                    {
                        $lookup: {
                            from: "User",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully")
    )
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannel,
    getWatchHistory
}