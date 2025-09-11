import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user_modal.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user  = await User.findById(userID);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save( { validateBeforeSave: false } );
        return { accessToken, refreshToken };
    }catch(err){
        throw new ApiError("Error generating tokens", 500);
    }
};  

const userRegister = asyncHandler(async (req, res) => {
    // Get user data from frontend
    // Validation - not empty
    // check if user already exists - email, username
    // check Image or avatar
    // Upload image to cloudinary
    // Create user Object and save to DB
    // Remove password and refresh token from response
    // check if user created successfully
    // send response to frontend
    const { username, email, fullname, password } = req.body;
    console.log(username, email, fullname, password);

    if(!username || !email || !fullname || !password){
        throw new ApiError("All fields are required", 400);
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });
    if(existedUser){
        throw new ApiError("User already exists with this email or username", 409);
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // console.log(avatarLocalPath, coverImageLocalPath);

    if(!avatarLocalPath){
        throw new ApiError("Avatar image is required", 400);
    }
    // Upload to cloudinary
    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!uploadedAvatar){
        throw new ApiError("Error uploading avatar image. Please try again", 500);
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email: email,
        fullname: fullname,
        password: password,
        avatar: uploadedAvatar.url,
        coverImage: uploadedCoverImage?.url
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError("Error creating user. Please try again", 500);
    }

    return res.status(201).json(
        new ApiResponse(
            createdUser,
            "User registered successfully",
            200
        )
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // Get email and password from frontend
    // Validation - not empty
    // Check if user exists
    // Check if password is correct
    // Remove password and refresh token from response
    // Send response to frontend
    // access and refresh token
    // Store refresh token in DB
    // Send cookie with refresh token
    const { email, username, password } = req.body;

    if(!(email || username)){
        throw new ApiError("Email or username are required", 400);
    }

    const user = await User.findOne({ 
        $or: [{ email }, { username: username.toLowerCase() }]
    });

    if(!user){
        throw new ApiError("Invalid email or password", 401);
    }

    const isMatchPass = await user.isPasswordCorrect(password);
    if(!isMatchPass){
        throw new ApiError("Invalid password", 401);
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully",
                200
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        { 
            $set: { 
                refreshToken: undefined 
            } 
        }, 
        {   new: true,
        
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(
                null || {},
                "User logged out successfully",
                200
            )
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    if(!incomingRefreshToken){  
        throw new ApiError("Unauthorized token", 401);
    }   

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!user || user.refreshToken !== incomingRefreshToken){
            throw new ApiError("Invalid refresh token", 401);
        }
    
        const options = {
            httpOnly: true,
            secure: true
        };
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token generated successfully",
                    200
                )
            );
    } catch (error) {
        throw new ApiError("Could not refresh access token", 500);
    }

});

const changeCurrentPassword = asyncHandler( async (req, res) =>
    {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
        if(!isPasswordCorrect){
            throw new ApiError("Old password is incorrect", 400);
        }

        user.password = newPassword;
        await user.save({validateBeforeSave: false});
        return res.status(200).json(
            new ApiResponse(
                null,
                "Password changed successfully",
                200
            )
        );
    }
);

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    if(!user){
        throw new ApiError("User not found", 404);
    }
    return res.status(200).json(
        new ApiResponse(
            { user },
            "Current user fetched successfully",
            200
        )
    );
});

const updateAccountDetails = asyncHandler( async (req, res) => {
    const { fullname, email} = req.body;
    if(!fullname || !email){
        throw new ApiError("Fullname and email are required", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname: fullname,
                email
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(
            { user },
            "Account details updated successfully",
            200
        )
    );
});

const updateUserAvatar = asyncHandler( async ( req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError("Avatar image is missing", 400);
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){    
        throw new ApiError("Error uploading avatar image. Please try again", 500);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(
            user,
            "Avatar updated successfully",
            200
        )
    );
});

const updateUsercoverImage = asyncHandler( async ( req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError("Cover image is missing", 400);
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage){    
        throw new ApiError("Error uploading cover image. Please try again", 500);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(
            user,
            "Cover image updated successfully",
            200
        )
    );
});

export { userRegister, 
        loginUser, 
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUsercoverImage

};