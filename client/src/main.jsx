import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Award,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Copy,
  GraduationCap,
  Heart,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  Medal,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX
} from "lucide-react";
import "./styles.css";

const defaultNotes = [
  "Vui lòng có mặt trước giờ bắt đầu 15 phút.",
  "Trang phục lịch sự, ưu tiên tông màu sáng.",
  "Có thể gửi lời chúc hoặc xác nhận tham dự qua nút bên dưới."
];

const defaultMemories = [
  {
    title: "Danh hiệu",
    description: "Sinh viên hoàn thành chương trình học với nhiều nỗ lực đáng nhớ."
  },
  {
    title: "Hoạt động",
    description: "Tham gia câu lạc bộ, workshop và các dự án trong thời gian học."
  },
  {
    title: "Ngoại khóa",
    description: "Những chuyến đi, sự kiện và khoảnh khắc cùng bạn bè."
  }
];

const emptyConfig = {
  heroImage: "",
  heroImages: [],
  gallery: [],
  graduateName: "",
  degree: "",
  school: "",
  eventTitle: "Lễ tốt nghiệp",
  eventDate: "",
  eventTime: "",
  locationName: "",
  locationAddress: "",
  mapUrl: "",
  hostName: "",
  greeting: "",
  message: "",
  privateMessage: "",
  description: "",
  dressCode: "",
  phone: "",
  rsvpUrl: "",
  notes: defaultNotes,
  memories: defaultMemories
};

const fields = [
  ["graduateName", "Tên người tốt nghiệp"],
  ["degree", "Danh xưng / ngành học"],
  ["school", "Trường"],
  ["eventTitle", "Tên sự kiện"],
  ["eventDate", "Ngày tổ chức", "date"],
  ["eventTime", "Giờ", "time"],
  ["locationName", "Địa điểm"],
  ["locationAddress", "Địa chỉ"],
  ["mapUrl", "Link Google Maps"],
  ["hostName", "Người gửi lời mời"],
  ["greeting", "Lời mời ngắn"],
  ["message", "Lời nhắn chính"],
  ["privateMessage", "Lời nhắn gửi riêng"],
  ["description", "Mô tả thêm"],
  ["dressCode", "Dress code"],
  ["rsvpUrl", "Link xác nhận tham dự"]
];

const RELATION_OPTIONS = [
  "Anh", "Chị", "Bạn", "Cô", "Chú", "Bác", "Ông", "Bà",
  "Em", "Thầy", "Cô giáo", "Anh họ", "Chị họ"
];

function normalizeConfig(data) {
  const heroImages = Array.isArray(data?.heroImages) ? data.heroImages : [];
  const legacyHeroImage = data?.heroImage ? [data.heroImage] : [];

  return {
    ...emptyConfig,
    ...data,
    heroImages: [...new Set([...heroImages, ...legacyHeroImage])],
    gallery: Array.isArray(data?.gallery) ? data.gallery : [],
    notes: Array.isArray(data?.notes) ? data.notes : defaultNotes,
    memories:
      Array.isArray(data?.memories)
        ? data.memories.map((item) =>
            typeof item === "string" ? { title: item, description: "" } : { title: "", description: "", ...item }
          )
        : defaultMemories
  };
}

function resolveAsset(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return url;
}

