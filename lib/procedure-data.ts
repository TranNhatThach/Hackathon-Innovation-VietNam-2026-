export interface ProcedureStep {
  id: string;
  order: number;
  title: string;
  patientInstruction: string;
  responsibleRole: string;
  staffActions: string[];
  sourcePages: string;
  note?: string;
}

export const procedureMeta = {
  code: "QT.25.01",
  title: "Quy trình đón tiếp bệnh nhân và khám chữa bệnh ngoại trú tại Khu Tự nguyện 1 – Cơ sở 1",
  issue: "Lần ban hành 07",
  effectiveDate: "05/12/2024",
  sourceUrl: "/tai-lieu/quy-trinh-ngoai-tru-tn1-cs1-qt-25-01.pdf",
};

export const procedureSteps: ProcedureStep[] = [
  {
    id: "dat-lich",
    order: 1,
    title: "Đặt lịch hoặc đến khám trực tiếp",
    patientInstruction: "Nếu đặt lịch trước, người bệnh nhận mã đặt lịch, ngày khám và tên bác sĩ (nếu có). Nếu chưa đặt lịch, lấy số trực tiếp tại cây lấy số tự động của Khu Tự nguyện 1.",
    responsibleRole: "Nhân viên tổ Chăm sóc khách hàng – Phòng Công tác xã hội",
    staffActions: ["Tiếp nhận yêu cầu qua điện thoại, website hoặc fanpage.", "Tư vấn quy trình và thông báo thông tin lịch đã đặt."],
    sourcePages: "Trang 4",
  },
  {
    id: "lay-so",
    order: 2,
    title: "Lấy số tiếp nhận",
    patientInstruction: "Người đã đặt lịch vào quầy dành cho lịch hẹn; người chưa đặt lịch lấy số tại cây lấy số và chờ được gọi.",
    responsibleRole: "Nhân viên tư vấn, tiếp đón và hướng dẫn viên",
    staffActions: ["Hướng dẫn đúng khu vực lấy số.", "Giữ trật tự khu vực chờ tiếp nhận."],
    sourcePages: "Trang 4",
  },
  {
    id: "dang-ky",
    order: 3,
    title: "Đăng ký khám và kiểm tra giấy tờ",
    patientInstruction: "Người khám lần đầu khai phiếu đăng ký. Người khám BHYT chuẩn bị giấy chuyển tuyến hoặc giấy hẹn khám lại khi được yêu cầu, thông tin BHYT điện tử/thẻ BHYT và CCCD hoặc giấy tờ tùy thân hợp lệ.",
    responsibleRole: "Nhân viên tổ tư vấn và tiếp đón khám bệnh",
    staffActions: ["Tiếp nhận người khám mới, tái khám, BHYT và dịch vụ.", "Đối chiếu thông tin hồ sơ và xác định đối tượng ưu tiên theo quy định.", "Hướng dẫn sang đúng quầy kế toán."],
    sourcePages: "Trang 4–5",
    note: "Quyền lợi và điều kiện BHYT do nhân viên có thẩm quyền kiểm tra; giao diện không tự kết luận.",
  },
  {
    id: "bhyt-thu-phi",
    order: 4,
    title: "Tiếp nhận BHYT và thu phí ban đầu",
    patientInstruction: "Xuất trình giấy tờ được yêu cầu, nghe thông báo về phí khám và phần chênh lệch BHYT (nếu có), sau đó làm theo hướng dẫn đến bàn đo dấu hiệu sinh tồn.",
    responsibleRole: "Nhân viên kế toán",
    staffActions: ["Kiểm tra giấy tờ BHYT cần thiết.", "Thông báo phí khám, phần chênh lệch (nếu có) và thực hiện thu phí.", "Hướng dẫn người bệnh sang bàn đo dấu hiệu sinh tồn."],
    sourcePages: "Trang 5",
  },
  {
    id: "dau-hieu-sinh-ton",
    order: 5,
    title: "Đo dấu hiệu sinh tồn, chiều cao và cân nặng",
    patientInstruction: "Đến bàn đo theo hướng dẫn và chờ nhân viên ghi kết quả vào phiếu tiếp nhận.",
    responsibleRole: "Nhân viên đo dấu hiệu sinh tồn",
    staffActions: ["Đo dấu hiệu sinh tồn, chiều cao, cân nặng và ghi phiếu tiếp nhận.", "Ưu tiên đúng đối tượng theo quy định.", "Báo bác sĩ hoặc chuyển cấp cứu khi có dấu hiệu bất thường theo hướng dẫn liên quan."],
    sourcePages: "Trang 5",
  },
  {
    id: "cho-kham",
    order: 6,
    title: "Chờ gọi số và vào phòng khám",
    patientInstruction: "Ngồi tại sảnh chờ của phòng khám đã đăng ký, theo dõi màn hình và loa gọi số; vào phòng khi số của mình được gọi.",
    responsibleRole: "Điều dưỡng phát số và hướng dẫn viên hành lang",
    staffActions: ["Phát số phân phòng và hướng dẫn khu vực chờ.", "Theo dõi màn hình, loa gọi số và báo sự cố gọi số.", "Quan sát, hỗ trợ các tình huống bất thường tại sảnh."],
    sourcePages: "Trang 6",
  },
  {
    id: "kham-cls",
    order: 7,
    title: "Khám và thực hiện cận lâm sàng nếu có",
    patientInstruction: "Bác sĩ khám và có thể chỉ định cận lâm sàng. Người bệnh thực hiện đúng các mục và vị trí trên phiếu hướng dẫn, sau đó chờ điều dưỡng tổng hợp kết quả để quay lại bác sĩ kết luận.",
    responsibleRole: "Bác sĩ, điều dưỡng bàn phân phòng – trả kết quả và hướng dẫn viên",
    staffActions: ["Bác sĩ khám, giải thích và in chỉ định cần thiết.", "Điều dưỡng ghi số thứ tự, đánh dấu các mục/vị trí cần làm.", "Hướng dẫn viên đưa người bệnh đi làm chỉ định và chuyển kết quả về bàn trả kết quả.", "Điều dưỡng kiểm soát kết quả, xử lý bất thường theo quy định và phát số quay lại bác sĩ."],
    sourcePages: "Trang 6–7",
    note: "Cận lâm sàng (CLS) có thể gồm điện tim, siêu âm, X-quang, xét nghiệm máu, ABI… theo chỉ định của bác sĩ.",
  },
  {
    id: "ket-luan-hen-lai",
    order: 8,
    title: "Bác sĩ kết luận, kê đơn hoặc hướng xử trí tiếp",
    patientInstruction: "Nghe bác sĩ giải thích, nhận đơn thuốc/hướng dẫn sử dụng, chế độ sinh hoạt và lịch khám lại. Trường hợp cần nhập viện, chuyển tuyến hoặc xử trí khác sẽ được nhân viên hướng dẫn theo quy trình riêng.",
    responsibleRole: "Bác sĩ phòng khám và điều dưỡng bàn khám lại",
    staffActions: ["Bác sĩ kết luận, kê đơn, hướng dẫn điều trị và cấp giấy hẹn khi cần.", "Điều dưỡng kiểm tra đơn, đóng dấu ngoại trú/chương trình phù hợp và hướng dẫn thủ tục lần sau.", "Thực hiện nhánh nhập viện/chuyển tuyến theo quy trình liên quan khi có chỉ định."],
    sourcePages: "Trang 7–8",
  },
  {
    id: "thuoc-ket-thuc",
    order: 9,
    title: "Duyệt đơn, thanh toán và lĩnh/mua thuốc",
    patientInstruction: "Thực hiện phần đồng chi trả hoặc thanh toán thuốc dịch vụ (nếu có), ký nhận theo hướng dẫn, sau đó lĩnh thuốc BHYT hoặc mua thuốc dịch vụ và kết thúc lượt khám.",
    responsibleRole: "Kế toán và quầy thuốc BHYT/nhà thuốc dịch vụ",
    staffActions: ["Duyệt đơn BHYT, thu phần chênh lệch hoặc thu tiền thuốc dịch vụ.", "Kiểm tra đơn, số lượng và liều dùng; phát thuốc theo đơn và đóng dấu đã phát."],
    sourcePages: "Trang 8",
  },
];
