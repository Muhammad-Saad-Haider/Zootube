import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

// Configuration of CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// To limit the amount of json that will be coming in the server
app.use(express.json({limit: "16kb"}));

// To configure the data coming from URL
app.use(express.urlencoded({
    extended: true,  // allows to keep objects inside object
    limit: "16kb"
}));

// To store some assets that will be accessed by anyone
app.use(express.static("public"));  // Here public is just a name

// To access and set cookies on user's browser
app.use(cookieParser());

// Importing routes

import userRouter from "./routes/user.routes.js"

// Routes declaration

app.use("/api/v1/users" , userRouter);

export { app }