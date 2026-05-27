import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Illustration from '../models/Illustration.js';
import Follow from '../models/Follow.js';
import { uploadFileToCloudinary } from '../utils/cloudinary.js';



const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
    requestTerms: user.requestTerms,
    walletBalance: user.walletBalance,
    socialLinks: user.socialLinks,
    website: user.website,
    customSocialLinks: user.customSocialLinks,
    gender: user.gender,
    country: user.country,
    birthday: user.birthday,
    occupation: user.occupation,
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

    const userObj = user.toObject();
    const isMe = req.user && req.user.id === req.params.id;

    if (!isMe) {
      if (userObj.website && !userObj.website.isPublic) {
        userObj.website = { value: '', isPublic: false };
      }
      if (userObj.gender && !userObj.gender.isPublic) {
        userObj.gender = { value: 'other', isPublic: false };
      }
      if (userObj.country && !userObj.country.isPublic) {
        userObj.country = { value: '', isPublic: false };
      }
      if (userObj.birthday && !userObj.birthday.isPublic) {
        userObj.birthday = { value: null, isPublic: false };
      }
      if (userObj.occupation && !userObj.occupation.isPublic) {
        userObj.occupation = { value: '', isPublic: false };
      }
      if (userObj.customSocialLinks) {
        userObj.customSocialLinks = userObj.customSocialLinks.filter(link => link.isPublic);
      }
    }

    res.status(200).json(userObj);
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

    const {
      nickname,
      bio,
      socialLinks,
      isArtist,
      website,
      gender,
      country,
      birthday,
      occupation,
      customSocialLinks
    } = req.body;

    const parseField = (field) => {
      if (!field) return undefined;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch (err) {
        return field;
      }
    };

    if (nickname) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    
    if (socialLinks) {
      const parsedSocial = parseField(socialLinks);
      user.socialLinks = {
        ...user.socialLinks,
        ...parsedSocial,
      };
    }
    
    if (isArtist !== undefined) {
      user.isArtist = isArtist === 'true' || isArtist === true;
    }

    const parsedWebsite = parseField(website);
    if (parsedWebsite !== undefined) user.website = parsedWebsite;

    const parsedGender = parseField(gender);
    if (parsedGender !== undefined) user.gender = parsedGender;

    const parsedCountry = parseField(country);
    if (parsedCountry !== undefined) user.country = parsedCountry;

    const parsedBirthday = parseField(birthday);
    if (parsedBirthday !== undefined) {
      user.birthday = {
        value: parsedBirthday.value ? new Date(parsedBirthday.value) : null,
        isPublic: parsedBirthday.isPublic ?? true,
      };
    }

    const parsedOccupation = parseField(occupation);
    if (parsedOccupation !== undefined) user.occupation = parsedOccupation;

    const parsedCustomSocialLinks = parseField(customSocialLinks);
    if (parsedCustomSocialLinks !== undefined) user.customSocialLinks = parsedCustomSocialLinks;

    // Xử lý URL của file tải lên (avatar hoặc banner) nếu được Multer lưu lại
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        user.avatarUrl = await uploadFileToCloudinary(req.files.avatar[0]);
      }
      if (req.files.banner && req.files.banner[0]) {
        user.bannerUrl = await uploadFileToCloudinary(req.files.banner[0]);
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
    // Lấy danh sách top 6 artist được sắp xếp theo totalLikes và totalViews
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

export const updateRequestTerms = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { title, details, targetPrice } = req.body;

    user.requestTerms = {
      ...user.requestTerms,
      title: title || user.requestTerms.title,
      details: details || user.requestTerms.details,
      targetPrice: targetPrice !== undefined ? Number(targetPrice) : user.requestTerms.targetPrice,
      hasTerms: true
    };

    if (req.file) {
      user.requestTerms.backgroundUrl = await uploadFileToCloudinary(req.file);
    }

    user.isArtist = true; // Đồng bộ hóa để tương thích

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('[Update Request Terms Error]', error);
    res.status(500).json({ message: 'Server error updating request terms' });
  }
};

export const deleteRequestTerms = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.requestTerms = {
      title: '',
      details: '',
      targetPrice: 0,
      backgroundUrl: '',
      hasTerms: false
    };

    user.isArtist = false; // Đồng bộ hóa để tương thích

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('[Delete Request Terms Error]', error);
    res.status(500).json({ message: 'Server error deleting request terms' });
  }
};

export const googleLogin = async (req, res) => {
  const { credential } = req.body;

  try {
    if (!credential) {
      return res.status(400).json({ message: 'Token Google không hợp lệ' });
    }

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


    // Xác thực token sử dụng google-auth-library
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Không thể xác thực tài khoản Google' });
    }

    const { email, name, picture } = payload;

    // Kiểm tra xem người dùng đã tồn tại chưa
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Người dùng chưa tồn tại, tạo người dùng mới
      // 1. Tạo username duy nhất từ phần tiền tố của email
      const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let baseUsername = emailPrefix || 'user';
      let username = baseUsername;
      
      // Tiếp tục kiểm tra cho đến khi tìm thấy username duy nhất
      let usernameExists = await User.findOne({ username });
      let counter = 1;
      while (usernameExists) {
        username = `${baseUsername}${counter}`;
        usernameExists = await User.findOne({ username });
        counter++;
      }

      // 2. Tạo một password hash ngẫu nhiên bảo mật
      const randomPassword = Math.random().toString(36).slice(-10) + Date.now().toString();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      // 3. Tạo người dùng
      user = await User.create({
        username,
        email: email.toLowerCase(),
        passwordHash,
        nickname: name || username,
        avatarUrl: picture || '',
        isArtist: false,
      });
    }

    // Đăng nhập người dùng và gửi response chứa token
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('[Google Login Error]', error);
    res.status(500).json({ message: 'Lỗi máy chủ trong quá trình đăng nhập bằng Google' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(200).json([]);
    }

    const query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } },
      ],
    };

    const users = await User.find(query).select('-passwordHash').limit(20);

    // Lấy tối đa 3 artwork mới nhất cho mỗi người dùng khớp
    const usersWithArtworks = await Promise.all(
      users.map(async (u) => {
        const artworks = await Illustration.find({ artistId: u._id, visibility: 'everyone' })
          .sort({ createdAt: -1 })
          .limit(3)
          .select('imageUrls title');
        
        let followed = false;
        if (req.user) {
          followed = !!(await Follow.findOne({ followerId: req.user.id, followingId: u._id }));
        }

        return {
          ...u.toObject(),
          artworks,
          followed,
        };
      })
    );

    res.status(200).json(usersWithArtworks);
  } catch (error) {
    console.error('[Search Users Error]', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
};


