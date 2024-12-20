import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// This middleware will verify the user

const verifyJWT = asyncHandler( async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");  // In the second option the header is the another way of taking data from the browser in the form of header insted of cookies. There is property named 'Authorization' which holds the value 'Bearer accessToken'. We have to retrieve accessToken from it for which the replace method is used
    
        if(!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
    
        if(!user) {
            throw new ApiError(401, "Invalid access token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export { verifyJWT }