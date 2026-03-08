/**
 * 飞书日历配置 - 示例文件
 * 
 * ⚠️ 重要提示：
 * 1. 请勿将此文件与真实凭证一起提交到 Git！
 * 2. 真实配置应保存在 feishuConfig.ts 中，该文件已在 .gitignore 中排除
 * 3. 使用此模板创建您的配置
 * 
 * 使用说明：
 * 1. 复制此文件并重命名为 feishuConfig.ts
 * 2. 访问 https://open.feishu.cn/ 登录飞书账号
 * 3. 创建企业自建应用，添加日历权限
 * 4. 在"凭证与基础信息"页面获取 App ID 和 App Secret
 * 5. 创建共享日历（用于存储同步的日程）
 * 6. 将获取的凭证和日历 ID 填入 feishuConfig.ts 对应位置
 * 7. 保存后重启应用即可使用
 */

export const FEISHU_CONFIG = {
  /** 飞书应用的 App ID（必填） */
  appId: 'YOUR_APP_ID_HERE',
  
  /** 飞书应用的 App Secret（必填） */
  appSecret: 'YOUR_APP_SECRET_HERE',
  
  /** 飞书开放平台 API 基础地址 */
  apiBaseUrl: 'https://open.feishu.cn/open-apis',
  
  /** 请求超时时间（毫秒） */
  timeout: 10000,
  
  /** 同步日历 ID（用于存储同步的日程，必须确保应用有该日历的编辑权限） */
  calendarId: 'YOUR_CALENDAR_ID_HERE'
}
