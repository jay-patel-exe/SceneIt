import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

cloudinary.config({ 
  cloud_name: 'process.env.CLOUDINARY_NAME', 
  api_key: 'process.env.CLOUDINARY_API_KEY', 
  api_secret: 'process.env.CLOUDINARY_API_SECRET'
});

const uplodadOnCloudinary = async (localfilepath) => {
    try {
        if(!localfilepath) return null
        const response = cloudinary.uploader.upload(localfilepath, { resource_type : "auto"})
        console.log("Yeahh", response.url)
        return response

    } catch (error) {
        fs.unlinkSync(localfilepath)
        return null
    }
}

export { uplodadOnCloudinary}