# My CI workflow and review (week 4, project P4)

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-20

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.13.0
- **My whole suite on my laptop:** `npx playwright test` → 22 passed, 0 failed
- **What the GitHub computer needs (my words):** Use Node.js 24, install packages with npm ci, and install only Chromium with npx playwright install --with-deps chromium.

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js 24, install packages with npm ci, and install only Chromium with npx playwright install --with-deps chromium.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** my rule gave Claude the facts, so my file already had `node-version: 24`, `npm ci` and Chromium only. The line I judged came from another run, with no Node.js rule: `node-version: 22` (with `cache: npm`).
- **Claude said:** "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js 24 (my laptop: v24.13.0) · `npm ci`, from `package-lock.json` · Chromium only
- **My answer to the developer:** **Not yet.** Claude itself flagged it: "Nothing in the material asks for a specific version." So 22 is a guess, not something it read in package.json or the README. Our project runs on Node 24 (my laptop has v24.13.0, and the suite is green there). CI on 22 tests a different setup than the one we use, and a package that needs 24 could fail there, or pass there and break locally. Change line 16 to `node-version: 24`, then merge. To stop this guess next time, add `"engines": { "node": ">=24" }` to package.json, so the version is written down where anyone (and Claude) can read it.
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, add a comment above line 16: # Node 24: the suite is green on Node v24.13.0 on my laptop. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 1–17):**
  - Line 1: the workflow's name on the Actions tab: "Playwright tests".
  - Lines 3–4: when it runs: on every push, to any branch.
  - Lines 6–7: one job, called `test`.
  - Line 8: where: a fresh Linux computer at GitHub.
  - Lines 10–11: step 1 copies the repository onto that computer.
  - Lines 13–14: step 2 installs Node.js with GitHub's ready-made setup-node step.
  - Line 16: a comment; GitHub skips it. It says why we use 24.
  - Line 17: install Node 24 (the newest 24.x, maybe not exactly 24.13.0).
- **Packages, browser, tests and the report (lines 19–33):**
  - Lines 19–20: install the packages, exactly as in package-lock.json.
  - Lines 22–23: install Chromium and the Linux libraries it needs.
  - Lines 25–26: run all the tests.
  - Line 28: a step that saves the test report.
  - Line 29: do this step even if tests failed; skip it only if someone stopped the run.
  - Line 30: use GitHub's ready-made upload step.
  - Line 32: call the saved file "playwright-report".
  - Line 33: take it from the playwright-report folder, where Playwright writes the HTML report.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- …

### Tuesday: `tests/contract.spec.ts`
- …
