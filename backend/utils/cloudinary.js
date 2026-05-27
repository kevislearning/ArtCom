import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Check if Cloudinary credentials are set in environment variables
const hasCloudinary = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Cloudinary] Cloudinary SDK configured successfully.');
} else {
  console.warn('[Cloudinary] Missing environment credentials. Running in local storage fallback mode.');
}

/**
 * Uploads a file (saved by Multer diskStorage) to Cloudinary if configured.
 * If Cloudinary is not configured or fails, falls back to serving it locally.
 * In both cases, returns the URL path to save in the Database.
 * If uploaded to Cloudinary, deletes the local file to keep the disk clean.
 */
export const uploadFileToCloudinary = async (file) => {
  if (!file) return null;

  if (hasCloudinary) {
    try {
      console.log(`[Cloudinary] Uploading file "${file.filename}" to Cloudinary...`);
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'art_gallery',
      });
      
      console.log(`[Cloudinary] Upload successful! URL: ${result.secure_url}`);

      // Asynchronously delete local temporary file
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error('[Cloudinary] Failed to delete local temp file:', file.path, err.message);
        } else {
          console.log('[Cloudinary] Deleted local temp file successfully:', file.path);
        }
      });

      return result.secure_url;
    } catch (err) {
      console.error('[Cloudinary Upload Error] Falling back to local storage:', err.message);
      return `/uploads/${file.filename}`;
    }
  }

  // Fallback to local storage path
  console.log(`[Cloudinary Fallback] Using local storage path for file: /uploads/${file.filename}`);
  return `/uploads/${file.filename}`;
};

/**
 * Helper to upload multiple files
 */
export const uploadMultipleToCloudinary = async (files) => {
  if (!files || files.length === 0) return [];
  console.log(`[Cloudinary] Uploading ${files.length} files...`);
  const uploadPromises = files.map(file => uploadFileToCloudinary(file));
  return Promise.all(uploadPromises);
};
