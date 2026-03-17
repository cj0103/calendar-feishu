# 日历数据技能

> 快速参考指南 - 日历导出/导入 JSON 数据结构说明

## 📦 JSON 结构

```json
{
  "exportInfo": { ... },    // 导出元信息
  "events": [ ... ]         // 日程数组
}
```

## 🔑 核心字段

### 必填字段
- **`date`**: `YYYY-MM-DD` - 日期（如：`2026-03-16`）
- **`title`**: `string` - 标题（非空字符串）

### 可选字段及默认值
- **`time`**: `HH:mm` - 时间（默认：`09:00`）
- **`endTime`**: `HH:mm` - 结束时间（默认：startTime + 1 小时）
- **`importance`**: `low|medium|high` - 优先级（默认：`medium`）
- **`location`**: `string` - 地点
- **`description`**: `string` - 描述

## 📋 完整结构

```typescript
{
  exportInfo: {
    exportedAt: string              // 导出时间（ISO 格式）
    dateRange: {
      start: string                 // 开始日期（YYYY-MM-DD）
      end: string                   // 结束日期（YYYY-MM-DD）
    }
    totalEvents: number             // 总事件数
    withAttachments: number         // 带附件的事件数
    formatVersion: string           // 格式版本（当前：'2.1'）
  },
  events: [
    {
      id: string
      dateTime: {
        date: string                // YYYY-MM-DD
        startTime: string           // HH:mm
        endTime: string             // HH:mm
      }
      basicInfo: {
        title: string
        location?: string
        importance: 'low'|'medium'|'high'
      }
      content: {
        description: string
        attachments: []             // 附件列表
        rawDescription: string
      }
      syncInfo: {
        source: 'local'|'feishu'
        feishuEventId?: string
      }
    }
  ]
}
```

## ✅ 验证规则

### 日期格式
```regex
^\d{4}-\d{2}-\d{2}$
```
示例：`2026-03-16` ✅ | `2026-3-16` ❌

### 时间格式
```regex
^([01]\d|2[0-3]):[0-5]\d$
```
示例：`09:00` ✅ | `9:00` ❌ | `25:00` ❌

### 优先级
允许值：`low` | `medium` | `high`

## 🔄 导入导出规范

### 导入模式
- ✅ **增量导入**：合并现有数据，不清空替换
- ✅ **冲突处理**：跳过重复（基于 ID 或 date+time+title）
- ✅ **默认值**：缺少时间自动使用 `09:00`

### 导出数据
- 支持三种格式：
  1. 完整格式：`{exportInfo, events}`
  2. 简单数组：`[{date, time, title, ...}]`
  3. 最简格式：`[{date, title}]`

## 📎 附件处理

### 附件类型
- `document`: 文档（doc, pdf, xlsx 等）
- `image`: 图片（jpg, png, gif 等）
- `link`: 链接（http://, https://）
- `other`: 其他

### 提取规则
- 自动识别描述中的文件路径和 URL
- 支持 Windows 路径、UNC 路径、相对路径
- 自动去重

## 🚀 快速示例

### 导出示例
```json
{
  "exportInfo": {
    "exportedAt": "2026-03-16T10:00:00.000Z",
    "dateRange": {
      "start": "2026-03-16",
      "end": "2026-03-22"
    },
    "totalEvents": 5,
    "formatVersion": "2.1"
  },
  "events": [
    {
      "id": "event-1",
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
        "description": "每周例行晨会",
        "attachments": [],
        "rawDescription": "每周例行晨会"
      },
      "syncInfo": {
        "source": "local"
      }
    }
  ]
}
```

### 导入示例（最简格式）
```json
[
  {
    "date": "2026-03-17",
    "title": "产品评审会"
  },
  {
    "date": "2026-03-18",
    "time": "14:00",
    "title": "技术分享"
  }
]
```

## 💡 使用提示

1. **时间处理**：缺少时间字段会自动使用 `09:00`
2. **冲突检测**：使用 `date-time-title` 作为唯一键
3. **附件提取**：描述中的路径会自动分离为附件
4. **版本兼容**：当前格式版本 `2.1`

## 📖 详细文档

完整文档请查看：`.trae/documents/calendar-data-guide.md`
