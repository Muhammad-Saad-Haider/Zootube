import { asyncHanlder } from "../utils/asyncHandler.js";

const registerUser = asyncHanlder( async (req, res) => {
    // temp ->
    res.status(200).json({
        message: "User Registered"
    })
} );

export { registerUser }