import Follow from '../models/Follow.js';
import User from '../models/User.js';
import { notificationService } from '../services/notificationService.js';

export const toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const followerId = req.user.id;

    if (targetUserId === followerId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingFollow = await Follow.findOne({ followerId, followingId: targetUserId });

    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      res.status(200).json({ followed: false, message: 'Unfollowed user successfully' });
    } else {
      await Follow.create({ followerId, followingId: targetUserId });

      // Trigger notification
      await notificationService.createNotification({
        recipientId: targetUserId,
        actorId: followerId,
        type: 'follow',
        contentPreview: `${req.user.nickname || req.user.username} started following you`,
      });

      res.status(200).json({ followed: true, message: 'Followed user successfully' });
    }
  } catch (error) {
    console.error('[Toggle Follow Error]', error);
    res.status(500).json({ message: 'Server error toggling follow' });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const followers = await Follow.find({ followingId: userId })
      .populate('followerId', 'username nickname avatarUrl isArtist bio');
    
    res.status(200).json(followers.map(f => f.followerId));
  } catch (error) {
    console.error('[Get Followers Error]', error);
    res.status(500).json({ message: 'Server error fetching followers' });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const following = await Follow.find({ followerId: userId })
      .populate('followingId', 'username nickname avatarUrl isArtist bio');
    
    res.status(200).json(following.map(f => f.followingId));
  } catch (error) {
    console.error('[Get Following Error]', error);
    res.status(500).json({ message: 'Server error fetching following' });
  }
};

export const checkFollowStatus = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const followerId = req.user.id;

    const follow = await Follow.findOne({ followerId, followingId: targetUserId });
    res.status(200).json({ followed: !!follow });
  } catch (error) {
    console.error('[Check Follow Error]', error);
    res.status(500).json({ message: 'Server error checking follow status' });
  }
};
