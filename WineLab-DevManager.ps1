Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Styling
[System.Windows.Forms.Application]::EnableVisualStyles()

# Global regex to clean ANSI codes
$script:ansiRegex = [regex]::new('\x1B\[[0-9;]*[a-zA-Z]')

# Main Form
$form = New-Object System.Windows.Forms.Form
$form.Text = "WineLab Dev Manager"
$form.Size = New-Object System.Drawing.Size(520, 610)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 35)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.MinimumSize = New-Object System.Drawing.Size(520, 610)

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "WineLab Dev Manager"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(139, 92, 246)
$titleLabel.Location = New-Object System.Drawing.Point(20, 15)
$titleLabel.Size = New-Object System.Drawing.Size(460, 40)
$titleLabel.Anchor = "Top, Left, Right"
$form.Controls.Add($titleLabel)

# Status Panel
$statusPanel = New-Object System.Windows.Forms.Panel
$statusPanel.Location = New-Object System.Drawing.Point(20, 65)
$statusPanel.Size = New-Object System.Drawing.Size(460, 150)
$statusPanel.BackColor = [System.Drawing.Color]::FromArgb(40, 40, 50)
$statusPanel.Anchor = "Top, Left, Right"
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
$pgAdminPath = "A:\Program\PosgreSQL\18\pgAdmin 4\runtime\pgAdmin4.exe"

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

# Metrics Status
$metricsTitleLabel = New-Object System.Windows.Forms.Label
$metricsTitleLabel.Text = "Project Load:"
$metricsTitleLabel.Location = New-Object System.Drawing.Point(15, 120)
$metricsTitleLabel.Size = New-Object System.Drawing.Size(180, 25)
$metricsTitleLabel.ForeColor = [System.Drawing.Color]::White
$metricsTitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$statusPanel.Controls.Add($metricsTitleLabel)

$script:metricsLabel = New-Object System.Windows.Forms.Label
$script:metricsLabel.Text = "CPU: 0% | RAM: 0 MB"
$script:metricsLabel.Location = New-Object System.Drawing.Point(200, 120)
$script:metricsLabel.Size = New-Object System.Drawing.Size(250, 25)
$script:metricsLabel.ForeColor = [System.Drawing.Color]::FromArgb(59, 130, 246)
$script:metricsLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$statusPanel.Controls.Add($script:metricsLabel)

# Log Label
$logLabel = New-Object System.Windows.Forms.Label
$logLabel.Text = "Log View:"
$logLabel.Location = New-Object System.Drawing.Point(20, 225)
$logLabel.Size = New-Object System.Drawing.Size(80, 20)
$logLabel.ForeColor = [System.Drawing.Color]::Gray
$logLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($logLabel)

# Buttons for selecting logs
$btnLogManager = New-Object System.Windows.Forms.Button
$btnLogManager.Text = "Manager"
$btnLogManager.Location = New-Object System.Drawing.Point(105, 220)
$btnLogManager.Size = New-Object System.Drawing.Size(80, 25)
$btnLogManager.FlatStyle = "Flat"
$btnLogManager.FlatAppearance.BorderSize = 0
$btnLogManager.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
$btnLogManager.ForeColor = [System.Drawing.Color]::White
$btnLogManager.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnLogManager.Cursor = [System.Windows.Forms.Cursors]::Hand

$btnLogApi = New-Object System.Windows.Forms.Button
$btnLogApi.Text = "API"
$btnLogApi.Location = New-Object System.Drawing.Point(195, 220)
$btnLogApi.Size = New-Object System.Drawing.Size(80, 25)
$btnLogApi.FlatStyle = "Flat"
$btnLogApi.FlatAppearance.BorderSize = 0
$btnLogApi.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
$btnLogApi.ForeColor = [System.Drawing.Color]::White
$btnLogApi.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnLogApi.Cursor = [System.Windows.Forms.Cursors]::Hand

