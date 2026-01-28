# 🚀 HomeDCIM 快速启动指南

## 一、本地运行

### 第一步：启动服务器
```bash
cd Home-dcim
npm install  # 首次运行需要安装依赖
node server.js
# 或开发模式（自动重启）
npm run dev
```

**预期输出：**
```
DB initialized: cabinets=2, devices=3
Server listening on http://localhost:3001 (PID 12345)
```

### 第二步：打开浏览器

| 页面 | 地址 | 说明 |
|------|------|------|
| 仪表盘 | http://localhost:3001 | 机柜和设备管理 |
| SSH 终端 | http://localhost:3001/ssh.html | 浏览器 SSH 客户端 |
| VNC 远程 | http://localhost:3001/vnc.html | 浏览器 VNC 客户端 |

---

## 二、功能演示

### 2.1 机柜和设备管理
1. 打开 http://localhost:3001
2. 左侧看到机柜列表，右上角可以新建机柜或导入数据
3. 点击任意机柜查看详情和 42U 机架视图
4. 可拖放设备改变位置（会自动保存）

### 2.2 SSH 终端
1. 打开 http://localhost:3001/ssh.html
2. 输入要连接的 SSH 服务器信息（可以是局域网内的 Linux 服务器）
3. 点击"连接"按钮
4. 连接成功后可输入任何 shell 命令

**示例：**
```
主机: 192.168.1.100
端口: 22
用户: root
密码: your-password
```

### 2.3 VNC 远程
1. **前置条件**：主机需要安装 websockify
   ```bash
   # Windows (WSL) / Linux / macOS
   pip install websockify
   # 或
   apt-get install websockify  # Linux
   brew install websockify      # macOS
   ```

2. 打开 http://localhost:3001/vnc.html
3. 输入要连接的 VNC 服务器信息
4. 点击"启动 WebSocket 代理"
5. 点击"连接 VNC"
6. 连接成功后可见远程桌面

---

## 三、快速测试

### 运行测试脚本
```bash
node test-ssh-vnc.js
```

这将验证：
- SSH 页面是否正常加载
- VNC 页面是否正常加载
- API 是否响应

---

## 四、目录结构一览

```
Home-dcim/
├── server.js              # 主服务器（包含 SSH/VNC 代理）
├── db.js                  # 数据库初始化
├── package.json           # 项目配置
├── homedcim.json          # 数据文件
│
├── SSH_VNC_GUIDE.md       # 详细使用指南 ⭐
├── COMPLETION_SUMMARY.md  # 完成情况总结
├── QUICK_START.md         # 本文件
│
├── public/
│   ├── index.html         # 仪表盘主页
│   ├── ssh.html           # SSH 终端 ⭐
│   ├── vnc.html           # VNC 远程 ⭐
│   ├── app.js             # 前端逻辑
│   └── styles.css         # 统一样式
│
└── test-ssh-vnc.js        # 功能测试脚本
```

---

## 五、主要功能特性

### ✅ 机柜管理
- 创建、编辑、删除机柜
- 设备位置管理（42U 机架）
- 支持多 U 高度设备
- 拖放排列位置

### ✅ 网络监控
- SNMP 设备检测
- 实时在线/离线状态
- 批量检测功能
- 网络摘要显示

### ✅ SSH 远程访问
- 浏览器内完整的 SSH 终端
- 支持所有 shell 命令
- xterm.js 终端仿真
- 连接状态实时显示

### ✅ VNC 远程桌面
- 基于 WebSocket 的 VNC 客户端
- noVNC 库提供支持
- 鼠标键盘交互
- websockify 代理集成

### ✅ 审计日志
- 记录所有操作
- 可查询历史记录
- 包含操作者信息
- API 端点可用

### ✅ 统一 UI
- 现代化设计
- 响应式布局
- 一致的样式和交互
- 深色/浅色适配

---

## 六、常见问题

### Q: 服务器启动失败（端口被占用）
**A:** 改用其他端口：
```javascript
// 在 server.js 中修改
const PORT = 3002; // 改成其他端口
```

### Q: SSH 连接超时
**A:** 
1. 检查目标服务器是否在线
2. 检查防火墙规则
3. 确认 SSH 端口号正确

### Q: VNC 代理启动失败
**A:** 需要先安装 websockify
```bash
pip install websockify
```

### Q: 数据丢失
**A:** 数据保存在 `homedcim.json` 文件中，检查文件是否存在和可读

---

## 七、性能和限制

| 项目 | 性能 | 说明 |
|------|------|------|
| 并发连接 | 10-50 | 取决于系统资源 |
| 设备数量 | 无限 | JSON 文件大小限制 |
| 用户数量 | 1 | 当前无多用户支持 |
| 数据库 | JSON 文件 | 轻量级，适合小规模 |
| 网络延迟 | 实时 | WebSocket 低延迟 |

---

## 八、部署建议

### 开发环境
```bash
npm run dev  # 使用 nodemon 自动重启
```

### 生产环境
```bash
# 使用 PM2 进程管理
npm install -g pm2
pm2 start server.js --name "homedcim"
pm2 save
pm2 startup
```

### Docker 部署（可选）
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## 九、下一步

1. **阅读详细文档**：[SSH_VNC_GUIDE.md](SSH_VNC_GUIDE.md)
2. **了解完成情况**：[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)
3. **查看原始 README**：[README.md](README.md)
4. **生产部署**：参考部署建议配置 HTTPS/WSS

---

## 十、获取帮助

### 本地测试失败
```bash
# 1. 检查服务器日志
node server.js

# 2. 运行测试脚本
node test-ssh-vnc.js

# 3. 检查浏览器控制台（F12）
```

### 查看 API 文档
- SSH WebSocket: `/ssh?host=<host>&port=<port>`
- 启动 websockify: `POST /api/start-websockify`
- 审计日志: `GET /api/audits`

---

**祝你使用愉快！🎉**

更新时间: 2025-12-03  
版本: v0.1-complete
