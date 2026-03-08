/// <reference types="vite/client" />

interface Window {
  api: {
    minimize: () => Promise<void>
    close: () => Promise<void>
    quit: () => Promise<void>
    setIgnoreMouseEvents: (ignore: boolean) => Promise<void>
    setWallpaperMode: (enabled: boolean) => Promise<void>
    forceShow: () => Promise<void>
    getBounds: () => Promise<{ width: number; height: number; x: number; y: number }>
    setOpacity: (opacity: number) => Promise<void>
    onWindowMoved: (callback: () => void) => void
    onWindowResized: (callback: () => void) => void
  }
}
