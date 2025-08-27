# 德州扑克线上游戏 🎰

基于Node.js和Socket.io开发的局域网多人德州扑克游戏，支持跨平台浏览器对战。

## 🎮 游戏特性

### 核心功能
- ✅ **完整德州扑克规则** - 严格按照标准德州扑克规则实现
- ✅ **局域网多人对战** - 支持2-8人同桌游戏，基于WebSocket实时通信
- ✅ **跨平台兼容** - 完全基于浏览器，支持PC和移动设备
- ✅ **响应式界面** - 智能适配不同屏幕尺寸和设备类型

### 游戏功能
- 🎯 **状态机驱动** - 完整的游戏流程控制（翻牌前→翻牌圈→转牌圈→河牌圈→摊牌）
- 🎲 **智能牌型判断** - 自动识别和比较所有牌型（皇家同花顺到高牌）
- 💰 **筹码管理** - 支持下注、跟注、加注、弃牌等所有操作
- 👥 **玩家管理** - 庄家位置轮换、盲注系统、全押检测

### 社交功能
- 💬 **实时聊天** - 支持文字聊天和预设快捷文案
- 📊 **数据统计** - 详细记录每位玩家的胜率、盈亏、游戏局数
- 📜 **操作历史** - 实时显示所有玩家的操作记录
- 🎯 **游戏回放** - 记录完整的游戏事件用于复盘分析

### 界面体验
- 🎨 **精美界面** - 专业扑克桌设计，沉浸式游戏体验
- 📱 **移动优化** - 针对手机屏幕优化的触控操作
- 🌙 **视觉效果** - 渐变背景、动画效果、状态提示
- ⚡ **性能优化** - 轻量级架构，低延迟通信

## 🚀 快速开始

### 系统要求
- Node.js 14.0+ 
- 现代浏览器 (Chrome, Firefox, Safari, Edge)
- Docker (可选，推荐用于生产部署)

### 本地开发

1. **克隆或下载项目文件**
2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   npm start
   ```

4. **访问游戏**
   - 打开浏览器访问：`http://localhost:3000`
   - 或在局域网其他设备访问：`http://[服务器IP]:3000`

### 开发模式
```bash
npm run dev  # 使用nodemon自动重载
```

### 🐳 Docker部署

#### 快速启动
```bash
# 使用Docker Compose
docker-compose up -d

# 或直接运行Docker
docker build -t texas-holdem-game .
docker run -p 3000:3000 texas-holdem-game
```

#### 从DockerHub拉取（推送后可用）
```bash
docker pull [your-dockerhub-username]/texas-holdem-game:latest
docker run -p 3000:3000 [your-dockerhub-username]/texas-holdem-game:latest
```

#### 多平台支持
此项目支持以下架构：
- `linux/amd64` (x86_64)
- `linux/arm64` (Apple Silicon, ARM服务器)

Docker会自动选择适合您平台的镜像。

## 🎯 游戏玩法

### 加入游戏
1. 输入玩家昵称
2. 输入房间号（留空自动生成）
3. 点击"加入游戏"

### 游戏操作
- **弃牌 (Fold)** - 放弃当前手牌
- **过牌 (Check)** - 不下注但继续游戏
- **跟注 (Call)** - 跟上当前最高下注
- **加注 (Raise)** - 提高下注金额

### 快捷聊天
游戏内置多种快捷文案：
- ⏰ "快点！等到花儿也谢了~"  
- 👍 "这把牌不错啊"
- 🤔 "我觉得你在诈唬"
- 🔥 "好牌！"

## 🛠️ 技术架构

### 后端技术栈
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **Socket.io** - WebSocket实时通信
- **UUID** - 唯一标识符生成

### 前端技术栈  
- **原生JavaScript** - 核心游戏逻辑
- **HTML5/CSS3** - 界面布局和样式
- **Socket.io Client** - 实时通信
- **响应式设计** - 跨设备兼容

### 核心特性
- **混合通信架构** - WebSocket + HTTP的高效通信模式
- **状态机设计** - 严格的游戏流程控制
- **事件驱动** - 基于事件的实时游戏更新
- **数据持久化** - 游戏记录和玩家统计

## 📊 游戏数据

### 玩家统计
- 游戏局数
- 胜利次数  
- 胜率百分比
- 总盈利金额

