import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

// Nhập các mô hình Mongoose
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

// Helper: Tải hình ảnh từ URL và lưu cục bộ
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Xử lý chuyển hướng HTTP (rất phổ biến với URL hình ảnh)
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
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
        fs.unlink(filepath, () => {}); // Xóa file khi thất bại
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// 12 hình ảnh nghệ thuật/sáng tạo chất lượng cao từ Unsplash
const seedImageUrls = [
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop', // 1. Tranh sơn dầu/kỹ thuật số nghệ thuật
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop', // 2. Nghệ thuật trừu tượng mềm mại
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', // 3. Sóng 3D kính mờ (glassmorphic)
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop', // 4. Đường phố Anime ấm cúng
  'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop', // 5. Ánh sáng Cyberpunk hoài cổ
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop', // 6. Bản mạch công nghệ Cyberpunk
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop', // 7. Phong cảnh sông núi
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop', // 8. Thiên hà vũ trụ giả tưởng
  'https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=600&auto=format&fit=crop', // 9. Chất lỏng hữu cơ Neon
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop', // 10. Bãi biển hoàng hôn phong cách màu nước
  'https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=600&auto=format&fit=crop', // 11. Thẩm mỹ quán cà phê ấm cúng
  'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=600&auto=format&fit=crop'  // 12. Điêu khắc tinh xảo với ánh sáng màu sắc
];

