/**
 * 飞书日程同步管理器
 * 
 * 负责本地日程与飞书日历之间的双向同步
 * 
 * ## 同步策略
 * 
 * ### 初次同步
 * - 从飞书获取前后 30 天的所有日程
 * - 完全替换本地数据
 * - 保存 sync_token 用于后续增量同步
 * 
 * ### 增量同步
 * - 使用 sync_token 获取变更数据
 * - 飞书新增 → 添加到本地
 * - 飞书更新 → 比较时间戳，更新本地或同步到飞书
 * - 本地独有 → 上传到飞书
 * - 飞书取消 → 跳过，保留本地数据
 * 
 * ## 数据存储
 * 
 * ### localStorage Key 规范
 * - `calendar-events`: 存储日程列表（JSON 数组）
 * - `feishu_sync_token`: 存储飞书同步 token
 * - `feishu_last_sync_time`: 存储最后同步时间
 * 
 * ⚠️ **注意**: 统一使用中划线格式（kebab-case）
 * 
 * @example
 * ```typescript
 * const syncManager = new SyncManager(calendarId)
 * await syncManager.sync()
 * ```
 */

import { CalendarEvent } from '../types'
import { FEISHU_CONFIG } from '../../../main/feishuConfig'
import {
  convertToLocalEvent,
  toFeishuTimestamp,
  saveSyncToken,
  loadSyncToken,
  saveLastSyncTime,
  loadLastSyncTime,
  findLocalByFeishuId,
  mergeEvents
} from './syncUtils'

export interface SyncResult {
  added: number
  updated: number
  deleted: number
  uploaded: number  // 本地独有上传到飞书的数量
}

export interface SyncStatus {
  syncing: boolean
  lastSyncTime: number | null
  error: string | null
}

export class SyncManager {
  private syncToken: string | null = null
  private lastSyncTime: number | null = null
  private isSyncing: boolean = false
  private calendarId: string

  /**
   * 创建同步管理器实例
   * @param calendarId 飞书日历 ID
   */
  constructor(calendarId: string = FEISHU_CONFIG.calendarId) {
    this.calendarId = calendarId
    this.initialize()
  }

  /**
   * 初始化同步管理器
   * - 从 localStorage 加载 sync_token
   * - 从 localStorage 加载最后同步时间
   */
  async initialize(): Promise<void> {
    this.syncToken = loadSyncToken()
    this.lastSyncTime = loadLastSyncTime()
  }

  /**
   * 执行同步
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { added: 0, updated: 0, deleted: 0, uploaded: 0 }
    }

    this.isSyncing = true
    
    try {
      let result: SyncResult

      if (!this.syncToken) {
        // 没有 sync_token，执行初次同步
        result = await this.initialSync()
      } else {
        // 增量同步
        result = await this.incrementalSync()
      }

      this.lastSyncTime = Date.now()
      saveLastSyncTime(this.lastSyncTime)

      return result
    } catch (error: any) {
      console.error('❌ Sync failed:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 初次全量同步
   */
  private async initialSync(): Promise<SyncResult> {
    const now = new Date()
    const startTime = new Date(now.getTime() - 30 * 24 * 3600000) // 30 天前
    const endTime = new Date(now.getTime() + 30 * 24 * 3600000)   // 30 天后

    const result = await window.api.feishu.getEvents(
      this.calendarId,
      Math.floor(startTime.getTime() / 1000),
      Math.floor(endTime.getTime() / 1000)
    )

    if (!result.success) {
      throw new Error(result.error || 'Initial sync failed')
    }

    // 确保 events 是数组
    const events = Array.isArray(result.events) ? result.events : []
    
    // ⭐ 过滤掉已取消的日程
    const validEvents = events.filter(event => event.status !== 'cancelled')

    // 转换为本地格式
    const localEvents: CalendarEvent[] = validEvents.map(feishuEvent =>
      convertToLocalEvent(feishuEvent)
    )

    // 保存到本地
    this.saveEventsToLocalStorage(localEvents)
    
    // ⭐ 验证保存的数据
    const savedData = localStorage.getItem('calendar-events')
    if (savedData) {
      const parsed = JSON.parse(savedData)
      if (parsed.length > 0) {
        // 数据验证通过
      }
    }

    // 保存 sync_token
    if (result.sync_token) {
      this.syncToken = result.sync_token
      saveSyncToken(result.sync_token)
    }

    return { added: localEvents.length, updated: 0, deleted: 0 }
  }

