# ⚡ BlockWay Launcher v42.4.1 PRO — Pure Horizon Glass Unified Edition (`blockway-launcher`)

<p align="center">
  <img src="src/ui/app-banner.png" alt="BlockWay Launcher — Every World, One Place" width="100%" style="border-radius:14px;" />
</p>

<p align="center">
  <a href="https://buiduchuy2010qn-prog.github.io/blockway-launcher/"><img src="https://img.shields.io/badge/Official_Website-BlockWay_Launcher-0284c7?style=for-the-badge" alt="Website" /></a>
  <a href="https://github.com/buiduchuy2010qn-prog/blockway-launcher/releases/latest"><img src="https://img.shields.io/badge/Release-v42.4.1_PRO-6b4bff?style=for-the-badge" alt="Latest Release" /></a>
  <a href="https://github.com/buiduchuy2010qn-prog/blockway-launcher"><img src="https://img.shields.io/badge/Minecraft_1.7.10_to_26.3-8_Core_Loaders_+_Horizon_Rust-f97316?style=for-the-badge" alt="8 Core Loaders" /></a>
</p>

**BlockWay Launcher** (*Every World, One Place* — phát triển bởi **buiduchuy2010qn-prog**) là trình khởi chạy Minecraft đa nền tảng (**Windows & Linux**) hợp nhất cả **Electron Launcher (`src/`)** lẫn **Nhân mã nguồn Rust (`rust-engine/`)** trong **1 repo duy nhất (`buiduchuy2010qn-prog/blockway-launcher`)**, kết hợp đầy đủ **7 Mod Loader Java truyền thống** (`Vanilla`, `OptiFine`, `Fabric`, `Forge`, `NeoForge`, `Quilt`, `Legacy Fabric`) cùng nhân thứ 8 **🦀 Horizon Rust** (client & server viết bằng Rust chạy trên Vulkan / DirectX 12). Hỗ trợ **Tài khoản Microsoft** (kiểm tra quyền sở hữu Minecraft: Java Edition chính thức), **Tài khoản Cloud 24/7** và **Chế độ Offline** để chơi đơn / LAN.

