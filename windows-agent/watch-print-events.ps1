
$ErrorActionPreference = "Stop"

$logName = "Microsoft-Windows-PrintService/Operational"
$collectorUrl = "http://localhost:3000/api/print-job-events"
$agentId = $env:COMPUTERNAME

$envFile = Join-Path $PSScriptRoot "..\server\.env"
$checkpoint = Join-Path $PSScriptRoot "print-event-checkpoint.txt"

# Read the agent token locally; never print or upload it.
if (!(Test-Path $envFile)) {
    throw "Cannot find server\.env. Check the IHAP folder."
}

$tokenLine = Get-Content $envFile |
    Where-Object { $_ -match '^\s*AGENT_TOKEN\s*=' } |
    Select-Object -First 1

if (!$tokenLine) {
    throw "AGENT_TOKEN was not found in server\.env."
}

$token = ($tokenLine -replace '^\s*AGENT_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'")

if (!$token) {
    throw "AGENT_TOKEN is empty."
}

$headers = @{ Authorization = "Bearer $token" }

# First run starts from the newest existing event to avoid importing history.
if (Test-Path $checkpoint) {
    $lastId = [long](Get-Content $checkpoint -Raw).Trim()
} else {
    $latest = Get-WinEvent -FilterHashtable @{
        LogName = $logName
        Id = 307
    } -MaxEvents 1 -ErrorAction SilentlyContinue

    $lastId = if ($latest) { [long]$latest.RecordId } else { 0 }
    Set-Content -LiteralPath $checkpoint -Value $lastId
}

Write-Host "IHAP metadata watcher started on $agentId."
Write-Host "Watching for new completed print jobs. Press Ctrl+C to stop."

while ($true) {
    $events = @(
        Get-WinEvent -FilterHashtable @{
            LogName = $logName
            Id = 307
        } -MaxEvents 100 -ErrorAction SilentlyContinue |
        Where-Object { $_.RecordId -gt $lastId } |
        Sort-Object RecordId
    )

    foreach ($ev in $events) {
        $message = $ev.Message

        # Parse the standard English Windows Event 307 message.
        $pattern = 'Document\s+(?<job>\d+),\s*(?<doc>.*?)\s+owned by\s+(?<user>.*?)\s+on\s+(?<machine>.*?)\s+was printed on\s+(?<printer>.*?)\s+through port\s+(?<port>.*?)\.\s+Size in bytes:\s*(?<size>\d+)\.\s+Pages printed:\s*(?<pages>\d+)'
        $match = [regex]::Match($message, $pattern)

        if (!$match.Success) {
            Write-Warning "Could not parse event record $($ev.RecordId); skipping it."
            $lastId = [long]$ev.RecordId
            Set-Content -LiteralPath $checkpoint -Value $lastId
            continue
        }

        $payload = @{
            agent_id = $agentId
            event_record_id = [long]$ev.RecordId
            source_job_id = [long]$match.Groups["job"].Value
            document_name = $match.Groups["doc"].Value.Trim()
            windows_username = $match.Groups["user"].Value.Trim()
            machine_name = $match.Groups["machine"].Value.Trim()
            printer_name = $match.Groups["printer"].Value.Trim()
            port_name = $match.Groups["port"].Value.Trim()
            job_size_bytes = [long]$match.Groups["size"].Value
            pages_printed = [int]$match.Groups["pages"].Value
            printed_at = $ev.TimeCreated.ToUniversalTime().ToString("o")
        }

        try {
            $body = $payload | ConvertTo-Json -Depth 4
            $response = Invoke-RestMethod `
                -Uri $collectorUrl `
                -Method Post `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $body

            Write-Host "Processed print event $($ev.RecordId)."

            $lastId = [long]$ev.RecordId
            Set-Content -LiteralPath $checkpoint -Value $lastId
        }
        catch {
            Write-Warning "Upload failed for event $($ev.RecordId). Will retry. Check the collector and token."
            break
        }
    }

    Start-Sleep -Seconds 3
}
