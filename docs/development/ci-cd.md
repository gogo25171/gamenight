# CI/CD

Every push and pull request runs the pipeline in
[`.github/workflows/`](https://github.com/gogo25171/gamenight/tree/main/.github/workflows).

## `ci.yml` — on push and pull request

| Job | What it does |
|-----|--------------|
| **test** | Node 18, 20 and 22 in parallel: `npm ci`, `node --check` on every JS file, the tournament test, then boots the server and fetches `/` and `/js/app.js` |
| **versions** | Checks the version claims in the repo agree with each other |
| **audit** | `npm audit --omit=dev --audit-level=high` on production dependencies |
| **docker** | Builds the image, runs the container, and confirms it answers on port 4000 |
| **pre-commit** | Runs the same hooks contributors run locally |

The matrix uses `fail-fast: false`, so a failure on one Node version still tells
you whether the others pass.

### What "version consistency" means

The `versions` job exists because version numbers are stated in several places
that quietly drift apart:

- The `FROM node:` major in the `Dockerfile` must be a version the test matrix
  actually covers — otherwise the image ships on a runtime nothing tested.
- `engines.node` must be declared in `package.json`, and its minimum must appear
  in the matrix — otherwise the README promises support nobody verifies.
- `npm ci --dry-run` fails if `package-lock.json` has drifted from
  `package.json`.

## `security.yml` — Trivy

Runs on every push and pull request, plus every Monday at 04:00 UTC — the
schedule matters, because a dependency that was clean when you merged it can be
the subject of an advisory a week later.

| Job | Scans |
|-----|-------|
| **trivy-repo** | The repository: dependency vulnerabilities, hard-coded secrets and misconfigurations |
| **trivy-image** | The container image that actually ships, base layer included |

Results are uploaded as SARIF and appear under **Security → Code scanning**, so
findings are tracked and de-duplicated across runs rather than buried in a log.

The build only fails on **fixable** HIGH or CRITICAL findings
(`ignore-unfixed: true`). An unfixable CVE in the Alpine base layer should show
up in the security tab without blocking every pull request — there is nothing a
contributor can do about it until upstream publishes a patch.

Trivy complements `npm audit` rather than replacing it: `npm audit` only knows
about npm packages, while Trivy also sees the operating-system packages inside
the image, Dockerfile misconfigurations, and accidentally committed secrets.

Run it locally the same way:

```bash
trivy fs --scanners vuln,secret,misconfig .
docker build -t gamenight:scan . && trivy image gamenight:scan
```

## `docs.yml` — this site

On a pull request that touches `docs/` or `mkdocs.yml`, the site is built with
`mkdocs build --strict` and nothing is published. Strict mode turns warnings —
a broken internal link, a page missing from the nav — into failures.

On `main`, the built site is uploaded and deployed to GitHub Pages.

Build it locally the same way:

```bash
pip install -r requirements-docs.txt
mkdocs serve          # live reload on http://127.0.0.1:8000
mkdocs build --strict # exactly what CI runs
```

## `release.yml` — publishing an image

Pushing a version tag builds a multi-architecture image (amd64 and arm64) and
pushes it to the GitHub Container Registry:

```bash
npm version minor        # bumps package.json and creates the tag
git push --follow-tags
```

The workflow first checks the tag matches `package.json`, so a mistyped tag
fails before anything is published rather than shipping a mislabelled image.

Published images:

```bash
docker pull ghcr.io/gogo25171/gamenight:latest
docker pull ghcr.io/gogo25171/gamenight:1.2.0
```

## Dependabot

[`.github/dependabot.yml`](https://github.com/gogo25171/gamenight/blob/main/.github/dependabot.yml)
opens update pull requests weekly for npm packages, GitHub Actions and the
Docker base image, and monthly for the docs toolchain. npm updates are grouped
into one production pull request and one development pull request rather than
one per package.

Every Dependabot pull request goes through the same CI, so an update that breaks
the build says so before it is merged.

## Caching

`actions/setup-node` caches the npm cache, `actions/setup-python` caches pip,
and the Docker jobs use the GitHub Actions build cache (`type=gha`). A warm run
is considerably faster than a cold one.

!!! note "Workflows on a fork"

    GitHub disables Actions on newly created forks. They have been enabled on
    this repository; if you fork it again, enable them yourself under
    **Actions** before expecting any of this to run.
