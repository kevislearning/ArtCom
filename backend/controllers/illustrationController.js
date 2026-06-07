import fs from 'fs';
import mongoose from 'mongoose';
import Illustration from '../models/Illustration.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Bookmark from '../models/Bookmark.js';
import Follow from '../models/Follow.js';
import { notificationService } from '../services/notificationService.js';
import { uploadMultipleToCloudinary, deleteMultipleFromCloudinary } from '../utils/cloudinary.js';


/**
 * Helper để cập nhật các thống kê tương tác phi chuẩn hóa (denormalized interaction statistics) của người dùng
 */
const updateArtistStats = async (artistId) => {
  const illustrations = await Illustration.find({ artistId });
  const illustrationIds = illustrations.map(i => i._id);

  const totalViews = illustrations.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
  const totalLikes = await Like.countDocuments({ illustrationId: { $in: illustrationIds } });
  const totalBookmarks = await Bookmark.countDocuments({ illustrationId: { $in: illustrationIds } });

  await User.findByIdAndUpdate(artistId, {
    totalViews,
    totalLikes,
    totalBookmarks,
  });
};

export const createIllustration = async (req, res) => {
  try {
    const { title, description, tags, visibility, commentsEnabled, isAIGenerated } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image file is required' });
    }

    // Parse tags nếu được gửi dưới dạng chuỗi JSON hoặc phân tách bằng dấu phẩy
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    let isAIDetected = false;
    let aiProbability = 0;

    const userDeclaredAI = isAIGenerated === 'true' || isAIGenerated === true;

    // Gọi Hugging Face API để phát hiện AI nếu người dùng không tự khai báo
    if (!userDeclaredAI && req.files && req.files[0]) {
      console.log(`[Hugging Face Scan] Đang tiến hành quét tác phẩm "${title}" bằng AI Image Detector...`);
      try {
        const imageBuffer = fs.readFileSync(req.files[0].path);
        
        let result = null;
        const hfToken = process.env.HF_TOKEN;

        if (hfToken) {
          try {
            console.log('[Hugging Face Scan] Gửi request đến Inference API Router...');
            const response = await fetch(
              "https://router.huggingface.co/hf-inference/models/umm-maybe/AI-image-detector",
              {
                headers: {
                  Authorization: `Bearer ${hfToken}`,
                  "Content-Type": "image/jpeg",
                },
                method: "POST",
                body: imageBuffer,
              }
            );

            if (response.ok) {
              result = await response.json();
              console.log('[Hugging Face Scan] Nhận kết quả thành công:', JSON.stringify(result, null, 2));
            } else {
              const errText = await response.text();
              console.error(`[Hugging Face Router Failed] Status: ${response.status}. Error: ${errText.substring(0, 200)}`);
            }
          } catch (fetchErr) {
            console.error('[Hugging Face Fetch Error]', fetchErr.message);
          }
        } else {
          console.warn('[Hugging Face Auth Failed] Không tìm thấy HF_TOKEN trong .env.');
        }

        if (Array.isArray(result)) {
          const artificialResult = result.find(r => r.label === 'artificial');
          if (artificialResult) {
            aiProbability = artificialResult.score;
            console.log(`[Hugging Face Scan] Tỉ lệ AI (artificial) phát hiện được: ${(aiProbability * 100).toFixed(2)}%`);
            if (aiProbability >= 0.65) {
              isAIDetected = true;
              console.log('[Hugging Face Scan] Kết luận: Tác phẩm này sử dụng AI (Tỉ lệ >= 65%). Sẽ được gán nhãn cảnh báo.');
            } else {
              console.log('[Hugging Face Scan] Kết luận: Không phát hiện sử dụng AI hoặc dưới ngưỡng cảnh báo (65%).');
            }
          }
        }
      } catch (err) {
        console.error('[Hugging Face Detection Error]', err.message);
      }
    } else if (userDeclaredAI) {
      console.log(`[Hugging Face Scan] Người dùng tự khai báo tác phẩm "${title}" được vẽ bằng AI. Bỏ qua bước quét tự động.`);
    }

    // Tải lên Cloudinary (sẽ fallback về lưu trữ đĩa cục bộ nếu credentials chưa được cấu hình)
    // Note: Phải chạy SAU khi scan Hugging Face vì việc tải lên Cloudinary sẽ xóa các file tạm cục bộ.
    const imageUrls = await uploadMultipleToCloudinary(req.files);

    const illustration = await Illustration.create({
      artistId: req.user.id,
      title,
      description,
      imageUrls,
      tags: parsedTags,
      visibility: visibility || 'everyone',
      commentsEnabled: commentsEnabled !== 'false',
      isAIGenerated: userDeclaredAI,
      aiDetectionResult: {
        isAIDetected,
        aiProbability,
      },
    });

    // Gửi notification cho tất cả người theo dõi (followers)
    const followers = await Follow.find({ followingId: req.user.id });
    for (const follow of followers) {
      await notificationService.createNotification({
        recipientId: follow.followerId,
        actorId: req.user.id,
        type: 'new_illustration',
        targetId: illustration._id,
        targetModel: 'Illustration',
        contentPreview: `${req.user.nickname || req.user.username} posted a new work: "${title}"`,
      });
    }

    res.status(201).json(illustration);
  } catch (error) {
    console.error('[Create Illustration Error]', error);
    res.status(500).json({ message: 'Server error creating illustration' });
  }
};