$btnLogFrontend = New-Object System.Windows.Forms.Button
$btnLogFrontend.Text = "Frontend"
$btnLogFrontend.Location = New-Object System.Drawing.Point(285, 220)
$btnLogFrontend.Size = New-Object System.Drawing.Size(80, 25)
$btnLogFrontend.FlatStyle = "Flat"
$btnLogFrontend.FlatAppearance.BorderSize = 0
$btnLogFrontend.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
$btnLogFrontend.ForeColor = [System.Drawing.Color]::White
$btnLogFrontend.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnLogFrontend.Cursor = [System.Windows.Forms.Cursors]::Hand

$btnClearLog = New-Object System.Windows.Forms.Button
$btnClearLog.Text = "Clear Log"
$btnClearLog.Location = New-Object System.Drawing.Point(380, 220)
$btnClearLog.Size = New-Object System.Drawing.Size(100, 25)
$btnClearLog.FlatStyle = "Flat"
$btnClearLog.FlatAppearance.BorderSize = 0
$btnClearLog.BackColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$btnClearLog.ForeColor = [System.Drawing.Color]::White
$btnClearLog.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnClearLog.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnClearLog.Anchor = "Top, Right"

$form.Controls.Add($btnLogManager)
$form.Controls.Add($btnLogApi)
$form.Controls.Add($btnLogFrontend)
$form.Controls.Add($btnClearLog)

# Log TextBoxes
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.Location = New-Object System.Drawing.Point(20, 255)
$logBox.Size = New-Object System.Drawing.Size(460, 190)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 25)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ReadOnly = $true
$logBox.Anchor = "Top, Bottom, Left, Right"
$form.Controls.Add($logBox)

$apiLogBox = New-Object System.Windows.Forms.TextBox
$apiLogBox.Multiline = $true
$apiLogBox.ScrollBars = "Vertical"
$apiLogBox.Location = $logBox.Location
$apiLogBox.Size = $logBox.Size
$apiLogBox.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 25)
$apiLogBox.ForeColor = [System.Drawing.Color]::White
$apiLogBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$apiLogBox.ReadOnly = $true
$apiLogBox.Visible = $false
$apiLogBox.Anchor = "Top, Bottom, Left, Right"
$form.Controls.Add($apiLogBox)

$frontendLogBox = New-Object System.Windows.Forms.TextBox
$frontendLogBox.Multiline = $true
$frontendLogBox.ScrollBars = "Vertical"
$frontendLogBox.Location = $logBox.Location
$frontendLogBox.Size = $logBox.Size
$frontendLogBox.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 25)
$frontendLogBox.ForeColor = [System.Drawing.Color]::White
$frontendLogBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$frontendLogBox.ReadOnly = $true
$frontendLogBox.Visible = $false
$frontendLogBox.Anchor = "Top, Bottom, Left, Right"
$form.Controls.Add($frontendLogBox)

# Highlight active log button
function Update-LogButtons {
    param($activeBtn)
    $btnLogManager.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
    $btnLogApi.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
    $btnLogFrontend.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 60)
    $activeBtn.BackColor = [System.Drawing.Color]::FromArgb(139, 92, 246)
}

$btnLogManager.Add_Click({
    $logBox.Visible = $true; $apiLogBox.Visible = $false; $frontendLogBox.Visible = $false;
    Update-LogButtons $btnLogManager
})
$btnLogApi.Add_Click({
    $logBox.Visible = $false; $apiLogBox.Visible = $true; $frontendLogBox.Visible = $false;
    Update-LogButtons $btnLogApi
})
$btnLogFrontend.Add_Click({
    $logBox.Visible = $false; $apiLogBox.Visible = $false; $frontendLogBox.Visible = $true;
    Update-LogButtons $btnLogFrontend
})
Update-LogButtons $btnLogManager

$btnClearLog.Add_Click({
    if ($logBox.Visible) { $logBox.Clear() }
    if ($apiLogBox.Visible) { $apiLogBox.Clear() }
    if ($frontendLogBox.Visible) { $frontendLogBox.Clear() }
})

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

