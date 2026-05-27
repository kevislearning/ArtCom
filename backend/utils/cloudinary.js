import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Kiểm tra xem credentials Cloudinary đã được thiết lập trong biến môi trường chưa
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
 * Tải một file (được lưu bởi Multer diskStorage) lên Cloudinary nếu được cấu hình.
 * Nếu Cloudinary chưa được cấu hình hoặc thất bại, fallback về việc cung cấp file cục bộ.
 * Trong cả hai trường hợp, trả về đường dẫn URL để lưu vào cơ sở dữ liệu.
 * Nếu tải lên Cloudinary thành công, xóa file cục bộ để giữ cho đĩa sạch.
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

      // Xóa file tạm cục bộ một cách bất đồng bộ
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

  // Fallback về đường dẫn lưu trữ cục bộ
  console.log(`[Cloudinary Fallback] Using local storage path for file: /uploads/${file.filename}`);
  return `/uploads/${file.filename}`;
};

/**
 * Helper để tải lên nhiều files
 */
export const uploadMultipleToCloudinary = async (files) => {
  if (!files || files.length === 0) return [];
  console.log(`[Cloudinary] Uploading ${files.length} files...`);
  const uploadPromises = files.map(file => uploadFileToCloudinary(file));
  return Promise.all(uploadPromises);
};
