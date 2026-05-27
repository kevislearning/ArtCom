import fs from 'fs';
import Illustration from '../models/Illustration.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Bookmark from '../models/Bookmark.js';
import Follow from '../models/Follow.js';
import { notificationService } from '../services/notificationService.js';
import { uploadMultipleToCloudinary } from '../utils/cloudinary.js';


/**
 * Helper to update user denormalized interaction statistics
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

    // Parse tags if sent as stringified JSON or comma-separated
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

    // Call Hugging Face API to detect AI if user did not declare it
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

    // Upload to Cloudinary (will fall back to local disk storage if credentials are not configured)
    // Note: Must run AFTER Hugging Face scan because Cloudinary upload deletes local temp files.
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

    // Notify all followers
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

    // Increment views asynchronously
    illustration.viewsCount += 1;
    await illustration.save();
    updateArtistStats(illustration.artistId._id).catch(err => console.error('[Stats update error]', err));

    // Check if the current user has liked or bookmarked this illustration
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

    // Check ownership
    if (illustration.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this work' });
    }

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

      // Trigger notification
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

      // Trigger notification
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
 * Fetch feeds:
 * Supports querying by search keyword, tag, or artistId
 */
export const getIllustrations = async (req, res) => {
  try {
    const { sort, tag, search, artistId, period } = req.query;

    const query = { visibility: 'everyone' };
    
    // Logged in users can see everyone + logged_in visibility works
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
      // Delete general visibility filter so artists can view their own private posts if needed
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

    let illustrationsQuery = Illustration.find(query)
      .populate('artistId', 'username nickname avatarUrl isArtist');

    // Sorting strategies
    if (sort === 'popular') {
      // Hot ranking: likes + bookmarks + view fraction
      illustrationsQuery = illustrationsQuery.sort({ likesCount: -1, bookmarksCount: -1, viewsCount: -1 });
    } else if (sort === 'recommended') {
      // Recommended: sort by views and likes
      illustrationsQuery = illustrationsQuery.sort({ viewsCount: -1, likesCount: -1 });
    } else {
      // Newest
      illustrationsQuery = illustrationsQuery.sort({ createdAt: -1 });
    }

    const illustrations = await illustrationsQuery.exec();

    // Check like/bookmark status if logged in
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
 * Chronological feed of artists followed by the current user
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

    // Attach interaction status
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
 * Get top trending tags based on tag occurrences in the system
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

    // Make sure we check like status
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
