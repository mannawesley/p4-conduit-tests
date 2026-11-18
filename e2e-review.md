# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-18

## 1. My first look
- **After I published an article by hand, I would check:** The core check is that the article you just published shows up in the Global Feed, and it’s clearly yours from this run. Main assertion: the first card in the Global Feed (it’s sorted newest first) has the exact title you typed. Supporting checks on that card: the description matches “What’s this article about?”; the author is practice-author’s username; the date is today’s date; the like count is 0.
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** **No.** The heading is visible as soon as the article page loads, before the click and after it. So line 19 is true before the journey and true after it. It would pass even if the Favorite click did nothing, threw an error, or never reached the server. A check that can't fail tells you nothing.
  - **API (best):** read the article as the reader and check `favorited` is `true` and `favoritesCount` is `1`. With a fresh author and article, the starting count is known to be 0.
  - **Page (weaker, but at least it changes):** the button text changes to "Unfavorite Article" and the count shows 1.

  Both are false before the click and true after it, which is the test that line 19 fails.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end, read the result with the API and match the exact values typed in the page: the new article's title, description, body and author (the new user), and the article's comments list holding exactly one comment with the typed body and the new user as author. Each value must be unique to this run, so the check is false before the journey.
```

## 4. The run
- **Claude's 2 tests:** `npx playwright test tests/e2e.spec.ts` → 2 passed, 0 failed ("a signed-in user publishes a new article in the editor"; "a signed-in user posts a comment on an article").

## 5. The teammate's question
- **Claude said:** "Each test makes a new user with `POST /api/users`." and, at the end of its answer, "The tests have no teardown. The users, articles and comments they create stay in the app after a run."
- **My answer:** **No. Green means the checks passed. It says nothing about cleanup, and these tests never clean up.**

  Each run leaves behind:
  - **Test 1:** a new user and a published article.
  - **Test 2:** a new user and a comment, plus probably another user and the article it commented on, depending on its setup.

  Nothing in the code deletes them. Unique values keep the tests from clashing with each other. They don't remove the data.

  **Why it matters for a daily run:** the Global Feed fills with "Diwali sale checklist …" articles; the database grows every day; a future test that checks something global, like "the feed's first card," can break because of leftovers.

  **What I'd suggest:** add an `afterEach` that deletes what the test created through the API (`DELETE /api/articles/:slug`, and the comment if it's on an article that's kept); check API.md for a way to delete users (if there is none, use a throwaway database reset before each run, or a dedicated test environment); say this plainly in the test file or the README, so "all green" isn't read as "nothing changed."

## 6. What I saw on the home page
- Your first end-to-end test

## 7. My change
- **My line to Claude:** "In @P4/tests/e2e.spec.ts, each test leaves a new user and an article, and test 2 also leaves a comment. Delete the comment and the article with the API in test.afterEach, so it runs even when a check fails. If @P4/API.md has no way to delete a user, say so in a comment in the file. Do not run the tests."
- **The clean-up Claude added:** `test.afterEach` deletes the comments the new user posted and every article by each noted author, and expects 204 for each delete. A comment in the file says API.md has no request to delete a user.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
