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

/**
 * Xóa một file khỏi Cloudinary (nếu có cấu hình) hoặc thư mục local uploads.
 */
export const deleteFileFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  // Trường hợp fallback: Nếu url lưu trữ cục bộ
  if (imageUrl.startsWith('/uploads/')) {
    const localPath = `./uploads/${imageUrl.replace('/uploads/', '')}`;
    fs.unlink(localPath, (err) => {
      if (err) {
        console.error('[Cloudinary Cleanup] Failed to delete local file:', localPath, err.message);
      } else {
        console.log('[Cloudinary Cleanup] Deleted local file successfully:', localPath);
      }
    });
    return;
  }

  // Trường hợp Cloudinary
  if (hasCloudinary && imageUrl.includes('res.cloudinary.com')) {
    try {
      const parts = imageUrl.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex === -1) return;

      const pathParts = parts.slice(uploadIndex + 1);
      // Loại bỏ phần version (ví dụ: v12345678)
      if (pathParts[0].match(/^v\d+$/)) {
        pathParts.shift();
      }

      // Ghép lại và loại bỏ đuôi mở rộng file (.jpg, .png, v.v.)
      const pathWithExtension = pathParts.join('/');
      const publicId = pathWithExtension.substring(0, pathWithExtension.lastIndexOf('.'));

      console.log(`[Cloudinary Cleanup] Deleting "${publicId}" from Cloudinary...`);
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`[Cloudinary Cleanup] Cloudinary destruction response:`, result);
    } catch (err) {
      console.error('[Cloudinary Cleanup] Error destroying image:', err.message);
    }
  }
};

/**
 * Xóa nhiều files bất đồng bộ (non-blocking)
 */
export const deleteMultipleFromCloudinary = (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) return;
  console.log(`[Cloudinary Cleanup] Cleaning up ${imageUrls.length} assets in background...`);
  
  // Chạy bất đồng bộ hoàn toàn (không block thread chính của request)
  imageUrls.forEach(url => {
    deleteFileFromCloudinary(url).catch(err => {
      console.error(`[Cloudinary Cleanup] Failed background delete for ${url}:`, err.message);
    });
  });
};
