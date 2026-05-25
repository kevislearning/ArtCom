
mongodb+srv://tdtphuoc:noNdNk5hQZ2wZUUR@cluster0.vvecajz.mongodb.net/?appName=Cluster0


# Sửa lỗi: 
- Mỗi lần reload, giao diện sẽ quay về lại dark mode thay vì phải ghi nhớ trạng thái trước đó mà người dùng đặt.
- Ở giao diện light mode, trong mỗi thẻ ảnh thì tên người đăng không thể thấy được do text màu đen. 
- Theo mô tả dự án thì người dùng có thể tạo bài đăng, hiện tại chưa thấy. 
- Kiểm tra lại thư mục thảm khảo của dự án đặc biệt file mô tả và kiểm tra đã thực hiện đầy đủ các trang và chức năng chưa.


- Tôi muốn thiết lập chức năng thanh toán hoàn chỉnh. Cụ thể là thanh toán chuyển khoản qua momo và tài khoản ngân hàng, tham khảo luồng xử lý và thanh toán của pixiv.net, tìm hiểu api momo, thanh toán chuyển khoản ngân hàng và cài đặt chức năng.


Dựa vào các ảnh giao diện tham khảo và file mô tả dự án thì còn những mục/chức năng/trang chưa được cài đặt, cần kiểm tra và hoàn thiện như sau: 
- Trang khám phá (discovery): chưa có tùy chọn khám phá tác phẩm đề xuất và họa sĩ đề xuất (recommended works và recommended user).
- Chưa có trang rankings (xếp hạng): hiện tại là một mục trong trang chủ (home), cần tách ra thành trang riêng và có các lựa chọn xem xếp hạng theo ngày, tuần, tháng, năm,...
- Chưa có trang dashboard của người dùng: để xem các bài post/work/tác phẩm đã đăng, tồng số lượt views, likes, bookmarks và comments.
- Chuyển phần thiết lập light/dark mode, ngôn ngữ vào phần cài đặt (hiện tại đang nằm ở top bar).
- Trong trang cài đặt chưa cho phép thay đổi mật khẩu.
- Chưa có trang bookmarks để xem lại các post/work/tác phẩm đã bookmark.
- Trong trang chi tiết một bài post thì cần đặt comment section ngay dưới tác phẩm (hiện tại đang được đặt bên phải tác phẩm).


Có một vấn đề khi một người dùng nhận một tin nhắn từ người dùng khác thì trong phần tin nhắn, ở đây đáng lẽ phải để tên và avatar của người dùng mình đang nhắn tin cùng là Huy, không phải là avatar và tên của mình. Chỉ khi reload trang thì mới thấy thay đổi.



