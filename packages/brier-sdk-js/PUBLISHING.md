# Publishing `@brier/sdk` to npm

The package is publish-ready. `npm publish` builds first (via `prepublishOnly`)
and ships `dist/`, `README.md`, and `LICENSE` (verified with `npm publish --dry-run`).

## One-time setup

1. **Log in** to npm with an account that may publish under the `@brier` scope:
   ```bash
   npm login
   ```
2. **Claim the `@brier` scope** (free for public packages). Create an npm org named
   `brier` at https://www.npmjs.com/org/create — the scope `@brier` then belongs to it.
   *Alternative:* skip the org and publish unscoped by renaming `"name"` to
   `"brier-sdk"` in `package.json` (the name `brier-sdk` is currently free).

## Publish

```bash
cd packages/brier-sdk-js
npm publish        # access:public is already set in package.json
```

That's it. To cut a new version later, bump `version` (`npm version patch|minor|major`)
then `npm publish` again.

## Verify after publishing

```bash
npm view @brier/sdk
npm install @brier/sdk   # in a scratch project, then import { BrierClient }
```
