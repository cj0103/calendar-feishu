# JSON 导入功能开发计划

## 一、需求分析

### 1.1 功能目标
开发一个 JSON 导入功能，允许用户从外部文件导入日程数据到桌面日历应用中。

### 1.2 核心需求
1. **支持导入格式**：与现有导出格式兼容的 JSON 文件
2. **导入模式**：**增量导入（合并）** - 保留现有数据，只添加新日程
3. **数据验证**：
   - 必填字段：`date`（日期）、`title`（标题）
   - 可选字段：`time`（时间）- 如果未提供，默认使用 `09:00`
   - 其他字段自动填充默认值
4. **冲突处理**：跳过重复日程（基于 ID 或日期+时间+标题）
5. **用户反馈**：显示导入进度和结果统计

### 1.3 现有数据结构

#### 📤 导出的 JSON 文件格式（完整示例）

```json
{
  "exportInfo": {
    "exportedAt": "2024-01-15T10:30:00.000Z",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "totalEvents": 3,
    "withAttachments": 1,
    "formatVersion": "2.1"
  },
  "events": [
    {
      "id": "1704067200000",
      "dateTime": {
        "date": "2024-01-01",
        "startTime": "09:00",
        "endTime": "10:00"
      },
      "basicInfo": {
        "title": "项目启动会议",
        "location": "会议室A",
        "importance": "high"
      },
      "content": {
        "description": "讨论项目计划和里程碑",
        "attachments": [
          {
            "path": "D:\\Documents\\项目计划.pdf",
            "name": "项目计划.pdf",
            "type": "document"
          }
        ],
        "rawDescription": "讨论项目计划和里程碑 D:\\Documents\\项目计划.pdf"
      },
      "syncInfo": {
        "source": "local",
        "feishuEventId": null
      }
    },
    {
      "id": "1704153600000",
      "dateTime": {
        "date": "2024-01-02",
        "startTime": "14:00",
        "endTime": "15:30"
      },
      "basicInfo": {
        "title": "团队周会",
        "location": "",
        "importance": "medium"
      },
      "content": {
        "description": "每周工作汇报",
        "attachments": [],
        "rawDescription": "每周工作汇报"
      },
      "syncInfo": {
        "source": "feishu",
        "feishuEventId": "feishu_event_123456"
      }
    },
    {
      "id": "1704240000000",
      "dateTime": {
        "date": "2024-01-03",
        "startTime": "10:00",
        "endTime": ""
      },
      "basicInfo": {
        "title": "客户电话",
        "location": "线上",
        "importance": "low"
      },
      "content": {
        "description": "确认需求细节 https://docs.feishu.cn/doc/xxx",
        "attachments": [
          {
            "path": "https://docs.feishu.cn/doc/xxx",
            "name": "需求文档",
            "type": "link"
          }
        ],
        "rawDescription": "确认需求细节 https://docs.feishu.cn/doc/xxx"
      },
      "syncInfo": {
        "source": "local",
        "feishuEventId": null
      }
    }
  ]
}
```

#### 📥 导入时支持的数据格式

**格式 1：完整格式（推荐）**
与导出格式完全一致，包含 `exportInfo` 和 `events` 两部分。

**格式 2：简化格式**
只包含日程数组，自动生成 `exportInfo`：
```json
[
  {
    "id": "1704067200000",
    "date": "2024-01-01",
    "time": "09:00",
    "title": "项目启动会议",
    "location": "会议室A",
    "importance": "high",
    "description": "讨论项目计划",
    "endTime": "2024-01-01T10:00:00.000Z"
  }
]
```

**格式 3：最简格式**
只包含必填字段（时间自动使用 09:00）：
```json
[
  {
    "date": "2024-01-01",
    "title": "会议"
  }
]
```
导入后自动添加：
```json
{
  "date": "2024-01-01",
  "time": "09:00",  // 自动填充
  "title": "会议"
}
```

#### 📋 字段详细说明

