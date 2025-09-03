import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user_modal.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

    const existedUser = User.findOne({
        $or: [{ email }, { username }]
    });
    if(existedUser){
        throw new ApiError("User already exists with this email or username", 409);
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    console.log(avatarLocalPath, coverImageLocalPath);

    if(!avatarLocalPath){
        throw new ApiError("Avatar image is required", 400);
    }
    // Upload to cloudinary
    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!uploadedAvatar){
        throw new ApiError("Error uploading avatar image. Please try again", 500);
    }

    const user = awaitUser.create({
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
            200,
            createdUser,
            "User registered successfully"
        )
    );
});

export { userRegister };