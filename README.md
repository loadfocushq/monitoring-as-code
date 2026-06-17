# @loadfocus/monitoring

Define LoadFocus API-monitoring checks as code (YAML or JS/TS constructs) and `deploy` / `test`
them from CI. Authoring compiles to a canonical wire format; the server reconciles it
(create/update, safe orphan-deletion) via the `/mac/*` API.

```
loadfocus-monitoring login --apikey <key> --teamid <id>
loadfocus-monitoring init               # scaffold loadfocus.config.yaml + a sample monitor
loadfocus-monitoring validate           # compile locally + server dry-run; nothing applied
loadfocus-monitoring test               # run checks ad-hoc (no persistence), CI exit code
loadfocus-monitoring deploy --dry-run   # preview the plan, change nothing
loadfocus-monitoring deploy             # APPLY (prompts y/N before any deletions)
loadfocus-monitoring deploy --yes       # APPLY non-interactively (CI; allows deletions)
loadfocus-monitoring trigger            # run already-deployed checks on demand (CI exit code)
loadfocus-monitoring list               # inventory of deployed resources
loadfocus-monitoring get <logicalId>    # show one deployed resource
loadfocus-monitoring env ls             # list secret + variable KEYS (values never shown)
loadfocus-monitoring logout             # clear saved credentials
```

All read/result commands accept `--json` for machine-readable output (CI/agents). In a
non-interactive environment (CI detected, or piped stdin), a `deploy`/`destroy` that would delete
without `--yes` exits with code **2** and prints a `confirmation_required` payload instead of
hanging on a prompt.

Config: `loadfocus.config.{json,yaml,js}` (project, defaults, checkMatch glob).

## Credentials & configuration
Resolution order (highest first): **environment variables → `~/.loadfocus/config.json`**.

| Setting | Env var | Config key | Default |
|---|---|---|---|
| API key | `LOADFOCUS_API_KEY` | `apikey` | — (required) |
| Team id | `LOADFOCUS_TEAM_ID` | `teamId` | — (required) |
| API base URL | `LOADFOCUS_API_URL` | `apiBaseUrl` | `https://apimonitor.loadfocus.com` |

```
loadfocus-monitoring config set --apikey <key> --teamid <id> [--api-url <url>]
loadfocus-monitoring config show     # resolved creds, apikey masked
loadfocus-monitoring whoami          # verify the creds against the server
```
The config file is written `0600`. In CI, prefer the env vars over committing the key.

## Authoring

YAML (`monitors/home.check.yaml`):
```yaml
kind: check
type: api
logicalId: home
name: Home API
schedule: "300"
locations: [us-east-1]
request: { url: "https://example.com", method: GET }
assertions: [{ type: statusCode, comparison: equals, value: 200 }]
```
or JS/TS constructs (`monitors/home.check.js`):
```js
const { Monitor } = require('@loadfocus/monitoring');
module.exports = [ new Monitor({ type: 'api', logicalId: 'home', name: 'Home API', schedule: '300',
  locations: ['us-east-1'], request: { url: 'https://example.com', method: 'GET' },
  assertions: [{ type: 'statusCode', comparison: 'equals', value: 200 }] }) ];
```
One `Monitor({ type })` covers all check types (api/browser/multistep/tcp/heartbeat); org primitives
are `Group`, `AlertRule`, `Maintenance`, `Dashboard`.

Ready-to-copy samples (one of each kind + a config) live in `examples/monitors/`.

### Field values (validated server-side)
The server validates these enums on `deploy`/`test` — using a value outside the set fails the
request:
- **check** `type`: `api` · `browser` · `multistep` · `tcp` · `heartbeat`
- **assertion** `type`: `statusCode` · `responseTime`; `comparison`: `equals` · `above` · `below`
- **alertRule** `metric`: `responseTime` · `statusCode` · `duration`; `condition`: `above` · `below`

## Adopt an existing project
```
loadfocus-monitoring import --project acme-prod --out monitors
# review the generated monitors/*.yaml + loadfocus.config.yaml, commit, then deploy.
```

## CI/CD
See `examples/github-actions.yml` and `examples/gitlab-ci.yml` — `test` on PRs, `deploy --yes`
on merge. Set `LOADFOCUS_API_KEY` + `LOADFOCUS_TEAM_ID` as CI secrets. Tip: run
`loadfocus-monitoring whoami` as a pre-flight step so a bad/expired secret fails fast and clearly
instead of mid-deploy.

`deploy --yes` / `destroy --yes` apply AND delete non-interactively — the human gate is your
merge, so protect the deploy branch (require PR review + scope the workflow's path filter).

## Security
- **Don't hardcode credentials in authored YAML.** Write the literal placeholder strings
  `{{secrets.NAME}}` / `{{variables.NAME}}` in your check fields — the CLI ships them verbatim
  (it does NOT expand them client-side) and the **server** resolves them at run time, so the real
  value never lands in git. Manage the values with `env set-secret` / `env set-var` (or the
  LoadFocus app) — never in these files. `env ls` lists keys; values are never printed.
- **Authoring files are executed.** `.js` authoring files and `loadfocus.config.js` are
  `require()`d when the CLI runs (like `terraform`/`webpack` config), so only run the CLI in a
  repo you trust. `node_modules`/`.git` are excluded; scope `checkMatch` to e.g. `monitors/**`.
- **`apiBaseUrl` controls where your apikey is sent.** The CLI refuses cleartext `http` to a
  non-loopback host and warns when the host isn't `*.loadfocus.com`. Keep the default unless you
  run a self-hosted endpoint.


## License
Apache-2.0 — see `LICENSE`.
