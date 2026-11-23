# IHAP Windows print-event agent setup

This agent sends Windows PrintService event 307 metadata to the existing IHAP print collector hosted on Render. It does not upload document contents.

## 1. Configure the Render collector

In the Render dashboard, open the existing IHAP print-collector web service and confirm:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health check path (if configured): `/health`

Set these environment variables in Render (use your real Supabase project values):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side secret only; never put this in a laptop config or frontend variable)
- `AGENT_TOKEN` (a long, random secret shared with the three authorized agents)

Render supplies `PORT` automatically. After deploying, verify `https://ihap.onrender.com/health` returns `{"ok":true}`.

## 2. Configure each department laptop

On each Windows laptop:

1. Copy `windows-agent/agent-config.example.json` to `windows-agent/agent-config.json`.
2. Set `collector_url` to the base HTTPS URL of your Render service (no `/api/...` suffix).
3. Set `agent_token` to exactly the `AGENT_TOKEN` value configured on Render.
4. Set `agent_id` to a unique, recognizable label, for example `DEPARTMENT-1-LAPTOP-01`, `DEPARTMENT-2-LAPTOP-01`, and `DEPARTMENT-3-LAPTOP-01`. Replace these with your actual department names if preferred.
5. Keep `agent-config.json` private. It is excluded by `.gitignore`; do not upload it to a public repository.

The dashboard's Captured print activity table now displays both Agent / Department ID and the Windows computer name, so the three sources can be distinguished.

## 3. Start the watcher

Open PowerShell on the laptop, navigate to the `windows-agent` folder, and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\watch-print-events.ps1
```

The Windows PrintService Operational log must be enabled and the watcher account must be allowed to read it. To test, start the watcher and then print a small test page. The first run initializes its checkpoint at the newest existing event, so it does not import old print history.

## 4. Verify

- The watcher should report that it started.
- Print a test page from that laptop.
- Check the Render service logs for requests to `/api/print-job-events`.
- Open IHAP > Print Jobs > Captured print activity and refresh. The event should appear with its Agent / Department ID and computer name.

Repeat with a different unique `agent_id` on the other two laptops. All three agents send to the same Render URL and use the same server-side `AGENT_TOKEN`.

## Notes and security

- This collector records print metadata from Windows Event ID 307: document title, Windows user, printer, computer, pages, job size, and timestamps. It does not collect document contents.
- The `agent_id` is used as the source/department label and as part of the event deduplication key. Keep it stable and unique for each laptop; changing it later makes future events appear under a new source.
- Protect the agent token. If it is exposed, rotate `AGENT_TOKEN` in Render and update all three local agent config files.
- The PowerShell parser currently expects the standard English Windows Event 307 message format.
