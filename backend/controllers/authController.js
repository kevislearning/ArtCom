import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    isArtist: user.isArtist,
    walletBalance: user.walletBalance,
    socialLinks: user.socialLinks,
    totalViews: user.totalViews,
    totalLikes: user.totalLikes,
    totalBookmarks: user.totalBookmarks,
    totalComments: user.totalComments,
    token,
  });
};

export const register = async (req, res) => {
  const { username, email, password, nickname, isArtist } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      nickname: nickname || username,
      isArtist: !!isArtist,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Please provide credentials' });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Successfully logged out' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('[GetMe Error]', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('[Public Profile Error]', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { nickname, bio, socialLinks, isArtist } = req.body;

    if (nickname) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    if (socialLinks) {
      user.socialLinks = {
        ...user.socialLinks,
        ...socialLinks,
      };
    }
    if (isArtist !== undefined) {
      user.isArtist = isArtist === 'true' || isArtist === true;
    }

    // Handle uploaded file URLs (avatar or banner) if Multer saves them
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        user.avatarUrl = `/uploads/${req.files.avatar[0].filename}`;
      }
      if (req.files.banner && req.files.banner[0]) {
        user.bannerUrl = `/uploads/${req.files.banner[0].filename}`;
      }
    }

    await user.save();
    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const getRecommendedArtists = async (req, res) => {
  try {
    // Fetch top 6 artists sorted by totalLikes and totalViews
    const artists = await User.find({ isArtist: true })
      .select('-passwordHash')
      .sort({ totalLikes: -1, totalViews: -1 })
      .limit(6);
    res.status(200).json(artists);
  } catch (error) {
    console.error('[Get Recommended Artists Error]', error);
    res.status(500).json({ message: 'Server error fetching recommended artists' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('[Change Password Error]', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};
