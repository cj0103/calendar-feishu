---
name: "feishu-calendar-api"
description: "飞书日历 API 完整使用指南。Invoke when creating/modifying Feishu calendar events or troubleshooting API integration issues."
---

# 飞书日历 API 使用指南

## 📋 API 概览

飞书日历 API v4 版本，支持以应用身份（tenant_access_token）或用户身份（user_access_token）管理日历和日程。

## 🔑 核心概念

### 1. 身份类型
- **tenant_access_token**：应用身份，代表应用本身
  - 适用场景：应用自动创建的日历和日程
  - 权限范围：应用自己的日历（primary/shared 类型）
  - 前置条件：应用必须开启**机器人能力**
  
- **user_access_token**：用户身份，代表登录用户
  - 适用场景：操作用户个人日历
  - 权限范围：用户有权限访问的日历
  - 获取方式：OAuth 2.0 用户授权流程

### 2. 日历类型
- **primary**：主日历（应用或用户的默认日历）
- **shared**：共享日历（应用创建并共享的日历）
- **subscription**：订阅日历（只读）

> ⚠️ **重要限制**：使用 `tenant_access_token` 只能操作 `primary` 或 `shared` 类型的日历

## 📚 核心 API 接口

### 一、获取访问令牌

#### 1.1 获取 tenant_access_token
```http
POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
Content-Type: application/json

{
  "app_id": "cli_xxxxx",
  "app_secret": "xxxxx"
}
```

**响应示例：**
```json
{
  "code": 0,
  "tenant_access_token": "t-g1044qeGEDXTB6NDJOGV4JQCYDGHRBARFTGT1234",
  "expire": 7200
}
```

### 二、日历管理

#### 2.1 查询日历列表
```http
GET https://open.feishu.cn/open-apis/calendar/v4/calendars
Authorization: Bearer {access_token}
```

