# 日历数据导出/导入指南

> 完整的数据字典和使用说明

## 📖 目录

1. [概述](#概述)
2. [数据结构详解](#数据结构详解)
3. [字段详细说明](#字段详细说明)
4. [验证规则](#验证规则)
5. [使用示例](#使用示例)
6. [常见问题](#常见问题)

---

## 概述

### 文档目的
本文档详细说明桌面日历应用的 JSON 数据导出/导入格式，用于：
- 理解导出数据集的含义
- 指导后续数据分析项目
- 作为数据字典参考

### 适用场景
- ✅ 数据备份与恢复
- ✅ 跨设备数据迁移
- ✅ 数据分析与处理
- ✅ 第三方工具集成

### 版本信息
- **当前格式版本**：`2.1`
- **最后更新**：2026-03-16

---

## 数据结构详解

### 完整 JSON 结构

```typescript
interface ExportData {
  exportInfo: ExportInfo      // 导出元信息
  events: ExportEvent[]       // 日程事件数组
}
```

### ExportInfo - 导出元信息

```typescript
interface ExportInfo {
  exportedAt: string          // 导出时间（ISO 8601 格式）
  dateRange: {
    start: string             // 开始日期（YYYY-MM-DD）
    end: string               // 结束日期（YYYY-MM-DD）
  }
  totalEvents: number         // 总事件数
  withAttachments: number     // 包含附件的事件数
  formatVersion: string       // 格式版本（当前：'2.1'）
}
```

**字段说明**：
- `exportedAt`: 导出操作完成的时间戳
- `dateRange.start`: 导出范围的开始日期
- `dateRange.end`: 导出范围的结束日期
- `totalEvents`: 导出的事件总数
- `withAttachments`: 包含附件的事件数量
- `formatVersion`: 数据格式版本号

### ExportEvent - 日程事件

```typescript
interface ExportEvent {
  id: string                  // 事件唯一 ID
  dateTime: DateTimeInfo      // 日期时间信息
  basicInfo: BasicInfo        // 基本信息
  content: ContentInfo        // 内容信息
  syncInfo: SyncInfo          // 同步信息
}
```

#### DateTimeInfo - 日期时间信息

```typescript
interface DateTimeInfo {
  date: string                // 日期（YYYY-MM-DD）
  startTime: string           // 开始时间（HH:mm）
  endTime: string             // 结束时间（HH:mm）
}
```

#### BasicInfo - 基本信息

```typescript
interface BasicInfo {
  title: string               // 标题（必填）
  location?: string           // 地点（可选）
  importance: Importance      // 优先级
}

type Importance = 'high' | 'medium' | 'low'
```

#### ContentInfo - 内容信息

```typescript
interface ContentInfo {
  description: string         // 描述文本（不含附件路径）
  attachments: Attachment[]   // 附件列表
  rawDescription: string      // 原始描述（包含附件路径）
}
```

#### SyncInfo - 同步信息

```typescript
interface SyncInfo {
  source: EventSource         // 事件来源
  feishuEventId?: string      // 飞书事件 ID
}

type EventSource = 'local' | 'feishu'
```

- `source: 'local'`: 本地创建的事件
- `source: 'feishu'`: 从飞书同步的事件
- `feishuEventId`: 飞书日历中的事件 ID（用于同步）

### Attachment - 附件

```typescript
interface Attachment {
  path: string                // 文件路径或 URL
  name: string                // 文件名
  type: AttachmentType        // 附件类型
}

type AttachmentType = 'document' | 'image' | 'link' | 'other'
```

**附件类型说明**：
- `document`: 文档文件（doc, pdf, xlsx, txt, md 等）
- `image`: 图片文件（jpg, png, gif, bmp 等）
- `link`: URL 链接（http://, https://）
- `other`: 其他类型

---

## 字段详细说明

### 必填字段

#### 1. date - 日期

- **类型**: `string`
- **格式**: `YYYY-MM-DD`
- **示例**: `2026-03-16`
- **说明**: 事件发生的日期
- **验证**: 必须是有效的日期格式

```typescript
// 有效示例
"2026-03-16" ✅
"2026-01-01" ✅

// 无效示例
"2026-3-16" ❌    // 月份和日期必须是两位数
"2026/03/16" ❌   // 必须使用连字符
"March 16, 2026" ❌  // 必须是数字格式
```

#### 2. title - 标题

- **类型**: `string`
- **长度**: 1-500 字符
- **说明**: 事件的标题或名称
- **验证**: 不能为空字符串

```typescript
// 有效示例
"周一晨会" ✅
"产品评审会" ✅

// 无效示例
"" ❌           // 空字符串
null ❌         // 空值
```

### 可选字段

#### 3. time - 时间

- **类型**: `string`
- **格式**: `HH:mm`
- **默认值**: `09:00`
- **示例**: `09:00`, `14:30`
- **说明**: 事件开始时间

```typescript
// 有效示例
"09:00" ✅
"14:30" ✅
"23:59" ✅

// 无效示例
"9:00" ❌     // 小时必须是两位数
"9:0" ❌      // 分钟必须是两位数
"25:00" ❌    // 小时超出范围
```

#### 4. endTime - 结束时间

- **类型**: `string`
- **格式**: `HH:mm` 或 ISO 8601
- **默认值**: `startTime + 1 小时`
- **示例**: `10:00`, `2026-03-16T10:00:00.000Z`

#### 5. importance - 优先级

- **类型**: `enum`
- **允许值**: `'high'` | `'medium'` | `'low'`
- **默认值**: `'medium'`
- **说明**: 事件的重要程度

```typescript
// 有效示例
"high" ✅
"medium" ✅
"low" ✅

// 无效示例
"urgent" ❌    // 不在允许值范围内
"1" ❌         // 必须是字符串
```

#### 6. location - 地点

- **类型**: `string`
- **长度**: 0-200 字符
- **示例**: `"会议室 A"`, `"线上"`

#### 7. description - 描述

- **类型**: `string`
- **长度**: 0-10000 字符
- **说明**: 事件的详细描述
- **注意**: 导出时会自动分离附件路径

#### 8. feishuEventId - 飞书事件 ID

- **类型**: `string` (可选)
- **说明**: 飞书日历中的事件 ID
- **用途**: 用于判断是创建新事件还是更新现有事件

---

## 验证规则

### 日期格式验证

```regex
^\d{4}-\d{2}-\d{2}$
```

**JavaScript 实现**：
```javascript
function isValidDate(date) {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false
  
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  
  return dateObj.getFullYear() === year &&
         dateObj.getMonth() === month - 1 &&
         dateObj.getDate() === day
}
```

### 时间格式验证

```regex
^([01]\d|2[0-3]):[0-5]\d$
```

**JavaScript 实现**：
```javascript
function isValidTime(time) {
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/
  return regex.test(time)
}
```

### 必填字段检查

导入时会检查以下必填字段：
1. `date` - 日期
2. `title` - 标题

缺少任一字段都会导致验证失败。

### 数据验证流程

```
1. 检查文件格式（数组或对象）
   ↓
2. 检查是否有数据（非空）
   ↓
3. 验证每个事件
   ├─ 检查必填字段
   ├─ 验证日期格式
   ├─ 验证时间格式（如有）
   └─ 验证优先级（如有）
   ↓
4. 返回验证结果
   ├─ errors: 错误列表
   ├─ warnings: 警告列表
   └─ events: 验证通过的事件
```

---

## 使用示例

### 示例 1：完整格式导出

```json
{
  "exportInfo": {
    "exportedAt": "2026-03-16T10:00:00.000Z",
    "dateRange": {
      "start": "2026-03-16",
      "end": "2026-03-22"
    },
    "totalEvents": 1,
    "withAttachments": 0,
    "formatVersion": "2.1"
  },
  "events": [
    {
      "id": "event-001",
      "dateTime": {
        "date": "2026-03-16",
        "startTime": "09:00",
        "endTime": "10:00"
      },
      "basicInfo": {
        "title": "周一晨会",
        "location": "会议室 A",
        "importance": "high"
      },
      "content": {
        "description": "每周例行晨会，讨论本周工作计划",
        "attachments": [],
        "rawDescription": "每周例行晨会，讨论本周工作计划"
      },
      "syncInfo": {
        "source": "local"
      }
    }
  ]
}
```

### 示例 2：简单数组格式

```json
[
  {
    "date": "2026-03-17",
    "time": "14:00",
    "title": "产品评审会",
    "location": "线上",
    "importance": "medium",
    "description": "评审新产品设计方案"
  },
  {
    "date": "2026-03-18",
    "time": "10:00",
    "title": "技术分享"
  }
]
```

### 示例 3：最简格式

```json
[
  {
    "date": "2026-03-19",
    "title": "客户拜访"
  },
  {
    "date": "2026-03-20",
    "title": "团队聚餐"
  }
]
```

**说明**：
- 缺少 `time` 字段会自动使用 `09:00`
- 缺少 `importance` 字段会自动使用 `medium`

### 示例 4：带附件的事件

```json
{
  "events": [
    {
      "id": "event-002",
      "dateTime": {
        "date": "2026-03-17",
        "startTime": "14:00",
        "endTime": "15:30"
      },
      "basicInfo": {
        "title": "设计评审",
        "importance": "high"
      },
      "content": {
        "description": "评审设计稿，详见附件",
        "attachments": [
          {
            "path": "C:\\Users\\Design\\mockup.png",
            "name": "mockup.png",
            "type": "image"
          },
          {
            "path": "https://example.com/spec.pdf",
            "name": "spec.pdf",
            "type": "document"
          }
        ],
        "rawDescription": "评审设计稿，详见 C:\\Users\\Design\\mockup.png 和 https://example.com/spec.pdf"
      },
      "syncInfo": {
        "source": "local"
      }
    }
  ]
}
```

---

## 常见问题

### Q1: 时间格式错误怎么办？

**问题**：导入时报错"时间格式错误"

**原因**：时间格式不符合 `HH:mm` 格式

**解决方法**：
```javascript
// 错误格式
"9:00"    // ❌ 小时不是两位数
"9:0"     // ❌ 分钟不是两位数

// 正确格式
"09:00"   // ✅
"09:00"   // ✅
```

### Q2: 缺少时间字段会怎样？

**答案**：会自动使用默认值 `09:00`

```json
{
  "date": "2026-03-16",
  "title": "晨会"
  // time 字段缺失
}
```

导入后会自动设置为：
```json
{
  "date": "2026-03-16",
  "time": "09:00",  // 自动填充默认值
  "title": "晨会"
}
```

### Q3: 如何处理重复数据？

**答案**：导入时会检测并跳过重复数据

**检测规则**：
1. **ID 相同**：`event.id` 相同
2. **内容相同**：`date + time + title` 组合相同

**示例**：
```javascript
// 现有数据
{ date: "2026-03-16", time: "09:00", title: "晨会" }

// 导入数据（会被跳过）
{ date: "2026-03-16", time: "09:00", title: "晨会" }
```

### Q4: 附件是如何处理的？

**答案**：导出时自动提取，导入时保留引用

**导出流程**：
1. 扫描 `description` 字段
2. 识别文件路径和 URL
3. 分离为 `attachments` 数组
4. `description` 保留纯文本

**导入流程**：
1. 读取 `attachments` 数组
2. 保留路径引用
3. 不验证文件是否存在

### Q5: 如何确保数据格式版本兼容？

**答案**：检查 `formatVersion` 字段

```javascript
if (data.exportInfo.formatVersion !== '2.1') {
  console.warn('格式版本不匹配，可能存在问题')
}
```

### Q6: 导入失败如何调试？

**方法**：查看验证返回的 `errors` 和 `warnings`

```javascript
const result = validateImportData(data)
if (!result.valid) {
  console.error('错误:', result.errors)
  console.warn('警告:', result.warnings)
}
```

---

## 附录

### A. 数据类型速查表

| 字段 | 类型 | 必填 | 默认值 | 格式 |
|------|------|------|--------|------|
| date | string | ✅ | - | YYYY-MM-DD |
| title | string | ✅ | - | 非空字符串 |
| time | string | ❌ | 09:00 | HH:mm |
| endTime | string | ❌ | startTime+1h | HH:mm |
| importance | enum | ❌ | medium | low\|medium\|high |
| location | string | ❌ | - | 字符串 |
| description | string | ❌ | - | 字符串 |

### B. 附件类型扩展名

**document**:
- doc, docx, pdf, txt, md
- xlsx, xls, ppt, pptx, wps

**image**:
- jpg, jpeg, png, gif, bmp, webp

**link**:
- http://*
- `https://*`

### C. 相关文档

- Skill 文件（快速参考）：`.trae/skills/calendar-data-skill.md`
- 导出工具代码：`src/renderer/src/utils/exportUtils.ts`
- 导入工具代码：`src/renderer/src/utils/importUtils.ts`
- 类型定义：`src/renderer/src/types.ts`

---

**文档版本**: 1.0  
**最后更新**: 2026-03-16  
**维护者**: 日历开发团队
