/**
 * 网络状态检测工具
 * 
 * 提供网络连接状态的实时检测和监听
 */

/**
 * 检测当前是否联网
 * @returns true 表示联网，false 表示未联网
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * 监听网络状态变化
 * @param callback 网络状态变化时的回调函数
 * @returns 清理函数，用于移除监听器
 */
export function onNetworkStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * 获取网络状态
 * @returns 当前网络状态
 */
export function getNetworkStatus(): boolean {
  return isOnline()
}
