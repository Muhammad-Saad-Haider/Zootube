import { Router } from "express"
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"


const router = new Router();

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route('/login').post(upload.none(), loginUser);  // 'upload.none()' => this is used to ignore any files that will be uploaded along with this post request. I added this because for some reasons request in json form is working fine but from the the form-data format the req.body is empty.

// Secured Routes

router.route('/logout').post(verifyJWT ,logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-pasword').post(verifyJWT, changePassword);
router.route('/current-user').post(verifyJWT, getCurrentUser);
router.route('/change-account-details').post(verifyJWT,upload.none(), updateAccountDetails);

export default router