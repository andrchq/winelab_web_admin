Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Hide console window
Add-Type -Name Window -Namespace Console -MemberDefinition '
[DllImport("Kernel32.dll")]
public static extern IntPtr GetConsoleWindow();
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
'
$consolePtr = [Console.Window]::GetConsoleWindow()
[Console.Window]::ShowWindow($consolePtr, 0) | Out-Null

# Styling
[System.Windows.Forms.Application]::EnableVisualStyles()

# Main Form
$form = New-Object System.Windows.Forms.Form
$form.Text = "WineLab Dev Manager"
$form.Size = New-Object System.Drawing.Size(500, 470)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 35)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "WineLab Dev Manager"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(139, 92, 246)
$titleLabel.Location = New-Object System.Drawing.Point(20, 15)
$titleLabel.Size = New-Object System.Drawing.Size(450, 40)
$form.Controls.Add($titleLabel)

# Status Panel
$statusPanel = New-Object System.Windows.Forms.Panel
$statusPanel.Location = New-Object System.Drawing.Point(20, 65)
$statusPanel.Size = New-Object System.Drawing.Size(445, 90)
$statusPanel.BackColor = [System.Drawing.Color]::FromArgb(40, 40, 50)
$form.Controls.Add($statusPanel)

# API Status
$apiStatusLabel = New-Object System.Windows.Forms.Label
$apiStatusLabel.Text = "API Server (port 3001):"
$apiStatusLabel.Location = New-Object System.Drawing.Point(15, 18)
$apiStatusLabel.Size = New-Object System.Drawing.Size(180, 25)
$apiStatusLabel.ForeColor = [System.Drawing.Color]::White
$apiStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$statusPanel.Controls.Add($apiStatusLabel)

$apiStatus = New-Object System.Windows.Forms.Label
$apiStatus.Text = "STOPPED"
$apiStatus.Location = New-Object System.Drawing.Point(200, 18)
$apiStatus.Size = New-Object System.Drawing.Size(150, 25)
$apiStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$apiStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$statusPanel.Controls.Add($apiStatus)

# Frontend Status
$frontendStatusLabel = New-Object System.Windows.Forms.Label
$frontendStatusLabel.Text = "Frontend (port 8888):"
$frontendStatusLabel.Location = New-Object System.Drawing.Point(15, 52)
$frontendStatusLabel.Size = New-Object System.Drawing.Size(180, 25)
$frontendStatusLabel.ForeColor = [System.Drawing.Color]::White
$frontendStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$statusPanel.Controls.Add($frontendStatusLabel)

$frontendStatus = New-Object System.Windows.Forms.Label
$frontendStatus.Text = "STOPPED"
$frontendStatus.Location = New-Object System.Drawing.Point(200, 52)
$frontendStatus.Size = New-Object System.Drawing.Size(150, 25)
$frontendStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$frontendStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$statusPanel.Controls.Add($frontendStatus)

# pgAdmin Configuration
$pgAdminPath = "E:\Posgres 18\pgAdmin 4\runtime\pgAdmin4.exe"

# pgAdmin Status
$pgAdminStatusLabel = New-Object System.Windows.Forms.Label
$pgAdminStatusLabel.Text = "pgAdmin:"
$pgAdminStatusLabel.Location = New-Object System.Drawing.Point(15, 86)
$pgAdminStatusLabel.Size = New-Object System.Drawing.Size(180, 25)
$pgAdminStatusLabel.ForeColor = [System.Drawing.Color]::White
$pgAdminStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$statusPanel.Controls.Add($pgAdminStatusLabel)

$pgAdminStatus = New-Object System.Windows.Forms.Label
$pgAdminStatus.Text = "STOPPED"
$pgAdminStatus.Location = New-Object System.Drawing.Point(200, 86)
$pgAdminStatus.Size = New-Object System.Drawing.Size(150, 25)
$pgAdminStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$pgAdminStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$statusPanel.Controls.Add($pgAdminStatus)

# Log Label
$logLabel = New-Object System.Windows.Forms.Label
$logLabel.Text = "Console Log:"
$logLabel.Location = New-Object System.Drawing.Point(20, 165)
$logLabel.Size = New-Object System.Drawing.Size(200, 20)
$logLabel.ForeColor = [System.Drawing.Color]::Gray
$logLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($logLabel)

# Log TextBox
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.Location = New-Object System.Drawing.Point(20, 188)
$logBox.Size = New-Object System.Drawing.Size(445, 130)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 25)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ReadOnly = $true
$form.Controls.Add($logBox)