function getEventDateTime(config) {
  if (!config.eventDate) return null;
  const time = config.eventTime || "00:00";
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const date = new Date(`${config.eventDate}T${normalizedTime}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function useCountdown(config) {
  const eventDateTime = useMemo(() => getEventDateTime(config), [config.eventDate, config.eventTime]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!eventDateTime) {
    return { expired: false, items: [] };
  }

  const distance = eventDateTime.getTime() - now;
  const safeDistance = Math.max(distance, 0);
  const totalSeconds = Math.floor(safeDistance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: distance <= 0,
    items: [
      ["Ngày", days],
      ["Giờ", hours],
      ["Phút", minutes],
      ["Giây", seconds]
    ]
  };
}

function useConfig() {
  const [config, setConfig] = useState(emptyConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(normalizeConfig(data)))
      .finally(() => setLoading(false));
  }, []);

  return { config, setConfig, loading };
}

// Hook: lấy thông tin khách từ token trong URL (chỉ dùng ở trang mời)
function useGuestToken() {
  const [guest, setGuest] = useState(null); // null = chưa biết, false = không có token/không tìm thấy
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setGuest(false);
      setChecked(true);
      return;
    }
    fetch(`/api/guest/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setGuest(data))
      .catch(() => setGuest(false))
      .finally(() => setChecked(true));
  }, []);

  return { guest, checked };
}

// ── Confetti Burst ───────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#ffe066", "#ffc940", "#8ecae6", "#a8dbd5",
  "#ffffff", "#f4a261", "#e9c46a", "#90e0ef", "#ffb347",
];

function ConfettiBurst({ active }) {
  const particles = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 90 }, (_, i) => {
      const angle = (i / 90) * 360 + (Math.random() - 0.5) * 22;
      const rad = (angle * Math.PI) / 180;
      const dist = 120 + Math.random() * 230;
      const isRect = Math.random() > 0.45;
      const w = 5 + Math.random() * 6;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w,
        h: isRect ? w * 2.8 : w,
        br: isRect ? 2 : "50%",
        tx: Math.cos(rad) * dist,
        ty: Math.sin(rad) * dist - 80,
        rot: Math.random() * 560 - 280,
        dur: 0.65 + Math.random() * 0.7,
        delay: Math.random() * 0.18,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.br,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            "--rot": `${p.rot}deg`,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Scroll Reveal hook ────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    });
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);
}

// ── Flip Digit ────────────────────────────────────────────────────────────────

function FlipDigit({ value }) {
  const ref = useRef(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current && ref.current) {
      ref.current.classList.remove("digit-flip");
      void ref.current.offsetWidth; // force reflow
      ref.current.classList.add("digit-flip");
      prevRef.current = value;
    }
  }, [value]);

  return (
    <strong ref={ref} className="countdown-digit">
      {String(value).padStart(2, "0")}
    </strong>
  );
}

// ── Envelope Screen ───────────────────────────────────────────────────────────