  /**
   * 增量同步
   */
  private async incrementalSync(): Promise<SyncResult> {
    if (!this.syncToken) {
      return await this.initialSync()
    }

    const result = await window.api.feishu.getEventsWithSyncToken(
      this.calendarId,
      this.syncToken
    )

    console.log('📥 Incremental sync API response:', {
      success: result.success,
      eventsCount: result.events?.length,
      hasSyncToken: !!result.sync_token,
      error: result.error
    })
    
    // ⭐ 打印飞书返回的原始事件详情
    if (result.events && result.events.length > 0) {
      console.log('⭐ Feishu returned events:', result.events.map((e: any) => ({
        event_id: e.event_id,
        summary: e.summary,
        status: e.status,
        updated_time: e.updated_time,
        start_time: e.start_time?.timestamp
      })))
    }

    if (!result.success) {
      throw new Error(result.error || 'Incremental sync failed')
    }

    const stats = { added: 0, updated: 0, deleted: 0, uploaded: 0 }
    const localEvents = this.loadEventsFromLocalStorage()
    
    // ⭐ 记录本次同步中飞书返回的事件 ID，用于检测本地独有的事件
    const feishuEventIds = new Set<string>()

    // 处理变更：飞书 → 本地
    for (const feishuEvent of result.events) {
      // ⭐ 跳过已取消的日程
      if (feishuEvent.status === 'cancelled') {
        continue
      }
      
      feishuEventIds.add(feishuEvent.event_id)
      
      const localEvent = findLocalByFeishuId(localEvents, feishuEvent.event_id)

      if (!localEvent) {
        // 新增日程：飞书有，本地没有 → 添加到本地
        const newEvent = convertToLocalEvent(feishuEvent)
        localEvents.push(newEvent)
        stats.added++
      } else {
        // 判断冲突：以最后更新时间为准
        const feishuUpdateTime = parseInt(feishuEvent.updated_time) * 1000
        const localUpdateTime = localEvent.lastSyncTime || 0

        if (feishuUpdateTime > localUpdateTime) {
          // 飞书更新更晚，覆盖本地
          const updatedEvent = convertToLocalEvent(feishuEvent)
          updatedEvent.id = localEvent.id // 保持本地 ID
          const index = localEvents.findIndex(e => e.id === localEvent.id)
          if (index !== -1) {
            localEvents[index] = updatedEvent
          }
          stats.updated++
        } else {
          // 本地更新更晚，同步到飞书
          await this.syncUpdateToFeishu(localEvent)
        }
      }
    }
    
    // ⭐ 本地独有的事件：上传到飞书
    const localOnlyEvents = localEvents.filter(event => 
      !event.feishuEventId // 没有飞书 ID，说明是本地独有的
    )
    
    for (const event of localOnlyEvents) {
      const success = await this.syncCreateToFeishu(event)
      if (success) {
        stats.uploaded++
      }
    }

    // 保存更新后的本地数据
    this.saveEventsToLocalStorage(localEvents)

    // 保存新的 sync_token
    if (result.sync_token) {
      this.syncToken = result.sync_token
      saveSyncToken(result.sync_token)
    }

    return stats
  }

