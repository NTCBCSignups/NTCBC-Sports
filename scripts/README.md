# Scripts

CLI scripts for interacting with the CCSA Dashboard API. Run with `npx tsx scripts/<script>.ts`.

For CCSA, session cookies are persisted to a temp file (`ccsa-cookies.json` in `os.tmpdir()`) so you only need to authenticate once.

## Files

| Script                  | Purpose                               |
| ----------------------- | ------------------------------------- |
| `ccsa-test-client.ts`   | Shared CCSA API client & auth helpers |
| `get-allplayerinfo.ts`  | Fetch team roster                     |
| `add-player-to-team.ts` | Add a player by profile access code   |
