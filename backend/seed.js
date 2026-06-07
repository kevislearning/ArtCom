import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Nhập các Model Mongoose
import User from './models/User.js';
import Illustration from './models/Illustration.js';
import Like from './models/Like.js';
import Bookmark from './models/Bookmark.js';
import Follow from './models/Follow.js';
import Comment from './models/Comment.js';
import Commission from './models/Commission.js';
import WalletTransaction from './models/WalletTransaction.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';

// Tải các biến môi trường
dotenv.config();

// Kiểm tra cấu hình Cloudinary
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
  console.log('[Seed Cloudinary] Cloudinary SDK configured successfully.');
} else {
  console.warn('[Seed Cloudinary] Missing credentials. Fallback to using raw remote URLs directly.');
}

// Hàm hỗ trợ: Tải ảnh từ URL và lưu trữ cục bộ kèm theo các header trình duyệt
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    let options;
    try {
      const urlObj = new URL(url);
      options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };
    } catch (e) {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    https.get(url, options, (response) => {
      // Xử lý chuyển hướng HTTP (301 hoặc 302)
      if (response.statusCode === 301 || response.statusCode === 302) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image. Status: ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Dọn dẹp file khi gặp lỗi
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Hàm hỗ trợ: tải từ URL từ xa xuống file tạm cục bộ, tải lên Cloudinary, và xóa file tạm.
// Nếu không có cấu hình Cloudinary, trả về trực tiếp URL từ xa.
const processImageForSeed = async (imageUrl, index) => {
  if (!hasCloudinary) {
    console.log(`[Seed Image] Cloudinary not configured. Using raw remote URL for image ${index}: ${imageUrl}`);
    return imageUrl;
  }

  const tempDir = path.join(process.cwd(), 'temp_seed');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filename = `temp_seed_${index}_${Date.now()}.jpg`;
  const filepath = path.join(tempDir, filename);

  try {
    console.log(`[Seed Image] Downloading temp file ${index} from: ${imageUrl}`);
    await downloadImage(imageUrl, filepath);
  } catch (err) {
    console.warn(`[Seed Image Warning] Failed to download from original URL ${imageUrl}: ${err.message}. Trying stable Picsum fallback...`);
    try {
      const fallbackUrl = `https://picsum.photos/600/600?random=${index}`;
      await downloadImage(fallbackUrl, filepath);
    } catch (fallbackErr) {
      console.error(`[Seed Image Fatal] Picsum fallback also failed: ${fallbackErr.message}`);
      if (fs.existsSync(filepath)) {
        fs.unlink(filepath, () => {});
      }
      return imageUrl; // Dự phòng: trả về URL gốc
    }
  }

  // Tải file đã tải xuống thành công lên Cloudinary
  try {
    console.log(`[Seed Image] Uploading ${index} to Cloudinary...`);
    const result = await cloudinary.uploader.upload(filepath, {
      folder: 'art_gallery',
    });
    
    console.log(`[Seed Image] Cloudinary Upload success! URL: ${result.secure_url}`);
    
    // Dọn dẹp file tạm
    fs.unlink(filepath, (err) => {
      if (err) console.error(`[Seed Image Warning] Failed to delete temp file ${filepath}:`, err.message);
    });
    
    return result.secure_url;
  } catch (cloudinaryErr) {
    console.error(`[Seed Image Error] Cloudinary upload failed: ${cloudinaryErr.message}. Falling back to raw remote URL.`);
    if (fs.existsSync(filepath)) {
      fs.unlink(filepath, () => {});
    }
    return imageUrl;
  }
};

// 56 hình ảnh chất lượng cao từ Unsplash & ArtStation
const seedImageUrls = [
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547891654-e66ed7edd96c?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1617791160505-6f006e121980?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551918120-9739cb430c6d?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525909002-1b057f3955f8?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501472312651-726afd116ff1?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1608889174637-3c44f6326f2a?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1608889175150-f8d227f2c2fe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502224562085-639556652f33?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523554888454-84137e72c3ce?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558862107-d49efd457c4c?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1482160549825-59d1b23cb208?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
  // Các hình ảnh từ ArtStation CDN
  'https://cdna.artstation.com/p/assets/images/images/062/776/234/medium/concept-art-1.jpg?1683884824',
  'https://cdnb.artstation.com/p/assets/images/images/062/776/235/medium/concept-art-2.jpg?1683884825',
  'https://cdna.artstation.com/p/assets/images/images/062/776/236/medium/concept-art-3.jpg?1683884826',
  'https://cdnb.artstation.com/p/assets/images/images/062/776/237/medium/concept-art-4.jpg?1683884827',
  'https://cdna.artstation.com/p/assets/images/images/062/776/238/medium/concept-art-5.jpg?1683884828',
  'https://cdnb.artstation.com/p/assets/images/images/062/776/239/medium/concept-art-6.jpg?1683884829',
  'https://cdna.artstation.com/p/assets/images/images/062/776/240/medium/concept-art-7.jpg?1683884830',
  'https://cdnb.artstation.com/p/assets/images/images/062/776/241/medium/concept-art-8.jpg?1683884831'
];

// Mẫu siêu dữ liệu (metadata) của các tác phẩm nghệ thuật
const artTemplates = [
  // 0-7: Phong Art (Phong cảnh)
  { title: 'Sự tĩnh lặng của đại ngàn', desc: 'Bức tranh phong cảnh vẽ bằng màu nước tả chiều hoàng hôn rực đỏ trên dãy núi Alps hùng vĩ.', tags: ['landscape', 'watercolor', 'nature', 'painting'] },
  { title: 'Chiều hoàng hôn bên bờ biển', desc: 'Cảnh biển êm đềm với những con sóng nhẹ xô bờ cát vàng khi mặt trời bắt đầu lặn.', tags: ['landscape', 'nature', 'beach', 'sunset'] },
  { title: 'Thành phố trong sương', desc: 'Một buổi sáng mờ sương tĩnh lặng trên các tòa nhà cổ kính tại xứ sở mù sương Đà Lạt.', tags: ['landscape', 'nature', 'city', 'morning'] },
  { title: 'Thung lũng vàng rực nắng', desc: 'Đồng cỏ xanh trải dài bất tận dưới ánh mặt trời rực rỡ buổi ban mai.', tags: ['landscape', 'nature', 'valley', 'sunshine'] },
  { title: 'Rừng thông mùa đông lạnh giá', desc: 'Những hàng thông phủ đầy tuyết trắng xóa tĩnh lặng bên hồ nước đóng băng.', tags: ['landscape', 'nature', 'winter', 'forest'] },
  { title: 'Bình minh trên đỉnh Fansipan', desc: 'Biển mây bồng bềnh cuộn sóng dưới ánh bình minh đỏ rực ấm áp.', tags: ['landscape', 'nature', 'mountain', 'clouds'] },
  { title: 'Mùa thu vàng trên đại lộ', desc: 'Những hàng cây phong trút lá vàng nhuộm thắm cả góc phố yên bình.', tags: ['landscape', 'autumn', 'city', 'cozy'] },
  { title: 'Hồ nước trong veo trên núi', desc: 'Mặt nước hồ phẳng lặng như gương phản chiếu bầu trời xanh trong vắt.', tags: ['landscape', 'nature', 'lake', 'peaceful'] },

  // 8-15: Vy Anime (Anime & Chibi)
  { title: 'Cô bé dưới tán anh đào', desc: 'Tranh fanart nhân vật nữ phong cách anime mặc kimono đứng dưới gốc cây anh đào rơi lãng mạn.', tags: ['anime', 'digitalart', 'fanart', 'cherryblossom'] },
  { title: 'Thế giới phép thuật nhiệm màu', desc: 'Bức vẽ chi tiết về một góc thư viện phép thuật cổ xưa đầy sách bay tự động và sinh vật huyền bí.', tags: ['anime', 'fantasy', 'digitalart', 'magic'] },
  { title: 'Chibi quán trà sữa dễ thương', desc: 'Minh họa nhân vật chibi mắt to tròn lấp lánh đang uống ly trà sữa trân châu đường đen khoái khẩu.', tags: ['anime', 'chibi', 'digitalart', 'cute'] },
  { title: 'Công chúa tuyết lấp lánh', desc: 'Minh họa công chúa băng giá với vương miện pha lê và bộ váy lấp lánh như ngàn ngôi sao.', tags: ['anime', 'digitalart', 'princess', 'glitter'] },
  { title: 'Dưới ánh trăng huyền ảo', desc: 'Nhân vật anime tóc xanh đứng ngắm trăng khuyết khổng lồ soi bóng nước.', tags: ['anime', 'fantasy', 'moonlight', 'mystic'] },
  { title: 'Ngày hè năng động', desc: 'Chibi cô gái đeo kính râm chạy nhảy vui tươi trên bãi biển mùa hè rực nắng.', tags: ['anime', 'chibi', 'summer', 'energetic'] },
  { title: 'Chiến binh rồng dũng mãnh', desc: 'Fanart nam nhân vật mang đôi cánh rồng dũng mãnh đứng trước dung nham đỏ rực.', tags: ['anime', 'digitalart', 'warrior', 'dragon'] },
  { title: 'Góc học tập ấm cúng', desc: 'Cô bé lofi đang ngồi viết bài bên chú mèo lười ngủ say dưới ánh đèn bàn ấm áp.', tags: ['anime', 'lofi', 'study', 'cozy'] },

  // 16-23: Linh Watercolor (Tranh màu nước)
  { title: 'Tinh hoa tượng nghệ thuật phục hưng', desc: 'Tác phẩm phác họa tượng điêu khắc Phục Hưng cổ điển phối cùng vệt màu nước rực rỡ hiện đại.', tags: ['traditional', 'watercolor', 'art', 'sculpture'] },
  { title: 'Tinh hoa đóa hồng sớm mai', desc: 'Bức vẽ màu nước tả thực cận cảnh đóa hoa hồng đỏ thắm còn đọng những giọt sương sớm lung linh.', tags: ['watercolor', 'traditional', 'rose', 'nature'] },
  { title: 'Tách cà phê bình yên', desc: 'Vẽ tĩnh vật một buổi sáng ấm áp yên bình bên khung cửa sổ kèm tách cà phê nghi ngút khói.', tags: ['watercolor', 'traditional', 'coffee', 'cozy'] },
  { title: 'Giỏ trái cây chín mọng', desc: 'Tĩnh vật giỏ táo và nho căng tròn bóng loáng vẽ bằng màu nước cổ điển.', tags: ['watercolor', 'traditional', 'fruit', 'stilllife'] },
  { title: 'Cành hoa cẩm tú cầu', desc: 'Đóa hoa cẩm tú cầu sắc xanh tím nhẹ nhàng lan tỏa trên mặt giấy vân thô.', tags: ['watercolor', 'flower', 'vintage', 'pastel'] },
  { title: 'Thú cưng tinh nghịch', desc: 'Chân dung chú mèo con mắt xanh hiếu động đang vờn cuộn len màu hồng.', tags: ['watercolor', 'traditional', 'cat', 'pet'] },
  { title: 'Góc phố cổ chiều mưa', desc: 'Những mái nhà ngói rêu phong phản chiếu bóng nước lung linh trong chiều mưa nhạt nhòa.', tags: ['watercolor', 'traditional', 'street', 'rain'] },
  { title: 'Bóng thuyền cô đơn', desc: 'Chiếc thuyền độc mộc nhỏ bé trôi lững lờ giữa sông nước mênh mang mờ sương.', tags: ['watercolor', 'traditional', 'boat', 'lonely'] },

  // 24-31: Minh Cyber (Cyberpunk)
  { title: 'Đêm Neon rực sáng cyberpunk', desc: 'Góc phố đêm lung linh huyền ảo với ánh đèn neon quảng cáo nhiều màu sắc tại một đại lộ tương lai đầy xe bay.', tags: ['cyberpunk', 'digitalart', 'future', 'neon'] },
  { title: 'Dòng chảy bo mạch công nghệ', desc: 'Ý tưởng trừu tượng về sự tích hợp của con chip sinh học nhân tạo trong não bộ tương lai.', tags: ['cyberpunk', 'future', 'digitalart', 'chip'] },
  { title: 'Đường cong dòng ánh sáng neon', desc: 'Phân tích trừu tượng 3D về các luồng hạt ánh sáng di chuyển tự do trong mạng lưới ảo.', tags: ['cyberpunk', 'future', 'sci-fi', 'glow'] },
  { title: 'Hacker bóng đêm', desc: 'Một hacker ẩn mình trong áo trùm đầu trước hệ thống màn hình ma trận xanh lục lấp lánh.', tags: ['cyberpunk', 'future', 'hacker', 'matrix'] },
  { title: 'Robot phục vụ thân thiện', desc: 'Minh họa 3D một chú robot bồi bàn dễ thương đang đưa nước uống với đôi mắt LED cười.', tags: ['cyberpunk', 'future', 'robot', 'friendly'] },
  { title: 'Đại lộ tương lai', desc: 'Toàn cảnh thành phố Megacity khổng lồ với những tòa nhà chọc trời nối liền bởi các đường hầm ánh sáng.', tags: ['cyberpunk', 'future', 'megacity', 'concept'] },
  { title: 'Mũ bảo hiểm thực tế ảo VR', desc: 'Cận cảnh thiết bị VR siêu hiện đại phản chiếu ánh sáng cực quang xanh tím.', tags: ['cyberpunk', 'future', 'vr', 'gaming'] },
  { title: 'Chiến giáp chiến binh cyber', desc: 'Bản vẽ chi tiết về giáp cơ khí phản lực tích hợp súng năng lượng plasma.', tags: ['cyberpunk', 'future', 'exosuit', 'armor'] },

  // 32-39: Quỳnh Concept (Concept Art)
  { title: 'Cổng không gian cổ xưa', desc: 'Một cổng đá khổng lồ lơ lửng phát ra luồng năng lượng thần bí giữa sa mạc cát vàng hoang vu.', tags: ['conceptart', 'scifi', 'ancient', 'portal'] },
  { title: 'Tàu tuần tiễu vũ trụ', desc: 'Phác thảo chiến hạm vũ trụ khổng lồ đang cập bến trạm tiếp liệu ngoài quỹ đạo Trái Đất.', tags: ['conceptart', 'scifi', 'spaceship', 'orbit'] },
  { title: 'Vết nứt không thời gian', desc: 'Ý tưởng trừu tượng về vết rách không gian phơi bày chiều kích vũ trụ song song đầy sắc màu.', tags: ['conceptart', 'scifi', 'dimension', 'abstract'] },
  { title: 'Thành phố nổi trên mây', desc: 'Concept nghệ thuật về các hòn đảo nhân tạo khổng lồ bay lơ lửng giữa biển mây trắng xóa.', tags: ['conceptart', 'fantasy', 'skycity', 'clouds'] },
  { title: 'Lăng mộ của các vị thần', desc: 'Khung cảnh vĩ đại bên trong hang động ngầm khổng lồ với những pho tượng thần sừng sững.', tags: ['conceptart', 'fantasy', 'mystic', 'temple'] },
  { title: 'Căn cứ nghiên cứu vùng cực', desc: 'Trạm nghiên cứu khoa học biệt lập giữa bão tuyết mịt mù tại Nam Cực lạnh giá.', tags: ['conceptart', 'scifi', 'antarctica', 'base'] },
  { title: 'Quái thú đầm lầy', desc: 'Phác họa sinh vật khổng lồ có bộ da phủ đầy rêu phong thức tỉnh từ đầm lầy âm u.', tags: ['conceptart', 'monster', 'creature', 'dark'] },
  { title: 'Khu vườn thủy tinh sinh học', desc: 'Môi trường sinh thái khép kín trong vòm kính lớn chứa các loài thực vật phát quang.', tags: ['conceptart', 'scifi', 'biodome', 'luminescent'] },

  // 40-47: Bảo Painter (Tranh sơn dầu)
  { title: 'Chân dung quý bà quý tộc', desc: 'Tranh sơn dầu kỹ thuật số phác họa chân dung một quý bà thời kỳ Phục Hưng với ánh mắt sâu thẳm cổ điển.', tags: ['oilpainting', 'classic', 'portrait', 'renaissance'] },
  { title: 'Tĩnh vật bình hoa cổ', desc: 'Bức vẽ sơn dầu mô tả bình hoa gốm cổ đặt cạnh đĩa táo chín mọng trên nền vải nhung tối.', tags: ['oilpainting', 'stilllife', 'vase', 'vintage'] },
  { title: 'Tự họa ánh sáng góc tối', desc: 'Kỹ thuật tương phản ánh sáng Chiaroscuro tập trung vào khuôn mặt trầm tư của người nghệ sĩ.', tags: ['oilpainting', 'chiaroscuro', 'portrait', 'shadow'] },
  { title: 'Điệu nhảy dưới mưa', desc: 'Nét cọ sơn dầu mạnh mẽ vẽ cặp đôi khiêu vũ lãng mạn dưới ánh đèn đường nhạt nhòa trong đêm mưa.', tags: ['oilpainting', 'romantic', 'dance', 'rainy'] },
  { title: 'Cơn bão trên biển cả', desc: 'Những ngọn sóng khổng lồ gầm rú đánh vào mỏm đá nhô ra giữa bầu trời giông bão xám xịt.', tags: ['oilpainting', 'sea', 'storm', 'dramatic'] },
  { title: 'Hoàng hôn đồng quê yên ả', desc: 'Ngôi nhà tranh nhỏ đơn sơ nằm nép mình bên cánh đồng lúa mì vàng óng dưới ráng chiều.', tags: ['oilpainting', 'countryside', 'sunset', 'peaceful'] },
  { title: 'Gương mặt suy tư', desc: 'Vẽ cận cảnh khuôn mặt cô gái đang hướng mắt nhìn xa xăm đầy cảm xúc ưu tư.', tags: ['oilpainting', 'portrait', 'emotion', 'expression'] },
  { title: 'Đấu sĩ đấu trường La Mã', desc: 'Tái hiện lại vẻ dũng mãnh, oai hùng của đấu sĩ La Mã trên đấu trường rực cát bụi.', tags: ['oilpainting', 'gladiator', 'rome', 'epic'] },

  // 48-55: Trang Illustrator (Chibi & Sticker)
  { title: 'Sticker bé mèo ngộ nghĩnh', desc: 'Set các hình vẽ sticker chú mèo ú nu màu cam với nhiều biểu cảm đáng yêu khó cưỡng.', tags: ['illustration', 'chibi', 'sticker', 'cat'] },
  { title: 'Góc phòng búp bê mơ mộng', desc: 'Vẽ minh họa phòng ngủ pastel thu nhỏ với giường nệm hồng và kệ tủ chứa đầy gấu bông.', tags: ['illustration', 'cute', 'cozy', 'dollhouse'] },
  { title: 'Bé mầm nhỏ nhắn', desc: 'Nhân vật chibi đầu đội chiếc mầm cây nhỏ xinh đang hăng hái tưới nước cho hoa.', tags: ['illustration', 'chibi', 'cute', 'garden'] },
  { title: 'Bánh ngọt trà sữa ngọt ngào', desc: 'Bộ sưu tập vẽ tay các món bánh ngọt, macaron và ly trà sữa ngọt ngào tông màu pastel.', tags: ['illustration', 'sticker', 'sweet', 'pastry'] },
  { title: 'Khủng long xanh vụng về', desc: 'Chú khủng long béo tròn màu xanh lá đang cố gắng hái quả táo trên cành cao.', tags: ['illustration', 'chibi', 'cute', 'dinosaur'] },
  { title: 'Chào buổi sáng năng lượng', desc: 'Hình nền điện thoại vẽ một bạn nhỏ tươi cười rạng rỡ ôm chiếc gối ôm hình quả chuối.', tags: ['illustration', 'wallpaper', 'morning', 'cute'] },
  { title: 'Phù thủy nhỏ học việc', desc: 'Cô bé phù thủy chibi lóng ngóng cưỡi chổi bay đâm sầm vào bụi cây rậm rạp.', tags: ['illustration', 'chibi', 'witch', 'funny'] },
  { title: 'Chú gấu trúc ham ăn', desc: 'Hình vẽ chú gấu trúc tròn xoe ôm chặt mụt măng tre nhai nhồm nhoàm khoái chí.', tags: ['illustration', 'cute', 'panda', 'bamboo'] }
];

const runSeed = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/art-gallery';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Database Connected.');

    // Bước 1: Xóa các collection hiện có
    console.log('[Seed] Wiping existing data collections...');
    await User.deleteMany({});
    await Illustration.deleteMany({});
    await Like.deleteMany({});
    await Bookmark.deleteMany({});
    await Follow.deleteMany({});
    await Comment.deleteMany({});
    await Commission.deleteMany({});
    await WalletTransaction.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    console.log('[Seed] All database collections wiped successfully.');

    // Xóa thư mục uploads cục bộ cũ nếu nó tồn tại
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      console.log('[Seed] Cleaning legacy uploads directory to prevent local pollution...');
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }

    // Bước 2: Xử lý hình ảnh trực tiếp lên Cloudinary (hoặc dùng URL từ xa để dự phòng)
    const processedImageUrls = [];
    console.log('[Seed] Processing 56 high-quality images (uploading directly to Cloudinary)...');
    for (let i = 0; i < seedImageUrls.length; i++) {
      const url = await processImageForSeed(seedImageUrls[i], i + 1);
      processedImageUrls.push(url);
    }
    console.log('[Seed] Finished image processing phase.');

    // Bước 3: Khởi tạo dữ liệu mẫu Người dùng (Fans & Artists)
    console.log('[Seed] Seeding default users...');
    const defaultPassword = 'password123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const usersData = [
      // Người hâm mộ (Fans)
      {
        username: 'fan_huy',
        email: 'huy@gmail.com',
        passwordHash,
        nickname: 'Huy Nguyễn',
        bio: 'Một người yêu thích sưu tầm tranh màu nước cổ điển và phong cảnh thiên nhiên Tây Bắc.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HuyNguyen',
        bannerUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 3500000
      },
      {
        username: 'fan_vy',
        email: 'vyvy@gmail.com',
        passwordHash,
        nickname: 'Vy Vy',
        bio: 'Đam mê đặt vẽ (commission) các nhân vật game online và anime dễ thương làm avatar.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VyVy',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 10500000
      },
      {
        username: 'fan_nam',
        email: 'nam@gmail.com',
        passwordHash,
        nickname: 'Nam Khánh',
        bio: 'Thích sưu tầm hình nền cyberpunk nghệ thuật cao.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NamKhanh',
        bannerUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 3500000
      },
      {
        username: 'fan_lan',
        email: 'lan@gmail.com',
        passwordHash,
        nickname: 'Lan Hương',
        bio: 'Yêu tranh sơn dầu cổ điển châu Âu.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LanHuong',
        bannerUrl: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 2000000
      },
      {
        username: 'fan_an',
        email: 'an@gmail.com',
        passwordHash,
        nickname: 'An Bình',
        bio: 'Khám phá thế giới anime và các tác phẩm fanart đáng yêu.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnBinh',
        bannerUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 5000000
      },
      // Họa sĩ (Artists)
      {
        username: 'artist_phong',
        email: 'phong@gmail.com',
        passwordHash,
        nickname: 'Phong Art',
        bio: 'Họa sĩ Digital Landscape. Chuyên vẽ tranh phong cảnh núi đồi, đồng lúa rực rỡ sắc màu.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=PhongArt',
        bannerUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 1500000,
        socialLinks: { twitter: 'https://twitter.com/phongart', behance: 'https://behance.net/phongart', artstation: 'https://artstation.com/phongart' }
      },
      {
        username: 'artist_vy',
        email: 'vyanime@gmail.com',
        passwordHash,
        nickname: 'Vy Anime',
        bio: 'Chuyên vẽ fanart anime, manga và chibi cực dễ thương. Thích uống trà sữa và vẽ tranh mỗi tối.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=VyAnime',
        bannerUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 1000000,
        socialLinks: { twitter: 'https://twitter.com/vyanime', behance: 'https://behance.net/vyanime' }
      },
      {
        username: 'artist_linh',
        email: 'linhwater@gmail.com',
        passwordHash,
        nickname: 'Linh Watercolor',
        bio: 'Họa sĩ màu nước vẽ tay truyền thống, thích vẽ tĩnh vật nhẹ nhàng và chân dung thú cưng.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=LinhWatercolor',
        bannerUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 800000,
        socialLinks: { behance: 'https://behance.net/linhwater', artstation: 'https://artstation.com/linhwater' }
      },
      {
        username: 'artist_minh',
        email: 'minhcyber@gmail.com',
        passwordHash,
        nickname: 'Minh Cyber',
        bio: 'Chuyên phong cách Cyberpunk, Sci-Fi và nghệ thuật tương lai, ánh sáng neon rực rỡ.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=MinhCyber',
        bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 2500000,
        socialLinks: { twitter: 'https://twitter.com/minhcyber', artstation: 'https://artstation.com/minhcyber' }
      },
      {
        username: 'artist_quynh',
        email: 'quynh@gmail.com',
        passwordHash,
        nickname: 'Quỳnh Concept',
        bio: 'Họa sĩ thiết kế bối cảnh, concept nghệ thuật khoa học viễn tưởng và robot.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuynhConcept',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 3000000,
        socialLinks: { artstation: 'https://artstation.com/quynhconcept' }
      },
      {
        username: 'artist_bao',
        email: 'bao@gmail.com',
        passwordHash,
        nickname: 'Bảo Painter',
        bio: 'Chuyên vẽ chân dung sơn dầu kỹ thuật số cổ điển và nghệ thuật phục hưng.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=BaoPainter',
        bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 0,
        socialLinks: { behance: 'https://behance.net/baopainter' }
      },
      {
        username: 'artist_trang',
        email: 'trang@gmail.com',
        passwordHash,
        nickname: 'Trang Illustrator',
        bio: 'Vẽ minh họa chibi dễ thương, thiết kế sticker, hình nền điện thoại tươi tắn.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TrangIllustrator',
        bannerUrl: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 0,
        socialLinks: { twitter: 'https://twitter.com/trangillu' }
      }
    ];

    const seededUsers = await User.insertMany(usersData);
    const uHuy = seededUsers[0];
    const uVy = seededUsers[1];
    const uNam = seededUsers[2];
    const uLan = seededUsers[3];
    const uAn = seededUsers[4];
    const aPhong = seededUsers[5];
    const aVy = seededUsers[6];
    const aLinh = seededUsers[7];
    const aMinh = seededUsers[8];
    const aQuynh = seededUsers[9];
    const aBao = seededUsers[10];
    const aTrang = seededUsers[11];

    console.log('[Seed] Users seeded successfully.');

    // Bước 4: Khởi tạo dữ liệu mẫu Illustrations
    console.log('[Seed] Seeding illustrations/artworks...');
    const illustrationsData = [];
    const artists = [aPhong, aVy, aLinh, aMinh, aQuynh, aBao, aTrang];

    for (let i = 0; i < artTemplates.length; i++) {
      const template = artTemplates[i];
      const artistIndex = Math.floor(i / 8);
      const artist = artists[artistIndex];
      
      const views = Math.floor(Math.random() * 500) + 50;
      const likes = Math.floor(Math.random() * (views / 5)) + 2;
      const bookmarks = Math.floor(Math.random() * (likes / 2)) + 1;
      const commentsCount = Math.floor(Math.random() * 5);
      
      const createdAtDate = new Date(Date.now() - (i * 12 * 60 * 60 * 1000)); // Phân bổ thời gian (Timestamps)

      illustrationsData.push({
        artistId: artist._id,
        title: template.title,
        description: template.desc,
        imageUrls: [processedImageUrls[i]],
        tags: template.tags,
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: views,
        likesCount: likes,
        bookmarksCount: bookmarks,
        commentsCount: commentsCount,
        createdAt: createdAtDate,
        updatedAt: createdAtDate
      });
    }

    const seededIllustrations = await Illustration.insertMany(illustrationsData);
    console.log(`[Seed] Seeded ${seededIllustrations.length} illustrations.`);

    // Bước 5: Khởi tạo dữ liệu mẫu Follow
    console.log('[Seed] Seeding follows...');
    const followsToInsert = [];
    const allFans = [uHuy, uVy, uNam, uLan, uAn];

    // Mỗi fan theo dõi từ 3 đến 5 họa sĩ ngẫu nhiên
    for (const fan of allFans) {
      const numFollows = Math.floor(Math.random() * 3) + 3;
      const shuffledArtists = [...artists].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numFollows; j++) {
        followsToInsert.push({
          followerId: fan._id,
          followingId: shuffledArtists[j]._id
        });
      }
    }
    // Mỗi họa sĩ theo dõi từ 1 đến 2 họa sĩ khác
    for (const artist of artists) {
      const otherArtists = artists.filter(a => a._id.toString() !== artist._id.toString());
      const shuffledOthers = otherArtists.sort(() => 0.5 - Math.random());
      const numFollows = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numFollows; j++) {
        followsToInsert.push({
          followerId: artist._id,
          followingId: shuffledOthers[j]._id
        });
      }
    }
    await Follow.insertMany(followsToInsert);
    console.log(`[Seed] Seeded ${followsToInsert.length} follow relations.`);

    // Bước 6: Khởi tạo dữ liệu mẫu Like, Bookmark, và Comment để khớp với các bộ đếm của illustration
    console.log('[Seed] Seeding likes, bookmarks, and comments...');
    const allUsers = [...allFans, ...artists];
    const likesToInsert = [];
    const bookmarksToInsert = [];
    const commentsToInsert = [];
    
    const commentTexts = [
      'Bức tranh tuyệt đẹp! Màu sắc và bố cục xuất sắc.',
      'Nét vẽ đỉnh cao quá họa sĩ ơi, hóng các tác phẩm tiếp theo.',
      'Tuyệt phẩm! Mình thích cách bạn xử lý ánh sáng trong tranh.',
      'Cảm giác bức tranh này mang lại rất bình yên và thư thái.',
      'Bức này vẽ mất khoảng bao lâu thế bạn? Đẹp quá.',
      'Thích phong cách vẽ này ghê, nhìn rất có hồn!',
      'Quá xịn! Chúc mừng tác giả đã hoàn thành tác phẩm xuất sắc này.',
      'Tone màu cuốn hút thật sự, nhìn không thể rời mắt.',
      'Amazing art! Keep up the great work.',
      'Nhìn cực kỳ chuyên nghiệp luôn nha bạn ơi.'
    ];

    for (let i = 0; i < seededIllustrations.length; i++) {
      const ill = seededIllustrations[i];
      const likesCount = ill.likesCount;
      const bookmarksCount = ill.bookmarksCount;
      const commentsCount = ill.commentsCount;
      
      // Trộn ngẫu nhiên người dùng
      const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random());
      for (let j = 0; j < Math.min(likesCount, shuffledUsers.length); j++) {
        likesToInsert.push({
          userId: shuffledUsers[j]._id,
          illustrationId: ill._id,
          createdAt: ill.createdAt
        });
      }
      
      const shuffledUsers2 = [...allUsers].sort(() => 0.5 - Math.random());
      for (let j = 0; j < Math.min(bookmarksCount, shuffledUsers2.length); j++) {
        bookmarksToInsert.push({
          userId: shuffledUsers2[j]._id,
          illustrationId: ill._id,
          createdAt: ill.createdAt
        });
      }

      const shuffledUsers3 = [...allUsers].sort(() => 0.5 - Math.random());
      for (let j = 0; j < commentsCount; j++) {
        const commenter = shuffledUsers3[j % shuffledUsers3.length];
        const commentText = commentTexts[Math.floor(Math.random() * commentTexts.length)];
        
        commentsToInsert.push({
          illustrationId: ill._id,
          userId: commenter._id,
          content: commentText,
          createdAt: new Date(ill.createdAt.getTime() + (j + 1) * 30 * 60 * 1000)
        });
      }
    }
    
    await Like.insertMany(likesToInsert);
    await Bookmark.insertMany(bookmarksToInsert);
    await Comment.insertMany(commentsToInsert);
    console.log(`[Seed] Synced ${likesToInsert.length} likes, ${bookmarksToInsert.length} bookmarks, and ${commentsToInsert.length} comments.`);

    // Bước 7: Khởi tạo dữ liệu mẫu Commission
    console.log('[Seed] Seeding commissions...');
    const commissionsData = [
      {
        clientId: uHuy._id,
        artistId: aPhong._id,
        title: 'Vẽ phong cảnh ruộng bậc thang Tây Bắc mùa lúa chín',
        description: 'Yêu cầu vẽ một phong cảnh ruộng bậc thang Mù Cang Chải vào những ngày lúa chín vàng ươm dưới nắng thu rực rỡ, phong cách tả thực ấm áp để gia đình treo phòng khách.',
        price: 1500000,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'completed',
        paymentStatus: 'paid_to_artist',
        resultIllustrationId: seededIllustrations[0]._id,
        isPrivate: false
      },
      {
        clientId: uVy._id,
        artistId: aVy._id,
        title: 'Vẽ nhân vật Chibi cho Avatar stream game cá nhân',
        description: 'Vẽ 1 avatar dạng chibi siêu cưng, nhân vật tóc hồng thắt bím hai bên, đeo tai nghe mèo hồng, đang tươi cười say sưa chơi game.',
        price: 500000,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        paymentStatus: 'escrow',
        isPrivate: false
      },
      {
        clientId: uNam._id,
        artistId: aMinh._id,
        title: 'Thiết kế ảnh bìa Cyberpunk phong cách DJ Neon',
        description: 'Đặt làm banner cover kích thước chuẩn cho kênh Soundcloud cá nhân. Vẽ một nữ DJ cool ngầu đứng mix nhạc ngoài ban công tòa cao ốc tương lai tràn ngập ánh đèn neon rực rỡ.',
        price: 2500000,
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'pending',
        paymentStatus: 'escrow',
        isPrivate: false
      },
      {
        clientId: uLan._id,
        artistId: aLinh._id,
        title: 'Vẽ chân dung chú cún Corgi bằng màu nước truyền thống',
        description: 'Vẽ chân dung cận mặt của em cún Corgi lông vàng dễ thương đang há miệng cười, vẽ màu nước tỉ mỉ trên giấy Arches.',
        price: 800000,
        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'rejected',
        paymentStatus: 'refunded',
        isPrivate: false
      },
      {
        clientId: uAn._id,
        artistId: aQuynh._id,
        title: 'Vẽ phi thuyền vũ trụ chiến đấu tương lai',
        description: 'Ý tưởng phi thuyền du hành hành tinh lạnh giá phong cách concept khoa học viễn tưởng.',
        price: 3000000,
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'completed',
        paymentStatus: 'paid_to_artist',
        resultIllustrationId: seededIllustrations[32]._id,
        isPrivate: false
      },
      {
        clientId: uVy._id,
        artistId: aBao._id,
        title: 'Vẽ chân dung nghệ thuật Phục Hưng sơn dầu',
        description: 'Bức chân dung sơn dầu mô phỏng phong cách tranh Phục Hưng bí ẩn.',
        price: 4000000,
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        paymentStatus: 'escrow',
        isPrivate: false
      }
    ];

    const seededCommissions = await Commission.insertMany(commissionsData);
    console.log(`[Seed] Seeded ${seededCommissions.length} commissions.`);

    // Bước 8: Khởi tạo sổ cái giao dịch Ví (Wallet)
    console.log('[Seed] Seeding Wallet Transaction ledger...');
    const walletTransactionsData = [
      { userId: uHuy._id, amount: 5000000, type: 'deposit', description: 'Nạp tiền vào tài khoản thông qua MoMo.' },
      { userId: uHuy._id, amount: -1500000, type: 'escrow_hold', referenceId: seededCommissions[0]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ phong cảnh ruộng bậc thang Tây Bắc".' },
      
      { userId: uVy._id, amount: 15000000, type: 'deposit', description: 'Nạp tiền vào ví thông qua chuyển khoản ngân hàng.' },
      { userId: uVy._id, amount: -500000, type: 'escrow_hold', referenceId: seededCommissions[1]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ nhân vật Chibi".' },
      { userId: uVy._id, amount: -4000000, type: 'escrow_hold', referenceId: seededCommissions[5]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ chân dung nghệ thuật Phục Hưng sơn dầu".' },

      { userId: uNam._id, amount: 6000000, type: 'deposit', description: 'Nạp tiền vào tài khoản thông qua MoMo.' },
      { userId: uNam._id, amount: -2500000, type: 'escrow_hold', referenceId: seededCommissions[2]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Thiết kế ảnh bìa Cyberpunk DJ".' },

      { userId: uLan._id, amount: 2000000, type: 'deposit', description: 'Nạp tiền vào ví.' },
      { userId: uLan._id, amount: -800000, type: 'escrow_hold', referenceId: seededCommissions[3]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ chân dung cún Corgi".' },
      { userId: uLan._id, amount: 800000, type: 'escrow_refund', referenceId: seededCommissions[3]._id, description: 'Hoàn trả tiền tạm giữ do Họa sĩ từ chối yêu cầu vẽ chân dung Corgi.' },

      { userId: uAn._id, amount: 8000000, type: 'deposit', description: 'Nạp tiền vào ví.' },
      { userId: uAn._id, amount: -3000000, type: 'escrow_hold', referenceId: seededCommissions[4]._id, description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ phi thuyền vũ trụ chiến đấu".' },

      { userId: aPhong._id, amount: 1500000, type: 'escrow_release', referenceId: seededCommissions[0]._id, description: 'Nhận giải ngân tiền vẽ tranh thành công cho tác phẩm: "Ruộng bậc thang Tây Bắc".' },
      { userId: aQuynh._id, amount: 3000000, type: 'escrow_release', referenceId: seededCommissions[4]._id, description: 'Nhận giải ngân tiền vẽ tranh thành công cho tác phẩm: "Vẽ phi thuyền vũ trụ chiến đấu".' }
    ];

    await WalletTransaction.insertMany(walletTransactionsData);
    console.log('[Seed] Wallet Transactions ledger seeded successfully.');

    // Bước 9: Khởi tạo dữ liệu mẫu Tin nhắn
    console.log('[Seed] Seeding messaging history...');
    const messagesData = [
      {
        senderId: uHuy._id,
        receiverId: aPhong._id,
        content: 'Chào bạn Phong Art! Mình vừa mới nạp tiền và gửi một yêu cầu commission vẽ phong cảnh Tây Bắc cho gia đình nhé. Bạn kiểm tra xem đã nhận được Brief chưa ạ?',
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        senderId: aPhong._id,
        receiverId: uHuy._id,
        content: 'Chào anh Huy! Dạ mình vừa nhận được Brief và hệ thống báo tiền đã gửi vào Escrow rồi ạ. Ý tưởng mùa lúa chín vàng Mù Cang Chải rất tuyệt, mình sẽ bắt tay vào vẽ phác thảo ngay nhé!',
        isRead: true,
        createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000)
      },
      {
        senderId: uVy._id,
        receiverId: aVy._id,
        content: 'Chào bạn Vy Anime dễ thương! Mình cực kỳ thích các nét vẽ chibi của bạn trên trang cá nhân. Mình có gửi yêu cầu vẽ avatar stream game ấy, không biết bạn rảnh nhận vẽ giúp mình không nhỉ?',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        senderId: aVy._id,
        receiverId: uVy._id,
        content: 'Hi bạn Vy Vy ạ! Cảm ơn bạn rất nhiều vì đã yêu mến tranh của mình nha. Mình rảnh và đã nhấn chấp nhận vẽ rồi nhé! Mình sẽ vẽ một em chibi đeo tai mèo siêu cưng gửi bạn duyệt sớm nghen!',
        isRead: false,
        createdAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000)
      }
    ];

    await Message.insertMany(messagesData);
    console.log('[Seed] Chat messenger data seeded successfully.');

    // Bước 10: Khởi tạo dữ liệu mẫu Thông báo
    console.log('[Seed] Seeding notifications...');
    const notificationsData = [
      {
        recipientId: aPhong._id,
        actorId: uHuy._id,
        type: 'like',
        targetId: seededIllustrations[0]._id,
        targetModel: 'Illustration',
        contentPreview: 'Huy Nguyễn đã thích tác phẩm của bạn: "Sự tĩnh lặng của đại ngàn"',
        isRead: true
      },
      {
        recipientId: aVy._id,
        actorId: uVy._id,
        type: 'follow',
        contentPreview: 'Vy Vy đã bắt đầu theo dõi bạn.',
        isRead: false
      },
      {
        recipientId: aVy._id,
        actorId: uVy._id,
        type: 'commission_update',
        targetId: seededCommissions[1]._id,
        targetModel: 'Commission',
        contentPreview: 'Bạn nhận được một yêu cầu vẽ mới từ Vy Vy.',
        isRead: false
      },
      {
        recipientId: aMinh._id,
        actorId: uNam._id,
        type: 'commission_update',
        targetId: seededCommissions[2]._id,
        targetModel: 'Commission',
        contentPreview: 'Bạn nhận được một yêu cầu vẽ mới từ Nam Khánh.',
        isRead: false
      }
    ];

    await Notification.insertMany(notificationsData);
    console.log('[Seed] Notifications history seeded successfully.');

    console.log('\n[Seed SUCCESS] All records and Cloudinary photos seeded flawlessly!');
    console.log('Test Accounts available (all passwords are "password123"):');
    console.log('- Fan Client 1: huy@gmail.com (Huy Nguyễn)');
    console.log('- Fan Client 2: vyvy@gmail.com (Vy Vy)');
    console.log('- Fan Client 3: nam@gmail.com (Nam Khánh)');
    console.log('- Creator Artist 1: phong@gmail.com (Phong Art)');
    console.log('- Creator Artist 2: vyanime@gmail.com (Vy Anime)');
    console.log('- Creator Artist 4: minhcyber@gmail.com (Minh Cyber)');

  } catch (error) {
    console.error('[Seed Fatal Error]', error);
  } finally {
    // Clean up temp_seed folder if it was created
    const tempDir = path.join(process.cwd(), 'temp_seed');
    if (fs.existsSync(tempDir)) {
      console.log('[Seed] Cleaning up temporary download directory...');
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('[Seed Warning] Failed to delete temp directory:', e.message);
      }
    }

    await mongoose.connection.close();
    console.log('[Seed] Database connection closed.');
  }
};

runSeed();
