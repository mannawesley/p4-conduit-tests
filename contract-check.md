# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-18

## 1. My first look
How I would check that an article answer has the right shape:

Same keys: no key missing, renamed, or added. A missing or renamed key breaks the other apps.
Same types: favoritesCount stays a number, favorited stays true/false, tagList stays a list.
Author too: check the keys inside author, not only the top level.

The test checks types, not exact values, because other articles have different text. If your Playwright version doesn’t have toBeOneOf, check bio and image separately: each must be a string or null.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):**
  - **missing:** fails. `bio` is gone, so the list has 4 keys, not 5.
  - **new field:** fails. `password` makes 6 keys, not 5.
  - **number:** passes. The key names are the same; the key list doesn't look at value types.

  So the two checks cover each other: the key list catches missing and extra fields, and `toMatchObject` with `expect.any` catches wrong types. Use both.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. In every schema test, check both the exact key list from API.md (top level and inside `author`) and the type of each field with `toMatchObject` and `expect.any`.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
My own article test already had exact key lists (lines 73–75), because of my rule. The question was about a test from another run.
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape" (lines 37–63, `toMatchObject` only)
- **Claude said:** "an anonymous reader gets 200 and the full Article shape."
- **My answer:** No, it stays green. `toMatchObject` only checks the fields it lists, so a new `password` field (or any extra field) slips through. The test name and Claude's line say "full Article shape", but the code doesn't check that.

  Fix: add exact key lists after line 62:
  ```ts
  const json = await response.json();
  expect(Object.keys(json.article).sort()).toEqual([
    'author', 'body', 'createdAt', 'description', 'favorited',
    'favoritesCount', 'slug', 'tagList', 'title', 'updatedAt',
  ]);
  expect(Object.keys(json.article.author).sort()).toEqual([
    'bio', 'following', 'image', 'username',
  ]);
  ```
  Now an extra field, at the top level or inside `author`, turns the test red.

## 6. My change
- **What I asked Claude:** "in @P4/tests/contract.spec.ts In the test "PUT /api/articles/:slug on someone else's article gives 403 and changes nothing", after the GET at lines 159–164, add exact key list checks for `article` and `article.author`. Take the keys from the Article shape in API.md. Keep the three value checks. Do not read P4/app and do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** I predict **2 tests fail**:
  1. **"GET /api/articles/:slug answers with the Article shape"**: its key list has 10 names, but the answer now has 9. If the missing field is also in its `toMatchObject` list, that fails too.
  2. **"PUT on someone else's article gives 403 and changes nothing"**: after the GET, the new key list check finds one name missing.

  The other 3 should **pass**:
  - **GET /api/user shape**: it reads the user answer, not the article answer.
  - **No token** and **wrong token**: the app answers 401 before it builds any article answer, so there's nothing to break.

  If more tests fail, that's useful too: it means the missing field was something they relied on, like `slug` used to build the next URL.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed (✘ "GET /api/articles/:slug answers with the Article shape from API.md"; ✘ "PUT /api/articles/:slug on someone else's article gives 403 and changes nothing")
- **What Playwright showed:** the article test, line 74: `-   "body",` (Expected - 1, Received + 0). The 403 test, line 164: Expected "Body text for the contract tests.", Received undefined.
- **My answer about a red test:** Because it reads the article again to prove nothing changed, and that check uses `body`. F2 removed `body`, so line 164 got `undefined` instead of the original text and stopped the test there.
  - **It failed on line 164, not on the new key list (line 167).** A test stops at the first failed `expect`, so the key list check never ran.
  - **The message can mislead.** "Expected the body text, received undefined" could look like the forbidden PUT wiped the body. The real cause is the missing field in every article answer, which the shape test's diff shows clearly.

  So the failure is correct, the article answer broke API.md, but read the shape test first to find the cause.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
