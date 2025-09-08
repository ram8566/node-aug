import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user_modal.js';

const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers
        ("authorization")?.replace("Bearer ", "")[1];
        if (!token) {
            throw new ApiError('No token provided', 401);
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        if (!user) {
            throw new ApiError('Invalid access token', 401);
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError('Invalid access token', 401);
        
    }

});

export default verifyJWT;