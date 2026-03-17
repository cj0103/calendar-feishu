@echo off
chcp 65001 >nul
echo 正在创建桌面快捷方式...

set "SCRIPT_DIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"

copy "%SCRIPT_DIR%start-dev.vbs" "%DESKTOP%\启动开发服务器.vbs" >nul

if exist "%DESKTOP%\启动开发服务器.vbs" (
    echo ✓ 快捷方式已创建成功！
    echo.
    echo 位置：%DESKTOP%\启动开发服务器.vbs
    echo.
    echo 现在您可以双击桌面上的"启动开发服务器"来启动应用了！
) else (
    echo ✗ 创建失败，请手动复制
)

pause
