/**
 * 同步队列管理工具（增强版 - 支持智能合并和串行处理）
 * 
 * 特性：
 * 1. 串行处理：避免并发冲突
 * 2. 智能合并：同一日程的多次更新只保留最后一次
 * 3. 优先级队列：删除 > 创建 > 更新
 * 4. 失败重试：自动重试机制
 */

import { CalendarEvent } from '../types'

/** 同步操作类型 */
export type SyncAction = 'create' | 'update' | 'delete'

/** 同步任务 */
export interface SyncTask {
  id: string           // 任务唯一 ID
  eventId: string      // 日程 ID
  event: CalendarEvent // 日程数据
  action: SyncAction   // 操作类型
  timestamp: number    // 创建时间戳
  priority: number     // 优先级（数字越小优先级越高）
  retryCount: number   // 重试次数
}

/** 配置参数 */
interface SyncQueueConfig {
  maxRetries: number      // 最大重试次数
  retryDelay: number      // 重试延迟（毫秒）
  mergeWindow: number     // 合并时间窗口（毫秒）
  processDelay: number    // 队列处理间隔（毫秒）
}

/** 默认配置 */
const DEFAULT_CONFIG: SyncQueueConfig = {
  maxRetries: 3,
  retryDelay: 5000,
  mergeWindow: 5000,     // 扩大到 5 秒，避免短时间内重复添加
  processDelay: 100
}

/** 同步队列管理器类 */
export class SyncQueueManager {
  private static readonly STORAGE_KEY = 'sync-queue-v2'
  private queue: SyncTask[] = []
  private isProcessing: boolean = false
  private currentTask: SyncTask | null = null
  private config: SyncQueueConfig = DEFAULT_CONFIG

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 获取任务优先级
   * 数字越小优先级越高
   */
  private getPriority(action: SyncAction): number {
    switch (action) {
      case 'delete':
        return 1  // 删除优先级最高
      case 'create':
        return 2  // 创建优先级中等
      case 'update':
        return 3  // 更新优先级最低
    }
  }

  /**
   * 按优先级插入队列
   */
  private insertByPriority(task: SyncTask): void {
    const index = this.queue.findIndex(t => t.priority > task.priority)
    if (index === -1) {
      this.queue.push(task)
    } else {
      this.queue.splice(index, 0, task)
    }
  }

  /**
   * 添加任务到队列（带智能合并）
   */
  add(event: CalendarEvent, action: SyncAction): void {
    const task: SyncTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId: event.id,
      event,
      action,
      timestamp: Date.now(),
      priority: this.getPriority(action),
      retryCount: 0
    }

    // 智能合并：检查是否有同一日程的待处理任务
    const existingIndex = this.queue.findIndex(t => t.eventId === event.id)

    if (existingIndex !== -1) {
      const existingTask = this.queue[existingIndex]

      // 同一事件同一操作 → 直接替换为最新版本（无论时间窗口）
      if (existingTask.action === action) {
        console.log(`🔄 合并重复任务：${event.id} (${action})`)
        this.queue[existingIndex] = task
        this.saveToStorage()
        return
      }

      // 不同操作 → 检查时间窗口（5 秒内的更新才合并）
      if (task.timestamp - existingTask.timestamp < this.config.mergeWindow) {
        console.log(`🔄 合并跨操作任务：${event.id} (${existingTask.action} → ${action})`)
        this.queue[existingIndex] = task
        this.saveToStorage()
        return
      }
    }

    // 没有重复，按优先级插入队列
    this.insertByPriority(task)
    this.saveToStorage()
    console.log(`📝 添加到同步队列：${action} - ${event.title} (优先级：${task.priority})`)
    //  不再自动处理，等待手动同步或定时同步时处理
  }

  /**
   * 串行处理队列
   */
  async processQueue(): Promise<void> {
    // 防止并发处理
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      // 取出第一个任务
      const task = this.queue[0]
      this.currentTask = task

      try {
        // 执行同步（由 SyncManager 提供回调）
        const success = await this.executeTask(task)

        if (success) {
          // 成功：从队列移除
          this.queue.shift()
          console.log(`✅ 同步成功：${task.event.title}`)
          
          // ⭐ 立即保存到 localStorage
          this.saveToStorage()
        } else {
          // 失败：加入重试队列
          this.retryTask(task, new Error('同步失败'))
        }
      } catch (error) {
        // 异常：加入重试队列
        this.retryTask(task, error as Error)
      }

      // 清空当前任务
      this.currentTask = null

      // 小延迟，避免过快请求
      await this.delay(this.config.processDelay)
    }

    this.isProcessing = false
  }

  /**
   * 执行单个同步任务（回调给 SyncManager）
   */
  private async executeTask(task: SyncTask): Promise<boolean> {
    // 这个方法会被 SyncManager 覆盖
    // 这里只是一个占位实现
    console.log(`⏳ 准备执行任务：${task.action} - ${task.event.title}`)
    return true
  }

  /**
   * 设置任务执行器（由 SyncManager 调用）
   */
  setTaskExecutor(executor: (task: SyncTask) => Promise<boolean>): void {
    this.executeTask = executor
  }

  /**
   * 失败重试
   */
  private retryTask(task: SyncTask, error: Error): void {
    task.retryCount++

    if (task.retryCount >= this.config.maxRetries) {
      // 超过最大重试次数，从队列移除并记录错误
      this.queue.shift()
      console.error(`❌ 重试 ${task.retryCount} 次失败，放弃任务：${task.event.title}`, error)
    } else {
      // 加入重试队列（带延迟）
      console.warn(`⚠️ 同步失败，${this.config.retryDelay}ms 后重试：${task.event.title}`)
      setTimeout(() => {
        this.queue.push(task)
        this.processQueue()
      }, this.config.retryDelay)
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取所有待同步项目
   */
  getAll(): SyncTask[] {
    return [...this.queue]
  }

  /**
   * 获取待同步项目数量
   */
  getCount(): number {
    return this.queue.length
  }

  /**
   * 获取当前处理状态
   */
  getProcessingStatus(): { isProcessing: boolean; currentTask: SyncTask | null } {
    return {
      isProcessing: this.isProcessing,
      currentTask: this.currentTask
    }
  }

  /**
   * 移除已完成的同步项目
   */
  remove(eventId: string): void {
    this.queue = this.queue.filter(item => item.eventId !== eventId)
    this.saveToStorage()
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = []
    this.saveToStorage()
    console.log('✅ 同步队列已清空')
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(SyncQueueManager.STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('保存同步队列失败:', error)
    }
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SyncQueueManager.STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        console.log(`📂 从本地存储加载了 ${this.queue.length} 个待同步项目`)
      }
    } catch (error) {
      console.error('加载同步队列失败:', error)
      this.queue = []
    }
  }

  /**
   * 获取队列统计信息
   */
  getStats(): { total: number; create: number; update: number; delete: number; processing: boolean } {
    return {
      total: this.queue.length,
      create: this.queue.filter(item => item.action === 'create').length,
      update: this.queue.filter(item => item.action === 'update').length,
      delete: this.queue.filter(item => item.action === 'delete').length,
      processing: this.isProcessing
    }
  }
}

// 导出单例
export const syncQueue = new SyncQueueManager()

