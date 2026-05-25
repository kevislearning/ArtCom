import Comment from '../models/Comment.js';
import Illustration from '../models/Illustration.js';
import { notificationService } from '../services/notificationService.js';

export const createComment = async (req, res) => {
  try {
    const { illustrationId, content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const illustration = await Illustration.findById(illustrationId);
    if (!illustration) {
      return res.status(404).json({ message: 'Illustration not found' });
    }

    if (!illustration.commentsEnabled) {
      return res.status(400).json({ message: 'Comments are disabled for this illustration' });
    }

    const comment = await Comment.create({
      illustrationId,
      userId,
      parentCommentId: parentCommentId || null,
      content,
    });

    // Populate user info for front-end rendering
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username nickname avatarUrl isArtist');

    // Increment comment count on illustration
    illustration.commentsCount += 1;
    await illustration.save();

    // Fire notifications
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment && parentComment.userId.toString() !== userId) {
        await notificationService.createNotification({
          recipientId: parentComment.userId,
          actorId: userId,
          type: 'reply',
          targetId: illustration._id,
          targetModel: 'Illustration',
          contentPreview: `${req.user.nickname || req.user.username} replied to your comment: "${content.substring(0, 40)}"`,
        });
      }
    } else if (illustration.artistId.toString() !== userId) {
      await notificationService.createNotification({
        recipientId: illustration.artistId,
        actorId: userId,
        type: 'comment',
        targetId: illustration._id,
        targetModel: 'Illustration',
        contentPreview: `${req.user.nickname || req.user.username} commented on "${illustration.title}": "${content.substring(0, 40)}"`,
      });
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('[Create Comment Error]', error);
    res.status(500).json({ message: 'Server error creating comment' });
  }
};

export const getCommentsByIllustration = async (req, res) => {
  try {
    const { illustrationId } = req.params;
    const comments = await Comment.find({ illustrationId })
      .populate('userId', 'username nickname avatarUrl isArtist')
      .sort({ createdAt: 1 });

    res.status(200).json(comments);
  } catch (error) {
    console.error('[Get Comments Error]', error);
    res.status(500).json({ message: 'Server error fetching comments' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const illustration = await Illustration.findById(comment.illustrationId);

    // Only comment owner or artwork owner can delete
    const isCommentOwner = comment.userId.toString() === req.user.id;
    const isIllustrationOwner = illustration && illustration.artistId.toString() === req.user.id;

    if (!isCommentOwner && !isIllustrationOwner) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }

    await Comment.deleteOne({ _id: comment._id });

    // Decrement comment count on illustration
    if (illustration) {
      illustration.commentsCount = Math.max(0, illustration.commentsCount - 1);
      await illustration.save();
    }

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('[Delete Comment Error]', error);
    res.status(500).json({ message: 'Server error deleting comment' });
  }
};