const runSeed = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/art-gallery';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Database Connected.');

    // Bước 1: Xóa toàn bộ các bản ghi hiện có trong các collection cốt lõi
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

    // Bước 2: Tải 12 hình ảnh Unsplash về thư mục uploads/ cục bộ
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log(`[Seed] Creating uploads directory at ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localImagePaths = [];
    console.log('[Seed] Starting to download 12 high-quality images from Unsplash to local uploads folder...');
    for (let i = 0; i < seedImageUrls.length; i++) {
      const filename = `seed_${i + 1}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      
      try {
        console.log(`[Seed] Downloading picture ${i + 1}/12: ${filename}...`);
        await downloadImage(seedImageUrls[i], filepath);
        localImagePaths.push(`/uploads/${filename}`);
      } catch (err) {
        console.warn(`[Seed Warning] Failed to download image ${i + 1}, fallback to raw unsplash URL. Error: ${err.message}`);
        localImagePaths.push(seedImageUrls[i]);
      }
    }
    console.log('[Seed] Finished image download phase.');

    // Bước 3: Seed người dùng (Users)
    console.log('[Seed] Seeding default users (fans and artists)...');
    const defaultPassword = 'password123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const usersData = [
      // Fans (Thành viên thông thường với số dư ví để tạo yêu cầu)
      {
        username: 'fan_huy',
        email: 'huy@gmail.com',
        passwordHash,
        nickname: 'Huy Nguyễn',
        bio: 'Một người yêu thích sưu tầm tranh màu nước cổ điển và phong cảnh thiên nhiên Tây Bắc.',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HuyNguyen',
        bannerUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop',
        isArtist: false,
        walletBalance: 1000000 // 1,000,000₫ (Ban đầu 5M - 1.5M giải phóng escrow - 2.5M khóa escrow) -> được điều chỉnh dưới phần sổ cái ledger
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
        walletBalance: 9500000 // 9,500,000₫ (Ban đầu 10M - 500k giữ escrow - 800k giữ + 800k hoàn tiền)
      },
      // Artists (Nghệ sĩ)
      {
        username: 'artist_phong',
        email: 'phong@gmail.com',
        passwordHash,
        nickname: 'Phong Art',
        bio: 'Họa sĩ Digital Landscape. Chuyên vẽ tranh phong cảnh núi đồi, đồng lúa rực rỡ sắc màu.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=PhongArt',
        bannerUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 1500000, // 1,500,000₫ kiếm được từ commission đã hoàn thành
        socialLinks: { twitter: 'https://twitter.com/phongart', behance: 'https://behance.net/phongart', artstation: 'https://artstation.com/phongart' }
      },
      {
        username: 'artist_vy',
        email: 'vyanime@gmail.com',
        passwordHash,
        nickname: 'Vy Anime',
        bio: 'Chuyên vẽ fanart anime, manga và chibi cực dễ thương. Thích uống trà sữa và vẽ tranh vẽ mỗi tối.',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=VyAnime',
        bannerUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
        isArtist: true,
        walletBalance: 0, // 500k hiện đang được khóa trong escrow (in_progress)
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
        walletBalance: 0, // 800k commission đã bị từ chối và hoàn tiền cho fan_vy
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
        walletBalance: 0, // 2.5M commission đang chờ xử lý và được khóa trong escrow
        socialLinks: { twitter: 'https://twitter.com/minhcyber', artstation: 'https://artstation.com/minhcyber' }
      }
    ];

    const seededUsers = await User.insertMany(usersData);
    const uHuy = seededUsers[0];
    const uVy = seededUsers[1];
    const aPhong = seededUsers[2];
    const aVy = seededUsers[3];
    const aLinh = seededUsers[4];
    const aMinh = seededUsers[5];

    console.log('[Seed] Users seeded successfully.');

    // Bước 4: Seed các tác phẩm minh họa (Illustrations) cho Artist
    console.log('[Seed] Seeding illustrations/artworks...');
    
    const illustrationsData = [
      // Artist 1: Phong Art (Phong cảnh)
      {
        artistId: aPhong._id,
        title: 'Sự tĩnh lặng của đại ngàn',
        description: 'Bức tranh phong cảnh vẽ bằng màu nước tả chiều hoàng hôn rực đỏ trên dãy núi Alps hùng vĩ.',
        imageUrls: [localImagePaths[0]],
        tags: ['landscape', 'watercolor', 'nature', 'painting'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 120,
        likesCount: 3,
        bookmarksCount: 2,
        commentsCount: 2
      },
      {
        artistId: aPhong._id,
        title: 'Chiều hoàng hôn bên bờ biển',
        description: 'Cảnh biển êm đềm với những con sóng nhẹ xô bờ cát vàng khi mặt trời bắt đầu lặn.',
        imageUrls: [localImagePaths[1]],
        tags: ['landscape', 'nature', 'beach', 'sunset'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 95,
        likesCount: 2,
        bookmarksCount: 1,
        commentsCount: 0
      },
      {
        artistId: aPhong._id,
        title: 'Thành phố trong sương',
        description: 'Một buổi sáng mờ sương tĩnh lặng trên các tòa nhà cổ kính tại xứ sở mù sương Đà Lạt.',
        imageUrls: [localImagePaths[2]],
        tags: ['landscape', 'nature', 'city', 'morning'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 78,
        likesCount: 1,
        bookmarksCount: 0,
        commentsCount: 0
      },

      // Artist 2: Vy Anime (Anime & Chibi)
      {
        artistId: aVy._id,
        title: 'Cô bé dưới tán anh đào',
        description: 'Tranh fanart nhân vật nữ phong cách anime mặc kimono đứng dưới gốc cây anh đào rơi lãng mạn.',
        imageUrls: [localImagePaths[3]],
        tags: ['anime', 'digitalart', 'fanart', 'cherryblossom'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 320,
        likesCount: 4,
        bookmarksCount: 3,
        commentsCount: 2
      },
      {
        artistId: aVy._id,
        title: 'Thế giới phép thuật nhiệm màu',
        description: 'Bức vẽ chi tiết về một góc thư viện phép thuật cổ xưa đầy sách bay tự động và sinh vật huyền bí.',
        imageUrls: [localImagePaths[4]],
        tags: ['anime', 'fantasy', 'digitalart', 'magic'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 210,
        likesCount: 3,
        bookmarksCount: 2,
        commentsCount: 0
      },
      {
        artistId: aVy._id,
        title: 'Chibi quán trà sữa dễ thương',
        description: 'Minh họa nhân vật chibi mắt to tròn lấp lánh đang uống ly trà sữa trân châu đường đen khoái khẩu.',
        imageUrls: [localImagePaths[5]],
        tags: ['anime', 'chibi', 'digitalart', 'cute'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 150,
        likesCount: 2,
        bookmarksCount: 1,
        commentsCount: 0
      },

      // Artist 3: Linh Watercolor (Màu nước nghệ thuật)
      {
        artistId: aLinh._id,
        title: 'Tinh hoa tượng nghệ thuật phục hưng',
        description: 'Tác phẩm phác họa tượng điêu khắc Phục Hưng cổ điển phối cùng vệt màu nước rực rỡ hiện đại.',
        imageUrls: [localImagePaths[11]], // Sử dụng ảnh index 11 cho điêu khắc tinh xảo
        tags: ['traditional', 'watercolor', 'art', 'sculpture'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 80,
        likesCount: 2,
        bookmarksCount: 1,
        commentsCount: 0
      },
      {
        artistId: aLinh._id,
        title: 'Tinh hoa đóa hồng sớm mai',
        description: 'Bức vẽ màu nước tả thực cận cảnh đóa hoa hồng đỏ thắm còn đọng những giọt sương sớm lung linh.',
        imageUrls: [localImagePaths[9]], // Bãi biển hoàng hôn tông màu nước
        tags: ['watercolor', 'traditional', 'rose', 'nature'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 62,
        likesCount: 1,
        bookmarksCount: 1,
        commentsCount: 0
      },
      {
        artistId: aLinh._id,
        title: 'Tách cà phê bình yên',
        description: 'Vẽ tĩnh vật một buổi sáng ấm áp yên bình bên khung cửa sổ kèm tách cà phê nghi ngút khói.',
        imageUrls: [localImagePaths[10]], // Thẩm mỹ quán cà phê ấm cúng
        tags: ['watercolor', 'traditional', 'coffee', 'cozy'],
        visibility: 'everyone',
        commentsEnabled: false, // Comments bị khóa
        viewsCount: 50,
        likesCount: 1,
        bookmarksCount: 0,
        commentsCount: 0
      },

      // Artist 4: Minh Cyber (Cyberpunk tương lai)
      {
        artistId: aMinh._id,
        title: 'Đêm Neon rực sáng cyberpunk',
        description: 'Góc phố đêm lung linh huyền ảo với ánh đèn neon quảng cáo nhiều màu sắc tại một đại lộ tương lai đầy xe bay.',
        imageUrls: [localImagePaths[4]], // Lặp lại ảnh 5 cho ánh sáng retro cyberpunk neon
        tags: ['cyberpunk', 'digitalart', 'future', 'neon'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 410,
        likesCount: 4,
        bookmarksCount: 3,
        commentsCount: 0
      },
      {
        artistId: aMinh._id,
        title: 'Dòng chảy bo mạch công nghệ',
        description: 'Ý tưởng trừu tượng về sự tích hợp của con chip sinh học nhân tạo trong não bộ tương lai.',
        imageUrls: [localImagePaths[5]], // Kết cấu bản mạch cyberpunk
        tags: ['cyberpunk', 'future', 'digitalart', 'chip'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 280,
        likesCount: 2,
        bookmarksCount: 1,
        commentsCount: 0
      },
      {
        artistId: aMinh._id,
        title: 'Đường cong dòng ánh sáng neon',
        description: 'Phân tích trừu tượng 3D về các luồng hạt ánh sáng di chuyển tự do trong mạng lưới ảo.',
        imageUrls: [localImagePaths[8]], // Sử dụng ảnh chất lỏng hữu cơ neon
        tags: ['cyberpunk', 'future', 'sci-fi', 'glow'],
        visibility: 'everyone',
        commentsEnabled: true,
        viewsCount: 190,
        likesCount: 2,
        bookmarksCount: 0,
        commentsCount: 0
      }
    ];

    const seededIllustrations = await Illustration.insertMany(illustrationsData);
    console.log('[Seed] Artworks seeded successfully.');

    // Bước 5: Seed theo dõi (Follows)
    console.log('[Seed] Seeding following relations...');
    const followsData = [
      { followerId: uHuy._id, followingId: aPhong._id },
      { followerId: uHuy._id, followingId: aVy._id },
      { followerId: uHuy._id, followingId: aLinh._id },
      { followerId: uVy._id, followingId: aVy._id },
      { followerId: uVy._id, followingId: aMinh._id },
      { followerId: aPhong._id, followingId: aVy._id },
      { followerId: aVy._id, followingId: aPhong._id }
    ];
    await Follow.insertMany(followsData);

    // Bước 6: Seed các lượt Like và Bookmark để khớp với bộ đếm
    console.log('[Seed] Seeding likes and bookmarks...');
    // Lượt thích (Likes)
    await Like.create([
      { userId: uHuy._id, illustrationId: seededIllustrations[0]._id }, // Phong cảnh núi của Phong
      { userId: uVy._id, illustrationId: seededIllustrations[0]._id },
      { userId: aVy._id, illustrationId: seededIllustrations[0]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[1]._id }, // Bãi biển hoàng hôn của Phong
      { userId: uVy._id, illustrationId: seededIllustrations[1]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[2]._id }, // Thành phố của Phong

      { userId: uHuy._id, illustrationId: seededIllustrations[3]._id }, // Hoa anh đào của Vy
      { userId: uVy._id, illustrationId: seededIllustrations[3]._id },
      { userId: aPhong._id, illustrationId: seededIllustrations[3]._id },
      { userId: aMinh._id, illustrationId: seededIllustrations[3]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[4]._id }, // Phép thuật của Vy
      { userId: uVy._id, illustrationId: seededIllustrations[4]._id },
      { userId: aPhong._id, illustrationId: seededIllustrations[4]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[5]._id }, // Chibi của Vy
      { userId: uHuy._id, illustrationId: seededIllustrations[5]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[6]._id }, // Điêu khắc của Linh
      { userId: aPhong._id, illustrationId: seededIllustrations[6]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[7]._id }, // Hoa hồng của Linh

      { userId: uHuy._id, illustrationId: seededIllustrations[8]._id }, // Cà phê của Linh

      { userId: uHuy._id, illustrationId: seededIllustrations[9]._id }, // Cyber Neon của Minh
      { userId: uVy._id, illustrationId: seededIllustrations[9]._id },
      { userId: aVy._id, illustrationId: seededIllustrations[9]._id },
      { userId: aPhong._id, illustrationId: seededIllustrations[9]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[10]._id }, // Vi mạch của Minh
      { userId: aVy._id, illustrationId: seededIllustrations[10]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[11]._id }, // Ánh sáng của Minh
      { userId: uHuy._id, illustrationId: seededIllustrations[11]._id }
    ]);

    // Lượt lưu (Bookmarks)
    await Bookmark.create([
      { userId: uHuy._id, illustrationId: seededIllustrations[0]._id },
      { userId: uVy._id, illustrationId: seededIllustrations[0]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[1]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[3]._id },
      { userId: uVy._id, illustrationId: seededIllustrations[3]._id },
      { userId: aPhong._id, illustrationId: seededIllustrations[3]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[4]._id },
      { userId: uVy._id, illustrationId: seededIllustrations[4]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[5]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[6]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[7]._id },

      { userId: uHuy._id, illustrationId: seededIllustrations[9]._id },
      { userId: uVy._id, illustrationId: seededIllustrations[9]._id },
      { userId: aVy._id, illustrationId: seededIllustrations[9]._id },

      { userId: uVy._id, illustrationId: seededIllustrations[10]._id }
    ]);

    // Bước 7: Seed các bình luận (Comments) (với phân cấp cha-con)
    console.log('[Seed] Seeding comments (with threaded replies)...');
    
    // Luồng bình luận trên Illustration 0 (Phong Art - núi)
    const comm1 = await Comment.create({
      illustrationId: seededIllustrations[0]._id,
      userId: uHuy._id,
      content: 'Bức tranh có chiều sâu quá ạ! Màu sắc hoàng hôn rất ấm áp, gợi nhớ mùa thu Hà Nội.'
    });

    await Comment.create({
      illustrationId: seededIllustrations[0]._id,
      userId: aPhong._id,
      parentCommentId: comm1._id,
      content: 'Cảm ơn bạn nhiều nhé! Mình đã tốn khoảng 16 giờ làm việc liên tục để lên màu bầu trời cho vừa ý đó.'
    });

    // Luồng bình luận trên Illustration 3 (Vy Anime - Sakura)
    const comm2 = await Comment.create({
      illustrationId: seededIllustrations[3]._id,
      userId: uVy._id,
      content: 'Trời ơi vẽ dễ thương quá vậy! Mắt lấp lánh như ngọc luôn á bạn ơi!'
    });

    await Comment.create({
      illustrationId: seededIllustrations[3]._id,
      userId: aVy._id,
      parentCommentId: comm2._id,
      content: 'Cảm ơn Vy nha! Hì hì mình rất thích vẽ mắt lấp lánh như thế này đó.'
    });

    console.log('[Seed] Comments seeded successfully.');

    // Bước 8: Seed các Commission
    console.log('[Seed] Seeding commission requests (simulating the wallet escrow cycle)...');

    const commissionsData = [
      // 1. Đã hoàn thành & Đã giải phóng thanh toán (Released)
      {
        clientId: uHuy._id,
        artistId: aPhong._id,
        title: 'Vẽ phong cảnh ruộng bậc thang Tây Bắc mùa lúa chín',
        description: 'Yêu cầu vẽ một phong cảnh ruộng bậc thang Mù Cang Chải vào những ngày lúa chín vàng ươm dưới nắng thu rực rỡ, phong cách tả thực ấm áp để gia đình treo phòng khách.',
        price: 1500000,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Còn 10 ngày
        status: 'completed',
        paymentStatus: 'paid_to_artist',
        resultIllustrationId: seededIllustrations[0]._id, // Liên kết tới bức tranh phong cảnh núi
        isPrivate: false
      },
      // 2. Đang thực hiện (In progress) & Escrow đã được khóa
      {
        clientId: uVy._id,
        artistId: aVy._id,
        title: 'Vẽ nhân vật Chibi cho Avatar stream game cá nhân',
        description: 'Vẽ 1 avatar dạng chibi siêu cưng, nhân vật tóc hồng thắt bím hai bên, đeo tai nghe mèo hồng, đang tươi cười say sưa chơi game.',
        price: 500000,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Còn 5 ngày
        status: 'in_progress',
        paymentStatus: 'escrow',
        isPrivate: false
      },
      // 3. Chờ phê duyệt (Pending approval) & Escrow đã được khóa
      {
        clientId: uHuy._id,
        artistId: aMinh._id,
        title: 'Thiết kế ảnh bìa Cyberpunk phong cách DJ Neon',
        description: 'Đặt làm banner cover kích thước chuẩn cho kênh Soundcloud cá nhân. Vẽ một nữ DJ cool ngầu đứng mix nhạc ngoài ban công tòa cao ốc tương lai tràn ngập ánh đèn neon rực rỡ.',
        price: 2500000,
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Còn 15 ngày
        status: 'pending',
        paymentStatus: 'escrow',
        isPrivate: false
      },
      // 4. Đã từ chối (Rejected) & Đã hoàn tiền (Refunded)
      {
        clientId: uVy._id,
        artistId: aLinh._id,
        title: 'Vẽ chân dung chú cún Corgi bằng màu nước truyền thống',
        description: 'Vẽ chân dung cận mặt của em cún Corgi lông vàng dễ thương đang há miệng cười, vẽ màu nước tỉ mỉ trên giấy Arches.',
        price: 800000,
        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // đã quá hạn chót (past deadline)
        status: 'rejected',
        paymentStatus: 'refunded',
        isPrivate: false
      }
    ];

    const seededCommissions = await Commission.insertMany(commissionsData);
    console.log('[Seed] Commissions seeded successfully.');

    // Bước 9: Seed sổ cái các giao dịch ví (Wallet Transactions Ledger)
    console.log('[Seed] Seeding Wallet Ledger transactions...');
    const walletTransactionsData = [
      // Huy Nguyễn
      {
        userId: uHuy._id,
        amount: 5000000,
        type: 'deposit',
        description: 'Nạp tiền vào tài khoản thông qua thẻ ngân hàng ảo.'
      },
      {
        userId: uHuy._id,
        amount: -1500000,
        type: 'escrow_hold',
        referenceId: seededCommissions[0]._id,
        description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ ruộng bậc thang Tây Bắc".'
      },
      {
        userId: uHuy._id,
        amount: -2500000,
        type: 'escrow_hold',
        referenceId: seededCommissions[2]._id,
        description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Thiết kế ảnh bìa Cyberpunk DJ".'
      },

      // Vy Vy
      {
        userId: uVy._id,
        amount: 10000000,
        type: 'deposit',
        description: 'Nạp tiền vào ví thông qua ví điện tử ảo.'
      },
      {
        userId: uVy._id,
        amount: -500000,
        type: 'escrow_hold',
        referenceId: seededCommissions[1]._id,
        description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ nhân vật Chibi".'
      },
      {
        userId: uVy._id,
        amount: -800000,
        type: 'escrow_hold',
        referenceId: seededCommissions[3]._id,
        description: 'Tạm giữ tiền (Escrow) cho yêu cầu: "Vẽ chân dung cún Corgi".'
      },
      {
        userId: uVy._id,
        amount: 800000,
        type: 'escrow_refund',
        referenceId: seededCommissions[3]._id,
        description: 'Hoàn trả tiền tạm giữ do Họa sĩ từ chối yêu cầu vẽ chân dung Corgi.'
      },

      // Artist Phong Art
      {
        userId: aPhong._id,
        amount: 1500000,
        type: 'escrow_release',
        referenceId: seededCommissions[0]._id,
        description: 'Nhận giải ngân tiền vẽ tranh thành công cho tác phẩm: "Vẽ ruộng bậc thang Tây Bắc".'
      }
    ];

    await WalletTransaction.insertMany(walletTransactionsData);
    console.log('[Seed] Wallet Transactions ledger seeded successfully.');

    // Bước 10: Seed lịch sử chat tin nhắn trực tiếp (Direct Messaging)
    console.log('[Seed] Seeding simulated Chat messenger history...');
    const messagesData = [
      // Chat Huy & Phong
      {
        senderId: uHuy._id,
        receiverId: aPhong._id,
        content: 'Chào bạn Phong Art! Mình vừa mới nạp tiền và gửi một yêu cầu commission vẽ phong cảnh Tây Bắc cho gia đình nhé. Bạn kiểm tra xem đã nhận được Brief chưa ạ?',
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 giờ trước
      },
      {
        senderId: aPhong._id,
        receiverId: uHuy._id,
        content: 'Chào anh Huy! Dạ mình vừa nhận được Brief và hệ thống báo tiền đã gửi vào Escrow rồi ạ. Ý tưởng mùa lúa chín vàng Mù Cang Chải rất tuyệt, mình sẽ bắt tay vào vẽ phác thảo ngay nhé!',
        isRead: true,
        createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000)
      },
      {
        senderId: uHuy._id,
        receiverId: aPhong._id,
        content: 'Tuyệt quá, cảm ơn Phong nha! Rất hóng bản vẽ của bạn!',
        isRead: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },

      // Chat Vy Vy & Vy Anime
      {
        senderId: uVy._id,
        receiverId: aVy._id,
        content: 'Chào bạn Vy Anime dễ thương! Mình cực kỳ thích các nét vẽ chibi của bạn trên trang cá nhân. Mình có gửi yêu cầu vẽ avatar stream game ấy, không biết bạn rảnh nhận vẽ giúp mình không nhỉ?',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 giờ trước
      },
      {
        senderId: aVy._id,
        receiverId: uVy._id,
        content: 'Hi bạn Vy Vy ạ! Cảm ơn bạn rất nhiều vì đã yêu mến tranh của mình nha. Mình rảnh và đã nhấn chấp nhận vẽ rồi nhé! Mình sẽ vẽ một em chibi đeo tai mèo siêu cưng gửi bạn duyệt sớm nghen!',
        isRead: false, // Tin nhắn chưa đọc!
        createdAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000)
      }
    ];

    await Message.insertMany(messagesData);
    console.log('[Seed] Chat messenger data seeded successfully.');

    // Bước 11: Seed danh sách cảnh báo thông báo (Notifications Alert)
    console.log('[Seed] Seeding notifications history...');
    const notificationsData = [
      // Thông báo cho Phong: Huy đã thích tác phẩm phong cảnh núi
      {
        recipientId: aPhong._id,
        actorId: uHuy._id,
        type: 'like',
        targetId: seededIllustrations[0]._id,
        targetModel: 'Illustration',
        contentPreview: 'Huy Nguyễn đã thích tác phẩm của bạn: "Sự tĩnh lặng của đại ngàn"',
        isRead: true
      },
      // Thông báo cho Phong: Huy đã bình luận trên tác phẩm núi
      {
        recipientId: aPhong._id,
        actorId: uHuy._id,
        type: 'comment',
        targetId: seededIllustrations[0]._id,
        targetModel: 'Illustration',
        contentPreview: 'Huy Nguyễn đã bình luận về tác phẩm: "Sự tĩnh lặng của đại ngàn"',
        isRead: true
      },
      // Thông báo cho Vy Anime: Vy Vy đã theo dõi
      {
        recipientId: aVy._id,
        actorId: uVy._id,
        type: 'follow',
        contentPreview: 'Vy Vy đã bắt đầu theo dõi bạn.',
        isRead: false
      },
      // Thông báo cho Vy Anime: Vy Vy đã yêu cầu commission
      {
        recipientId: aVy._id,
        actorId: uVy._id,
        type: 'commission_update',
        targetId: seededCommissions[1]._id,
        targetModel: 'Commission',
        contentPreview: 'Bạn nhận được một yêu cầu vẽ mới từ Vy Vy.',
        isRead: false
      },
      // Thông báo cho Minh Cyber: Huy đã yêu cầu commission
      {
        recipientId: aMinh._id,
        actorId: uHuy._id,
        type: 'commission_update',
        targetId: seededCommissions[2]._id,
        targetModel: 'Commission',
        contentPreview: 'Bạn nhận được một yêu cầu vẽ mới từ Huy Nguyễn.',
        isRead: false
      }
    ];

    await Notification.insertMany(notificationsData);
    console.log('[Seed] Notifications seeded successfully.');

    console.log('\n[Seed SUCCESS] All records and local photos seeded flawlessly! You are ready to log in with password "password123".');
    console.log('Test Accounts available:');
    console.log('- Fan Client 1: huy@gmail.com (Huy Nguyễn)');
    console.log('- Fan Client 2: vyvy@gmail.com (Vy Vy)');
    console.log('- Creator Artist 1: phong@gmail.com (Phong Art)');
    console.log('- Creator Artist 2: vyanime@gmail.com (Vy Anime)');
    console.log('- Creator Artist 3: linhwater@gmail.com (Linh Watercolor)');
    console.log('- Creator Artist 4: minhcyber@gmail.com (Minh Cyber)');

  } catch (error) {
    console.error('[Seed Fatal Error]', error);
  } finally {
    await mongoose.connection.close();
    console.log('[Seed] Database connection closed.');
  }
};

runSeed();
