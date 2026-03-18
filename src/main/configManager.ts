/**
 * 飞书配置管理器
 * 
 * 负责管理用户配置的加载、保存和读取
 * 用户配置保存在用户数据目录，不会打包到 release 中
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * 飞书用户配置接口
 */
export interface FeishuUserConfig {
  appId: string
  appSecret: string
  calendarId?: string
  lastUpdated?: string
}

/**
 * 配置管理器类
 */
class ConfigManager {
  private configPath: string
  private userConfig: FeishuUserConfig | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'feishu-user-config.json')
  }

  /**
   * 加载用户配置
   * 优先从内存读取，如果没有则从文件加载
   */
  async loadUserConfig(): Promise<FeishuUserConfig | null> {
    // 如果内存中已有配置，直接返回
    if (this.userConfig) {
      return this.userConfig
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        this.userConfig = JSON.parse(data)
        console.log('✅ 加载用户配置成功:', this.configPath)
        return this.userConfig
      }
    } catch (error) {
      console.error('❌ 加载用户配置失败:', error)
    }
    
    console.log('⚠️ 未找到用户配置')
    return null
  }

  /**
   * 保存用户配置
   * 保存到用户数据目录的 JSON 文件
   */
  async saveUserConfig(config: FeishuUserConfig): Promise<boolean> {
    try {
      // 添加更新时间戳
      config.lastUpdated = new Date().toISOString()
      
      // 确保目录存在
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // 写入配置文件
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
      this.userConfig = config
      
      console.log('✅ 用户配置已保存:', this.configPath)
      return true
    } catch (error) {
      console.error('❌ 保存用户配置失败:', error)
      return false
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): FeishuUserConfig | null {
    return this.userConfig
  }

  /**
   * 检查是否有有效的用户配置
   * Calendar ID 是可选的，所以只检查 App ID 和 App Secret
   */
  hasUserConfig(): boolean {
    return (
      this.userConfig !== null &&
      this.userConfig.appId !== '' &&
      this.userConfig.appId !== 'YOUR_APP_ID_HERE' &&
      this.userConfig.appSecret !== ''
    )
  }

  /**
   * 删除用户配置（重置）
   */
  async deleteUserConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath)
      }
      this.userConfig = null
      console.log('✅ 已删除用户配置')
    } catch (error) {
      console.error('❌ 删除用户配置失败:', error)
    }
  }
}

// 导出单例
export const configManager = new ConfigManager()
