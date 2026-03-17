import { useState, useEffect } from 'react'
import { CalendarEvent } from './types'
import {
  validateImportData,
  transformToCalendarEvent,
  resolveConflicts,
  ValidationResult
} from './utils/importUtils'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (events: CalendarEvent[], syncToFeishu: boolean) => void
  existingEvents: CalendarEvent[]
}

export default function ImportModal({
  isOpen,
  onClose,
  onImport,
  existingEvents
}: ImportModalProps): JSX.Element | null {
  const [fileContent, setFileContent] = useState<any>(null)
  const [fileName, setFileName] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [syncToFeishu, setSyncToFeishu] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setFileContent(null)
      setFileName('')
      setValidation(null)
      setSyncToFeishu(false)
      setImporting(false)
      setError(null)
    }
  }, [isOpen])
  
  // 选择文件
  const handleSelectFile = async () => {
    try {
      setError(null)
      const result = await window.api.openImportFile()
      
      if (result.canceled) {
        return
      }
      
      setFileName(result.filePath.split(/[/\\]/).pop() || result.filePath)
      
      // 解析 JSON
      try {
        const data = JSON.parse(result.content)
        setFileContent(data)
        
        // 验证数据
        const validationResult = validateImportData(data)
        setValidation(validationResult)
      } catch (parseError: any) {
        setError('文件格式错误：无法解析 JSON 文件')
        setFileContent(null)
        setValidation(null)
      }
    } catch (err: any) {
      setError('文件读取失败：' + (err.message || '未知错误'))
    }
  }
  
  // 执行导入
  const handleImport = async () => {
    if (!validation || !validation.valid || !validation.events) {
      return
    }
    
    setImporting(true)
    
    try {
      // 转换为本地格式
      const newEvents = validation.events.map(e => transformToCalendarEvent(e))
      
      // 解析冲突 - 跳过重复日程
      const filteredEvents = resolveConflicts(newEvents, existingEvents)
      
      // 计算统计
      const imported = filteredEvents.length
      const skipped = newEvents.length - filteredEvents.length
      
      // 执行导入
      onImport(filteredEvents, syncToFeishu)
      
      // 显示结果
      const message = `导入完成！
成功导入：${imported} 条日程
跳过重复：${validation.warnings.length > 0 ? `${skipped} 条` : `${skipped} 条`}`

      if (validation.warnings.length > 0) {
        alert(message + '\n\n警告：\n' + validation.warnings.join('\n'))
      } else {
        alert(message)
      }
      
      onClose()
    } catch (err: any) {
      setError('导入失败：' + (err.message || '未知错误'))
    } finally {
      setImporting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">导入日程数据</h2>
          
          {/* 文件选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📁 选择文件
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectFile}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                disabled={importing}
              >
                选择 JSON 文件...
              </button>
              {fileName && (
                <span className="text-sm text-gray-600">{fileName}</span>
              )}
            </div>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* 文件信息 */}
          {validation && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">📊 文件信息</h3>
              {validation.valid ? (
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• 日程数量：{validation.totalEvents} 条</p>
                  {fileContent?.exportInfo?.exportedAt && (
                    <p>• 导出时间：{new Date(fileContent.exportInfo.exportedAt).toLocaleString()}</p>
                  )}
                  {fileContent?.exportInfo?.dateRange && (
                    <p>• 日期范围：{fileContent.exportInfo.dateRange.start} 至 {fileContent.exportInfo.dateRange.end}</p>
                  )}
                  {fileContent?.exportInfo?.withAttachments && (
                    <p>• 带附件：{fileContent.exportInfo.withAttachments} 条</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  <p className="font-medium mb-2">❌ 数据验证失败</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 警告信息 */}
              {validation.warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-yellow-600 font-medium mb-1">⚠️ 警告：</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                    {validation.warnings.slice(0, 5).map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                    {validation.warnings.length > 5 && (
                      <li>... 还有 {validation.warnings.length - 5} 条警告</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* 导入设置 */}
          {validation && validation.valid && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">⚙️ 导入设置</h3>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={syncToFeishu}
                    onChange={(e) => setSyncToFeishu(e.target.checked)}
                    className="mr-2"
                    disabled={importing}
                  />
                  <span className="text-sm text-gray-700">导入后同步到飞书</span>
                </label>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>ℹ️ 导入模式：增量导入（合并现有数据）</p>
                  <p>ℹ️ 重复日程：自动跳过</p>
                  <p>ℹ️ 缺少时间：自动使用 09:00</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            disabled={importing}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!validation?.valid || importing}
          >
            {importing ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
