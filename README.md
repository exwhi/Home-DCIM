Home-DCIM: 家庭机柜管理系统
项目概述
Home-DCIM 是一个轻量级、用户友好的家庭机柜设备管理系统，采用类似数据中心资产管理（DCIM）的布局，提供基于 Web 的界面，用于管理和查看家中机柜中的固定设备，注重简单易用。
功能特性

设备管理：添加、编辑和删除设备，包含名称、位置、描述等信息。
搜索与过滤：通过名称或位置快速查找设备。
响应式界面：支持桌面端和移动端访问，包含侧边栏导航、网格视图和详情面板。
本地数据库：使用 lowdb（JSON 文件）进行轻量级数据存储，默认保存在 homedcim.json。
数据导入/导出：支持导出设备数据为 JSON 文件，或从 JSON 文件导入数据。
简单部署：依赖少，部署简便。

技术栈

前端：HTML、CSS、JavaScript（原生 JS）
后端：Node.js、Express
数据库：lowdb（JSON 文件存储）
API：RESTful 接口，用于增删改查操作

安装指南
前置条件

Node.js（v16 或更高版本）
Git

安装步骤

克隆仓库：git clone https://github.com/exwhi/home-dcim.git


进入项目目录：cd home-dcim


安装依赖：npm install


启动服务器（默认端口 3001，若需使用 3000，请确保端口空闲）：PORT=3001 npm start


打开浏览器，访问 http://localhost:3001。

使用方法

通过 Web 界面管理机柜设备：
侧边栏导航：包含 Dashboard、Cabinets 和 Devices 页面。
网格视图：显示设备列表，点击查看或编辑。
详情面板：展示选中设备的详细信息并提供编辑表单。


数据备份：直接复制 homedcim.json 文件即可备份数据。
导入/导出：
点击网页顶部“导出 JSON”按钮，下载设备数据为 hcm-cabinets.json。
使用“导入 JSON”按钮上传包含设备数组（每项含 name, location, description）的 JSON 文件，系统会逐条创建记录。



项目结构
home-dcim/
├── public/              # 静态文件（HTML、CSS、JS）
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── homedicim.json       # lowdb 数据文件
├── package.json         # Node.js 依赖和脚本
├── package-lock.json    # NPM 锁定文件
├── server.js            # 主服务器文件
└── README.md            # 本文件

API 接口

GET /api/cabinets - 获取所有设备
GET /api/cabinets/:id - 获取单个设备
POST /api/cabinets - 创建新设备（body: {name, location, description}）
PUT /api/cabinets/:id - 更新设备
DELETE /api/cabinets/:id - 删除设备

注意事项

数据默认保存在项目根目录的 homedcim.json 文件中。
当前使用 lowdb 避免复杂的数据库配置。若需切换到 SQLite，需安装 Visual Studio Build Tools 并更新依赖。请联系维护者获取迁移步骤。

贡献指南
欢迎贡献代码！请按照以下步骤操作：

Fork 本仓库。
创建新分支（git checkout -b feature-name）。
提交更改（git commit -m '添加功能'）。
推送到分支（git push origin feature-name）。
提交 Pull Request。

许可证
本项目采用 MIT 许可证，详情请见 LICENSE 文件。
联系方式
如有问题或建议，请提交 Issue 或联系维护者：[raxzy785@gmail.com]。