### 牌型识别
游戏支持所有标准德州扑克牌型：
1. 皇家同花顺 (Royal Flush)
2. 同花顺 (Straight Flush) 
3. 四条 (Four of a Kind)
4. 葫芦 (Full House)
5. 同花 (Flush)
6. 顺子 (Straight)
7. 三条 (Three of a Kind)
8. 两对 (Two Pair)
9. 一对 (One Pair)
10. 高牌 (High Card)

## 🔧 部署指南

### 本地部署
适合家庭/办公室局域网使用：

```bash
# 1. 准备服务器（任意一台电脑）
git clone [项目地址]
cd texas-holdem-game
npm install

# 2. 启动服务
npm start

# 3. 查看本机IP
# Windows: ipconfig
# macOS/Linux: ifconfig

# 4. 其他设备访问
# http://[服务器IP]:3000
```

### Docker生产部署
推荐用于生产环境：

```bash
# 克隆项目
git clone [your-repo-url]
cd texas-holdem-game

# 使用Docker Compose部署
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 云服务部署
适合远程朋友一起游戏：

```bash
# 支持各大云平台
# - Heroku
# - 腾讯云
# - 阿里云  
# - AWS

# 环境变量配置
export PORT=3000
```

### 🚀 GitHub自动部署到DockerHub

本项目配置了GitHub Actions自动构建和推送Docker镜像：

#### 设置GitHub Secrets
在GitHub仓库设置中添加以下Secrets：
- `DOCKERHUB_USERNAME`: DockerHub用户名
- `DOCKERHUB_TOKEN`: DockerHub访问令牌

#### 自动触发条件
- 推送到`main`或`master`分支
- 创建版本标签（如`v1.0.0`）
- Pull Request

#### 生成的镜像标签
- `latest`: 最新main分支构建
- `<branch-name>`: 分支名称
- `<version>`: 版本标签（如v1.0.0）

#### 多架构支持
自动构建适用于以下平台的镜像：
- `linux/amd64` (Intel/AMD 64位)
- `linux/arm64` (ARM 64位，如Apple Silicon)

## 📱 移动设备支持

### 响应式设计
- **自动布局调整** - 根据屏幕尺寸智能排版
- **触控优化** - 专门设计的移动端操作按钮
- **手势支持** - 支持触摸、滑动等手势操作
- **字体缩放** - 自动调整文字大小确保可读性

### 设备兼容
- ✅ iPhone/iPad (Safari)
- ✅ Android手机/平板 (Chrome)  
- ✅ Windows PC (Chrome/Edge)
- ✅ macOS (Safari/Chrome)

## 🔒 安全特性

### 游戏公平性
- **服务器权威** - 所有游戏逻辑在服务器执行
- **防作弊设计** - 客户端无法修改游戏状态
- **随机洗牌** - 使用安全的随机数生成器
- **状态同步** - 严格的游戏状态验证

### 网络安全
- **输入过滤** - 防止XSS和注入攻击
- **连接管理** - 自动处理断线重连
- **房间隔离** - 不同游戏房间数据完全隔离

## 🎨 界面预览

### PC端界面
- 专业扑克桌设计
- 环形玩家位置布局
- 清晰的牌面显示
- 直观的操作面板

### 移动端界面  
- 紧凑的垂直布局
- 大尺寸触控按钮
- 滑动操作支持
- 简化的信息显示

## 🤝 开发团队建议

根据需求文档建议的团队配置：

### 技术岗位
- **后端工程师** (1-2名) - Node.js、游戏逻辑、数据库
- **前端工程师** (1-2名) - JavaScript、响应式UI、用户体验  
- **UI/UX设计师** (1名) - 界面设计、交互流程
- **美术设计师** (1名) - 卡牌、筹码、背景等素材

### 开发工具
- **版本控制** - Git
- **项目管理** - GitHub/GitLab
- **设计工具** - Figma/Photoshop
- **测试工具** - 浏览器开发者工具

## 📈 后续扩展

### 计划功能
- 🤖 **AI对手** - 添加电脑玩家用于练习
- 📊 **高级统计** - 更详细的游戏分析报告  
- 🎮 **锦标赛模式** - 多桌淘汰赛
- 🏆 **成就系统** - 游戏成就和徽章
- 💎 **自定义主题** - 多种界面主题选择

### 技术优化
- **数据库持久化** - 长期数据存储
- **集群部署** - 支持更多并发用户
- **WebRTC集成** - 点对点通信优化
- **PWA支持** - 渐进式Web应用

---

**🎉 现在就开始你的德州扑克之旅吧！**

访问 `http://localhost:3000` 创建房间，邀请朋友加入，享受专业的线上德州扑克体验！