**查询参数：**
- `user_id`: 用户 ID（`me` 表示当前用户）
- `type`: 日历类型过滤（`primary`, `shared`, `subscription`）

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "calendar_id": "feishu.cn_xxx@group.calendar.feishu.cn",
        "summary": "日历名称",
        "type": "shared",
        "permissions": "owner",
        "color": -6511959
      }
    ]
  }
}
```

#### 2.2 创建日历
```http
POST https://open.feishu.cn/open-apis/calendar/v4/calendars
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "summary": "日历名称",
  "description": "日历描述",
  "color": "blue"
}
```

### 三、日程管理（重点）

#### 3.1 创建日程 ⭐

**请求格式：**
```http
POST https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events
Authorization: Bearer {access_token}
Content-Type: application/json
Locale: zh_cn
```

**路径参数：**
- `calendar_id`: 日历 ID，格式如 `feishu.cn_xxx@group.calendar.feishu.cn`

**请求体（Request Body）：**
```json
{
  "summary": "日程标题",
  "description": "日程描述（支持 HTML 标签）",
  "start_time": {
    "timestamp": "1709712000",
    "timezone": "Asia/Shanghai"
  },
  "end_time": {
    "timestamp": "1709715600",
    "timezone": "Asia/Shanghai"
  },
  "location": "会议室 A",
  "need_notification": true,
  "visibility": "default"
}
```

**字段详解：**

| 字段 | 类型 | 必填 | 说明 | 示例/备注 |
|------|------|------|------|-----------|
| `summary` | string | 否 | 日程标题 | 最大长度 1000 字符<br>⚠️ 包含"晋升、绩效、述职"等关键词不会生成会议纪要 |
| `description` | string | 否 | 日程描述 | 最大长度 40960 字符<br>支持 HTML 标签实现富文本 |
| `start_time` | time_info | 是 | 开始时间 | 见下方时间格式说明 |
| `end_time` | time_info | 是 | 结束时间 | 见下方时间格式说明 |
| `location` | event_location | 否 | 地点 | ⚠️ **重要**：使用**对象**格式 `{name: "地点名"}`<br>API 返回时也是对象格式<br>本地存储建议只保存 `location.name` |
| `need_notification` | boolean | 否 | 是否发送 Bot 通知 | 默认：`true`<br>`true`: 发送通知<br>`false`: 不发送 |
| `visibility` | string | 否 | 日程公开范围 | 默认：`default`<br>`default`: 默认权限<br>`public`: 公开<br>`private`: 私密 |

**时间格式（time_info）：**
```json
{
  "timestamp": "1709712000",
  "timezone": "Asia/Shanghai"
}
```
- `timestamp`: Unix 时间戳（秒），**字符串格式**
- `timezone`: 时区，常用值：
  - `Asia/Shanghai`: 中国标准时间
  - `UTC`: 协调世界时

**可选参数：**
```json
{
  "idempotency_key": "25fdf41b-8c80-2ce1-e94c-de8b5e7aa7e6",
  "user_id_type": "open_id",
  "attendees": [...],
  "reminders": {...},
  "recurrence": {...}
}
```

**响应示例（成功）：**
```json
{
  "code": 0,
  "data": {
    "event_id": "xxxxx",
    "summary": "日程标题",
    "start_time": {
      "timestamp": "1709712000"
    },
    "organizer": {
      "user_id": "xxxxx"
    }
  },
  "msg": "success"
}
```

#### 3.2 更新日程 ⭐

**请求格式：**
```http
PATCH https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events/{event_id}
Authorization: Bearer {access_token}
Content-Type: application/json
Locale: zh_cn
```

**路径参数：**
- `calendar_id`: 日历 ID
- `event_id`: 日程 ID（创建日程时返回，或从日程列表获取）

**请求体（Request Body）：**
```json
{
  "summary": "修改后的标题",
  "description": "修改后的描述",
  "start_time": {
    "timestamp": "1709715600",
    "timezone": "Asia/Shanghai"
  },
  "end_time": {
    "timestamp": "1709719200",
    "timezone": "Asia/Shanghai"
  },
  "location": "新的地点",
  "need_notification": true,
  "visibility": "public"
}
```

**字段详解：**

| 字段 | 类型 | 必填 | 说明 | 示例/备注 |
|------|------|------|------|-----------|
| `summary` | string | 否 | 日程标题 | 最大长度 1000 字符<br>不传值表示不更新该字段 |
| `description` | string | 否 | 日程描述 | 最大长度 40960 字符<br>⚠️ API 不支持富文本 |
| `start_time` | time_info | 否 | 开始时间 | 需要与 `end_time` 同时有值才会生效 |
| `end_time` | time_info | 否 | 结束时间 | 需要与 `start_time` 同时有值才会生效 |
| `location` | event_location | 否 | 地点 | ⚠️ **重要**：使用**对象**格式 `{name: "地点名"}`<br>API 返回时也是对象格式 |
| `need_notification` | boolean | 否 | 是否发送 Bot 通知 | `true`: 发送<br>`false`: 不发送 |
| `visibility` | string | 否 | 日程公开范围 | `default`: 默认<br>`public`: 公开<br>`private`: 私密 |
| `recurrence` | string | 否 | 重复规则 | RFC5545 格式<br>示例：`FREQ=DAILY;INTERVAL=1` |

**重要说明：**
- **只需提供要修改的字段**，不需要提供完整数据
- 不传值的字段表示不更新
- 当前身份为日程**组织者**时，可修改所有字段
- 当前身份为**参与者**时，仅可编辑部分字段（visibility、free_busy_status、color、reminders）

**响应示例（成功）：**
```json
{
  "code": 0,
  "data": {
    "event_id": "00592a0e-7edf-4678-bc9d-1b77383ef08e_0",
    "summary": "团队周会",
    "updated_time": "1709720000"
  },
  "msg": "success"
}
```

#### 3.3 删除日程 ⭐

**请求格式：**
```http
DELETE https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events/{event_id}
Authorization: Bearer {access_token}
```

**路径参数：**
- `calendar_id`: 日程所在的日历 ID
- `event_id`: 要删除的日程 ID

**查询参数：**
- `user_id_type`: 用户 ID 类型（`open_id` | `union_id` | `user_id`）

**响应示例（成功）：**
```json
{
  "code": 0,
  "msg": "success"
}
```

**注意事项：**
- 删除后无法恢复
- 当前身份必须有日历的 `writer` 或 `owner` 权限
- 如果是重复日程，需要提供完整的 event_id（包括例外日程的后缀）

**错误码：**
- `193001`: 日程未找到
- `193002`: 无权限操作
- `193003`: 日程已经被删除

---

#### 3.3.1 Location 字段说明 ⭐

**重要：Location 字段格式**

| 项目 | 说明 |
|------|------|
| **字段类型** | `event_location`（对象） |
| **创建/更新格式** | `{name: "地点名称"}` |
| **API 返回格式** | `{name: "地点名", address: "地址", latitude: 1.1, longitude: 2.2}` |

**本地存储建议：**
```typescript
// 保存到飞书时（使用对象）
const createData = {
  location: event.location ? { name: event.location } : undefined  // 只保存 name 字段
}