# Store launched process IDs and log info
$script:apiProcessId = $null
$script:frontendProcessId = $null
$script:apiLogFile = Join-Path $env:TEMP "WineLab_API_$(Get-Random).log"
$script:frontendLogFile = Join-Path $env:TEMP "WineLab_Frontend_$(Get-Random).log"
$script:apiLogPos = 0
$script:frontendLogPos = 0

# Get script directory
$script:scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $script:scriptDir) { $script:scriptDir = Get-Location }

# (Metrics logging removed)

function Start-ApiServer {
    Write-Log "Starting API server..."
    $apiLogBox.Clear()
    $script:apiLogPos = 0
    New-Item -Path $script:apiLogFile -ItemType File -Force | Out-Null
    $apiPath = Join-Path $script:scriptDir "winelab_api"
    
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden -Command `"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; cd '$apiPath'; npm run start:dev 2>&1 | Out-File -FilePath '$script:apiLogFile' -Encoding UTF8`"" -WindowStyle Hidden -PassThru
    $script:apiProcessId = $proc.Id
}

function Start-FrontendServer {
    Write-Log "Starting Frontend server..."
    $frontendLogBox.Clear()
    $script:frontendLogPos = 0
    New-Item -Path $script:frontendLogFile -ItemType File -Force | Out-Null
    
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden -Command `"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; cd '$script:scriptDir'; npm run dev 2>&1 | Out-File -FilePath '$script:frontendLogFile' -Encoding UTF8`"" -WindowStyle Hidden -PassThru
    $script:frontendProcessId = $proc.Id
}

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
$startButton.Location = New-Object System.Drawing.Point(20, 460)
$startButton.Size = New-Object System.Drawing.Size(110, 45)
$startButton.Anchor = "Bottom"
Style-Button $startButton ([System.Drawing.Color]::FromArgb(34, 197, 94))
$form.Controls.Add($startButton)

# STOP Button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "STOP ALL"
$stopButton.Location = New-Object System.Drawing.Point(140, 460)
$stopButton.Size = New-Object System.Drawing.Size(110, 45)
$stopButton.Anchor = "Bottom"
Style-Button $stopButton ([System.Drawing.Color]::FromArgb(239, 68, 68))
$form.Controls.Add($stopButton)

# RESTART Button
$restartButton = New-Object System.Windows.Forms.Button
$restartButton.Text = "RESTART"
$restartButton.Location = New-Object System.Drawing.Point(260, 460)
$restartButton.Size = New-Object System.Drawing.Size(100, 45)
$restartButton.Anchor = "Bottom"
Style-Button $restartButton ([System.Drawing.Color]::FromArgb(251, 146, 60))
$form.Controls.Add($restartButton)

# OPEN Browser Button
$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "BROWSER"
$openButton.Location = New-Object System.Drawing.Point(370, 460)
$openButton.Size = New-Object System.Drawing.Size(110, 45)
$openButton.Anchor = "Bottom"
Style-Button $openButton ([System.Drawing.Color]::FromArgb(59, 130, 246))
$form.Controls.Add($openButton)

# Start pgAdmin Button
$startPgButton = New-Object System.Windows.Forms.Button
$startPgButton.Text = "Start pgAdmin"
$startPgButton.Location = New-Object System.Drawing.Point(20, 515)
$startPgButton.Size = New-Object System.Drawing.Size(230, 35)
$startPgButton.Anchor = "Bottom"
Style-Button $startPgButton ([System.Drawing.Color]::FromArgb(72, 187, 120))
$form.Controls.Add($startPgButton)

# Stop pgAdmin Button
$stopPgButton = New-Object System.Windows.Forms.Button
$stopPgButton.Text = "Stop pgAdmin"
$stopPgButton.Location = New-Object System.Drawing.Point(260, 515)
$stopPgButton.Size = New-Object System.Drawing.Size(220, 35)
$stopPgButton.Anchor = "Bottom"
Style-Button $stopPgButton ([System.Drawing.Color]::FromArgb(220, 38, 38))
$form.Controls.Add($stopPgButton)

# (Script directory initialized earlier)

