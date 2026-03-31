# SVExpress Automation — Giai đoạn 1

## Tổng quan
Viết lại toàn bộ repo `svexpress-automation` với kiến trúc modular, 2 chế độ chạy (fast/full) trên GitHub Actions.

## Kiến trúc

```
svexpress-automation/
├── .github/workflows/sync.yml
├── scripts/
│   ├── fast-mode.js
│   ├── full-mode.js
│   ├── lib/
│   │   ├── svexpress-auth.js
│   │   ├── svexpress-export.js
│   │   ├── phone-fetcher.js
│   │   ├── excel-merger.js
│   │   └── oms-uploader.js
│   └── output/
├── package.json
├── .gitignore
└── README.md
```

## Modules

### svexpress-auth.js
- `login(phone, hashPassword)` → `{ accessToken, refreshToken }`
- POST `https://api.svexpress.vn/v1/auth/login`

### svexpress-export.js
- `exportExcel(accessToken, { dateRange, outputDir })` → `filePath`
- Playwright headless: set localStorage token → navigate → export
- dateRange: `'30days'` (fast) hoặc `'today'` (full)
- Nếu `'today'`: đổi date inputs → click "Lọc danh sách"
- Click "Xuất Excel" → waitForEvent('download')

### phone-fetcher.js
- `fetchPhones(accessToken, orderCodes)` → `Map<string, string>`
- GET `/v1/order/phone-by-code/{MĐH}`, batch 5, delay 2s
- Dừng ngay nếu 429/403

### excel-merger.js
- `mergePhones(excelPath, phoneMap, outputDir)` → `{ outputPath, stats }`
- Exact match cột "Mã Yêu Cầu" và "Số Điện Thoại"
- Chỉ thay SĐT bị ẩn (chứa * hoặc x) hoặc trống

### oms-uploader.js
- `uploadToOMS(filePath)` → placeholder, log TODO

## Chế độ Fast (8 lần/ngày, tài khoản A)
Login API → Playwright export (30 ngày, không đổi filter) → artifact

## Chế độ Full (22h VN, tài khoản B)
Login API → Playwright export (1 ngày, đổi date + "Lọc danh sách") → đọc MĐH từ cột F → API lấy SĐT → merge vào cột AJ → artifact

## Workflow
- 9 cron triggers (8 fast + 1 full 15:00 UTC)
- workflow_dispatch với input mode
- Detect mode: dispatch input hoặc UTC hour
- Timeout: 30 phút fast, 45 phút full
