# Web Nền tảng Cộng đồng Sáng tạo (Creative Community Platforms) / Phòng triển lãm trực tuyến (Online Art Galleries)
- Web tham khảo / lấy cảm hứng: pixiv.net, behance.net, ArtStation,...
## Tech stack: 
- MERN stack 
    - Front: Reactjs
    - Back: Expressjs, Nodejs
    - DB: MongoDB
## Màn hình / trang cần có
- Home
- Newest by followed
- Discovery:
    - recommended works
    - recommended users
- Rankings: theo ngày, tuần, tháng, năm,...
- Newest by all 
- Request / commission: trang để tìm họa sĩ và tạo request/commission 
- User profile:
    - Edit profile
    - Edit avatar, banner
    - Edit social links
    - Edit bio
    - Edit nickname
- Dashboard: 
    - Your posts/works
    - Your reactions
- Manage request:
    - Recieved requests
    - Sent requests
- Bookmarks
- Settings:
    - Language:
        - Vietnamese
        - English 
    - Dark/light mode
    - Account: 
        - Password
        - Email 
        - Nickname
    - Notifications
- Money management (for commissions/request)
- Create post/work

## Mô tả các chức năng
- Hệ thống tags: chỉ cần tags, không cần phân thành các mục lớn như illustrations, manga, novels như pixiv.
- Khi tạo một bài đăng: 
    - Có thể có nhiều file ảnh 
    - Tiêu đề 
    - Mô tả 
    - Thẻ/tags
    - Người thấy được post: mọi người (everyone), chỉ mình tôi (private), người dùng đã đăng nhập (Logged-in users)
    - Bật/tắt phần bình luận
- Khi một bài đăng hiện trên feed, người dùng có thể: 
    - Like / unlike (thích / bỏ thích) 
    - Comment (bình luận) 
    - Share (chia sẻ)
    - Bookmark (đánh dấu)
- Đặt commission 
- Thanh toán 
- Thông toán (notifications)
- Nhắn tin 

## Tham khảo:
- Ảnh giao diện mẫu: thư mục 'images_references'
- Cấu trúc database (DBML): schema-dbml.md

## Lưu ý:
- Đây là project đồ án, web không cần phải quá phức tạp và quy mô quá lớn, theo yêu cầu thì web phải được deploy.
- Schema được đưa ra chỉ là tham khảo, không bắt buộc phải tuân theo 100%, chỉnh sửa nếu cần thiết.
- Ảnh giao diện được tham khảo từ các web trên, nhưng không nhất thiết phải giống 100%. Quan trọng là các chức năng và mô tả của các trang web trên phải được thể hiện rõ ràng trên web của chúng ta.

- Giao diện ưu tiên tiếng Việt vì thế mặc định tiền tệ là VND
- Tham khảo ảnh/luồng request / commission trên pixiv.net để hiểu rõ hơn về các trạng thái và thông tin cần thiết.

