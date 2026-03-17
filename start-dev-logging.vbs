' start-dev-logging.vbs - 隐藏终端窗口启动 npm run dev（带日志记录）
' 双击此文件即可在后台启动开发服务器，日志会保存到 dev.log

Set objShell = CreateObject("WScript.Shell")

' 获取脚本所在目录
strScriptPath = WScript.ScriptFullName
strScriptDir = Left(strScriptPath, InStrRev(strScriptPath, "\") - 1)

' 切换到项目目录并启动
objShell.CurrentDirectory = strScriptDir

' 重定向输出到日志文件
' 标准输出和错误输出都会保存到 dev.log
objShell.Run "cmd /c npm run dev > dev.log 2>&1", 0, False

' 显示提示
MsgBox "开发服务器已在后台启动！" & vbCrLf & vbCrLf & _
       "访问地址：http://localhost:5173" & vbCrLf & _
       "日志文件：dev.log" & vbCrLf & vbCrLf & _
       "停止方法：任务管理器 → 结束 node.exe 进程", _
       vbInformation, "启动成功"
