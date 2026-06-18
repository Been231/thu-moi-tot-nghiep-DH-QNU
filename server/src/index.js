import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const port = process.env.PORT || 4000;
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "../data");
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads");
const configPath = path.join(dataDir, "config.json");
const guestsPath = path.join(dataDir, "guests.json");
const clientDist = path.join(rootDir, "client/dist");
const adminToken = process.env.ADMIN_TOKEN || "";

const defaultConfig = {
  heroImage: "",
  heroImages: [],
  gallery: [],
  graduateName: "Nguyen Van A",
  degree: "Tan cu nhan Cong nghe thong tin",
  school: "Truong Dai hoc",
  eventTitle: "Le tot nghiep",
  eventDate: "2026-07-20",
  eventTime: "08:30",
  locationName: "Hoi truong A",
  locationAddress: "123 Duong Le Loi, Quan 1, TP. Ho Chi Minh",
  mapUrl: "",
  hostName: "Gia dinh Nguyen",
  greeting: "Tran trong kinh moi ban den chung vui trong ngay le tot nghiep.",
  message:
    "Su hien dien cua ban la niem vui va niem vinh hanh lon voi minh va gia dinh.",
  privateMessage:
    "Cam on ban da la mot phan dac biet trong hanh trinh thanh xuan nay.",
  description:
    "Day la cot moc danh dau hanh trinh hoc tap va nhung ky niem dang nho.",
  dressCode: "Lich su, trang nhã",
  phone: "0900000000",
  rsvpUrl: "",
  notes: [
    "Vui long co mat truoc gio bat dau 15 phut.",
    "Trang phuc lich su, uu tien tong mau sang.",
    "Co the xac nhan tham du qua nut ben duoi."
  ],
  memories: [
    {
      title: "Danh hieu",
      description: "Hoan thanh chuong trinh hoc voi nhieu no luc dang nho."
    },
    {
      title: "Hoat dong",
      description: "Tham gia cau lac bo, workshop va cac du an trong thoi gian hoc."
    },
    {
      title: "Ngoai khoa",
      description: "Nhung chuyen di, su kien va khoanh khac cung ban be."
    }
  ]
};

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  try {
    await fs.access(guestsPath);
  } catch {
    await fs.writeFile(guestsPath, JSON.stringify([], null, 2));
  }
}

async function readConfig() {
  await ensureStorage();
  const raw = await fs.readFile(configPath, "utf8");
  return { ...defaultConfig, ...JSON.parse(raw) };
}

async function writeConfig(config) {
  await ensureStorage();
  const cleanConfig = { ...defaultConfig, ...config };
  await fs.writeFile(configPath, JSON.stringify(cleanConfig, null, 2));
  return cleanConfig;
}

async function readGuests() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(guestsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeGuests(guests) {
  await ensureStorage();
  await fs.writeFile(guestsPath, JSON.stringify(guests, null, 2));
  return guests;
}

function createGuestToken(guests) {
  const existingTokens = new Set(guests.map((guest) => guest.token));
  let token;
  do {
    token = randomBytes(16).toString("hex");
  } while (existingTokens.has(token));
  return token;
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDir, { maxAge: "7d" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", async (_req, res, next) => {
  try {
    res.json(await readConfig());
  } catch (error) {
    next(error);
  }
});

function requireAdmin(req, res, next) {
  if (!adminToken) {
    next();
    return;
  }
  if (req.header("x-admin-token") === adminToken) {
    next();
    return;
  }
  res.status(401).json({ message: "Invalid admin token" });
}

app.put("/api/config", requireAdmin, async (req, res, next) => {
  try {
    res.json(await writeConfig(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// ── Guest management ──────────────────────────────────────────────────────────

// Public: tra cứu thông tin khách theo token (không cần admin)
app.get("/api/guest/:token", async (req, res, next) => {
  try {
    const guests = await readGuests();
    const guest = guests.find((g) => g.token === req.params.token);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }
    // Chỉ trả về thông tin cần thiết cho trang mời
    res.json({ name: guest.name, relation: guest.relation });
  } catch (error) {
    next(error);
  }
});

// Admin: lấy danh sách khách
app.get("/api/guests", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readGuests());
  } catch (error) {
    next(error);
  }
});

// Admin: tạo khách mới
app.post("/api/guests", requireAdmin, async (req, res, next) => {
  try {
    const { name, relation } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời là bắt buộc" });
    }
    const guests = await readGuests();
    const token = createGuestToken(guests);
    const guest = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      name: name.trim(),
      relation: (relation || "Bạn").trim(),
      token,
      createdAt: new Date().toISOString()
    };
    guests.push(guest);
    await writeGuests(guests);
    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
});

// Admin: xóa khách
app.delete("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const guests = await readGuests();
    const filtered = guests.filter((g) => g.id !== req.params.id);
    if (filtered.length === guests.length) {
      return res.status(404).json({ message: "Guest not found" });
    }
    await writeGuests(filtered);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ── Static ────────────────────────────────────────────────────────────────────

app.get(["/admin", "/admin/*"], (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use(express.static(clientDist));

app.get("*", (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

await ensureStorage();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
