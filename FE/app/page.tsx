import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { PatientShell } from "@/components/patient/patient-shell";
import { HomeChat } from "@/components/patient/home-chat";
import { quickActions } from "@/lib/mock-data";

export default function PatientHomePage() {
  return (
    <PatientShell>
      <section className="emergency-banner" aria-label="Thông tin cấp cứu">
        <div className="container">
          <span>
            <Icon name="alert" />
          </span>
          <p>
            <strong>Bạn đang đau ngực dữ dội, khó thở hoặc mất ý thức?</strong>
            <small>Trợ lý trực tuyến không phải là dịch vụ cấp cứu.</small>
          </p>
          <a href="tel:115" className="button button--danger">
            <Icon name="phone" size={18} /> Gọi 115
          </a>
          <Link href="#cap-cuu">
            Xem hướng dẫn cấp cứu <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
      <section className="patient-hero">
        <div className="container hero-grid">
          <HomeChat />
        </div>
      </section>
      <section className="primary-actions" aria-label="Tác vụ chính">
        <div className="container">
          <div className="hero-copy hero-copy--below">
            <span className="eyebrow"><i /> CỔNG THÔNG TIN NGƯỜI BỆNH</span>
            <h1>Đi khám dễ dàng hơn,<br/><em>luôn biết bước tiếp theo</em></h1>
            <p>Đặt lịch, chuẩn bị giấy tờ và theo dõi số thứ tự trong một nơi. Nếu chưa quen dùng điện thoại, bạn có thể gọi tổng đài để được hướng dẫn.</p>
            <div className="hero-actions"><Link className="button button--primary button--large" href="/appointments?mode=book"><Icon name="calendar"/> Đặt lịch khám</Link><Link className="button button--secondary button--large" href="/appointments"><Icon name="search"/> Tôi đã có lịch hẹn</Link></div>
            <div className="hero-support"><Icon name="phone"/><span><strong>Cần người hướng dẫn? Gọi 024 3942 2430</strong><small>Không dùng cho tình huống cấp cứu</small></span></div>
          </div>
          <div className="action-strip-heading">
            <span>Chọn việc bạn muốn làm</span>
            <small>Chạm vào một ô để tiếp tục</small>
          </div>
          <div className="action-strip">
            <Link href="/appointments?mode=book">
              <span>
                <Icon name="calendar" />
              </span>
              <p>
                <strong>Đặt lịch khám</strong>
                <small>Chọn ngày và nhu cầu khám</small>
              </p>
              <Icon name="chevron" />
            </Link>
            <Link href="/appointments">
              <span>
                <Icon name="search" />
              </span>
              <p>
                <strong>Tra cứu lịch hẹn</strong>
                <small>Kiểm tra lịch đã đặt</small>
              </p>
              <Icon name="chevron" />
            </Link>
            <Link href="/visit/VISIT-001">
              <span>
                <Icon name="route" />
              </span>
              <p>
                <strong>Theo dõi lượt khám</strong>
                <small>Xem số và nơi cần đến</small>
              </p>
              <Icon name="chevron" />
            </Link>
            <Link href="/assistant">
              <span>
                <Icon name="message" />
              </span>
              <p>
                <strong>Hỏi thông tin</strong>
                <small>Giấy tờ, quy trình, chỉ đường</small>
              </p>
              <Icon name="chevron" />
            </Link>
          </div>
        </div>
      </section>
      <section className="quick-section" id="quy-trinh">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HƯỚNG DẪN NHANH</span>
              <h2>Hôm nay bạn cần hỗ trợ gì?</h2>
              <p>Chọn một nội dung để xem hướng dẫn theo QT.25.01.</p>
            </div>
            <Link href="/procedures">
              Xem toàn bộ quy trình <Icon name="arrow" size={17} />
            </Link>
          </div>
          <div className="quick-grid">
            {quickActions.map((action) => (
              <Link
                href={action.href}
                className="quick-card"
                key={action.title}
              >
                <span className="quick-card__icon">
                  <Icon name={action.icon} />
                </span>
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>
                <Icon name="chevron" className="quick-card__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="visit-promo">
        <div className="container visit-promo__inner">
          <div>
            <span className="eyebrow eyebrow--light">LƯỢT KHÁM HÔM NAY</span>
            <h2>Mọi thông tin trong một màn hình</h2>
            <p>
              Theo dõi số thứ tự, phòng khám và bước tiếp theo. Bạn luôn biết
              mình cần đi đâu và chuẩn bị gì.
            </p>
            <Link href="/visit/VISIT-001" className="button button--light">
              Theo dõi hành trình khám <Icon name="arrow" />
            </Link>
          </div>
          <div className="mini-phone" aria-hidden="true">
            <div className="mini-phone__top" />
            <span>Lượt khám của bạn</span>
            <strong>A024</strong>
            <small>Đang chờ thanh toán</small>
            <div className="mini-progress">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-room">
              <Icon name="map" />
              <span>
                Quầy thu ngân 03
                <br />
                <small>Tầng 1 · Khu A</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="safety-section" id="cap-cuu">
        <div className="container safety-card">
          <span>
            <Icon name="phone" size={28} />
          </span>
          <div>
            <h2>Khi nào cần gọi cấp cứu?</h2>
            <p>
              Nếu đau ngực dữ dội, khó thở, mất ý thức hoặc có dấu hiệu nguy
              hiểm, hãy gọi 115 hoặc đến cơ sở y tế gần nhất. Không chờ phản hồi
              từ chatbot.
            </p>
          </div>
          <a href="tel:115" className="button button--danger">
            Gọi cấp cứu 115
          </a>
        </div>
      </section>
    </PatientShell>
  );
}