# START Click Handler
$startButton.Add_Click({
    Write-Log "Stopping existing processes..."
    Stop-LaunchedProcesses
    Start-Sleep -Milliseconds 500
    
    Start-PgAdmin

    Start-ApiServer
    Start-Sleep -Seconds 2
    
    Start-FrontendServer
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
    
    Start-ApiServer
    Start-Sleep -Seconds 2
    
    Start-FrontendServer
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
$timer.Interval = 2000
$timer.Add_Tick({ 
    Update-Status 
    
    # Process API Log
    if (Test-Path $script:apiLogFile) {
        try {
            $fs = [System.IO.File]::Open($script:apiLogFile, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            if ($fs.Length -gt $script:apiLogPos) {
                $fs.Seek($script:apiLogPos, [System.IO.SeekOrigin]::Begin) | Out-Null
                $reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
                $newData = $reader.ReadToEnd()
                
                # Cleanup ANSI codes and mangled formatting
                $cleanData = $script:ansiRegex.Replace($newData, "")
                
                $script:apiLogPos = $fs.Position
                $reader.Close()
                
                if ($apiLogBox.TextLength -gt 50000) {
                    $apiLogBox.Text = $apiLogBox.Text.Substring(10000)
                }
                $apiLogBox.AppendText($cleanData)
                if ($apiLogBox.Visible) {
                    $apiLogBox.SelectionStart = $apiLogBox.TextLength
                    $apiLogBox.ScrollToCaret()
                }
            } else {
                $fs.Close()
            }
        } catch {}
    }
    
    # Process Frontend Log
    if (Test-Path $script:frontendLogFile) {
        try {
            $fs = [System.IO.File]::Open($script:frontendLogFile, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            if ($fs.Length -gt $script:frontendLogPos) {
                $fs.Seek($script:frontendLogPos, [System.IO.SeekOrigin]::Begin) | Out-Null
                $reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
                $newData = $reader.ReadToEnd()
                
                # Cleanup ANSI codes and mangled formatting
                $cleanData = $script:ansiRegex.Replace($newData, "")
                
                $script:frontendLogPos = $fs.Position
                $reader.Close()
                
                if ($frontendLogBox.TextLength -gt 50000) {
                    $frontendLogBox.Text = $frontendLogBox.Text.Substring(10000)
                }
                $frontendLogBox.AppendText($cleanData)
                if ($frontendLogBox.Visible) {
                    $frontendLogBox.SelectionStart = $frontendLogBox.TextLength
                    $frontendLogBox.ScrollToCaret()
                }
            } else {
                $fs.Close()
            }
        } catch {}
    }

    # Process Metrics Update
    try {
        $pids = @()
        if ($script:apiProcessId) { $pids += $script:apiProcessId }
        if ($script:frontendProcessId) { $pids += $script:frontendProcessId }

        # Find child node processes related to winelab
        if ($pids.Count -gt 0) {
            $nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
            foreach ($np in $nodeProcs) {
                if ($np.CommandLine -match "winelab|next|nest") {
                    if ($pids -notcontains $np.ProcessId) {
                        $pids += $np.ProcessId
                    }
                }
            }
        }

        if ($pids.Count -gt 0) {
            $procs = Get-Process -Id $pids -ErrorAction SilentlyContinue
            if ($procs) {
                $ramMB = [math]::Round((($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 1)
                
                # Fetch CPU
                $cpuQuery = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction SilentlyContinue | Where-Object { $_.IDProcess -in $pids }
                $cpuPercent = 0
                if ($cpuQuery) {
                    $cpuPercent = ($cpuQuery | Measure-Object PercentProcessorTime -Sum).Sum
                }

                $script:metricsLabel.Text = "CPU: $cpuPercent% | RAM: $ramMB MB"
                
                # Log to CSV (removed)
            } else {
                $script:metricsLabel.Text = "CPU: 0% | RAM: 0 MB"
            }
        } else {
            $script:metricsLabel.Text = "CPU: 0% | RAM: 0 MB"
        }
    } catch {
        # Ignore errors during metric parsing
    }
})
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