| 字段路径 | 类型 | 必填 | 说明 | 示例值 | 默认值 |
|---------|------|------|------|--------|--------|
| **exportInfo** | Object | 否 | 导出信息（可选） | - | 自动生成 |
| exportInfo.exportedAt | String | 否 | 导出时间（ISO 格式） | "2024-01-15T10:30:00.000Z" | 当前时间 |
| exportInfo.dateRange | Object | 否 | 日期范围 | {"start": "2024-01-01", "end": "2024-12-31"} | 自动计算 |
| exportInfo.totalEvents | Number | 否 | 日程总数 | 100 | 实际数量 |
| exportInfo.formatVersion | String | 否 | 格式版本 | "2.1" | "2.1" |
| **events** | Array | 是 | 日程列表（至少 1 条） | - | - |
| **events[].id** | String | 否 | 日程唯一 ID | "1704067200000" | 自动生成时间戳 |
| **events[].date** | String | ✅ 是 | 日期（YYYY-MM-DD） | "2024-01-01" | - |
| **events[].time** | String | 否 | 开始时间（HH:mm） | "09:00" | **"09:00"** |
| **events[].title** | String | ✅ 是 | 日程标题 | "项目会议" | - |
| **events[].location** | String | 否 | 地点 | "会议室A" | "" |
| **events[].importance** | String | 否 | 优先级 | "high", "medium", "low" | "medium" |
| **events[].description** | String | 否 | 描述（可包含附件路径） | "讨论项目 D:\\doc.pdf" | "" |
| **events[].participants** | Array | 否 | 参与者列表 | ["张三", "李四"] | [] |
| **events[].endTime** | String | 否 | 结束时间（ISO 格式） | "2024-01-01T10:00:00.000Z" | 开始时间+1小时 |
| **events[].feishuEventId** | String | 否 | 飞书日程 ID | "feishu_123456" | null |
| **dateTime** | Object | 否 | 日期时间对象（格式 1） | - | - |
| dateTime.date | String | 是 | 日期 | "2024-01-01" | - |
| dateTime.startTime | String | 是 | 开始时间 | "09:00" | - |
| dateTime.endTime | String | 否 | 结束时间 | "10:00" | "" |
| **basicInfo** | Object | 否 | 基本信息（格式 1） | - | - |
| basicInfo.title | String | 是 | 标题 | "会议" | - |
| basicInfo.location | String | 否 | 地点 | "会议室A" | "" |
| basicInfo.importance | String | 否 | 优先级 | "high" | "medium" |
| **content** | Object | 否 | 内容信息（格式 1） | - | - |
| content.description | String | 否 | 描述 | "讨论项目" | "" |
| content.attachments | Array | 否 | 附件列表 | [{path, name, type}] | [] |
| content.rawDescription | String | 否 | 原始描述 | "讨论项目 D:\\doc.pdf" | "" |
| **syncInfo** | Object | 否 | 同步信息（格式 1） | - | - |
| syncInfo.source | String | 否 | 来源 | "local" 或 "feishu" | "local" |
| syncInfo.feishuEventId | String | 否 | 飞书 ID | "feishu_123" | null |

#### 🔍 数据验证规则

**必填字段验证：**
1. ✅ `date` - 必须存在且格式正确（YYYY-MM-DD）
2. ✅ `title` - 必须存在且不为空
3. ⚠️ `time` - 如果不存在，自动使用 `09:00`

**格式验证：**
- 日期格式：`YYYY-MM-DD`（如 `2024-01-15`）
- 时间格式：`HH:mm`（如 `09:00`、`14:30`）
- 优先级：`high`、`medium`、`low`（默认 `medium`）

**自动填充规则：**
```typescript
{
  id: 自动生成时间戳,
  time: "09:00",           // 如果未提供
  location: "",            // 默认空字符串
  importance: "medium",    // 默认中等优先级
  description: "",         // 默认空字符串
  participants: [],        // 默认空数组
  endTime: 自动计算,       // 开始时间 + 1小时
  feishuEventId: null,     // 默认 null
  lastSyncTime: null       // 默认 null
}
```

**错误处理：**
- ❌ 缺少 `date` 字段 → 跳过该日程，记录错误
- ❌ 缺少 `title` 字段 → 跳过该日程，记录错误
- ❌ 日期格式错误 → 跳过该日程，记录错误
- ⚠️ 缺少 `time` 字段 → 自动使用 `09:00`，继续导入

#### 🔄 数据转换逻辑

**从格式 1（完整格式）转换为本地格式：**
```typescript
// 输入：ExportEvent 格式
{
  id: "123",
  dateTime: { date: "2024-01-01", startTime: "09:00", endTime: "10:00" },
  basicInfo: { title: "会议", location: "会议室A", importance: "high" },
  content: { description: "讨论", attachments: [], rawDescription: "讨论" },
  syncInfo: { source: "local", feishuEventId: null }
}

// 输出：CalendarEvent 格式
{
  id: "123",
  date: "2024-01-01",
  time: "09:00",
  title: "会议",
  location: "会议室A",
  importance: "high",
  description: "讨论",
  participants: [],
  endTime: "2024-01-01T10:00:00.000Z",
  feishuEventId: null,
  lastSyncTime: null
}
```

