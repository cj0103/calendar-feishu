# 桌面日历 - Desktop Calendar

一款基于 Electron 的桌面日历应用，支持日程管理、飞书日历同步和中国法定节假日显示。

## ✨ 功能特性

### 📅 日历基础功能
- **桌面常驻显示**：日历窗口常驻桌面，像壁纸一样显示
- **日程管理**：支持日程的增删改查，双击日期快速添加
- **窗口透明度调节**：0-100% 可调，仅影响背景色，文字保持清晰
- **鼠标穿透功能**：开启后鼠标可以穿透日历窗口操作桌面
- **窗口位置记忆**：自动保存和恢复窗口位置、大小
- **自定义颜色**：可设置工作日、周末、其他月的背景色

### 🔄 飞书日历同步
- **双向同步**：本地日程与飞书日历双向同步
- **增量同步**：使用 sync_token 实现增量同步，提高效率
- **自动同步**：可配置自动同步策略
- **冲突解决**：基于最后同步时间的冲突解决机制

### 🏮 节假日功能
- **中国法定节假日**：自动显示国家法定节假日
- **调休工作日**：清晰标记需要补班的调休日
- **数据更新**：每年手动更新一次节假日数据
- **醒目显示**：节假日显示"休"字，调休日显示"班"字

## 🛠️ 技术栈

- **框架**：Electron 28 + React 18 + TypeScript
- **构建工具**：Vite 5 + electron-vite
- **UI 库**：Tailwind CSS
- **API 集成**：飞书开放平台 Calendar API v4

## 📦 安装

### 环境要求
- Node.js >= 18.x
- Windows 10/11

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd calendar-feishu
```

2. **安装依赖**
```bash
npm install
```

3. **配置飞书应用**（如需要飞书同步功能）
   - 复制 `src/main/feishuConfig.example.ts` 为 `src/main/feishuConfig.ts`
   - 填写你的飞书应用 App ID 和 App Secret
   - 填写你的日历 ID

4. **启动应用**
```bash
npm run dev
```

5. **构建发布**
```bash
npm run build
```

## 🚀 使用说明

### 基本操作

#### 添加日程
1. 双击日历上的任意日期
2. 填写日程信息（标题、时间、地点等）
3. 点击"保存"按钮

#### 编辑日程
1. 右键点击已有日程
2. 选择"编辑"
3. 修改信息后保存

#### 删除日程
1. 右键点击日程
2. 选择"删除"
3. 确认删除

### 设置功能

点击标题栏的 ⚙️ 按钮打开设置：

#### 背景透明度
- 拖动滑块调节透明度（0-100%）
- 仅影响背景色，文字保持清晰
- 点击"保存"立即生效

#### 窗口大小
- 可调节窗口宽度和高度
- 窗口位置会自动保存
- 重启应用后恢复上次的位置

#### 颜色主题
- **工作日背景**：默认浅蓝色 (#eff6ff)
- **周末背景**：默认浅红色 (#fef2f2)
- **其他月背景**：默认浅灰色 (#f3f4f6)

#### 鼠标穿透
- 点击 🖱️ 按钮开启/关闭
- 开启后鼠标可以穿透日历窗口
- 再次点击按钮或点击桌面关闭

### 飞书日历同步

#### 首次配置
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 添加日历权限
4. 获取 App ID 和 App Secret
5. 创建共享日历（用于存储同步的日程）
6. 将配置填入 `src/main/feishuConfig.ts`

#### 同步操作
1. 点击标题栏的 🔄 同步按钮
2. 等待同步完成
3. 本地日程和飞书日历将保持一致

### 节假日显示

#### 自动显示
- 应用启动时自动加载节假日数据
- 法定节假日显示红色"休"字标记
- 调休工作日显示绿色"班"字标记

#### 更新节假日数据
1. 下载最新的 `holidayAPI.json`
2. 替换 `src/renderer/public/holidayAPI.json`
3. 重启应用

## 📁 项目结构

```
calendar-feishu/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.ts            # 主进程入口
│   │   ├── feishuAuth.ts       # 飞书认证模块
│   │   ├── feishuCalendar.ts   # 飞书日历 API
│   │   ├── feishuConfig.ts     # 飞书配置
│   │   └── feishuConfig.example.ts
│   ├── preload/                 # 预加载脚本
│   │   └── index.ts
│   └── renderer/                # 渲染进程（React）
│       ├── public/
│       │   └── holidayAPI.json  # 节假日数据
│       └── src/
│           ├── sync/            # 同步模块
│           │   ├── SyncManager.ts
│           │   └── syncUtils.ts
│           ├── types/           # 类型定义
│           │   └── holiday.ts
│           ├── utils/           # 工具函数
│           │   ├── colorUtils.ts
│           │   └── holidayManager.ts
│           ├── App.tsx          # 主组件
│           ├── EventFormModal.tsx
│           ├── FeishuTestPage.tsx
│           ├── SettingsModal.tsx
│           └── types.ts
├── .trae/
│   ├── documents/               # 技术文档
│   └── skills/                  # Skill 文档
│       └── feishu-calendar-api/
│           └── SKILL.md        # 飞书日历 API 文档
├── resources/                   # 应用资源
├── electron-builder.json        # Electron 构建配置
├── electron.vite.config.ts      # Vite 配置
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 配置文件

### feishuConfig.ts

```typescript
export const FEISHU_CONFIG = {
  appId: 'YOUR_APP_ID',           // 飞书应用 App ID
  appSecret: 'YOUR_APP_SECRET',   // 飞书应用 App Secret
  apiBaseUrl: 'https://open.feishu.cn/open-apis',
  timeout: 10000,
  calendarId: 'YOUR_CALENDAR_ID'  // 同步日历 ID
}
```

## ❓ 常见问题

### Q: 飞书同步失败怎么办？
A: 
1. 检查网络连接
2. 确认 App ID 和 App Secret 配置正确
3. 确认应用已添加日历权限
4. 确认日历 ID 正确且有编辑权限

### Q: 窗口位置不保存怎么办？
A: 
1. 检查是否有写入权限
2. 查看配置文件是否可写
3. 重启应用后再试

### Q: 节假日数据如何更新？
A: 
1. 从 GitHub 下载最新的 `holidayAPI.json`
2. 替换 `src/renderer/public/holidayAPI.json`
3. 重启应用

### Q: 如何关闭应用？
A: 
- 通过系统托盘图标右键选择退出
- 或使用任务管理器

### Q: 透明度设置无效？
A: 
- 确保点击了"保存"按钮
- 透明度仅影响背景色，文字保持清晰

## 📚 技术文档

- [中国节假日数据说明](./.trae/documents/中国节假日数据说明.md)
- [飞书日历 API 使用指南](./.trae/skills/feishu-calendar-api/SKILL.md)

## 📝 开发指南

### 本地开发

1. **启动开发服务器**
```bash
npm run dev
```

2. **调试技巧**
- 使用 Chrome DevTools 调试渲染进程
- 使用 Electron DevTools 调试主进程

### 构建发布

1. **构建**
```bash
npm run build
```

2. **打包**
```bash
npm run package
```

3. **发布**
- 构建产物在 `dist/` 目录
- 可执行文件在 `dist/win-unpacked/`

## 📄 许可证

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。