🌐 **Trang chủ chính thức:** **[https://buiduchuy2010qn-prog.github.io/blockway-launcher/](https://buiduchuy2010qn-prog.github.io/blockway-launcher/)**

---

## ✨ Điểm mới trong `v42.4.1 PRO` (Instant `<1s` Rust Launch, Ultra-Light Rust HeapCompact & Full-Version Smooth v5)

- **⚡ Khởi chạy BlockWay Rust `<1s` (`v42.4.1 PRO`):**
  - Loại bỏ kiểm tra OTA chặn đồng bộ trên nút Play khi nhân `horizon-client.exe` và tài nguyên `26.3` đã sẵn sàng (`<1ms` warm fast-path).
  - Đọc trực tiếp metadata `blockway-rust-build.json` (`0ms`) và đệm đĩa `.launch-api-cache.json` thay cho gọi `execFileSync(horizon-client.exe --launch-api)` trên mỗi phiên mới.
  - Đệm dấu vân tay thư mục cho `portJavaJarsToHorizonRust` và `sanitizeCorruptedWorldgenDatapacks`, thu gọn dọn `.datafix` theo từng thế giới thay vì duyệt đệ quy 5 tầng, bỏ ghi lặp `options.txt`/`horizon-player.txt`/skin PNG, trì hoãn `EmptyWorkingSet` khỏi 6 giây đầu khởi tạo Vulkan/DX12 và chuyển trạng thái UI sang đang chơi trong `550ms`.

## ✨ Nền tảng `v42.4.0 PRO` (Ultra-Light Rust HeapCompact, Full-Version Smooth v5 `1.8.9` → `26.3` & 120Hz Launcher Hibernation)

0. **🚀 Ba Trụ Cột Siêu Nhẹ & Đa Phiên Bản (`v42.4.0 PRO Ultra-Light & Full-Version`):**
   - **🦀 Ultra-Light Rust Core (`horizon-threads` + `Cargo.toml`):** Bổ sung nén bộ nhớ đệm gốc Windows **`HeapCompact`** (`GetProcessHeaps`) thu hồi RAM của driver Vulkan/DX12/Win32, tinh chỉnh **`mimalloc` v3** trả trang vật lý tức thì về hệ điều hành (`PURGE_DECOMMITS=1`, `PAGE_FULL_RETAIN=0`, `PURGE_DELAY=0`, `ARENA_PURGE_MULT=1`), rút gọn stack luồng worker còn **`1 MiB`**, giải phóng bộ đệm nhàn rỗi sau **`3s`**, lược bỏ ký hiệu gỡ lỗi **`strip = "debuginfo"`** khi đóng gói release, đi kèm nhận diện **Windows Hybrid P-Core** & tắt **EcoQoS Power Throttling**.
   - **⚡ Full-Version Smooth v5 (`1.8.9` → `26.3`):** Tự động tối ưu chuẩn xác theo từng thế hệ Minecraft: bật **`useVbo:true` + `fboEnable:true`** cho bản cổ điển `1.8.9` / `1.12.2` (loại bỏ nghẽn OpenGL Display Lists), đặt **`menuBackgroundBlurriness:0`** trên `1.21`–`26.3` chống tụt FPS khi mở túi đồ/rương, tự cấu hình **`badoptimizations.txt`** cùng FerriteCore / Lithium / C2ME / MoreCulling & Rust `opaqueIce` / `lodDistance:16` (**hoàn tác nguyên bản 1-Click**), kết hợp giới hạn luồng **G1GC thông minh** cho CPU nhiều nhân + **`-XX:+AlwaysPreTouch`**, **Java 25 Compact Object Headers + Auto AppCDS (`.jsa`)** và **Windows DirectX dGPU Auto-Binding** (`GpuPreference=2;`).
   - **🖥️ 120Hz Ultra-Light Launcher (`src/main.js` + `horizon-glass.css`):** Loại bỏ hoàn toàn giật khung hình khi cuộn danh sách dài nhờ gỡ `backdrop-filter` lồng trên từng dòng thẻ và bật **`content-visibility: auto`**, kích hoạt **Chromium GPU Zero-Copy Rasterization** (`enable-gpu-rasterization`, `enable-zero-copy`) và tự động chuyển sang **Ngủ Đông 1 FPS (`setFrameRate(1)`)** khi thu nhỏ lúc đang chơi game.

1. **🌌 Hợp nhất Monorepo (`rust-engine/`), Theme Studio Kính Mờ & Ưu tiên Mod đã cài (`Pure Horizon Glass`):**
   - **Kho Mod tự động đưa gói đã cài lên đầu (`Installed-First Mod Store`):** Mọi Mod, Shader, Resource Pack và Modpack đã cài (`✓ Đã Cài`) luôn được xếp cố định ở đầu danh sách ở cả 8 Core Loaders (kể cả các gói ngoài Top 48 tìm kiếm và ngay khi vừa bấm tải cài đặt trực tiếp).
   - **Hợp nhất 100% vào repo gốc `buiduchuy2010qn-prog/blockway-launcher`:** Toàn bộ mã nguồn Nhân Rust đa phiên bản (`rust-engine/`), GitHub Actions CI (`build-rust-core.yml`, tag `rust-core`) và OTA của Launcher đều nằm chung trong 1 kho mã nguồn chính thức duy nhất.
   - **Giải nén nguyên bản & Tự phục hồi Datapack 26.3 (`Worldgen Guard`):** Phát hiện và giữ nguyên 100% cấu trúc `density_function` chuẩn Minecraft 26.3 (`left`/`right`/`input`) khi cài các Datapack thế giới lớn như *Terralith 26.3*, đồng thời tự động kiểm tra & khôi phục/cách ly Datapack lỗi trước khi vào Thế giới để chống văng game tuyệt đối.
   - **Điều hướng chính trên Thanh Kính Nổi phía trên (`Top Floating Bar`):** Toàn bộ các mục chính (`Trang chủ`, `Chơi game`, `Kho Mod`, `Modpack`, `Thế giới`, `Máy chủ`, `Skin 3D`, `Công cụ`), tìm kiếm nhanh (`Ctrl K`), Hồ sơ tài khoản Microsoft/Offline và Cài đặt nằm gọn gàng trên thanh nổi phía trên.
   - **Cột Kính Mờ bên trái chuyên biệt cho 8 Core Loaders (`Left 8-Core Rail`):** Giữ trọn **Logo chính thức của BlockWay** ở góc trái trên, bên dưới là danh sách chuyển nhanh 1 chạm cả **8 Core** (`BlockWay Rust`, `Fabric`, `Forge`, `NeoForge`, `OptiFine`, `Quilt`, `Legacy PvP`, `Vanilla`) kèm lối tắt `SMP & Co-op LAN` và thẻ trạng thái hệ thống không quảng cáo.
   - **Tinh giản triệt để ảnh nền dư thừa & Kho Mod chuẩn Horizon:** Bầu trời sao đêm dịu tĩnh kết hợp ánh hoàng hôn thấp ở chân trời; sân khấu Nhân vật 3D kính trong suốt (không chồng ảnh banner Minecraft); danh sách Thế giới gần đây và **Kho Mod** hiển thị dạng **hàng ngang kính mờ gọn sắc nét** đi kèm **Bảng Chi Tiết Cố Định (`Sticky Inspector`)** và **100% ảnh gốc từ CDN Modrinth**.

1. **🔒 Gia cố Bảo mật toàn diện (`P0 Security Hardening`):**
   - **Khóa nguồn gọi IPC (`assertTrustedIpcSender`):** Mọi kênh `ipcMain.handle` và `ipcMain.on` xác thực chặt `event.sender === mainWindow.webContents`, từ chối subframe và nguồn không phải `file://`.
   - **Kiểm tra đường dẫn & giải nén an toàn (`openDirectorySafely` + `extractZipSafely`):** Chặn đường dẫn mạng UNC (ngăn rò rỉ NTLM trên Windows), xác minh `isDirectory()` trước khi gọi `shell.openPath` để không bao giờ kích hoạt nhầm tệp thực thi, và chặn triệt để lỗ hổng `Zip-Slip` (`../`) khi giải nén.
   - **Mã hóa khóa tài khoản trên ổ cứng (`Electron safeStorage`):** Tự động mã hóa `accessToken` / `refreshToken` (Microsoft & Cloud) trong `aether-config-v5.json` và khóa API CurseForge thông qua cơ chế bảo mật gốc của hệ điều hành (Windows DPAPI / Linux Secret Service).
   - **Xác thực CSRF/State OAuth2 & Làm sạch `innerHTML`:** Bổ sung tham số `state` ngẫu nhiên 128-bit kiểm tra hằng thời gian (`crypto.timingSafeEqual`) cho luồng đăng nhập Microsoft loopback & cổng Web Cloud nội bộ; chuẩn hóa `escapeHtml` trên toàn bộ giao diện.
   - **Cập nhật OTA kiểm định SHA-256 chặt chẽ (`Fail-Closed`):** Đồng bộ bộ đọc bảng băm `ota-manifest.json` (bao gồm cả `package.json` và toàn bộ `src/**/*`), hủy cập nhật kèm cơ chế khôi phục nguyên tử (atomic rollback) nếu bất kỳ tệp nào lệch mã băm SHA-256.
2. **🦀 Nhân Horizon Rust & Kiểm định Mod trung thực 100% (`v41.7.x` → `v41.8.1`):**
   - Tích hợp trực tiếp kho gói **`.hmod`** và Shader WGSL **`.hshader`** chính thức của Horizon Rust (kiểm tra SHA-256), đi kèm **5 tiện ích Rust gốc** (*Minimap, Zoom, Tọa độ, Keystrokes, FPS*) và trình biên dịch `horizon-port-jar.exe` chuyển khối vuông, vật phẩm, công thức & Datapack sang gói chạy thật trên nhân Rust.
   - **Chặn 100% cài giả:** Mọi Mod từ Modrinth được kiểm định trước khi mở nút cài; các Mod thuần mã máy Java Mixin được phân loại rõ ràng và gợi ý chuyển sang Core `Fabric` thay vì cài nhầm vào nhân Rust.
3. **🎨 Tinh chỉnh Phân cấp Thị giác & Studio Giao diện (`P3 UI Polish`):**
   - Cân chỉnh lại độ tương phản và bề mặt nút phụ trên chủ đề **Sakura (Trắng Hồng)** để làm nổi bật rõ nút hành động chính **`▶ CHƠI NGAY`**, giảm nhiễu viền hồng đậm khi mở nhiều khu vực cùng lúc và bổ sung viền `:focus-visible` chuẩn trợ năng bàn phím.
   - Hỗ trợ **7 chủ đề màu** (*Lunar Dark, Mojang, Modrinth, Feather, Cherry, Prism Sáng, Sakura Hồng, Rust Obsidian*), tùy chọn màu nhấn, mật độ hiển thị (*Gọn / Chuẩn / Thoáng*), thanh bên thu gọn và độ bo góc.
4. **🧪 Quy trình Build tái lập & Kiểm thử tự động (`P4 Reproducible CI`):**
   - Bổ sung `package-lock.json`, chuyển GitHub Actions sang `npm ci` và chạy bộ kiểm thử tự động `npm test` (`node:test`) kiểm tra cú pháp toàn bộ mã nguồn, đối chiếu mã băm SHA-256 của `ota-manifest.json`, kiểm tra CSP/IPC/Zip-Slip và logic phân loại Mod Rust trước khi đóng gói `.exe` / `.AppImage` / `.deb`.

---

## 🧩 Tính năng cốt lõi

- **8 Core Mod Loaders (`1.7.10` → `26.3`):** `Vanilla`, `OptiFine` (hỗ trợ cả profile độc lập lẫn chế độ nạp Mod), `Fabric`, `Forge`, `NeoForge`, `Quilt`, `Legacy Fabric` và `Horizon Rust` (Vulkan / DirectX 12).
- **Kho Mod, Shader, Resource Pack & Modpack:** Tìm kiếm và cài đặt trực tiếp từ Modrinth & CurseForge, tự động tải thư viện phụ thuộc, quản lý từng hồ sơ Modpack độc lập (`instances/`), đóng gói `.mrpack` chia sẻ cho bạn bè.
- **Quản lý Thế giới, Hạt giống (Seed 16:9) & Cứu hộ NBT:** Tự động sao lưu thế giới sau mỗi phiên chơi, khôi phục 1 chạm, tạo nhanh thế giới từ kho hạt giống tuyển chọn và kiểm tra thông tin `level.dat`.
- **Trạm Server dòng lệnh (`nogui`) & Chơi chung LAN / `e4mc`:** Tự động phân tích dung lượng RAM & số luồng CPU để khuyến cáo cấu hình phù hợp trước khi mở máy chủ `server.jar` ở chế độ dòng lệnh không giao diện đồ họa, hoặc mở thế giới đơn qua mạng LAN / `e4mc`.
- **Tối ưu cấu hình thực tế & Khôi phục nguyên bản 1 chạm:** Tinh chỉnh có sao lưu các tệp cấu hình (`options.txt`, `optionsof.txt`, `sodium-options.json`, `modernfix-mixins.properties`, `entityculling.json`), tự động tắt `ofFastRender` khi phát hiện gói Shader đang bật để tránh lỗi đen hình, cho phép hoàn tác về trạng thái gốc bất kỳ lúc nào.

---

## 💻 Cài đặt & Phát triển từ mã nguồn

### Người dùng cuối
- **Windows (x64):** Tải bản cài đặt `BlockWay.Launcher-Setup-*.exe` hoặc bản chạy ngay `BlockWay.Launcher-Portable-*.exe` tại mục **[Releases](https://github.com/buiduchuy2010qn-prog/blockway-launcher/releases/latest)**.
- **Linux (x86_64):**
  - **AppImage** (Arch, Fedora, SteamOS): `chmod +x BlockWay.Launcher-Linux-*.AppImage` rồi khởi chạy (trên Ubuntu 22.04+ cần gói `libfuse2`).
  - **Debian / Ubuntu / Mint (`.deb`):** `sudo apt install ./BlockWay.Launcher-Linux-*.deb`.

### Nhà phát triển (Build & Kiểm thử cục bộ)
Yêu cầu **Node.js 20+** (khuyến nghị Node.js 22 LTS):

```bash
git clone https://github.com/buiduchuy2010qn-prog/blockway-launcher.git
cd blockway-launcher

# Cài đặt phụ thuộc chuẩn xác theo lockfile
npm ci

# Chạy bộ kiểm thử cú pháp, bảo mật & toàn vẹn SHA-256
npm test

# Khởi chạy ở chế độ phát triển
npm start

# Đóng gói bộ cài Windows hoặc Linux
npm run dist:win
npm run dist:linux
```

---

## 🛡️ Kiến trúc Bảo mật

| Thành phần | Cơ chế bảo vệ |
| :--- | :--- |
| **Electron Process Isolation** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, chặn cấp quyền thiết bị ngoài ý muốn (`setPermissionRequestHandler`). |
| **Content Security Policy** | Giới hạn `default-src 'self'`, `object-src 'none'`, không sử dụng `'unsafe-eval'`. |
| **IPC & Hệ thống tệp** | Cầu nối tường minh qua `src/preload.js`, xác thực `mainWindow.webContents` ở mọi IPC, chặn đường dẫn UNC, kiểm tra `isDirectory()` và chống `Zip-Slip`. |
| **Lưu trữ thông tin đăng nhập** | Mã hóa token bằng `Electron safeStorage` (DPAPI / Keyring) với quyền tệp `0600`; tự ẩn thông tin nhạy cảm (`<hidden>`, `<ip>`, `<user>`) khi chia sẻ log lỗi lên `mclo.gs`. |
| **Cập nhật OTA** | Đối chiếu mã băm SHA-256 bắt buộc từ `ota-manifest.json` cho từng tệp và tự động hoàn tác (rollback) nếu quá trình ghi gặp sự cố. |

---

## 📄 Giấy phép & Bản quyền Mã nguồn mở (License & Attribution)

- **BlockWay Launcher (`src/`):** Phát hành theo giấy phép **[MIT License](LICENSE)** — `Copyright (c) 2026 Bùi Đức Huy (@buiduchuy2010qn-prog)`.
- **Nhân Rust tích hợp (`rust-engine/`):** Phát triển mở rộng dựa trên dự án mã nguồn mở **[horizon-rust/horizon](https://github.com/horizon-rust/horizon)** (`Copyright (c) 2026 Ludovic Marie and the Horizon contributors`, **[MIT License](rust-engine/LICENSE)**). Đầy đủ thông báo bản quyền upstream và thư viện bên thứ ba được ghi nhận minh bạch tại **[NOTICE.md](NOTICE.md)** và **[rust-engine/THIRD_PARTY_NOTICES.md](rust-engine/THIRD_PARTY_NOTICES.md)**.
- **Tuyên bố Nhãn hiệu Mojang / Microsoft:**
  > **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**
  > Minecraft là nhãn hiệu đã đăng ký của Mojang Synergies AB / Microsoft Corporation. Kho mã nguồn này không chứa bất kỳ tệp tài nguyên hay mã nguồn độc quyền nào của Mojang.