**从格式 2/3（简化格式）转换为本地格式：**
```typescript
// 输入：简化格式
{
  date: "2024-01-01",
  time: "09:00",
  title: "会议"
}

// 输出：CalendarEvent 格式（自动填充默认值）
{
  id: "1704067200000",  // 自动生成
  date: "2024-01-01",
  time: "09:00",
  title: "会议",
  location: "",         // 默认值
  importance: "medium", // 默认值
  description: "",      // 默认值
  participants: [],     // 默认值
  endTime: "2024-01-01T10:00:00.000Z", // 自动计算
  feishuEventId: null,  // 默认值
  lastSyncTime: null    // 默认值
}
```

#### 💡 导入数据示例

**示例 1：完整日程（带附件）**
```json
{
  "id": "1704067200000",
  "dateTime": {
    "date": "2024-01-15",
    "startTime": "09:00",
    "endTime": "11:00"
  },
  "basicInfo": {
    "title": "产品评审会议",
    "location": "3楼大会议室",
    "importance": "high"
  },
  "content": {
    "description": "评审新功能设计方案，确认开发排期",
    "attachments": [
      {
        "path": "D:\\Documents\\产品设计.pdf",
        "name": "产品设计.pdf",
        "type": "document"
      },
      {
        "path": "https://docs.feishu.cn/doc/xxx",
        "name": "会议纪要",
        "type": "link"
      }
    ],
    "rawDescription": "评审新功能设计方案 D:\\Documents\\产品设计.pdf https://docs.feishu.cn/doc/xxx"
  },
  "syncInfo": {
    "source": "local",
    "feishuEventId": null
  }
}
```

**示例 2：简单日程**
```json
{
  "date": "2024-01-20",
  "time": "14:00",
  "title": "团队周会",
  "location": "线上",
  "importance": "medium"
}
```

**示例 3：最简日程（自动使用 09:00）**
```json
{
  "date": "2024-01-25",
  "title": "客户电话"
}
```
导入后：
```json
{
  "date": "2024-01-25",
  "time": "09:00",  // 自动填充
  "title": "客户电话"
}
```

**示例 4：批量导入（简化格式，部分无时间）**
```json
[
  { "date": "2024-02-01", "time": "09:00", "title": "晨会" },
  { "date": "2024-02-01", "title": "项目讨论" },           // 自动使用 09:00
  { "date": "2024-02-02", "time": "10:00", "title": "代码评审" },
  { "date": "2024-02-03", "title": "客户演示" }            // 自动使用 09:00
]
```

---

## 二、技术方案

### 2.1 新增文件
1. **`src/renderer/src/ImportModal.tsx`** - 导入对话框组件
2. **`src/renderer/src/utils/importUtils.ts`** - 导入工具函数
3. **`src/main/importHandler.ts`** - 主进程文件读取处理（可选，可直接使用现有 IPC）

### 2.2 修改文件
1. **`src/renderer/src/App.tsx`** - 添加导入按钮和处理逻辑
2. **`src/preload/index.ts`** - 添加文件选择 IPC 接口
3. **`src/main/index.ts`** - 添加文件选择对话框处理

### 2.3 核心功能模块

#### 模块 1：文件选择（主进程）
- 使用 Electron `dialog.showOpenDialog` 选择 JSON 文件
- 返回文件路径或取消状态

#### 模块 2：数据验证（渲染进程）
- 验证 JSON 格式是否有效
- 检查必填字段（id, date, time, title）
- 验证数据类型和格式
- 返回验证结果和错误信息

#### 模块 3：数据转换（渲染进程）
- 将导出格式转换为本地存储格式（CalendarEvent）
- 处理缺失字段（使用默认值）
- 合并 description 和 attachments

#### 模块 4：冲突处理（渲染进程）
- **唯一策略：跳过重复** - 如果 ID 已存在或日期+时间+标题完全相同，跳过该日程
- 记录跳过的日程数量，在导入结果中显示

#### 模块 5：导入执行（渲染进程）
- 根据导入模式（合并/替换）执行导入
- 更新 localStorage
- 触发飞书同步（如果需要）
- 返回导入统计

---

## 三、实施步骤

### 步骤 1：创建导入工具函数（`importUtils.ts`）
**预计时间：20 分钟**

**功能清单：**
1. `validateImportData(data: any): ValidationResult`
   - 验证 JSON 结构
   - 检查必填字段
   - 验证数据格式

2. `transformToCalendarEvent(exportEvent: ExportEvent): CalendarEvent`
   - 转换数据格式
   - 处理缺失字段
   - 合并 description 和 attachments

