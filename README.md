# HomeDCIM - 家庭机柜管理系统（DCIM 风格）

这是一个轻量的家庭机柜（Cabinet）管理示例应用，后端使用 Node.js + Express，数据存储使用 lowdb（JSON 文件），前端为原生 HTML/JS，UI 采用类似 DCIM（数据中心资产管理）的布局：侧边栏导航、网格式机柜视图与右侧详情面板。

快速开始

1. 安装依赖

```powershell
cd C:\Users\evaha\Desktop\HomeDCIM
npm.cmd install
```

2. 启动

（示例使用 3001 端口，若需要改回 3000，请先确保端口空闲）

```powershell
npm start
```

打开浏览器并访问：http://localhost:3001

注意
- 数据默认保存在项目根目录的 `hcm.json`（lowdb）。
- 本仓库初始使用 lowdb 以避免在没有 Windows C++ 构建工具的环境下编译 sqlite3。若你需要切回 SQLite，请让我帮你执行迁移步骤（安装 Visual Studio Build Tools 并切换依赖）。

API 接口

- GET /api/cabinets  — 列表
- GET /api/cabinets/:id  — 单项
- POST /api/cabinets  — 创建 (body: {name, location, description})
- PUT /api/cabinets/:id  — 更新
- DELETE /api/cabinets/:id  — 删除

前端说明

- 左侧为导航（Dashboard / Cabinets / Inventory），中间为机柜网格视图，右侧为当前选择机柜的详情与编辑表单。
- 数据备份：可直接复制 `hcm.json` 文件作为备份。

导入 / 导出

- 在网页顶部有“导出 JSON”按钮，会下载当前机柜列表为 `hcm-cabinets.json`。
- “导入 JSON”按钮接受包含机柜数组的 JSON 文件（每项含 name, location, description），导入时会逐条 POST 到后端创建记录。

## 文件目录树

```
Home-dcim
├── COMPLETION_CHECKLIST.md
├── COMPLETION_REPORT_PAGE_UNIFICATION.md
├── COMPLETION_SUMMARY.md
├── db.js
├── FINAL_PROJECT_SUMMARY.md
├── hcm.json.bak
├── HEADER_UNIFICATION_COMPLETE.md
├── HOME_DCIM_FEATURES.md
├── homedcim.json
├── NEW_FEATURES_SUMMARY.md
├── package.json
├── PAGE_HEADER_UNIFICATION_FINAL.md
├── PAGE_STRUCTURE_GUIDE.md
├── PROJECT_COMPLETE.md
├── QUICK_START.md
├── README.md
├── server.js
├── SSH_VNC_GUIDE.md
├── test-ssh-vnc.js
├── verify-pages.js
└── public/
    ├── analytics.html
    ├── app.js
    ├── HEADER_TEMPLATE.html
    ├── index.html
    ├── management.html
    ├── ssh.html
    ├── ssh.js
    ├── styles.css
    ├── vnc.html
```

## 设计目的

HomeDCIM 的设计目的是为家庭用户提供一个轻量级的机柜管理工具，模仿数据中心基础设施管理（DCIM）的布局和功能。通过该工具，用户可以：

1. **可视化管理机柜**：通过网格视图直观查看机柜布局和设备分布。
2. **高效管理设备**：支持设备的增删改查操作，方便用户维护设备信息。
3. **数据备份与恢复**：通过 JSON 文件导入导出功能，确保数据安全。
4. **轻量化部署**：无需复杂的数据库配置，开箱即用，适合家庭或小型办公室场景。

该项目的目标是提供一个简单易用的工具，帮助用户更好地管理家庭或小型机房的 IT 设备。


## 许可证

本项目使用 MIT 许可证（详见仓库根目录的 `LICENSE` 文件）。

简要说明：MIT 许可证允许以非常宽松的方式使用、复制、修改和分发本软件。请在再发布或分发本软件的任何副本或重要部分时保留 `LICENSE` 中的著作权声明与许可条款。