export const getIllustrationById = async (req, res) => {
  try {
    const illustration = await Illustration.findById(req.params.id)
      .populate('artistId', 'username nickname avatarUrl isArtist');

    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    // Tăng số lượt xem (views) bất đồng bộ
    illustration.viewsCount += 1;
    await illustration.save();
    updateArtistStats(illustration.artistId._id).catch(err => console.error('[Stats update error]', err));

    // Kiểm tra xem người dùng hiện tại đã like hoặc bookmark illustration này chưa
    let liked = false;
    let bookmarked = false;

    if (req.user) {
      liked = !!(await Like.findOne({ userId: req.user.id, illustrationId: illustration._id }));
      bookmarked = !!(await Bookmark.findOne({ userId: req.user.id, illustrationId: illustration._id }));
    }

    res.status(200).json({
      ...illustration.toObject(),
      liked,
      bookmarked,
    });
  } catch (error) {
    console.error('[Get Illustration Error]', error);
    res.status(500).json({ message: 'Server error fetching illustration' });
  }
};

export const deleteIllustration = async (req, res) => {
  try {
    const illustration = await Illustration.findById(req.params.id);
    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    // Kiểm tra quyền sở hữu (ownership)
    if (illustration.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this work' });
    }

    deleteMultipleFromCloudinary(illustration.imageUrls);

    await Illustration.deleteOne({ _id: illustration._id });
    await Like.deleteMany({ illustrationId: illustration._id });
    await Bookmark.deleteMany({ illustrationId: illustration._id });

    updateArtistStats(req.user.id).catch(err => console.error('[Stats update error]', err));

    res.status(200).json({ message: 'Illustration deleted successfully' });
  } catch (error) {
    console.error('[Delete Illustration Error]', error);
    res.status(500).json({ message: 'Server error deleting illustration' });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const illustration = await Illustration.findById(id);
    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    const alreadyLiked = await Like.findOne({ userId, illustrationId: id });

    if (alreadyLiked) {
      await Like.deleteOne({ _id: alreadyLiked._id });
      illustration.likesCount = Math.max(0, illustration.likesCount - 1);
      await illustration.save();

      res.status(200).json({ liked: false, likesCount: illustration.likesCount });
    } else {
      await Like.create({ userId, illustrationId: id });
      illustration.likesCount += 1;
      await illustration.save();

      // Kích hoạt notification
      await notificationService.createNotification({
        recipientId: illustration.artistId,
        actorId: userId,
        type: 'like',
        targetId: illustration._id,
        targetModel: 'Illustration',
        contentPreview: `${req.user.nickname || req.user.username} liked your work: "${illustration.title}"`,
      });

      res.status(200).json({ liked: true, likesCount: illustration.likesCount });
    }

    updateArtistStats(illustration.artistId).catch(err => console.error('[Stats update error]', err));
  } catch (error) {
    console.error('[Toggle Like Error]', error);
    res.status(500).json({ message: 'Server error toggling like' });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const illustration = await Illustration.findById(id);
    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    const alreadyBookmarked = await Bookmark.findOne({ userId, illustrationId: id });

    if (alreadyBookmarked) {
      await Bookmark.deleteOne({ _id: alreadyBookmarked._id });
      illustration.bookmarksCount = Math.max(0, illustration.bookmarksCount - 1);
      await illustration.save();

      res.status(200).json({ bookmarked: false, bookmarksCount: illustration.bookmarksCount });
    } else {
      await Bookmark.create({ userId, illustrationId: id });
      illustration.bookmarksCount += 1;
      await illustration.save();

      // Kích hoạt notification
      await notificationService.createNotification({
        recipientId: illustration.artistId,
        actorId: userId,
        type: 'bookmark',
        targetId: illustration._id,
        targetModel: 'Illustration',
        contentPreview: `${req.user.nickname || req.user.username} bookmarked your work: "${illustration.title}"`,
      });

      res.status(200).json({ bookmarked: true, bookmarksCount: illustration.bookmarksCount });
    }

    updateArtistStats(illustration.artistId).catch(err => console.error('[Stats update error]', err));
  } catch (error) {
    console.error('[Toggle Bookmark Error]', error);
    res.status(500).json({ message: 'Server error toggling bookmark' });
  }
};

