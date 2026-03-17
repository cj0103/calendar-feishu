# start-dev.ps1 - 使用 PowerShell 隐藏窗口启动 npm run dev
# 右键选择"使用 PowerShell 运行"即可

Start-Process npm -ArgumentList "run", "dev" -WindowStyle Hidden
