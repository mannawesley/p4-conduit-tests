# Tests from Playwright's agents, and my review (week 4, project P4)

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. After following the author, reload the page and check that the button shows "Unfollow" and the follower count went up by one, not only that the click worked.
- **The plan the planner saved:** `specs/profile-follow.md` (PF-01, 5 steps; PF-02, 3 steps)
- **The test files the generator wrote:** `tests/profile-follow/follow-persists.spec.ts`, `tests/profile-follow/unfollow-persists.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says the test sets its own start state: if the user already follows the author, it clicks Unfollow first. So we can keep this test in our suite as it is, right?"
- **My answer:** Not as it is. Claude described the code correctly, but "sets its own start state" only works if nothing else touches that state at the same time.
  - Shared user, shared data. Both follow tests (follow-persists and unfollow-persists) sign in as practice-reader and change the same follow on the server. Playwright runs files in parallel, so one test can unfollow while the other is checking "Unfollow" → random failures. Fix: give each test its own user, or run the two serially (`test.describe.configure({ mode: 'serial' })` in one file).
  - Line 21 doesn't wait. `isVisible()` checks once. If the page first shows "Follow" and loads the real follow state a moment later, line 20 passes on the wrong button, the test skips the unfollow, and line 28 clicks a button that is about to change. Fix: wait for the page's follow state to finish loading before deciding.
  - It leaves data behind. The test ends with the user following the author, which is the start state another test might not expect. Clean up in `afterEach`, or make every test that uses this user set its own start state.
  - So: keep it, but only after the shared-user problem is fixed. Until then it can pass alone and fail in the full suite.
- "PF-01 Follow persists after reload (button and follower count)" · **changed**, because it checks something useful (a follow survives a reload), but it signs in as practice-reader, a shared user, so other tests and teammates can change its follow state mid-run. It must sign up its own new user by API, then follow practice-author with that user. With a fresh user the start state is always "Follow", so lines 20–23 (the `isVisible()` check and the conditional unfollow) can be deleted too.
- "PF-02 Unfollow persists after reload" · **changed**, because it checks something useful (an unfollow survives a reload, the opposite of PF-01, so not a repeat), but it fails three checklist points:
  - #8 Own data: it signs in as practice-reader, the same shared user as PF-01. Run in parallel, the two tests flip the same follow. Fix: sign up its own user by API, and make that user follow practice-author by API as setup, so the start state is always "Unfollow".
  - #6 Waits before acting: line 21 uses `isVisible()`, which checks once without waiting. With the API setup, lines 20–23 go away and line 24 becomes a real web-first check.
  - #7 Page object: the locators (lines 16–17, and the login ones) are written in the test. Move them to a profile page object under `pages/`, shared with PF-01.
  - Points 1, 2 and 5 pass: getByRole with exact names, no waitForTimeout.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In follow-persists.spec.ts: sign up its own new user by API, then follow practice-author with that user; delete lines 20–23. In unfollow-persists.spec.ts: #8 own user by API, made to follow practice-author by API as setup; #6 lines 20–23 go away and line 24 becomes a real web-first check; #7 move the locators to a profile page object under `pages/`, shared with PF-01. (Full wording in `P4/prompts/stronger.md`.)
- **Result:** No fault: 22 passed, 0 failed (second fault run). Claude added `tests/pages/profile-page.ts`; neither follow test uses practice-reader now.
