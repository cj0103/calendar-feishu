' start-dev.vbs - 隐藏终端窗口启动 npm run dev
' 双击此文件即可在后台启动开发服务器

Set objShell = CreateObject("WScript.Shell")

' 获取脚本所在目录
strScriptPath = WScript.ScriptFullName
strScriptDir = Left(strScriptPath, InStrRev(strScriptPath, "\") - 1)

' 切换到项目目录并启动
objShell.CurrentDirectory = strScriptDir

' 使用 0 参数隐藏窗口运行
' 参数说明：0=隐藏，1=正常，2=最小化，3=最大化
objShell.Run "cmd /c npm run dev", 0, False

' 显示提示（可选，如果不需要可以注释掉）
' MsgBox "开发服务器已在后台启动！" & vbCrLf & vbCrLf & _
'        "访问地址：http://localhost:5173" & vbCrLf & vbCrLf & _
'        "停止方法：任务管理器 → 结束 node.exe 进程", _
'        vbInformation, "启动成功"