/**
 * Lấy danh sách feeds:
 * Hỗ trợ query theo từ khóa tìm kiếm, tag, hoặc artistId
 */
export const getIllustrations = async (req, res) => {
  try {
    const { sort, tag, search, artistId, period, page, limit } = req.query;

    const query = { visibility: 'everyone' };
    
    // Người dùng đã đăng nhập có thể thấy mọi người + cơ chế hiển thị logged_in hoạt động
    if (req.user) {
      query.visibility = { $in: ['everyone', 'logged_in'] };
    }

    if (tag) {
      query.tags = { $regex: new RegExp(`^${tag}$`, 'i') };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (artistId) {
      query.artistId = artistId;
      // Xóa bộ lọc visibility chung để artist có thể xem các bài viết private của chính họ nếu cần
      if (req.user && req.user.id === artistId) {
        delete query.visibility;
      }
    }

    if (period) {
      let startDate;
      const now = new Date();
      if (period === 'day') {
        startDate = new Date(now.setDate(now.getDate() - 1));
      } else if (period === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else if (period === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    let illustrationsQuery;

    const isFeedQuery = !tag && !search && !artistId;
    if (req.user && isFeedQuery && (!sort || sort === 'newest')) {
      const followingRelations = await Follow.find({ followerId: req.user.id });
      const followedArtistIds = followingRelations.map(f => f.followingId);

      const [userLikes, userBookmarks] = await Promise.all([
        Like.find({ userId: req.user.id }).select('illustrationId'),
        Bookmark.find({ userId: req.user.id }).select('illustrationId'),
      ]);

      const interactedIds = [
        ...userLikes.map(l => l.illustrationId),
        ...userBookmarks.map(b => b.illustrationId),
      ];

      const interactedWorks = await Illustration.find({ _id: { $in: interactedIds } }).select('tags');
      const userFavTags = Array.from(new Set(interactedWorks.flatMap(w => w.tags || [])));

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const followedObjectIds = followedArtistIds.map(id => new mongoose.Types.ObjectId(id));

      const pipeline = [
        { $match: query },
        {
          $addFields: {
            score: {
              $add: [
                {
                  $cond: {
                    if: { $in: ['$artistId', followedObjectIds] },
                    then: 10,
                    else: 0
                  }
                },
                {
                  $cond: {
                    if: {
                      $gt: [
                        { $size: { $setIntersection: [{ $ifNull: ['$tags', []] }, userFavTags] } },
                        0
                      ]
                    },
                    then: 5,
                    else: 0
                  }
                }
              ]
            }
          }
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ];

      const illustrations = await Illustration.aggregate(pipeline);
      const populated = await Illustration.populate(illustrations, {
        path: 'artistId',
        select: 'username nickname avatarUrl isArtist'
      });

      const likedSet = new Set(userLikes.map(l => l.illustrationId.toString()));
      const bookmarkedSet = new Set(userBookmarks.map(b => b.illustrationId.toString()));

      const results = populated.map(illustration => ({
        ...illustration,
        liked: likedSet.has(illustration._id.toString()),
        bookmarked: bookmarkedSet.has(illustration._id.toString()),
      }));

      return res.status(200).json(results);
    }

    illustrationsQuery = Illustration.find(query)
      .populate('artistId', 'username nickname avatarUrl isArtist');

    // Các chiến lược sắp xếp (sorting strategies)
    if (sort === 'popular') {
      // Sắp xếp Hot ranking: likes + bookmarks + tỉ lệ views
      illustrationsQuery = illustrationsQuery.sort({ likesCount: -1, bookmarksCount: -1, viewsCount: -1 });
    } else if (sort === 'recommended') {
      // Sắp xếp Recommended: sắp xếp theo views và likes
      illustrationsQuery = illustrationsQuery.sort({ viewsCount: -1, likesCount: -1 });
    } else if (sort === 'oldest') {
      illustrationsQuery = illustrationsQuery.sort({ createdAt: 1 });
    } else if (sort === 'popularity') {
      illustrationsQuery = illustrationsQuery.sort({ viewsCount: -1 });
    } else if (sort === 'likes') {
      illustrationsQuery = illustrationsQuery.sort({ likesCount: -1 });
    } else if (sort === 'bookmarks') {
      illustrationsQuery = illustrationsQuery.sort({ bookmarksCount: -1 });
    } else {
      // Mới nhất
      illustrationsQuery = illustrationsQuery.sort({ createdAt: -1 });
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;
      illustrationsQuery = illustrationsQuery.skip(skip).limit(limitNum);
    }

    const illustrations = await illustrationsQuery.exec();

    // Kiểm tra trạng thái like/bookmark nếu đã đăng nhập
    let results = illustrations;
    if (req.user) {
      const userLikes = await Like.find({ userId: req.user.id });
      const likedSet = new Set(userLikes.map(l => l.illustrationId.toString()));

      const userBookmarks = await Bookmark.find({ userId: req.user.id });
      const bookmarkedSet = new Set(userBookmarks.map(b => b.illustrationId.toString()));

      results = illustrations.map(illustration => ({
        ...illustration.toObject(),
        liked: likedSet.has(illustration._id.toString()),
        bookmarked: bookmarkedSet.has(illustration._id.toString()),
      }));
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('[Get Illustrations Error]', error);
    res.status(500).json({ message: 'Server error fetching illustrations' });
  }
};

/**
 * Feed theo thứ tự thời gian của các artist được theo dõi bởi người dùng hiện tại
 */
export const getFollowedFeed = async (req, res) => {
  try {
    const followingRelations = await Follow.find({ followerId: req.user.id });
    const followedArtistIds = followingRelations.map(f => f.followingId);

    if (followedArtistIds.length === 0) {
      return res.status(200).json([]);
    }

    const illustrations = await Illustration.find({
      artistId: { $in: followedArtistIds },
      visibility: { $ne: 'private' },
    })
      .sort({ createdAt: -1 })
      .populate('artistId', 'username nickname avatarUrl isArtist');

    // Đính kèm trạng thái tương tác
    const userLikes = await Like.find({ userId: req.user.id });
    const likedSet = new Set(userLikes.map(l => l.illustrationId.toString()));

    const userBookmarks = await Bookmark.find({ userId: req.user.id });
    const bookmarkedSet = new Set(userBookmarks.map(b => b.illustrationId.toString()));

    const results = illustrations.map(illustration => ({
      ...illustration.toObject(),
      liked: likedSet.has(illustration._id.toString()),
      bookmarked: bookmarkedSet.has(illustration._id.toString()),
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('[Followed Feed Error]', error);
    res.status(500).json({ message: 'Server error fetching followed feed' });
  }
};

/**
 * Lấy các trending tags hàng đầu dựa trên số lần xuất hiện của tag trong hệ thống
 */
export const getTrendingTags = async (req, res) => {
  try {
    const aggregation = await Illustration.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: { $toLower: '$tags' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.status(200).json(aggregation);
  } catch (error) {
    console.error('[Get Trending Tags Error]', error);
    res.status(500).json({ message: 'Server error fetching trending tags' });
  }
};

export const getBookmarkedIllustrations = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user.id });
    const illustrationIds = bookmarks.map((b) => b.illustrationId);

    const illustrations = await Illustration.find({
      _id: { $in: illustrationIds },
      visibility: { $in: ['everyone', 'logged_in'] },
    }).populate('artistId', 'username nickname avatarUrl isArtist');

    // Đảm bảo chúng ta kiểm tra trạng thái like
    const userLikes = await Like.find({ userId: req.user.id });
    const likedSet = new Set(userLikes.map((l) => l.illustrationId.toString()));

    const results = illustrations.map((illustration) => ({
      ...illustration.toObject(),
      liked: likedSet.has(illustration._id.toString()),
      bookmarked: true,
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('[Get Bookmarked Illustrations Error]', error);
    res.status(500).json({ message: 'Server error fetching bookmarked illustrations' });
  }
};

export const updateIllustration = async (req, res) => {
  try {
    const illustration = await Illustration.findById(req.params.id);
    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    if (illustration.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this illustration' });
    }

    const { title, description, tags, visibility, commentsEnabled } = req.body;

    if (title) illustration.title = title;
    if (description !== undefined) illustration.description = description;
    if (visibility) illustration.visibility = visibility;
    if (commentsEnabled !== undefined) illustration.commentsEnabled = commentsEnabled;
    if (tags) {
      try {
        const tagsArr = typeof tags === 'string' ? JSON.parse(tags) : tags;
        illustration.tags = tagsArr;
      } catch (err) {
        illustration.tags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
      }
    }

    await illustration.save();
    res.status(200).json(illustration);
  } catch (error) {
    console.error('[Update Illustration Error]', error);
    res.status(500).json({ message: 'Server error updating illustration' });
  }
};

export const searchTags = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(200).json([]);
    }
    const aggregation = await Illustration.aggregate([
      { $unwind: '$tags' },
      { $match: { tags: { $regex: search, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.status(200).json(aggregation);
  } catch (error) {
    console.error('[Search Tags Error]', error);
    res.status(500).json({ message: 'Server error searching tags' });
  }
};

