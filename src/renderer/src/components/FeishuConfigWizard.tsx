import { useState, useEffect } from 'react'

interface FeishuConfigWizardProps {
  onComplete?: () => void
  onClose?: () => void
}

/**
 * 飞书配置向导组件
 * 首次启动时显示，引导用户配置飞书凭证
 */
export function FeishuConfigWizard({ onComplete, onClose }: FeishuConfigWizardProps) {
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    calendarId: ''
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载已保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (window.api?.feishu) {
          const savedConfig = await window.api.feishu.getConfig()
          if (savedConfig) {
            setConfig({
              appId: savedConfig.appId || '',
              appSecret: savedConfig.appSecret || '',
              calendarId: savedConfig.calendarId || ''
            })
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    if (!config.appId || !config.appSecret) {
      alert('请填写 App ID 和 App Secret')
      return
    }

    setSaving(true)
    try {
      if (!window.api?.feishu) {
        alert('API 未加载，请刷新页面')
        return
      }
      await window.api.feishu.saveConfig(config)
      alert('配置保存成功！')
      // 通知主进程重新加载配置
      window.location.reload()
      onComplete?.()
    } catch (error: any) {
      alert('保存失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      if (!window.api?.feishu) {
        setTestResult({ success: false, message: 'API 未加载，请刷新页面' })
        return
      }
      const result = await window.api.feishu.testConfig(config)
      setTestResult({
        success: result.success,
        message: result.success ? '配置有效！' : result.error
      })
    } catch (error: any) {
      setTestResult({ success: false, message: '测试失败：' + error.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => onClose?.()}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500 z-10"
          title="关闭"
          type="button"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">⚙️ 飞书配置</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          💡 首次使用需要配置飞书凭证
          <br />
          <span className="text-xs">配置后将自动保存，下次启动无需重新配置</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              App ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              placeholder="cli_xxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              App Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.appSecret}
              onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
              placeholder="请输入 App Secret"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Calendar ID <span className="text-gray-400 text-xs">(可选，可稍后在飞书日历管理平台复制)</span>
            </label>
            <input
              type="text"
              value={config.calendarId}
              onChange={(e) => setConfig({ ...config, calendarId: e.target.value })}
              placeholder="feishu.cn_xxxxx@group.calendar.feishu.cn"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded text-sm ${
                testResult.success
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleTest}
              disabled={testing || !config.appId || !config.appSecret}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
              {testing ? '🔄 测试中...' : '🧪 测试配置'}
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !config.appId ||
                !config.appSecret
              }
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {saving ? '💾 保存中...' : '✅ 保存配置'}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">📖 配置步骤：</p>
            <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
              <li>
                访问{' '}
                <a
                  href="https://open.feishu.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  飞书开放平台
                </a>
                {' '}创建企业自建应用
              </li>
              <li>添加日历权限，获取 App ID 和 App Secret</li>
              <li>
                访问{' '}
                <a
                  href="https://feishu.cn/calendar_console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  飞书日历管理平台
                </a>
                {' '}创建或选择日历
              </li>
              <li>复制日历 ID（格式：feishu.cn_xxx@group.calendar.feishu.cn）</li>
            </ol>
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              💡 提示：可先保存 App ID 和 App Secret，然后在飞书日历管理平台创建日历后，再通过设置页面配置 Calendar ID
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