# Helper function to log
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logBox.AppendText("[$timestamp] $message`r`n")
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
}

# Check port function
function Test-Port {
    param([int]$port)
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
        if ($tcpConnections) {
            return $true
        }
        return $false
    } catch {
        # Fallback to netstat if Get-NetTCPConnection fails
        try {
            $netstatOutput = netstat -ano 2>$null | findstr ":$port " | findstr "LISTENING"
            if ($netstatOutput) {
                return $true
            }
        } catch {}
        return $false
    }
}

# Start pgAdmin function
function Start-PgAdmin {
    if (Get-Process -Name "pgAdmin4" -ErrorAction SilentlyContinue) {
        Write-Log "pgAdmin is already running."
    } else {
        if (Test-Path $pgAdminPath) {
            Write-Log "Starting pgAdmin..."
            Start-Process -FilePath $pgAdminPath
            Write-Log "pgAdmin started."
        } else {
            Write-Log "Error: pgAdmin path not found!"
        }
    }
}

# Stop pgAdmin function
function Stop-PgAdmin {
    $proc = Get-Process -Name "pgAdmin4" -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Log "Stopping pgAdmin..."
        Stop-Process -Name "pgAdmin4" -Force
        Write-Log "pgAdmin stopped."
    } else {
        Write-Log "pgAdmin is not running."
    }
}

