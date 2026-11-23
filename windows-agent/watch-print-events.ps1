
$ErrorActionPreference = "Stop"

$logName = "Microsoft-Windows-PrintService/Operational"
$configPath = Join-Path $PSScriptRoot "agent-config.json"
$checkpoint = Join-Path $PSScriptRoot "print-event-checkpoint.txt"

# Each department laptop has its own local config. Never put the Supabase
# service-role key in this file; only the dedicated print-agent token belongs here.
if (!(Test-Path $configPath)) {
    throw "Missing agent-config.json. Copy agent-config.example.json to agent-config.json and configure it."
}

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$collectorBaseUrl = ([string]$config.collector_url).Trim().TrimEnd('/')
$token = ([string]$config.agent_token).Trim()
$agentId = ([string]$config.agent_id).Trim()

if (!$collectorBaseUrl -or !$token -or !$agentId) {
    throw "agent-config.json must contain collector_url, agent_token, and agent_id."
}

if ($collectorBaseUrl -notmatch '^https://') {
    throw "collector_url must use HTTPS (your Render service URL)."
}

$collectorUrl = "$collectorBaseUrl/api/print-job-events"
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
        $pattern = '(?is)Document\s+(?<job>\d+),\s*(?<doc>.*?)\s+owned by\s+(?<user>.*?)\s+on\s+(?<machine>.*?)\s+was printed on\s+(?<printer>.*?)\s+through port\s+(?<port>.*?)\.\s+Size in bytes:\s*(?<size>\d+)\s*[.;]\s*Pages printed:\s*(?<pages>\d+)'
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
    Write-Warning "Upload failed for event $($ev.RecordId)."
    Write-Warning "Actual error: $($_.Exception.Message)"

    if ($_.Exception.Response) {
        $response = $_.Exception.Response
        Write-Host "HTTP Status: $([int]$response.StatusCode)"

        $reader = New-Object System.IO.StreamReader(
            $response.GetResponseStream()
        )
        $details = $reader.ReadToEnd()
        $reader.Close()

        Write-Host "Server response: $details"
    }

    break
}
    }

    Start-Sleep -Seconds 3
}
