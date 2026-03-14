/**
 * 附件类型定义
 */
export type AttachmentType = 'document' | 'image' | 'link' | 'other'

/**
 * 附件接口
 */
export interface Attachment {
  path: string
  name: string
  type: AttachmentType
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  text: string
  attachments: Attachment[]
}

/**
 * 判断文件类型
 * @param pathOrUrl 文件路径或 URL
 * @returns 附件类型
 */
export function getAttachmentType(pathOrUrl: string): AttachmentType {
  // URL 链接
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return 'link'
  }
  
  // 提取扩展名
  const ext = pathOrUrl.split('.').pop()?.toLowerCase() || ''
  
  // 文档类型
  const documentExts = ['doc', 'docx', 'pdf', 'txt', 'md', 'xlsx', 'xls', 'ppt', 'pptx', 'wps']
  if (documentExts.includes(ext)) {
    return 'document'
  }
  
  // 图片类型
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  if (imageExts.includes(ext)) {
    return 'image'
  }
  
  return 'other'
}

/**
 * 从描述中提取附件路径，分离文字和附件
 * @param description 原始描述文本
 * @returns 解析结果（纯文本 + 附件列表）
 */
export function extractAttachments(description: string): ParseResult {
  const attachments: Attachment[] = []
  const seenPaths = new Set<string>()  // 用于去重
  
  let text = description
  
  // 正则表达式匹配各种路径（优化顺序）
  const patterns = [
    // URL 链接
    /(https?:\/\/[^\s<>"{}|\\^\`\[\]]+)/g,
    // Windows 路径（反斜杠，优先匹配完整路径）
    /([A-Za-z]:\\[^\s<>"|?*]+)/g,
    // Windows 路径（正斜杠）
    /([A-Za-z]:\/[^\s<>"|?*]+)/g,
    // UNC 路径
    /(\\\\[^\s<>"|?*]+)/g,
    // 相对路径（最后匹配，避免与绝对路径冲突）
    /(\.?[\/\\](?:[^\s<>"|?*]+[\/\\])+[^\s<>"|?*]+\.[^\s<>"|?*]+)/g
  ]
  
  for (const pattern of patterns) {
    const matches = description.match(pattern) || []
    for (const match of matches) {
      // 标准化路径（用于去重）
      const normalizedPath = normalizePath(match)
      
      // 跳过已处理的路径
      if (seenPaths.has(normalizedPath)) {
        continue
      }
      seenPaths.add(normalizedPath)
      
      // 正确提取文件名
      const name = extractFileName(match)
      
      // 判断类型
      const type = getAttachmentType(match)
      
      attachments.push({
        path: match,  // 保留原始路径
        name,
        type
      })
      
      // 从文本中移除路径（替换为空）
      text = text.replace(match, '')
    }
  }
  
  // 清理多余空白（但保留段落结构）
  text = text.replace(/  +/g, ' ').trim()
  
  return { text, attachments }
}

/**
 * 标准化路径（用于去重）
 * @param path 原始路径
 * @returns 标准化后的路径
 */
function normalizePath(path: string): string {
  // 统一斜杠方向并转为小写
  return path.replace(/\\/g, '/').toLowerCase()
}

/**
 * 正确提取文件名
 * @param path 文件路径或 URL
 * @returns 文件名
 */
function extractFileName(path: string): string {
  // 移除协议前缀
  let cleanPath = path.replace(/^https?:\/\//, '')
  
  // 提取最后一部分
  const parts = cleanPath.split(/[\/\\]/)
  return parts[parts.length - 1] || cleanPath
}

/**
 * 计算附件类型统计
 * @param attachments 附件列表
 * @returns 各类型附件数量
 */
export function countAttachmentTypes(attachments: Attachment[]): Record<AttachmentType, number> {
  const counts: Record<AttachmentType, number> = {
    document: 0,
    image: 0,
    link: 0,
    other: 0
  }
  
  for (const attachment of attachments) {
    counts[attachment.type]++
  }
  
  return counts
}