  /**
   * 同步单个日程到飞书（创建）
   */
  async syncCreateToFeishu(event: CalendarEvent): Promise<boolean> {
    try {
      const startTimeStamp = toFeishuTimestamp(event.date, event.time)
      const endTimeStamp = Math.floor(new Date(event.endTime!).getTime() / 1000)
      
      // ⭐ 在 description 中添加优先级标记
      const priorityMarker = event.importance !== 'medium' 
        ? `[优先级：${event.importance}]\n` 
        : ''
      
      const feishuEventData = {
        summary: event.title,  // ✅ 无前缀
        description: priorityMarker + (event.description || ''),
        start_time: {
          timestamp: startTimeStamp,
          timezone: 'Asia/Shanghai'
        },
        end_time: {
          timestamp: endTimeStamp,
          timezone: 'Asia/Shanghai'
        },
        // ⭐ location 作为对象传递（飞书 API 要求 event_location 类型）
        location: event.location ? { name: event.location } : undefined,
        need_notification: false
      }
      
      const result = await window.api.feishu.createEvent(
        this.calendarId,
        feishuEventData
      )

      if (result.success && result.event) {
        // ⭐ 关键：保存飞书返回的 event_id
        event.feishuEventId = result.event.event_id
        event.lastSyncTime = Date.now()
        
        // 更新本地存储
        this.updateLocalEvent(event)
        
        return true
      }
      
      console.error('❌ Failed to create in Feishu:', result.error)
      return false
    } catch (error) {
      console.error('Sync create to Feishu failed:', error)
      return false
    }
  }

  /**
   * 同步单个日程到飞书（更新）
   */
  async syncUpdateToFeishu(event: CalendarEvent): Promise<boolean> {
    try {
      // ⭐ 防御性检查：如果没有 feishuEventId，转为创建
      if (!event.feishuEventId) {
        return await this.syncCreateToFeishu(event)
      }
      
      const updateData: any = {}
      
      // ⭐ 只包含要更新的字段
      if (event.title) {
        updateData.summary = event.title
      }
      // ⭐ 如果 description 或 importance 有变化，需要重新构建 description（包含优先级标记）
      if (event.description !== undefined || event.importance) {
        const priorityMarker = event.importance !== 'medium' 
          ? `[优先级：${event.importance}]\n` 
          : ''
        updateData.description = priorityMarker + (event.description || '')
      }
      if (event.date && event.time) {
        updateData.start_time = {
          timestamp: toFeishuTimestamp(event.date, event.time),
          timezone: 'Asia/Shanghai'
        }
      }
      if (event.endTime) {
        updateData.end_time = {
          timestamp: Math.floor(new Date(event.endTime).getTime() / 1000),
          timezone: 'Asia/Shanghai'
        }
      }
      // ⭐ location 字段需要特殊处理：飞书 API 要求 location 是对象或省略
      if (event.location && event.location.trim()) {
        updateData.location = { name: event.location }
      }
      
      const result = await window.api.feishu.updateEvent(
        this.calendarId,
        event.feishuEventId,
        updateData
      )
      
      if (result.success) {
        event.lastSyncTime = Date.now()
        this.updateLocalEvent(event)
        return true
      }
      return false
    } catch (error) {
      console.error('Sync update to Feishu failed:', error)
      return false
    }
  }

  /**
   * 从飞书删除日程
   */
  async syncDeleteFromFeishu(event: CalendarEvent): Promise<boolean> {
    try {
      // ⭐ 防御性检查：如果没有 feishuEventId，无需删除
      if (!event.feishuEventId) {
        return true
      }
      
      await window.api.feishu.deleteEvent(
        this.calendarId,
        event.feishuEventId
      )
      
      return true
    } catch (error) {
      console.error('Sync delete from Feishu failed:', error)
      return false
    }
  }

  /**
   * 获取同步状态
   */
  getStatus(): SyncStatus {
    return {
      syncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      error: null
    }
  }

  /**
   * 从 localStorage 加载事件
   * @returns 日程列表
   */
  private loadEventsFromLocalStorage(): CalendarEvent[] {
    const eventsStr = localStorage.getItem('calendar-events')
    return eventsStr ? JSON.parse(eventsStr) : []
  }

  /**
   * 保存事件到 localStorage
   * @param events 日程列表
   */
  private saveEventsToLocalStorage(events: CalendarEvent[]): void {
    localStorage.setItem('calendar-events', JSON.stringify(events))
  }

  /**
   * 更新单个事件
   */
  private updateLocalEvent(event: CalendarEvent): void {
    const events = this.loadEventsFromLocalStorage()
    const index = events.findIndex(e => e.id === event.id)
    if (index !== -1) {
      events[index] = event
      this.saveEventsToLocalStorage(events)
    }
  }
}
