import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath, publicId) => {
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // jpeg, png pdf, docx, mp4
        });
        // console.log('File uploaded to Cloudinary successfully:', localFilePath);
        fs.unlinkSync(localFilePath); // Remove file from local uploads folder
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // Remove file from local uploads folder
        return null;
        // console.error('Error uploading to Cloudinary:', error);
        // throw error;
    }
};

export { uploadOnCloudinary };




    
 