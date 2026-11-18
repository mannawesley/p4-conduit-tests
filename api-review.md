# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- comments method 201 created
- post

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201. Body has comment.body = “Clear and useful.” (also author.username = “practice-reader” and a new id). The app answered 201, comment body "Clear and useful.", author practice-reader, id 5.
- **B** (the same comment, with no token): I predicted 401. Body: {"errors":{"token":["is missing"]}}. The endpoint needs a token and none was sent, so it fails before the article is even checked. The app answered 401, {"errors":{"token":["is missing"]}}.
- **C** (a comment on an article that does not exist): I predicted 404. Body: {"errors":{"article":["not found"]}}. The token is valid, but there’s no article with slug no-such-article to attach the comment to. The app answered 404, {"errors":{"article":["not found"]}}.

**What surprised me most:** B’s ordering is also telling. Without a token, the app returned 401 before checking anything else. It didn’t validate the body or look up the article. Auth runs first, so an anonymous caller learns nothing about which articles exist.

Test ideas that follow from this:
- Send a body with a fake author field and assert the response still shows practice-reader.
- Send no token to a non-existent slug and assert 401, not 404, to confirm auth is checked first.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Assert both the exact status from API.md and the specific body fields: on success, that returned values match what was sent (title, body, author from the token); on errors, the exact error key and message, such as `{"errors":{"article":["not found"]}}`.
```

## 4. The run
- **Result:** `npx playwright test tests/api.spec.ts` → 9 passed, 0 failed.
- **A red test, and who is wrong:** No test failed.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "create an article with no title returns 422 title cannot be blank" (lines 122–133)
- **My answer:** No, not from this test. It only checks what the app *said*, not what it *did*. A buggy app could save a half-made article and still answer 422 with the right message, and this test would pass.

  To prove nothing was saved, add a check after the request, for example:

  ```ts
  const list = await request.get('/api/articles?author=sneha');
  expect((await list.json()).articlesCount).toBe(0);
  ```

  Because `sneha` is a fresh user from `signUp`, she should have zero articles, so any article found means the refused request still wrote data.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "change an article returns 200 with the new values and keeps the fields not sent" (lines 74–93)
- **My decision:** Fix. It checks the exact 200, exact values, and it makes its own user. But it changes data and never reads it again, so it only proves what the app *said*.
  1. Status: ✓ exact 200.
  2. Body: ✓ exact title, body, description, author.
  3. Shape: partly. It checks four fields, not that the answer has every key API.md lists (`slug`, `createdAt`, `updatedAt`, `tagList`, etc.).
  4. Read again: ✗ missing. Add a GET after the PUT:
     ```ts
     const after = await request.get(`/api/articles/${json.article.slug}`);
     expect(after.status()).toBe(200);
     const saved = (await after.json()).article;
     expect(saved.title).toBe(changes.title);
     expect(saved.body).toBe(changes.body);
     expect(saved.description).toBe(newArticle.description);
     ```
  5. Own data: ✓ `signUp` gives a unique user.

  One catch in that GET: use `json.article.slug`, not `created.slug`. Changing the title can change the slug in Conduit, so the old slug may return 404. Worth asserting that too: the old slug should no longer find the article if API.md says the slug follows the title.

### "change someone else's article returns 403 article forbidden" (lines 142–154)
- **My decision:** Change. It's a valuable negative case and gets most of the checklist right, but it's missing item 4.
  1. Status: ✓ exact 403.
  2. Body: ✓ exact error `{ errors: { article: ['forbidden'] } }`.
  3. Shape: ✓ the whole error object is compared with `toEqual`.
  4. Negative case: ✗ it never proves the refused request changed nothing. A buggy app could save "Taken over" and still answer 403.
  5. Own data: ✓ two fresh users from `signUp`.

  Add after line 153:
  ```ts
  const after = await request.get(`/api/articles/${created.slug}`);
  expect(after.status()).toBe(200);
  const saved = (await after.json()).article;
  expect(saved.title).toBe(newArticle.title);
  expect(saved.author.username).toBe(author.username);
  ```

  Here `created.slug` is the right one to use. The title should not have changed, so the slug should not either. If the GET returns 404, that is itself a bug: the forbidden request renamed the article.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check the exact status code and the exact data in the answer, not just that something came back.
2. After a request that changes something or gets refused, use a GET to check what really happened.
3. Each test makes its own user and data, and uses the ids and slugs the app sends back.