// 从飞书同步到本地时（提取 name）
const localEvent = {
  location: feishuEvent.location?.name || ''  // 只保存 name 字段
}
```

**原因：**
- 飞书的 location 是 `event_location` 类型，包含多个维度（名称、地址、经纬度等）
- **创建/更新时必须使用对象格式**，不能直接传字符串（会报错 9499: Invalid parameter type）
- 本地存储只需保存地点名称即可，简化数据处理

#### 3.3.2 标题和优先级处理 ⭐

**标题格式约定：**
- 高优先级：`[高] 标题内容`
- 低优先级：`[低] 标题内容`
- 普通优先级：`标题内容`（无前缀）

**本地转换逻辑：**
```typescript
// 从飞书同步到本地时
function convertToLocalEvent(feishuEvent: any): CalendarEvent {
  let title = feishuEvent.summary || ''
  let importance: 'high' | 'medium' | 'low' = 'medium'
  
  // 提取优先级前缀
  if (title.startsWith('[高]')) {
    importance = 'high'
    title = title.substring(3) // 移除 [高] 前缀
  } else if (title.startsWith('[低]')) {
    importance = 'low'
    title = title.substring(3) // 移除 [低] 前缀
  }
  
  return {
    title: title,           // 存储不带前缀的标题
    importance: importance, // 单独存储优先级
    location: feishuEvent.location?.name || '',
    date: startTime.date,
    time: startTime.time,
    // ...
  }
}

// 保存到飞书时
const fullTitle = formData.importance === 'high' 
  ? `[高]${formData.title}` 
  : formData.importance === 'low'
    ? `[低]${formData.title}`
    : formData.title

const createData = {
  summary: fullTitle,  // 带优先级前缀的完整标题
  // ...
}
```

**原因：**
- 飞书 API 的 `summary` 字段存储完整标题（包含优先级前缀）
- 本地 UI 需要分离标题和优先级，方便表单显示
- 同步时自动提取/添加优先级前缀，保持数据一致性


#### 3.4 查询日程列表 ⭐

**请求格式：**
```http
GET https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events
Authorization: Bearer {access_token}
Content-Type: application/json
```

**路径参数：**
- `calendar_id`: 日历 ID

**查询参数（三种方式）：**

**方式一：时间范围查询（推荐用于初次同步）**
```
?start_time=1709712000&end_time=1709798400&page_size=500
```
- `start_time`: 开始时间戳（秒）
- `end_time`: 结束时间戳（秒）
- `page_size`: 返回数量（50-1000，默认 500）
- ⚠️ 限制：不能与 `page_token`、`sync_token`、`anchor_time` 同时使用
- ⚠️ 限制：一次性返回，无法分页，受 `page_size` 限制

**方式二：锚点查询（推荐用于增量拉取）**
```
?anchor_time=1709712000&page_token=xxx&page_size=500
```
- `anchor_time`: 时间锚点，获取该时间点之后的日程
- `page_token`: 分页标记（第一次不传）
- ⚠️ 限制：不能与 `start_time`、`end_time` 同时使用

**方式三：增量同步（推荐用于定时同步）**
```
?sync_token=xxx
```
- `sync_token`: 增量同步标记（从上次响应中获取）
- ⚠️ 限制：不能与其他参数同时使用
- ✅ 优势：只返回变更数据，效率高

**响应示例：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "items": [
      {
        "event_id": "00592a0e-7edf-4678-bc9d-1b77383ef08e_0",
        "summary": "团队周会",
        "description": "讨论项目进展",
        "start_time": {
          "timestamp": "1709712000",
          "timezone": "Asia/Shanghai"
        },
        "end_time": {
          "timestamp": "1709715600",
          "timezone": "Asia/Shanghai"
        },
        "location": "会议室 A",
        "visibility": "default",
        "status": "confirmed",
        "updated_time": "1709700000"
      }
    ],
    "page_token": "ListEventsPageToken_xxx",
    "has_more": true,
    "sync_token": "ListEventsSyncToken_xxx"
  }
}
```

**关键字段说明：**
- `event_id`: 日程唯一 ID，用于更新和删除
- `summary`: 日程标题
- `start_time.timestamp`: 开始时间戳（**字符串格式**）
- `end_time.timestamp`: 结束时间戳（**字符串格式**）
- `updated_time`: 最后更新时间戳（秒），用于冲突判断
- `sync_token`: 增量同步标记，下次同步时携带
- `page_token`: 分页标记，用于获取下一页数据

## 🔧 实战代码示例

