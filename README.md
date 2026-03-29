# @gitforge/cli

Terminal-native management tool for [GitForge](https://git-forge.dev) — Git infrastructure for developers who build on Git.

## Install

```bash
npm install -g @gitforge/cli
```

Or run without installing:

```bash
npx @gitforge/cli <command>
```

## Quick Start

```bash
# Authenticate
gitforge auth login --token gf_your_token_here --endpoint https://api.git-forge.dev

# Check connection
gitforge status

# Create a repo
gitforge repo create --name my-repo --visibility private

# List repos
gitforge repo list

# Generate a short-lived token
gitforge token create --name "ci-token" --scopes "repo:read,repo:write"
```

## Commands

### Auth

```bash
gitforge auth login --token <pat>     # Store credentials
gitforge auth login --token <pat> --endpoint <url>
gitforge auth status                   # Show current auth info
gitforge auth token                    # Print PAT to stdout (for piping)
gitforge auth logout                   # Clear stored credentials
```

### Repos

```bash
gitforge repo create --name <name> [--visibility public|private] [--description <desc>]
gitforge repo list [--format table|json] [--limit N]
gitforge repo get <id>
gitforge repo delete <id> --yes
```

### Tokens

```bash
gitforge token create --name <name> --scopes <scopes>
gitforge token list [--format table|json]
gitforge token revoke <id>
```

### Apps

```bash
gitforge app create --name <name>
gitforge app list [--format table|json]
gitforge app token <appId> --install <installId>
```

### Billing

```bash
gitforge billing reconcile [--dry-run]   # Sync Stripe with plan config
gitforge billing drift                     # Check for config/Stripe mismatches
```

### Storage

```bash
gitforge storage migrate --source s3 --target sftp --prefix <prefix> [--dry-run]
```

### Release Notes

```bash
gitforge release notes --repo <id> --base v0.1.0 --head v0.2.0
```

### Other

```bash
gitforge status           # Health check: auth, endpoint, repo count
gitforge init             # Interactive setup wizard
gitforge --version        # Print version
gitforge --help           # Show all commands
```

## Global Options

```bash
--token <pat>    # Override stored/env auth for this command
--json           # Force JSON output (auto-enabled when piped)
--quiet          # Suppress non-essential output
```

## Auth Priority

The CLI resolves authentication in this order:

1. `--token` flag (highest)
2. `GITFORGE_TOKEN` environment variable
3. Stored credentials (`~/.config/gitforge/auth.json`)

## Config

Stored at `~/.config/gitforge/`:

```
~/.config/gitforge/
├── auth.json      # { "token": "gf_..." }
└── config.json    # { "endpoint": "...", "defaultVisibility": "private", "outputFormat": "table" }
```

Set config values:

```bash
gitforge config set endpoint https://api.git-forge.dev
gitforge config set defaultVisibility private
gitforge config set outputFormat json
gitforge config list
```

## CI/CD Usage

```bash
# Use environment variable (no interactive auth)
export GITFORGE_TOKEN=gf_your_token_here
export GITFORGE_API_URL=https://api.git-forge.dev

gitforge repo create --name "build-$(date +%s)" --visibility private
gitforge release notes --repo $REPO_ID --base $PREV_TAG --head $NEW_TAG
```

## Contributing

This CLI is developed inside the [GitForge monorepo](https://github.com/Nu11ified/GitForge) at `sdks/cli/` and published to this repo via git subtree.

To contribute:

1. Clone the monorepo: `git clone https://github.com/Nu11ified/GitForge.git`
2. Install dependencies: `cd sdks/cli && bun install`
3. Make changes in `sdks/cli/`
4. Run tests: `bun test sdks/cli/`
5. Submit a PR to the monorepo

## License

MIT