3. `detectConflicts(newEvents: CalendarEvent[], existingEvents: CalendarEvent[]): ConflictInfo`
   - 检测重复日程
   - 返回冲突列表

4. `resolveConflicts(newEvents: CalendarEvent[], existingEvents: CalendarEvent[], strategy: ConflictStrategy): CalendarEvent[]`
   - 根据策略处理冲突
   - 返回最终事件列表

**数据类型定义：**
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  events?: ExportEvent[]
}

type ConflictStrategy = 'skip' | 'overwrite' | 'keep_both'

interface ConflictInfo {
  hasConflicts: boolean
  conflicts: Array<{
    newEvent: CalendarEvent
    existingEvent: CalendarEvent
  }>
}
```

---

### 步骤 2：创建导入对话框组件（`ImportModal.tsx`）
**预计时间：30 分钟**

**UI 设计：**
```
┌─────────────────────────────────────────┐
│  导入日程数据                            │
├─────────────────────────────────────────┤
│                                         │
│  📁 选择文件                            │
│  [选择 JSON 文件...]  calendar.json     │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  📊 文件信息                            │
│  • 导出时间：2024-01-01 12:00:00        │
│  • 日程数量：100 条                     │
│  • 日期范围：2024-01-01 至 2024-12-31   │
│  • 带附件：20 条                        │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  ⚙️ 导入设置                            │
│                                         │
│  ☑️ 导入后同步到飞书                    │
│                                         │
│  ℹ️ 导入模式：增量导入（合并现有数据）   │
│  ℹ️ 重复日程：自动跳过                   │
│  ℹ️ 缺少时间：自动使用 09:00             │
│                                         │
├─────────────────────────────────────────┤
│            [取消]  [开始导入]           │
└─────────────────────────────────────────┘
```

**组件功能：**
1. 文件选择按钮（调用 IPC）
2. 显示文件预览信息
3. 飞书同步选项（复选）
4. 显示导入规则说明
5. 开始导入按钮
6. 导入进度显示
7. 导入结果统计

---

### 步骤 3：添加主进程 IPC 接口
**预计时间：15 分钟**

**修改文件：**
1. `src/main/index.ts`
   - 添加 `ipcMain.handle('dialog:openFile', ...)` 处理器
   - 使用 `dialog.showOpenDialog` 选择文件
   - 返回文件路径或取消状态

2. `src/preload/index.ts`
   - 添加 `openImportFile: () => ipcRenderer.invoke('dialog:openFile')` 接口

**代码示例：**
```typescript
// src/main/index.ts
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择要导入的 JSON 文件',
    filters: [
      { name: 'JSON 文件', extensions: ['json'] }
    ],
    properties: ['openFile']
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }
  
  const filePath = result.filePaths[0]
  const content = readFileSync(filePath, 'utf-8')
  
  return {
    canceled: false,
    filePath,
    content
  }
})
```

---

### 步骤 4：在 App.tsx 中集成导入功能
**预计时间：20 分钟**

**修改内容：**
1. 添加导入按钮（在标题栏，导出按钮旁边）
2. 添加 `isImportOpen` 状态
3. 实现 `handleImport` 函数
4. 处理导入结果（更新 events 状态）
5. 可选：触发飞书同步

**代码示例：**
```typescript
// 添加状态
const [isImportOpen, setIsImportOpen] = useState(false)

// 导入处理函数
const handleImport = useCallback(async (
  events: CalendarEvent[],
  syncToFeishu: boolean
) => {
  // 增量导入（合并）
  const existingIds = new Set(events.map(e => e.id))
  const newEvents = events.filter(e => !existingIds.has(e.id))
  
  const merged = [...events, ...newEvents]
  setEvents(merged)
  saveEventsToLocalStorage(merged)
  
  // 可选：同步到飞书
  if (syncToFeishu) {
    for (const event of newEvents) {
      if (!event.feishuEventId) {
        await syncManager.syncCreateToFeishu(event)
      }
    }
  }
  
  setIsImportOpen(false)
}, [events, syncManager])

// 添加导入按钮
<button 
  onClick={() => setIsImportOpen(true)}
  className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
  title="导入日程"
>
  📥
</button>

// 添加导入对话框
<ImportModal
  isOpen={isImportOpen}
  onClose={() => setIsImportOpen(false)}
  onImport={handleImport}
  existingEvents={events}
