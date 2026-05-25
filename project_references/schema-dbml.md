Project PixivClone {
  database_type: 'MySQL'
  Note: 'Cơ sở dữ liệu cho nền tảng cộng đồng sáng tạo nghệ thuật (Art Community Platform)'
}

// ==========================================
// BẢNG NGƯỜI DÙNG (CẬP NHẬT CỘT THỐNG KÊ)
// ==========================================
Table users {
  id int [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(100) [unique, not null]
  password_hash varchar(255) [not null]
  bio text
  avatar_url varchar(255)
  is_artist boolean [default: false]
  
  // CÁC CỘT LƯU TRỮ TỔNG TƯƠNG TÁC CỦA NGHỆ SĨ (DENORMALIZATION)
  total_views int [default: 0, note: 'Tổng view của tất cả tranh cộng lại']
  total_likes int [default: 0, note: 'Tổng like nhận được']
  total_bookmarks int [default: 0, note: 'Tổng lượt bị bookmark']
  total_comments int [default: 0, note: 'Tổng bình luận trên các tranh của nghệ sĩ']
  
  created_at datetime [default: `CURRENT_TIMESTAMP`]
}

// ==========================================
// BẢNG BÀI ĐĂNG / ILLUSTRATIONS (CẬP NHẬT CỘT THỐNG KÊ)
// ==========================================
Table illustrations {
  id int [pk, increment]
  artist_id int [not null]
  title varchar(255) [not null]
  description text
  image_url varchar(255) [not null]
  
  // CÁC CỘT ĐẾM TƯƠNG TÁC CHO TỪNG BỨC TRANH RIÊNG LẺ
  views_count int [default: 0]
  likes_count int [default: 0]
  bookmarks_count int [default: 0]
  comments_count int [default: 0]
  
  created_at datetime [default: `CURRENT_TIMESTAMP`]
}

// ==========================================
// HỆ THỐNG TAG (THẺ PHÂN LOẠI)
// ==========================================
Table tags {
  id int [pk, increment]
  name varchar(50) [unique, not null, note: 'Tên thẻ (ví dụ: manga, tả thực, anime...)']
  category varchar(50) [note: 'Phân loại thẻ: style, character, theme, v.v.']
}

// Bảng trung gian để nối Tác phẩm và Thẻ (Mối quan hệ Nhiều-Nhiều)
Table illustration_tags {
  illustration_id int [not null]
  tag_id int [not null]
  
  indexes {
    (illustration_id, tag_id) [pk, note: 'Composite Primary Key để tránh trùng lặp']
  }
}

// ==========================================
// TƯƠNG TÁC (LIKE, BOOKMARK, FOLLOW)
// ==========================================
Table likes {
  user_id int [not null]
  illustration_id int [not null]
  created_at datetime [default: `CURRENT_TIMESTAMP`]
  
  indexes {
    (user_id, illustration_id) [pk]
  }
}

Table bookmarks {
  user_id int [not null]
  illustration_id int [not null]
  created_at datetime [default: `CURRENT_TIMESTAMP`]
  
  indexes {
    (user_id, illustration_id) [pk]
  }
}

Table follows {
  follower_id int [not null, note: 'Người đi follow']
  following_id int [not null, note: 'Nghệ sĩ được follow']
  created_at datetime [default: `CURRENT_TIMESTAMP`]

  indexes {
    (follower_id, following_id) [pk]
  }
}

// ==========================================
// TÍNH NĂNG ĐẶT VẼ (COMMISSION) 
// ==========================================
Table commissions {
  id int [pk, increment]
  client_id int [not null, note: 'Người đặt vẽ (Fan)']
  artist_id int [not null, note: 'Nghệ sĩ nhận vẽ (Creator)']
  title varchar(255) [not null]
  description text [not null, note: 'Mô tả chi tiết yêu cầu (Brief)']
  price decimal(10, 2) [not null, note: 'Giá thỏa thuận']
  
  // Bổ sung các trường nghiệp vụ
  deadline datetime [note: 'Hạn chót bàn giao tác phẩm']
  payment_status enum('unpaid', 'escrow', 'paid_to_artist', 'refunded') [default: 'unpaid', note: 'Quản lý trạng thái dòng tiền']
  result_illustration_id int [note: 'ID của bức tranh sau khi hoàn thành']
  is_private boolean [default: false, note: 'Khách yêu cầu giữ kín, không đăng công khai']
  
  // Cập nhật chi tiết các trạng thái vòng đời
  status enum('pending', 'accepted', 'in_progress', 'in_review', 'completed', 'canceled', 'rejected') [default: 'pending']
  
  created_at datetime [default: `CURRENT_TIMESTAMP`]
  updated_at datetime [default: `CURRENT_TIMESTAMP`]
}


// ==========================================
// TÍNH NĂNG NHẮN TIN (MESSAGES)
// ==========================================
Table messages {
  id int [pk, increment]
  sender_id int [not null]
  receiver_id int [not null]
  content text [not null]
  is_read boolean [default: false]
  created_at datetime [default: `CURRENT_TIMESTAMP`]
}

// ==========================================
// HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
// ==========================================
Table notifications {
  id int [pk, increment]
  recipient_id int [not null, note: 'Người nhận thông báo']
  actor_id int [note: 'Người gây ra hành động (ví dụ: người ấn like)']
  
  type enum(
    'new_illustration', 
    'like', 
    'bookmark', 
    'follow', 
    'comment', 
    'reply', 
    'commission_update', 
    'message'
  ) [not null]
  
  // Lưu ID của đối tượng liên quan để khi click vào thông báo sẽ dẫn đến đúng trang
  target_id int [note: 'ID của Illustration, Commission hoặc Comment liên quan']
  
  content_preview text [note: 'Nội dung tóm tắt (ví dụ: tên tranh hoặc nội dung comment)']
  is_read boolean [default: false]
  created_at datetime [default: `CURRENT_TIMESTAMP`]
}


// ==========================================
// TÍNH NĂNG BÌNH LUẬN VÀ PHẢN HỒI (COMMENTS)
// ==========================================
Table comments {
  id int [pk, increment]
  illustration_id int [not null, note: 'Bức tranh được bình luận']
  user_id int [not null, note: 'Người viết bình luận']
  parent_comment_id int [note: 'Nếu là NULL: Bình luận gốc. Nếu có số: Là phản hồi cho bình luận mang ID này.']
  content text [not null]
  created_at datetime [default: `CURRENT_TIMESTAMP`]
}



// ==========================================
// ĐỊNH NGHĨA CÁC MỐI QUAN HỆ (RELATIONSHIPS)
// ==========================================
Ref: illustrations.artist_id > users.id
Ref: illustration_tags.illustration_id > illustrations.id
Ref: illustration_tags.tag_id > tags.id
Ref: likes.user_id > users.id
Ref: likes.illustration_id > illustrations.id
Ref: bookmarks.user_id > users.id
Ref: bookmarks.illustration_id > illustrations.id
Ref: follows.follower_id > users.id
Ref: follows.following_id > users.id
Ref: commissions.client_id > users.id
Ref: commissions.artist_id > users.id
Ref: messages.sender_id > users.id
Ref: messages.receiver_id > users.id
Ref: commissions.result_illustration_id > illustrations.id
Ref: notifications.recipient_id > users.id
Ref: notifications.actor_id > users.id
Ref: comments.illustration_id > illustrations.id
Ref: comments.user_id > users.id
Ref: comments.parent_comment_id > comments.id