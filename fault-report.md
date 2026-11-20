# My practice fault report (week 4, project P4)

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-20
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** "Green tells you the suite passes. It doesn't tell you it can fail. Right now I can't give you a number. My guess is fewer than 17, maybe a handful." "I don't know yet. Give me a day of fault injection and I'll tell you how many of N seeded bugs we caught. That's the number that matters, not 17/17 green."

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/follow-persists.spec.ts`, `profile-follow/unfollow-persists.spec.ts`, `seed.spec.ts`
- **No fault:** 20 passed, 0 failed
- **F1** (Opening an article gives a server error (500)): caught (7 tests failed)
- **F2** (The article answer has no body text): caught (4 tests failed)
- **F3** (The article answer has a different title): caught (3 tests failed)
- **F4** (The comments list is always empty): caught (1 test failed: e2e comment test)
- **F5** (The article answer comes 3 seconds late): stayed green
- **F6** (Posting a comment is refused (422) and nothing is saved): caught (1 test failed: e2e comment test)

## 3. The weak spot I chose, and why
**Weakest: comments.** F4 and F6 are each caught by only one test, and it's the same test ("a signed-in user posts a comment on an article"). If that one e2e test breaks or is removed, nothing catches either fault. The comments part needs its own tests, for example an API test that posts a comment and reads the list back.

**A fault a good suite should catch:** "Following an author is not saved" (the button changes to Unfollow, but after a reload it shows Follow again). That's exactly what PF-01 was written for, but no fault in this run touches following, so we don't know yet whether PF-01 actually catches it.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Only one test checks comments, and it's an e2e test. Write P4/tests/comments.spec.ts with 2 API tests, each with a new user made by API: a new user posts a comment on an article, and the answer has the same body and the new user as author; then a GET of the article's comments shows that comment with the same body and author.
- **New or changed test file:** new `tests/comments.spec.ts`; changed `tests/profile-follow/follow-persists.spec.ts` and `tests/profile-follow/unfollow-persists.spec.ts`; new `tests/pages/profile-page.ts`

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 22 passed, 0 failed
- **The fault I chose:** F4: caught by 2 tests (before: 1). F6: caught by 3 tests (before: 1).

## 6. What changed
Now I have a number. We seeded 6 practice faults: 5 that make the app wrong, and 1 that only makes it slower. The suite caught all 5 wrong ones and stayed green on the slow one, which is what we want.

The numbers also showed a weak spot: both comment faults were caught by only one e2e test. I added 2 API tests for comments, so now an empty comments list is caught by 2 tests and a refused comment by 3.

One limit: these faults only touched articles and comments. For other parts, like following an author, "green" still proves nothing until we run faults there too. That's my next step.
