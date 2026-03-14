import axios, { AxiosInstance } from 'axios'
import CryptoJS from 'crypto-js'
import { FEISHU_CONFIG } from './feishuConfig'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
}

class FeishuAuth {
  private token: TokenData | null = null
  private readonly TOKEN_FILE_PATH = join(__dirname, '../../token.json')
  private readonly ENCRYPTION_KEY = 'feishu_calendar_secret_key_2024'

  /**
   * 获取授权 URL
   */
  getAuthorizeUrl(): string {
    const params = new URLSearchParams({
      app_id: FEISHU_CONFIG.appId,
      redirect_uri: FEISHU_CONFIG.redirectUri,
      state: this.generateState()
    })
    return `${FEISHU_CONFIG.authUrl}?${params.toString()}`
  }

  /**
   * 通过授权码获取 token
   */
  async getTokenByCode(code: string): Promise<TokenData> {
    try {
      const response = await axios.post(
        `${FEISHU_CONFIG.apiBaseUrl}/authen/v1/access_token`,
        {
          grant_type: 'authorization_code',
          code
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          auth: {
            username: FEISHU_CONFIG.appId,
            password: FEISHU_CONFIG.appSecret
          }
        }
      )

      if (response.data.code === 0) {
        const tokenData: TokenData = {
          access_token: response.data.data.access_token,
          refresh_token: response.data.data.refresh_token,
          expires_in: response.data.data.expires_in,
          expires_at: Date.now() + response.data.data.expires_in * 1000
        }
        this.saveToken(tokenData)
        return tokenData
      } else {
        throw new Error(response.data.msg || '获取 token 失败')
      }
    } catch (error: any) {
      console.error('获取 token 失败:', error)
      throw new Error(error.message || '获取 token 失败')
    }
  }

  /**
   * 刷新 token
   */
  async refreshToken(): Promise<TokenData> {
    const savedToken = this.loadToken()
    if (!savedToken || !savedToken.refresh_token) {
      throw new Error('没有可用的 refresh token')
    }

    try {
      const response = await axios.post(
        `${FEISHU_CONFIG.apiBaseUrl}/authen/v1/refresh_access_token`,
        {
          grant_type: 'refresh_token',
          refresh_token: savedToken.refresh_token
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          auth: {
            username: FEISHU_CONFIG.appId,
            password: FEISHU_CONFIG.appSecret
          }
        }
      )

      if (response.data.code === 0) {
        const tokenData: TokenData = {
          access_token: response.data.data.access_token,
          refresh_token: response.data.data.refresh_token || savedToken.refresh_token,
          expires_in: response.data.data.expires_in,
          expires_at: Date.now() + response.data.data.expires_in * 1000
        }
        this.saveToken(tokenData)
        return tokenData
      } else {
        throw new Error(response.data.msg || '刷新 token 失败')
      }
    } catch (error: any) {
      console.error('刷新 token 失败:', error)
      throw new Error(error.message || '刷新 token 失败')
    }
  }

  /**
   * 获取 tenant_access_token（应用身份）
   */
  async getTenantAccessToken(): Promise<{ tenant_access_token: string; expire: number }> {
    try {
      console.log('🔑 请求 tenant_access_token，使用 App ID:', FEISHU_CONFIG.appId)
      const response = await axios.post(
        `${FEISHU_CONFIG.apiBaseUrl}/auth/v3/tenant_access_token/internal`,
        {
          app_id: FEISHU_CONFIG.appId,
          app_secret: FEISHU_CONFIG.appSecret
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('📥 tenant_access_token 响应状态码:', response.data.code)
      
      if (response.data.code === 0) {
        console.log('✅ 成功获取 tenant_access_token')
        return {
          tenant_access_token: response.data.tenant_access_token,
          expire: response.data.expire
        }
      } else {
        console.error('❌ 获取 tenant_access_token 失败:', response.data.msg)
        console.error('错误详情:', response.data)
        throw new Error(`获取授权失败：${response.data.msg || '未知错误'}\n\n请检查：\n1. App ID 和 App Secret 是否正确\n2. 应用是否已发布\n3. 是否添加了"获取 tenant_access_token"权限`)
      }
    } catch (error: any) {
      console.error('❌ 获取 tenant_access_token 异常:', error)
      if (error.response) {
        console.error('HTTP 错误响应:', error.response.data)
        console.error('HTTP 状态码:', error.response.status)
      }
      throw new Error(error.message || '获取 tenant_access_token 失败')
    }
  }

  /**
   * 获取有效的 access token（自动刷新）
   */
  async getAccessToken(): Promise<string> {
    const token = this.loadToken()
    if (!token) {
      throw new Error('未登录，请先授权')
    }

    // 如果 token 已过期（提前 5 分钟刷新）
    if (token.expires_at < Date.now() + 5 * 60 * 1000) {
      const newToken = await this.refreshToken()
      return newToken.access_token
    }

    return token.access_token
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    const token = this.loadToken()
    if (!token) return false
    return token.expires_at > Date.now()
  }

  /**
   * 退出登录
   */
  logout(): void {
    if (existsSync(this.TOKEN_FILE_PATH)) {
      try {
        writeFileSync(this.TOKEN_FILE_PATH, JSON.stringify({}))
      } catch (error) {
        console.error('清除 token 失败:', error)
      }
    }
    this.token = null
  }

  /**
   * 保存 token（加密存储）
   */
  private saveToken(tokenData: TokenData): void {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(tokenData),
        this.ENCRYPTION_KEY
      ).toString()
      writeFileSync(this.TOKEN_FILE_PATH, JSON.stringify({ token: encrypted }))
      this.token = tokenData
    } catch (error) {
      console.error('保存 token 失败:', error)
    }
  }

  /**
   * 加载 token（解密读取）
   */
  private loadToken(): TokenData | null {
    try {
      if (!existsSync(this.TOKEN_FILE_PATH)) {
        return null
      }
      
      const data = readFileSync(this.TOKEN_FILE_PATH, 'utf8')
      const parsed = JSON.parse(data)
      const encrypted = parsed.token
      
      if (!encrypted) return null

      const bytes = CryptoJS.AES.decrypt(encrypted, this.ENCRYPTION_KEY)
      const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
      this.token = decrypted
      return decrypted
    } catch (error) {
      console.error('加载 token 失败:', error)
      return null
    }
  }

  /**
   * 生成随机 state 参数
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

export const feishuAuth = new FeishuAuth()
