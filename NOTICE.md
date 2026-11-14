# 📜 Open-Source License & Attribution Notice (`blockway-launcher`)

## 1. BlockWay Launcher Core & Pure Horizon Glass UI (`src/`)
* **Copyright:** `Copyright (c) 2026 Bùi Đức Huy (@buiduchuy2010qn-prog) and BlockWay Launcher Contributors`
* **License:** **[MIT License](LICENSE)**

## 2. Bundled Native Rust Engine (`rust-engine/`) — Upstream Attribution
The integrated Rust game client, server, and toolset under [`rust-engine/`](rust-engine/) are derived from the open-source **Horizon** project:
* **Upstream Project:** **[horizon-rust/horizon](https://github.com/horizon-rust/horizon)** (*Minecraft: Java Edition rewritten in Rust*)
* **Upstream Copyright:** `Copyright (c) 2026 Ludovic Marie and the Horizon contributors`
* **Upstream License:** **[MIT License](rust-engine/LICENSE)**
* **Multi-Version (`1.16.5–26.3`) & Ultra-Light (`HeapCompact` / `P-Core`) Modifications:** `Copyright (c) 2026 Bùi Đức Huy (@buiduchuy2010qn-prog)` — licensed under **[MIT License](LICENSE)**. These modifications are maintained independently and are not endorsed by or affiliated with the upstream Horizon team.
* **Third-Party Rust Crates, Fonts, Icons & Redistributables:** Preserved in full in **[rust-engine/THIRD_PARTY_NOTICES.md](rust-engine/THIRD_PARTY_NOTICES.md)** (including `wgpu-hal` & `naga` MIT/Apache-2.0, `mimalloc` v3 MIT, `Pixelify Sans` SIL OFL 1.1, `Pixelarticons` MIT, `Hugeicons` MIT, `Catnip / Ponder` MIT, and Microsoft DirectX Shader Compiler `dxcompiler.dll` redistributable terms on Windows x64).

## 3. External Ecosystem APIs & Mod Loaders
BlockWay Launcher interacts with official public APIs and user-selected runtimes while respecting each project's license and terms of service:
* **Modrinth API (`api.modrinth.com`)** & **CurseForge API** — mods, shaders, resource packs, and modpacks remain the property of their respective authors.
* **Fabric, Quilt, Legacy Fabric, Forge, NeoForge, OptiFine** — downloaded directly from their official distribution endpoints on user demand.
* **Eclipse Temurin / OpenJDK** — licensed under **GPL-2.0 with Classpath Exception** (executed as a separate JVM process).

## 4. Trademark & Non-Affiliation Disclaimer (Mojang / Microsoft)
> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**
> - **Minecraft** is a registered trademark of **Mojang Synergies AB / Microsoft Corporation**.
> - BlockWay Launcher distributes **zero** proprietary Mojang game JARs, decompiled code, or copyrighted assets. Official game files are downloaded directly from Mojang's servers on the user's machine in accordance with the [Minecraft EULA](https://www.minecraft.net/en-us/eula).