/>
```

---

### 步骤 5：测试和优化
**预计时间：15 分钟**

**测试清单：**
- [ ] 选择文件功能正常
- [ ] JSON 格式验证正确
- [ ] 增量导入模式工作正常
- [ ] 缺少时间字段时自动使用 09:00
- [ ] 重复日程自动跳过
- [ ] 飞书同步功能正常
- [ ] 错误提示友好清晰
- [ ] 导入统计准确

**优化项：**
1. 添加导入进度动画
2. 优化大文件导入性能
3. 添加导入历史记录
4. 支持拖拽文件导入

---

## 四、数据流程图

```
用户点击导入按钮
    ↓
打开 ImportModal 对话框
    ↓
用户选择 JSON 文件
    ↓
调用 IPC：dialog:openFile
    ↓
主进程打开文件选择对话框
    ↓
读取文件内容并返回
    ↓
渲染进程验证 JSON 格式
    ↓
显示文件预览信息
    ↓
用户选择导入模式和冲突策略
    ↓
点击"开始导入"
    ↓
数据转换（ExportEvent → CalendarEvent）
    ↓
冲突检测和处理
    ↓
更新 localStorage 和状态
    ↓
可选：同步到飞书
    ↓
显示导入结果统计
    ↓
关闭对话框
```

---

## 五、错误处理

### 5.1 文件读取错误
- 文件不存在
- 文件格式错误（非 JSON）
- 文件编码错误
- 文件权限不足

### 5.2 数据验证错误
- 缺少必填字段（date、title）
- 数据类型错误
- 日期格式错误
- 时间格式错误（自动使用默认值 09:00）

### 5.3 导入过程错误
- localStorage 写入失败
- 飞书同步失败
- 内存溢出（超大文件）

### 5.4 用户提示
- 友好的错误消息
- 详细的错误原因
- 建议的解决方案
- 导入日志记录

---

## 六、扩展功能（可选）

### 6.1 支持更多格式
- CSV 格式导入
- iCal 格式导入
- Excel 格式导入

### 6.2 高级功能
- 导入预览（显示前 10 条）
- 字段映射（自定义字段对应关系）
- 导入模板（提供标准模板下载）
- 导入历史（记录导入操作）

### 6.3 批量操作
- 批量编辑导入的日程
- 批量添加标签
- 批量设置优先级

---

## 七、开发时间估算

| 步骤 | 预计时间 | 说明 |
|------|---------|------|
| 步骤 1：创建导入工具函数 | 20 分钟 | 数据验证、转换、冲突处理 |
| 步骤 2：创建导入对话框组件 | 30 分钟 | UI 设计、交互逻辑 |
| 步骤 3：添加主进程 IPC 接口 | 15 分钟 | 文件选择对话框 |
| 步骤 4：在 App.tsx 中集成 | 20 分钟 | 按钮添加、状态管理 |
| 步骤 5：测试和优化 | 15 分钟 | 功能测试、错误处理 |
| **总计** | **100 分钟** | 约 1.5-2 小时 |

---

## 八、风险评估

### 8.1 技术风险
- **低风险**：JSON 解析和验证（成熟技术）
- **低风险**：文件选择对话框（Electron 原生支持）
- **中风险**：大数据量导入性能（可优化）

### 8.2 用户体验风险
- **低风险**：导入流程简单直观
- **中风险**：冲突处理逻辑需要用户理解
- **低风险**：错误提示清晰友好

### 8.3 数据安全风险
- **低风险**：只读取用户选择的文件
- **低风险**：导入前有预览和确认
- **低风险**：支持备份现有数据（完全替换前）

---

## 九、实施优先级

### P0（必须实现）
1. 文件选择功能
2. JSON 格式验证
3. 增量导入模式（合并现有数据）
4. 缺少时间字段自动使用 09:00
5. 重复日程自动跳过
6. 基本错误处理

### P1（重要功能）
1. 导入统计显示
2. 飞书同步选项
3. 友好的错误提示
4. 导入进度显示

### P2（可选功能）
1. 导入预览
2. 导入历史记录
3. 拖拽文件导入
4. 支持更多格式

---

## 十、验收标准

### 功能验收
- [ ] 可以选择并导入 JSON 文件
- [ ] 增量导入模式正常工作（合并现有数据）
- [ ] 缺少时间字段自动使用 09:00
- [ ] 重复日程自动跳过
- [ ] 导入后数据正确显示
- [ ] 飞书同步功能正常

### 质量验收
- [ ] 代码符合项目规范
- [ ] 无 TypeScript 类型错误
- [ ] 无控制台错误或警告
- [ ] 错误处理完善
- [ ] 用户提示友好

### 性能验收
- [ ] 小文件（<100 条）导入 < 1 秒
- [ ] 中等文件（100-500 条）导入 < 3 秒
- [ ] 大文件（>500 条）导入 < 10 秒

---

**计划完成，等待用户确认后开始实施。**
