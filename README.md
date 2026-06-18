# Thu moi tot nghiep

Website thu moi tot nghiep mobile-first, gom:

- Trang ngoai cho nguoi duoc moi: `/`
- Trang quan tri cau hinh noi dung va anh: `/admin`
- Backend Node/Express luu cau hinh vao JSON va serve anh upload tu `/uploads`
- Dong ho dem nguoc theo ngay/gio to chuc
- Nhieu anh cua nguoi tot nghiep, hien thi bang carousel ngang co auto-slide va ho tro vuot tren mobile
- Anh chinh co the upload nhieu anh de hien thi trong khung hero collage
- Section loi nhan gui rieng co the cau hinh tu admin
- Cau hinh luu y va ky niem dang nho nhu danh hieu, hoat dong, ngoai khoa

## Chay local

```bash
npm install
npm run build
npm start
```

Mo `http://localhost:4000`.

Khi phat trien giao dien:

```bash
npm run dev
```

Frontend chay o `http://localhost:5173`, backend chay o `http://localhost:4000`.

## Deploy Render

Repo da san sang deploy len Render bang `render.yaml`.

### Cach 1: Dung Blueprint

1. Push code len GitHub.
2. Vao Render Dashboard.
3. Chon `New` -> `Blueprint`.
4. Chon repo nay.
5. Render se doc file `render.yaml` va tao web service.
6. Nhap gia tri cho secret `ADMIN_TOKEN`.
7. Deploy.

`render.yaml` dang cau hinh:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/api/health`
- Disk mount path: `/var/data`
- `DATA_DIR=/var/data`
- `UPLOAD_DIR=/var/data/uploads`
- `ADMIN_TOKEN` la secret, khong commit vao repo

### Cach 2: Tao Web Service thu cong

Neu khong dung Blueprint, tao `New` -> `Web Service` va nhap:

```bash
Build Command: npm install && npm run build
Start Command: npm start
Health Check Path: /api/health
```

Them Environment Variables:

```bash
NODE_VERSION=20
DATA_DIR=/var/data
UPLOAD_DIR=/var/data/uploads
ADMIN_TOKEN=mot-chuoi-bi-mat
```

Them Persistent Disk:

```bash
Mount Path: /var/data
Size: 1GB
```

Cach nay giup anh upload va file cau hinh khong mat khi service restart/deploy. Theo tai lieu Render, chi du lieu ghi trong disk mount path moi duoc giu lai; filesystem con lai la tam thoi: https://render.com/docs/disks

Sau do vao `/admin`, nhap token nay vao o `Admin token` de upload anh va luu cau hinh.

## Cau hinh trong admin

Trong `/admin` co the sua:

- Ten nguoi tot nghiep, nganh hoc, truong
- Thoi gian, dia diem, link Google Maps
- Anh chinh va thu vien anh
- Loi moi, loi nhan, mo ta them
- Loi nhan gui rieng
- Luu y cho khach moi
- Ky niem dang nho gom tieu de va mo ta

Trang ngoai khong hien nut/icon quan tri. Muon vao admin thi truy cap truc tiep URL `/admin`.

## Ghi chu Figma

Phien nay chua lay duoc frame tu Figma qua plugin UIPro, nen giao dien da duoc dung mobile-first theo yeu cau san pham. Neu muon map sat 100% voi thiet ke, hay mo Figma plugin UIPro, generate code/screenshot cho frame mobile, roi chay lai yeu cau import.