function EnvelopeScreen({ config, guest, onOpen }) {
  const [opening, setOpening] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const envelopeRef = useRef(null);
  const wrapRef = useRef(null);

  // Sparkle positions (stable, generated once)
  const sparkles = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      size: 5 + Math.random() * 6,
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 84,
      delay: i * 0.32,
      dur: 1.4 + Math.random() * 1.2,
    }))
  , []);

  const handleOpen = () => {
    setOpening(true);
    setConfetti(true);
    onOpen();
  };

  // 3D mouse tilt
  const onMouseMove = useCallback((e) => {
    if (!envelopeRef.current || opening) return;
    const rect = envelopeRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    envelopeRef.current.style.transform =
      `rotateY(${dx * 16}deg) rotateX(${-dy * 11}deg) scale(1.03)`;
  }, [opening]);

  const onMouseLeave = useCallback(() => {
    if (envelopeRef.current) {
      envelopeRef.current.style.transform = "";
    }
  }, []);

  return (
    <div className={`envelope-screen${opening ? " opening" : ""}`}>
      {/* Nền rơi icon */}
      <div className="env-bg-icons" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`env-bg-icon env-bg-icon-${i + 1}`}>
            <GraduationCap size={i % 4 === 0 ? 28 : 18} />
          </span>
        ))}
      </div>

      {/* Text tiêu đề phía trên */}
      <div className="env-header">
        <p className="eyebrow" style={{ color: "rgb(255 246 228 / 80%)" }}>Bạn có một thư mời</p>
        <h1 className="env-name">{config.graduateName || "Lễ Tốt Nghiệp"}</h1>
      </div>

      {/* Phong bì với 3D tilt */}
      <div
        className="envelope-wrap"
        ref={wrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="envelope"
          ref={envelopeRef}
          style={{ transition: opening ? "transform 0.9s ease" : "transform 0.12s ease" }}
        >
          {/* Nắp phong bì */}
          <div className="envelope-flap">
            <div className="envelope-flap-inner" />
          </div>
          {/* Thân phong bì */}
          <div className="envelope-body">
            <div className="envelope-seal">
              <GraduationCap size={26} />
            </div>
          </div>
          {/* Thẻ nhỏ bên trong ló ra khi mở */}
          <div className="envelope-card-peek">
            <Sparkles size={14} />
            <span>Thư mời tốt nghiệp</span>
          </div>
          {/* Sparkle dots lung linh */}
          {sparkles.map((s) => (
            <div
              key={s.id}
              className="env-sparkle-dot"
              style={{
                width: s.size,
                height: s.size,
                left: `${s.x}%`,
                top: `${s.y}%`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          ))}
        </div>
        {/* Confetti nổ từ giữa phong bì */}
        <ConfettiBurst active={confetti} />
      </div>

      {/* Tên người được mời – nổi bật bên dưới phong bì, chỉ hiện khi có token */}
      {guest && (
        <div className="env-to-card">
          <span className="env-to-label">THÂN MỜI</span>
          <div className="env-to-name">
            <span className="env-to-relation">{guest.relation}</span>
            <strong className="env-to-fullname">{guest.name}</strong>
          </div>
        </div>
      )}

      {/* Nút mở */}
      <button
        className="open-envelope-btn"
        onClick={handleOpen}
        disabled={opening}
        aria-label="Mở thiệp mời"
      >
        <Mail size={20} />
        {opening ? "Đang mở..." : "Mở thiệp"}
      </button>

      <p className="env-hint">Nhấn để xem thư mời của bạn</p>
    </div>
  );
}

// ── Invitation ────────────────────────────────────────────────────────────────

function Invitation({ config, isOpened }) {
  const countdown = useCountdown(config);
  const { guest, checked } = useGuestToken();
  useScrollReveal();

  const photos = useMemo(() => {
    const merged = [...(config.heroImages || []), config.heroImage].filter(Boolean);
    return [...new Set(merged)];
  }, [config.heroImage, config.heroImages]);

  if (!checked) return null;

  return (
    <main className={`invitation-shell${isOpened ? " card-revealed" : ""}`}>
      <section className="hero">
        <FallingGraduationIcons />
        <PhotoCarousel photos={photos} graduateName={config.graduateName} />
        <div className="hero-copy">
          <p className="eyebrow">Thư mời dự tốt nghiệp</p>
          <h1>{config.graduateName}</h1>
          <p>{config.degree}</p>
          <span>{config.school}</span>
        </div>
      </section>

      {/* Banner cá nhân hóa – CHỈ hiển thị khi có khách hợp lệ */}
      {guest && (
        <section className="content-section guest-banner" data-reveal>
          <div className="guest-banner-inner">
            <Heart size={20} className="guest-banner-icon" />
            <p>
              Kính mời <span className="guest-relation">{guest.relation}</span>{" "}
              <strong className="guest-name">{guest.name}</strong>
            </p>
          </div>
        </section>
      )}

      <section className="content-section intro" data-reveal>
        <Sparkles size={22} />
        <p>{config.greeting}</p>
        <strong>{config.message}</strong>
        {config.description && <span>{config.description}</span>}
      </section>

      {config.privateMessage && (
        <section className="content-section private-message" data-reveal>
          <Heart size={22} />
          <div>
            <p className="eyebrow">Lời nhắn gửi riêng</p>
            <strong>{config.privateMessage}</strong>
          </div>
        </section>
      )}

      <section className="countdown-section" data-reveal>
        <div>
          <p className="eyebrow">{config.eventTitle}</p>
          <h2>{countdown.expired ? "Hẹn gặp tại buổi lễ" : "Đếm ngược đến ngày vui"}</h2>
        </div>
        <div className="countdown-grid">
          {countdown.items.map(([label, value]) => (
            <article key={label}>
              <FlipDigit value={value} />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section event-grid" data-reveal>
        <Info icon={<CalendarDays />} label="Ngày" value={formatDate(config.eventDate)} />
        <Info icon={<Clock />} label="Thời gian" value={config.eventTime} />
        <Info icon={<MapPin />} label={config.locationName} value={config.locationAddress} />
      </section>

      {(config.gallery || []).length > 0 && (
        <section className="memory-gallery" data-reveal>
          {(config.gallery || []).slice(0, 5).map((image, index) => (
            <img key={image} src={resolveAsset(image)} alt={`Khoảnh khắc ${index + 1}`} />
          ))}
        </section>
      )}

      <section className="content-section memory-section" data-reveal>
        <div className="section-heading">
          <Medal size={22} />
          <h2>Kỷ niệm đáng nhớ</h2>
        </div>
        <div className="memory-list">
          {(config.memories || []).map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <Award size={20} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section note-section" data-reveal>
        <div className="section-heading">
          <Check size={22} />
          <h2>Lưu ý</h2>
        </div>
        <ul>
          {(config.notes || []).map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="content-section details" data-reveal>
        <p>Dress code: {config.dressCode}</p>
        <p>Trân trọng, {config.hostName}</p>
      </section>

      <div className="action-bar">
        {config.mapUrl && (
          <a href={config.mapUrl} target="_blank" rel="noreferrer">
            <MapPin size={18} />
            Chỉ đường
          </a>
        )}
        {config.rsvpUrl && (
          <a href={config.rsvpUrl} target="_blank" rel="noreferrer">
            <Check size={18} />
            Xác nhận
          </a>
        )}
      </div>
    </main>
  );
}

// ── Photo Carousel ─────────────────────────────────────────────────────────────

function PhotoCarousel({ photos, graduateName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(0);
  const touchDelta = useRef(0);
  const hasManyPhotos = photos.length > 1;

  useEffect(() => {
    if (!hasManyPhotos) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % photos.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [hasManyPhotos, photos.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [photos.length]);

  const goTo = (index) => {
    if (!photos.length) return;
    setActiveIndex((index + photos.length) % photos.length);
  };

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0].clientX;
    touchDelta.current = 0;
  };

  const onTouchMove = (event) => {
    touchDelta.current = event.touches[0].clientX - touchStart.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta.current) < 42) return;
    goTo(activeIndex + (touchDelta.current < 0 ? 1 : -1));
  };

  if (!photos.length) {
    return (
      <div className="hero-placeholder hero-frame">
        <GraduationCap size={66} />
      </div>
    );
  }

  return (
    <div
      className="hero-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {photos.map((image, index) => {
          const framePhotos = [
            image,
            photos[(index + 1) % photos.length],
            photos[(index + 2) % photos.length]
          ].filter((item, itemIndex, items) => item && items.indexOf(item) === itemIndex);

          return (
            <figure className={`carousel-slide photo-count-${framePhotos.length}`} key={`${image}-${index}`}>
              {framePhotos.map((photo, photoIndex) => (
                <img
                  key={`${photo}-${photoIndex}`}
                  src={resolveAsset(photo)}
                  alt={`${graduateName} ${photoIndex + 1}`}
                  className={`photo-card ${photoIndex === 0 ? "main-photo" : "side-photo"}`}
                />
              ))}
            </figure>
          );
        })}
      </div>
      {hasManyPhotos && (
        <div className="carousel-dots" aria-label="Chọn ảnh">
          {photos.map((image, index) => (
            <button
              key={image}
              className={activeIndex === index ? "active" : ""}
              onClick={() => goTo(index)}
              aria-label={`Ảnh ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FallingGraduationIcons() {
  return (
    <div className="falling-icons" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, index) => (
        <span key={index} className={`falling-icon falling-icon-${index + 1}`}>
          <GraduationCap size={index % 3 === 0 ? 24 : 18} />
        </span>
      ))}
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <article className="info-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <p>{value}</p>
      </div>
    </article>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────

function Admin({ config, setConfig }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("config"); // "config" | "guests"

  const updateField = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const authHeaders = () => (adminToken ? { "x-admin-token": adminToken } : {});

  const uploadOneImage = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      throw new Error("Không upload được ảnh. Kiểm tra admin token nếu server có cấu hình.");
    }
    return res.json();
  };

  const uploadImages = async (files, target) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    setError("");
    try {
      const uploaded = await Promise.all(fileList.map((file) => uploadOneImage(file)));
      const urls = uploaded.map((item) => item.url);
      if (target === "heroImages") {
        updateField("heroImages", [...new Set([...(config.heroImages || []), ...urls])]);
        if (!config.heroImage && urls[0]) updateField("heroImage", urls[0]);
      } else {
        updateField("gallery", [...(config.gallery || []), ...urls]);
      }
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const removeHeroImage = (image) => {
    const nextImages = (config.heroImages || []).filter((item) => item !== image);
    setConfig((current) => ({
      ...current,
      heroImages: nextImages,
      heroImage: current.heroImage === image ? nextImages[0] || "" : current.heroImage
    }));
  };

  const setPrimaryHeroImage = (image) => {
    setConfig((current) => ({
      ...current,
      heroImage: image,
      heroImages: [image, ...(current.heroImages || []).filter((item) => item !== image)]
    }));
  };

  const removeGalleryImage = (image) => {
    updateField(
      "gallery",
      (config.gallery || []).filter((item) => item !== image)
    );
  };

  const longTextFields = ["message", "greeting", "description", "privateMessage"];
  const heroImages = config.heroImages || [];

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    localStorage.setItem("adminToken", adminToken);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(normalizeConfig(config))
    });
    if (!res.ok) {
      setSaving(false);
      setError("Không lưu được. Kiểm tra admin token nếu server có cấu hình.");
      return;
    }
    const data = await res.json();
    setConfig(normalizeConfig(data));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="admin-shell">
      <header>
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Cấu hình thư mời</h1>
        </div>
        <div className="admin-header-actions">
          {activeTab === "config" && (
            <button onClick={save} disabled={saving}>
              <Save size={18} />
              {saving ? "Đang lưu" : saved ? "Đã lưu ✓" : "Lưu"}
            </button>
          )}
        </div>
      </header>

      {/* Tab navigation */}
      <div className="admin-tabs">
        <button
          className={activeTab === "config" ? "active" : ""}
          onClick={() => setActiveTab("config")}
        >
          <Save size={16} />
          Cấu hình thư mời
        </button>
        <button
          className={activeTab === "guests" ? "active" : ""}
          onClick={() => setActiveTab("guests")}
        >
          <Users size={16} />
          Quản lý khách mời
        </button>
      </div>

      {/* Token chung */}
      <section className="admin-panel media-panel">
        <label className="token-field">
          <span>Admin token</span>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Chỉ cần nhập nếu Render có ADMIN_TOKEN"
          />
        </label>
      </section>

      {error && <p className="admin-error">{error}</p>}

      {activeTab === "config" && (
        <>
          <section className="admin-panel media-panel">
            <label className="upload-box">
              <ImagePlus size={24} />
              <span>Ảnh chính của người tốt nghiệp</span>
              <small>Chọn nhiều ảnh để hiển thị trong khung hero</small>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => uploadImages(e.target.files, "heroImages")}
              />
            </label>
            <div className="gallery-manager hero-image-manager">
              {heroImages.map((image) => (
                <div className="image-manager-item" key={image}>
                  <button type="button" onClick={() => setPrimaryHeroImage(image)} title="Đặt làm ảnh chính đầu tiên">
                    <img src={resolveAsset(image)} alt="Ảnh chính" />
                    {config.heroImage === image && <span>Chính</span>}
                  </button>
                  <button type="button" className="delete-image-button" onClick={() => removeHeroImage(image)} title="Xóa ảnh">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel form-grid">
            {fields.map(([key, label, type = "text"]) => (
              <label key={key} className={longTextFields.includes(key) ? "wide" : ""}>
                <span>{label}</span>
                {longTextFields.includes(key) ? (
                  <textarea value={config[key] || ""} onChange={(e) => updateField(key, e.target.value)} rows={3} />
                ) : (
                  <input type={type} value={config[key] || ""} onChange={(e) => updateField(key, e.target.value)} />
                )}
              </label>
            ))}
          </section>

          <section className="admin-panel">
            <PanelTitle icon={<Camera size={20} />} title="Ảnh kỷ niệm bên dưới" />
            <label className="inline-upload">
              <ImagePlus size={18} />
              Thêm ảnh
              <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files, "gallery")} />
            </label>
            <div className="gallery-manager">
              {(config.gallery || []).map((image) => (
                <div className="image-manager-item" key={image}>
                  <button type="button" onClick={() => removeGalleryImage(image)} title="Xóa ảnh">
                    <img src={resolveAsset(image)} alt="Ảnh thư viện" />
                  </button>
                  <button type="button" className="delete-image-button" onClick={() => removeGalleryImage(image)} title="Xóa ảnh">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <ListEditor
            title="Lưu ý"
            items={config.notes || []}
            addLabel="Thêm lưu ý"
            onChange={(items) => updateField("notes", items)}
          />

          <MemoryEditor
            items={config.memories || []}
            onChange={(items) => updateField("memories", items)}
          />
        </>
      )}

      {activeTab === "guests" && (
        <GuestManager authHeaders={authHeaders} />
      )}
    </main>
  );
}

// ── Guest Manager ─────────────────────────────────────────────────────────────

function GuestManager({ authHeaders }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Bạn");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guests", { headers: authHeaders() });
      if (!res.ok) throw new Error("Không tải được danh sách khách");
      setGuests(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const createGuest = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), relation })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Không tạo được khách mời");
      }
      const guest = await res.json();
      setGuests((prev) => [guest, ...prev]);
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteGuest = async (id) => {
    setError("");
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!res.ok) throw new Error("Không xóa được khách");
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = (token) => {
    const link = `${baseUrl}/?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <section className="admin-panel guest-manager">
      <PanelTitle icon={<Users size={20} />} title="Quản lý khách mời" />

      <p className="guest-manager-desc">
        Tạo link cá nhân cho từng khách. Khi khách mở link, trang sẽ hiển thị lời mời có tên và quan hệ riêng.
        Link mặc định (không có token) sẽ <strong>không</strong> hiển thị tên người được mời.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {/* Form tạo khách mới */}
      <form className="guest-form" onSubmit={createGuest}>
        <div className="guest-form-row">
          <label className="guest-form-field">
            <span>Tên khách mời</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              required
            />
          </label>
          <label className="guest-form-field">
            <span>Quan hệ / Xưng hô</span>
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={creating || !name.trim()} className="guest-create-btn">
          <Link2 size={18} />
          {creating ? "Đang tạo..." : "Tạo link mời"}
        </button>
      </form>

      {/* Danh sách khách */}
      <div className="guest-list">
        {loading && <p className="guest-loading">Đang tải...</p>}
        {!loading && guests.length === 0 && (
          <p className="guest-empty">Chưa có khách mời nào. Tạo link đầu tiên bên trên.</p>
        )}
        {guests.map((guest) => {
          const link = `${baseUrl}/?token=${guest.token}`;
          return (
            <div className="guest-item" key={guest.id}>
              <div className="guest-info">
                <div className="guest-name-row">
                  <span className="guest-badge">{guest.relation}</span>
                  <strong>{guest.name}</strong>
                </div>
                <a
                  className="guest-link"
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở link mời"
                >
                  {link}
                </a>
              </div>
              <div className="guest-actions">
                <button
                  type="button"
                  className={`copy-btn ${copiedId === guest.token ? "copied" : ""}`}
                  onClick={() => copyLink(guest.token)}
                  title="Sao chép link"
                >
                  {copiedId === guest.token ? <Check size={16} /> : <Copy size={16} />}
                  {copiedId === guest.token ? "Đã sao chép" : "Sao chép"}
                </button>
                <button
                  type="button"
                  className="delete-guest-btn"
                  onClick={() => deleteGuest(guest.id)}
                  title="Xóa khách"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function PanelTitle({ icon, title }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function ListEditor({ title, items, addLabel, onChange }) {
  const updateItem = (index, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <section className="admin-panel list-editor">
      <PanelTitle icon={<Check size={20} />} title={title} />
      {items.map((item, index) => (
        <div className="row-editor" key={index}>
          <input value={item} onChange={(e) => updateItem(index, e.target.value)} />
          <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button className="secondary-button" onClick={() => onChange([...items, ""])}>
        <Plus size={18} />
        {addLabel}
      </button>
    </section>
  );
}

function MemoryEditor({ items, onChange }) {
  const updateItem = (index, key, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  return (
    <section className="admin-panel list-editor">
      <PanelTitle icon={<Medal size={20} />} title="Kỷ niệm đáng nhớ" />
      {items.map((item, index) => (
        <div className="memory-editor" key={index}>
          <input
            value={item.title || ""}
            onChange={(e) => updateItem(index, "title", e.target.value)}
            placeholder="Danh hiệu, hoạt động, ngoại khóa..."
          />
          <textarea
            value={item.description || ""}
            onChange={(e) => updateItem(index, "description", e.target.value)}
            placeholder="Mô tả ngắn"
            rows={2}
          />
          <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button className="secondary-button" onClick={() => onChange([...items, { title: "", description: "" }])}>
        <Plus size={18} />
        Thêm kỷ niệm
      </button>
    </section>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function MusicToggle({ audioRef, isPlaying, setIsPlaying }) {
  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <button
      type="button"
      className={`music-toggle ${isPlaying ? "playing" : ""}`}
      onClick={toggleMusic}
      aria-label={isPlaying ? "Tat nhac nen" : "Bat nhac nen"}
      title={isPlaying ? "Tat nhac nen" : "Bat nhac nen"}
    >
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
      <span className="music-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}

function App() {
  const { config, setConfig, loading } = useConfig();
  const { guest, checked: guestChecked } = useGuestToken();
  const isAdmin = window.location.pathname.startsWith("/admin");
  const [isOpened, setIsOpened] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(null);

  const openInvitation = async () => {
    if (audioRef.current) {
      try {
        audioRef.current.volume = 0.42;
        await audioRef.current.play();
        setIsMusicPlaying(true);
      } catch {
        setIsMusicPlaying(false);
      }
    }
    setTimeout(() => setIsOpened(true), 920);
  };

  const page = useMemo(() => {
    if (loading || !guestChecked) return <div className="loading">Đang tải...</div>;
    if (isAdmin) return <Admin config={config} setConfig={setConfig} />;
    if (!isOpened) {
      return (
        <EnvelopeScreen
          config={config}
          guest={guest}
          onOpen={openInvitation}
        />
      );
    }
    return <Invitation config={config} isOpened={isOpened} />;
  }, [config, isAdmin, loading, setConfig, isOpened, guest, guestChecked]);

  return (
    <>
      {!isAdmin && (
        <>
          <audio ref={audioRef} loop preload="auto">
            <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" type="audio/mpeg" />
          </audio>
          <MusicToggle
            audioRef={audioRef}
            isPlaying={isMusicPlaying}
            setIsPlaying={setIsMusicPlaying}
          />
        </>
      )}
      {page}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
