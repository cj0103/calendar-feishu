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
    console.log('SyncManager initialized', {
      hasToken: !!this.syncToken,
      lastSyncTime: this.lastSyncTime
    })
  }

  /**
   * 执行同步
   */
  async sync(): Promise<SyncResult> {
    console.log('🔍 [SYNC DEBUG] sync() called')
    
    if (this.isSyncing) {
      console.log('⚠️ [SYNC DEBUG] Sync already in progress')
      return { added: 0, updated: 0, deleted: 0, uploaded: 0 }
    }

    this.isSyncing = true
    console.log('🔄 Starting sync...', {
      hasToken: !!this.syncToken,
      calendarId: this.calendarId
    })
    
    try {
      let result: SyncResult

      if (!this.syncToken) {
        // 没有 sync_token，执行初次同步
        console.log('📥 Performing initial sync (no sync_token)')
        result = await this.initialSync()
      } else {
        // 增量同步
        console.log('📥 Performing incremental sync (has sync_token)')
        console.log('📥 Current sync_token:', this.syncToken)
        result = await this.incrementalSync()
      }

      this.lastSyncTime = Date.now()
      saveLastSyncTime(this.lastSyncTime)
      
      console.log('✅ Sync completed:', result)

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

    console.log('Initial sync result:', result)

    if (!result.success) {
      throw new Error(result.error || 'Initial sync failed')
    }

    // 确保 events 是数组
    const events = Array.isArray(result.events) ? result.events : []
    console.log('Got events:', events.length, 'items')
    
    // ⭐ 过滤掉已取消的日程
    const validEvents = events.filter(event => event.status !== 'cancelled')
    console.log('Valid events (after filtering cancelled):', validEvents.length, 'items')

    // 转换为本地格式
    const localEvents: CalendarEvent[] = validEvents.map(feishuEvent =>
      convertToLocalEvent(feishuEvent)
    )

    console.log('Converted local events:', localEvents.length, 'items')
    if (localEvents.length > 0) {
      console.log('First event:', {
        id: localEvents[0].id,
        title: localEvents[0].title,
        feishuEventId: localEvents[0].feishuEventId,
        date: localEvents[0].date
      })
    }

    // 保存到本地
    this.saveEventsToLocalStorage(localEvents)
    console.log('Saved to localStorage')
    
    // ⭐ 验证保存的数据
    const savedData = localStorage.getItem('calendar-events')
    if (savedData) {
      const parsed = JSON.parse(savedData)
      console.log('⭐ Verification - Saved events:', parsed.length, 'items')
      if (parsed.length > 0) {
        console.log('⭐ First saved event:', {
          id: parsed[0].id,
          title: parsed[0].title,
          feishuEventId: parsed[0].feishuEventId,
          date: parsed[0].date
        })
      }
    }

    // 保存 sync_token
    if (result.sync_token) {
      this.syncToken = result.sync_token
      saveSyncToken(result.sync_token)
      console.log('Saved sync_token:', this.syncToken)
    }

    console.log('Initial sync completed', {
      added: localEvents.length,
      sync_token: this.syncToken
    })

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
        console.log('⏭️ Skipped cancelled event:', feishuEvent.event_id, feishuEvent.summary)
        continue
      }
      
      feishuEventIds.add(feishuEvent.event_id)
      
      const localEvent = findLocalByFeishuId(localEvents, feishuEvent.event_id)

      if (!localEvent) {
        // 新增日程：飞书有，本地没有 → 添加到本地
        const newEvent = convertToLocalEvent(feishuEvent)
        localEvents.push(newEvent)
        stats.added++
        console.log('➕ Added new event (from Feishu):', newEvent.title)
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
          console.log('🔄 Updated event (from Feishu):', updatedEvent.title)
        } else {
          // 本地更新更晚，同步到飞书
          console.log('⏩ Local event is newer, sync to Feishu:', localEvent.title)
          await this.syncUpdateToFeishu(localEvent)
        }
      }
    }
    
    // ⭐ 本地独有的事件：上传到飞书
    const localOnlyEvents = localEvents.filter(event => 
      !event.feishuEventId // 没有飞书 ID，说明是本地独有的
    )
    
    for (const event of localOnlyEvents) {
      console.log('⬆️ Uploading local-only event to Feishu:', event.title)
      const success = await this.syncCreateToFeishu(event)
      if (success) {
        stats.uploaded++
        console.log('✅ Uploaded to Feishu:', event.title, '→ ID:', event.feishuEventId)
      } else {
        console.error('❌ Failed to upload to Feishu:', event.title)
      }
    }

    // 保存更新后的本地数据
    this.saveEventsToLocalStorage(localEvents)

    // 保存新的 sync_token
    if (result.sync_token) {
      this.syncToken = result.sync_token
      saveSyncToken(result.sync_token)
    }

    console.log('Incremental sync completed', stats)
    return stats
  }

  /**
   * 同步单个日程到飞书（创建）
   */
  async syncCreateToFeishu(event: CalendarEvent): Promise<boolean> {
    try {
      console.log('📤 Creating event in Feishu:', {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        hasFeishuId: !!event.feishuEventId
      })
      
      const startTimeStamp = toFeishuTimestamp(event.date, event.time)
      const endTimeStamp = Math.floor(new Date(event.endTime!).getTime() / 1000)
      
      console.log('⏰ Time conversion:', {
        date: event.date,
        time: event.time,
        startTimeStamp,
        endTime: event.endTime,
        endTimeStamp
      })
      
      const feishuEventData = {
        summary: event.title,
        description: event.description || '',
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

      console.log('📦 Request data:', JSON.stringify(feishuEventData, null, 2))
      
      const result = await window.api.feishu.createEvent(
        this.calendarId,
        feishuEventData
      )

      console.log('📥 API response:', result)
      console.log('⭐ Response structure:', {
        hasEvent: !!result.event,
        eventKeys: result.event ? Object.keys(result.event) : [],
        eventId: result.event?.event_id,
        fullEvent: result.event
      })
      console.log('⭐ Full event JSON:', JSON.stringify(result.event, null, 2))

      if (result.success && result.event) {
        // ⭐ 关键：保存飞书返回的 event_id
        console.log('⭐ Saving event_id:', result.event.event_id)
        event.feishuEventId = result.event.event_id
        event.lastSyncTime = Date.now()
        
        // 更新本地存储
        this.updateLocalEvent(event)
        
        console.log('✅ Created in Feishu:', {
          localId: event.id,
          feishuId: event.feishuEventId,
          title: event.title
        })
        
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
        console.warn('⚠️ Event has no feishuEventId, creating instead of updating')
        return await this.syncCreateToFeishu(event)
      }
      
      console.log('📤 Updating event in Feishu:', {
        localId: event.id,
        feishuId: event.feishuEventId,
        title: event.title,
        date: event.date,
        time: event.time
      })
      
      const updateData: any = {}
      
      // ⭐ 只包含要更新的字段
      if (event.title) {
        updateData.summary = event.title
      }
      if (event.description !== undefined) {
        updateData.description = event.description
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
      if (event.location !== undefined) {
        // ⭐ location 作为字符串传递（飞书 API 要求）
        updateData.location = event.location || ''
      }
      
      const result = await window.api.feishu.updateEvent(
        this.calendarId,
        event.feishuEventId,
        updateData
      )
      
      if (result.success) {
        event.lastSyncTime = Date.now()
        this.updateLocalEvent(event)
        console.log('✅ Updated in Feishu:', {
          localId: event.id,
          feishuId: event.feishuEventId,
          title: event.title
        })
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
        console.warn('⚠️ Event has no feishuEventId, skip deletion')
        return true
      }
      
      console.log('🗑️ Deleting event from Feishu:', {
        localId: event.id,
        feishuId: event.feishuEventId,
        title: event.title
      })
      
      await window.api.feishu.deleteEvent(
        this.calendarId,
        event.feishuEventId
      )
      
      console.log('✅ Deleted from Feishu:', {
        localId: event.id,
        feishuId: event.feishuEventId,
        title: event.title
      })
      
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
