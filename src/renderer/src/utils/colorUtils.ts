/**
 * 将十六进制颜色转换为带透明度的 rgba 格式
 * @param hex 十六进制颜色，如 "#eff6ff"
 * @param opacity 透明度百分比，0-100
 * @returns rgba 格式的颜色字符串
 */
export function applyOpacity(hex: string, opacity: number): string {
  // 移除 # 号
  const cleanHex = hex.replace('#', '')
  
  // 解析 RGB 分量
  const r = parseInt(cleanHex.slice(0, 2), 16)
  const g = parseInt(cleanHex.slice(2, 4), 16)
  const b = parseInt(cleanHex.slice(4, 6), 16)
  
  // 计算透明度（0-1）
  const alpha = opacity / 100
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * 将十六进制颜色转换为 RGB 对象
 * @param hex 十六进制颜色，如 "#eff6ff"
 * @returns RGB 对象 { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '')
  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16)
  }
}
