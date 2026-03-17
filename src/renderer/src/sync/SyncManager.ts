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
import { isOnline } from '../utils/networkUtils'
import { syncQueue, SyncAction } from './syncQueue'

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
   * 执行同步任务（由队列调用）
   */
  private async executeSyncTask(task: { action: string; event: CalendarEvent }): Promise<boolean> {
    console.log(`⏳ 执行同步任务：${task.action} - ${task.event.title}`)
    
    try {
      switch (task.action) {
        case 'create': {
          const startTimeStamp = toFeishuTimestamp(task.event.date, task.event.time)
          const endTimeStamp = Math.floor(new Date(task.event.endTime!).getTime() / 1000)
          
          const priorityMarker = task.event.importance !== 'medium' 
            ? `[优先级：${task.event.importance}]\n` 
            : ''
          
          const feishuEventData = {
            summary: task.event.title,
            description: priorityMarker + (task.event.description || ''),
            start_time: {
              timestamp: startTimeStamp,
              timezone: 'Asia/Shanghai'
            },
            end_time: {
              timestamp: endTimeStamp,
              timezone: 'Asia/Shanghai'
            },
            location: task.event.location ? { name: task.event.location } : undefined,
            need_notification: false
          }
          
          const result = await window.api.feishu.createEvent(
            this.calendarId,
            feishuEventData
          )

          if (result.success && result.event) {
            task.event.feishuEventId = result.event.event_id
            task.event.lastSyncTime = Date.now()
            this.updateLocalEvent(task.event)
            console.log(`✅ 创建成功：${task.event.title}`)
            return true
          }
          
          console.error('❌ 创建失败:', result.error)
          return false
        }
        
        case 'update': {
          if (!task.event.feishuEventId) {
            console.warn('⚠️ 无飞书 ID，转为创建')
            return await this.executeSyncTask({ ...task, action: 'create' })
          }
          
          const updateData: any = {}
          
          if (task.event.title) {
            updateData.summary = task.event.title
          }
          
          if (task.event.description !== undefined || task.event.importance) {
            const priorityMarker = task.event.importance !== 'medium' 
              ? `[优先级：${task.event.importance}]\n` 
              : ''
            updateData.description = priorityMarker + (task.event.description || '')
          }
          
          if (task.event.date && task.event.time) {
            updateData.start_time = {
              timestamp: toFeishuTimestamp(task.event.date, task.event.time),
              timezone: 'Asia/Shanghai'
            }
          }
          
          if (task.event.endTime) {
            updateData.end_time = {
              timestamp: Math.floor(new Date(task.event.endTime).getTime() / 1000),
              timezone: 'Asia/Shanghai'
            }
          }
          
          if (task.event.location && task.event.location.trim()) {
            updateData.location = { name: task.event.location }
          }
          
          const result = await window.api.feishu.updateEvent(
            this.calendarId,
            task.event.feishuEventId,
            updateData
          )
          
          if (result.success) {
            task.event.lastSyncTime = Date.now()
            this.updateLocalEvent(task.event)
            console.log(`✅ 更新成功：${task.event.title}`)
            return true
          }
          
          console.error('❌ 更新失败:', result.error)
          return false
        }
        
        case 'delete': {
          if (!task.event.feishuEventId) {
            console.warn('⚠️ 无飞书 ID，无需删除')
            return true
          }
          
          await window.api.feishu.deleteEvent(
            this.calendarId,
            task.event.feishuEventId
          )
          
          console.log(`✅ 删除成功：${task.event.title}`)
          return true
        }
        
        default:
          console.error('❌ 未知任务类型:', task.action)
          return false
      }
    } catch (error) {
      console.error('❌ 同步任务失败:', error)
      return false
    }
  }

  /**
   * 创建同步管理器实例
   * @param calendarId 飞书日历 ID
   */
  constructor(calendarId: string = FEISHU_CONFIG.calendarId) {
    this.calendarId = calendarId
    this.initialize()
    
    // 设置队列任务执行器
    syncQueue.setTaskExecutor(async (task) => {
      return await this.executeSyncTask(task)
    })
  }

  /**
   * 初始化同步管理器
   * - 从 localStorage 加载 sync_token
   * - 从 localStorage 加载最后同步时间
   * - 启动时只添加本地独有的数据到队列（没有 feishuEventId）
   */
  async initialize(): Promise<void> {
    this.syncToken = loadSyncToken()
    this.lastSyncTime = loadLastSyncTime()
    
    // 启动时只添加本地独有的数据到队列（没有 feishuEventId）
    const localEvents = this.loadEventsFromLocalStorage()
    const localOnlyEvents = localEvents.filter(e => !e.feishuEventId)
    
    for (const event of localOnlyEvents) {
      syncQueue.add(event, 'create')
    }
    
    console.log(`📝 启动时添加了 ${localOnlyEvents.length} 个本地独有事件到队列`)
  }

  /**
   * 执行同步
   * 简化逻辑：只处理队列中的本地 → 飞书同步
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { added: 0, updated: 0, deleted: 0, uploaded: 0 }
    }

    this.isSyncing = true
    
    try {
      // 只处理队列，不再从飞书同步
      const queueStats = syncQueue.getStats()
      
      console.log(`📝 当前队列：${queueStats.total} 个任务`)
      
      // 队列会自动处理，这里只返回统计
      return {
        added: 0,
        updated: 0,
        deleted: 0,
        uploaded: queueStats.create + queueStats.update
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 初次全量同步（保留用于首次使用）
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
    
    // 保存 sync_token
    if (result.sync_token) {
      this.syncToken = result.sync_token
      saveSyncToken(result.sync_token)
    }

    return { added: localEvents.length, updated: 0, deleted: 0 }
  }

  /**
   * 同步单个日程到飞书（创建）
   * 直接加入队列，由队列统一调度
   * @returns 是否成功加入队列
   */
  async syncCreateToFeishu(event: CalendarEvent): Promise<boolean> {
    // 检查队列中是否已有该事件
    const existingTasks = syncQueue.getAll()
    const alreadyInQueue = existingTasks.some(task => 
      task.eventId === event.id && task.action === 'create'
    )
    
    if (!alreadyInQueue) {
      syncQueue.add(event, 'create')
      return true  // 成功加入队列
    } else {
      console.log(`⏭️ 事件已在队列中，跳过：${event.title}`)
      return false  // 已在队列中
    }
  }

  /**
   * 同步单个日程到飞书（更新）
   * 直接加入队列，由队列统一调度
   * @returns 是否成功加入队列
   */
  async syncUpdateToFeishu(event: CalendarEvent): Promise<boolean> {
    // 检查队列中是否已有该事件
    const existingTasks = syncQueue.getAll()
    const alreadyInQueue = existingTasks.some(task => 
      task.eventId === event.id && (task.action === 'update' || task.action === 'create')
    )
    
    if (!alreadyInQueue) {
      syncQueue.add(event, 'update')
      return true  // 成功加入队列
    } else {
      console.log(`⏭️ 事件已在队列中，跳过：${event.title}`)
      return false  // 已在队列中
    }
  }

  /**
   * 从飞书删除日程
   * 直接加入队列，由队列统一调度
   */
  async syncDeleteFromFeishu(event: CalendarEvent): Promise<void> {
    // 直接加入队列，不立即执行
    syncQueue.add(event, 'delete')
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
   * 获取同步队列统计
   */
  getPendingQueueStats() {
    return syncQueue.getStats()
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
    console.log(`📝 更新本地事件：${event.id} (${event.title}), feishuEventId: ${event.feishuEventId}`)
    
    const events = this.loadEventsFromLocalStorage()
    const index = events.findIndex(e => e.id === event.id)
    if (index !== -1) {
      console.log(`  - 找到事件，索引：${index}, 原 feishuEventId: ${events[index].feishuEventId}`)
      events[index] = event
      this.saveEventsToLocalStorage(events)
      
      // 验证保存
      const saved = localStorage.getItem('calendar-events')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const savedEvent = parsed.find((e: any) => e.id === event.id)
          if (savedEvent?.feishuEventId !== event.feishuEventId) {
            console.error(`❌ 保存失败！feishuEventId 未正确保存`)
            console.log(`  - 期望：${event.feishuEventId}, 实际：${savedEvent?.feishuEventId}`)
          } else {
            console.log(`  - ✅ 保存成功！feishuEventId: ${savedEvent?.feishuEventId}`)
          }
        } catch (error) {
          console.error('❌ 解析保存的数据失败:', error)
        }
      }
    } else {
      console.warn(`⚠️ 未找到事件，无法更新：${event.id}`)
    }
  }
}