### 创建日程（TypeScript）
```typescript
async function createFeishuEvent(
  calendarId: string,
  eventData: {
    title: string
    description: string
    startTime: Date
    endTime: Date
    location: string
  }
) {
  // 1. 获取 tenant_access_token
  const tokenResponse = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET
      })
    }
  )
  const { tenant_access_token } = await tokenResponse.json()

  // 2. 构建日程数据
  const feishuEventData = {
    summary: eventData.title,
    description: eventData.description,
    start_time: {
      timestamp: Math.floor(eventData.startTime.getTime() / 1000).toString(),
      timezone: 'Asia/Shanghai'
    },
    end_time: {
      timestamp: Math.floor(eventData.endTime.getTime() / 1000).toString(),
      timezone: 'Asia/Shanghai'
    },
    location: eventData.location,
    need_notification: true,
    visibility: 'default'
  }

  // 3. 调用创建接口
  const response = await fetch(
    `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feishuEventData)
    }
  )

  const result = await response.json()
  
  if (result.code === 0) {
    return { success: true, event: result.data }
  } else {
    return { success: false, error: result.msg }
  }
}
```

### 更新日程（TypeScript）
```typescript
async function updateFeishuEvent(
  calendarId: string,
  eventId: string,
  eventData: Partial<{
    title: string
    description: string
    startTime: Date
    endTime: Date
    location: string
  }>
) {
  // 1. 获取 token
  const tokenResponse = await fetch(/* 同上 */)
  const { tenant_access_token } = await tokenResponse.json()

  // 2. 构建更新数据（只包含修改的字段）
  const updateData: any = {}
  
  if (eventData.title) {
    updateData.summary = eventData.title
  }
  if (eventData.description) {
    updateData.description = eventData.description
  }
  if (eventData.startTime) {
    updateData.start_time = {
      timestamp: Math.floor(eventData.startTime.getTime() / 1000).toString(),
      timezone: 'Asia/Shanghai'
    }
  }
  if (eventData.endTime) {
    updateData.end_time = {
      timestamp: Math.floor(eventData.endTime.getTime() / 1000).toString(),
      timezone: 'Asia/Shanghai'
    }
  }
  if (eventData.location) {
    updateData.location = eventData.location
  }

  // 3. 调用更新接口
  const response = await fetch(
    `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tenant_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    }
  )

  const result = await response.json()
  
  if (result.code === 0) {
    return { success: true, event: result.data }
  } else {
    return { success: false, error: result.msg }
  }
}
```

## ⚠️ 常见问题

### 1. 权限错误
**错误信息：** "no permission" 或 "permission denied"

**解决方案：**
- 检查应用是否开启**机器人能力**
- 确认日历类型是 `primary` 或 `shared`
- 验证应用对日历有 `writer` 或 `owner` 权限

### 2. 时间戳格式错误
**错误信息：** "invalid timestamp format"

**解决方案：**
- 确保时间戳是**字符串格式**
- 使用 Unix 时间戳（秒），不是毫秒
- 示例：`"1709712000"` ✅，`1709712000` ❌

### 3. 日历 ID 格式错误
**解决方案：**
- 完整格式：`feishu.cn_xxx@group.calendar.feishu.cn`
- 必须包含 `@group.calendar.feishu.cn` 后缀

### 4. 重复创建日程
**解决方案：**
- 使用 `idempotency_key` 参数
- 生成唯一的 key（UUID 格式）
- 示例：`"25fdf41b-8c80-2ce1-e94c-de8b5e7aa7e6"`

## 📊 接口频率限制

- **创建日程**：1000 次/分钟，50 次/秒
- **查询日历**：1000 次/分钟
- **更新日程**：1000 次/分钟

## 🔗 相关资源

- [飞书开放平台](https://open.feishu.cn/)
- [日历 API 文档](https://open.feishu.cn/document/category/calendar)
- [API 调试台](https://open.feishu.cn/api-explorer/)
- [错误码查询](https://open.feishu.cn/document/ugtrtgO5MjPQ0gzMlDOczDyN)

## 💡 最佳实践

1. **Token 管理**
   - `tenant_access_token` 有效期 2 小时
   - 实现自动刷新机制
   - 缓存 token 避免频繁请求

2. **错误处理**
   - 检查 `code` 字段（0 表示成功）
   - 解析 `msg` 字段获取错误信息
   - 记录 `log_id` 用于技术支持

3. **数据验证**
   - 验证时间格式和范围
   - 检查标题长度（≤1000 字符）
   - 避免敏感词汇（晋升、绩效等）

4. **用户体验**
   - 提供明确的错误提示
   - 显示详细的调试日志
   - 支持日程创建幂等性

---

**最后更新：** 2026-03-07  
**API 版本：** v4  
**适用应用类型：** 自建应用、商店应用