# Kill port function
function Stop-Port {
    param([int]$port)
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $tcpConnections) {
            $processId = $conn.OwningProcess
            if ($processId -and $processId -ne $PID) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Fallback to netstat
        $output = netstat -ano | findstr ":$port " | findstr "LISTENING"
        foreach ($line in $output -split "`n") {
            if ($line -match '\s+(\d+)\s*$') {
                $processId = $matches[1]
                if ($processId -and $processId -ne $PID) {
                    Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

# Store launched process IDs
$script:apiProcessId = $null
$script:frontendProcessId = $null

# Stop launched PowerShell windows
function Stop-LaunchedProcesses {
    $currentPid = $PID
    try {
        if ($script:apiProcessId -and $script:apiProcessId -ne $currentPid) {
            Stop-Process -Id $script:apiProcessId -Force -ErrorAction SilentlyContinue
        }
        $script:apiProcessId = $null
        
        if ($script:frontendProcessId -and $script:frontendProcessId -ne $currentPid) {
            Stop-Process -Id $script:frontendProcessId -Force -ErrorAction SilentlyContinue
        }
        $script:frontendProcessId = $null
        
        # Also stop ports to be safe
        Stop-Port 3001
        Stop-Port 8888
    } catch {
        # Ignore errors
    }
}

# Update status function
function Update-Status {
    if (Test-Port 3001) {
        $apiStatus.Text = "RUNNING"
        $apiStatus.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
    } else {
        $apiStatus.Text = "STOPPED"
        $apiStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    }
    
    if (Test-Port 8888) {
        $frontendStatus.Text = "RUNNING"
        $frontendStatus.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
    } else {
        $frontendStatus.Text = "STOPPED"
        $frontendStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    }

    if (Get-Process -Name "pgAdmin4" -ErrorAction SilentlyContinue) {
        $pgAdminStatus.Text = "RUNNING"
        $pgAdminStatus.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
    } else {
        $pgAdminStatus.Text = "STOPPED"
        $pgAdminStatus.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    }
}

# Button styling helper
function Style-Button {
    param($button, $bgColor)
    $button.FlatStyle = "Flat"
    $button.FlatAppearance.BorderSize = 0
    $button.BackColor = $bgColor
    $button.ForeColor = [System.Drawing.Color]::White
    $button.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $button.Cursor = [System.Windows.Forms.Cursors]::Hand
}

# START Button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "START ALL"
$startButton.Location = New-Object System.Drawing.Point(20, 330)
$startButton.Size = New-Object System.Drawing.Size(105, 45)
Style-Button $startButton ([System.Drawing.Color]::FromArgb(34, 197, 94))
$form.Controls.Add($startButton)

# STOP Button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "STOP ALL"
$stopButton.Location = New-Object System.Drawing.Point(130, 330)
$stopButton.Size = New-Object System.Drawing.Size(105, 45)
Style-Button $stopButton ([System.Drawing.Color]::FromArgb(239, 68, 68))
$form.Controls.Add($stopButton)

# RESTART Button
$restartButton = New-Object System.Windows.Forms.Button
$restartButton.Text = "RESTART"
$restartButton.Location = New-Object System.Drawing.Point(240, 330)
$restartButton.Size = New-Object System.Drawing.Size(105, 45)
Style-Button $restartButton ([System.Drawing.Color]::FromArgb(251, 146, 60))
$form.Controls.Add($restartButton)

# OPEN Browser Button
$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "BROWSER"
$openButton.Location = New-Object System.Drawing.Point(350, 330)
$openButton.Size = New-Object System.Drawing.Size(115, 45)
Style-Button $openButton ([System.Drawing.Color]::FromArgb(59, 130, 246))
$form.Controls.Add($openButton)

# Start pgAdmin Button
$startPgButton = New-Object System.Windows.Forms.Button
$startPgButton.Text = "Start pgAdmin"
$startPgButton.Location = New-Object System.Drawing.Point(20, 385)
$startPgButton.Size = New-Object System.Drawing.Size(215, 35)
Style-Button $startPgButton ([System.Drawing.Color]::FromArgb(72, 187, 120))
$form.Controls.Add($startPgButton)

# Stop pgAdmin Button
$stopPgButton = New-Object System.Windows.Forms.Button
$stopPgButton.Text = "Stop pgAdmin"
$stopPgButton.Location = New-Object System.Drawing.Point(240, 385)
$stopPgButton.Size = New-Object System.Drawing.Size(225, 35)
Style-Button $stopPgButton ([System.Drawing.Color]::FromArgb(220, 38, 38))
$form.Controls.Add($stopPgButton)

# Increase form size to fit new buttons
$form.Size = New-Object System.Drawing.Size(500, 480)

# Get script directory
$script:scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $script:scriptDir) { $script:scriptDir = Get-Location }

# START Click Handler
$startButton.Add_Click({
    Write-Log "Stopping existing processes..."
    Stop-LaunchedProcesses
    Start-Sleep -Milliseconds 500
    
    Start-PgAdmin

    Write-Log "Starting API server..."
    $apiPath = Join-Path $script:scriptDir "winelab_api"
    $apiProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; npm run start:dev" -WindowStyle Minimized -PassThru
    $script:apiProcessId = $apiProc.Id
    
    Start-Sleep -Seconds 2
    
    Write-Log "Starting Frontend server..."
    $frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$script:scriptDir'; npm run dev" -WindowStyle Minimized -PassThru
    $script:frontendProcessId = $frontendProc.Id
    
    Start-Sleep -Seconds 2
    Update-Status
    Write-Log "All servers started!"
})

# STOP Click Handler
$stopButton.Add_Click({
    try {
        Write-Log "Stopping all servers..."
        Stop-LaunchedProcesses
        Start-Sleep -Milliseconds 500
        Update-Status
        Write-Log "All servers stopped."
    } catch {
        Write-Log "Error stopping: $_"
    }
})

# RESTART Click Handler
$restartButton.Add_Click({
    Write-Log "Restarting all servers..."
    Stop-LaunchedProcesses
    Start-Sleep -Milliseconds 800

    Start-PgAdmin
    
    Write-Log "Starting API server..."
    $apiPath = Join-Path $script:scriptDir "winelab_api"
    $apiProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; npm run start:dev" -WindowStyle Minimized -PassThru
    $script:apiProcessId = $apiProc.Id
    
    Start-Sleep -Seconds 2
    
    Write-Log "Starting Frontend server..."
    $frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$script:scriptDir'; npm run dev" -WindowStyle Minimized -PassThru
    $script:frontendProcessId = $frontendProc.Id
    
    Start-Sleep -Seconds 2
    Update-Status
    Write-Log "All servers restarted!"
})

# OPEN Click Handler
$openButton.Add_Click({
    Start-Process "http://localhost:8888"
    Write-Log "Opened browser..."
})

# Start pgAdmin Click Handler
$startPgButton.Add_Click({
    Start-PgAdmin
    Update-Status
})

# Stop pgAdmin Click Handler
$stopPgButton.Add_Click({
    Stop-PgAdmin
    Update-Status
})


# Timer for status updates
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({ Update-Status })
$timer.Start()

# Initial status check
Update-Status
Write-Log "WineLab Dev Manager ready."
Write-Log "Click START ALL to begin."

# Show form
[void]$form.ShowDialog()

# Cleanup
$timer.Stop()
$timer.Dispose()
$form.Dispose()
