import mongoose, {Schema} from "mongoose"  // Here Schema is the property that mongoose holds we are directly importing it so that we don't have to write mongoose.Schema everywhere we can just use it by writing Schema
import jwt from "jsonwebtoken"  // User for Tokens
import bcrypt from "bcrypt"  // Used for password incryption

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String, // Needs to be encrypted -> Achieved by 'bcrypt'
            required: [true, "Password is required"],
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,  // Cloudinary URL
            required: true
        },
        coverImage: {
            type: String, // Cloundinary URL
        },
        refreshToken: {
            type: String,
            // required: true
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ]
    }, { timestamps: true }
);

// To encrypt the password
userSchema.pre("save", async function(next) {  // Do not use arrow funtion here because arrow funtion does not know about the context i.e. 'this' is applicable in it
    if(this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    next();
});

// To add methods in Schema
// To check if the password entered by the user is correct or not
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

// To generate tokens
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);