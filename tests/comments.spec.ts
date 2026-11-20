import { test, expect, APIRequestContext } from '@playwright/test';

// API tests for comments. Written from API.md only.

function runId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Sign up a new user with the API and return the username and token.
async function signUp(request: APIRequestContext, name: string) {
  const username = `${name}${runId()}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.in`, password: 'Pass@12345' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

// A different new user writes the article, so the commenter is not the article author.
async function createArticle(request: APIRequestContext, writer: User) {
  const created = await request.post('/api/articles', {
    headers: { Authorization: `Token ${writer.token}` },
    data: {
      article: {
        title: `Onam offer ${runId()}`,
        description: 'Offer for PIN code 682001',
        body: 'The offer price is ₹1,499.',
      },
    },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).article.slug as string;
}

async function postComment(request: APIRequestContext, slug: string, commenter: User, body: string) {
  return request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: { Authorization: `Token ${commenter.token}` },
    data: { comment: { body } },
  });
}

// ---------- Clean-up ----------
// Each test notes here what it made. afterEach deletes it, even when a check fails.
// NOTE: API.md has no request to delete a user. So the new users stay in the app after every run.
type User = { username: string; token: string };
let articleAuthors: User[] = [];
let commentOn: { slug: string; commenter: User } | null = null;

test.beforeEach(() => {
  articleAuthors = [];
  commentOn = null;
});

test.afterEach(async ({ request }) => {
  // 1. Delete the comments the new user posted (comment author only).
  if (commentOn) {
    const { slug, commenter } = commentOn;
    const res = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    if (res.status() === 200) {
      const comments = (await res.json()).comments as { id: number; author: { username: string } }[];
      for (const c of comments.filter((c) => c.author.username === commenter.username)) {
        const del = await request.delete(`/api/articles/${encodeURIComponent(slug)}/comments/${c.id}`, {
          headers: { Authorization: `Token ${commenter.token}` },
        });
        expect(del.status()).toBe(204);
      }
    }
  }
  // 2. Delete every article by each noted author (author only).
  for (const author of articleAuthors) {
    const res = await request.get(`/api/articles?author=${encodeURIComponent(author.username)}`);
    expect(res.status()).toBe(200);
    for (const a of (await res.json()).articles as { slug: string }[]) {
      const del = await request.delete(`/api/articles/${encodeURIComponent(a.slug)}`, {
        headers: { Authorization: `Token ${author.token}` },
      });
      expect(del.status()).toBe(204);
    }
  }
});

test.describe('Comments API', () => {
  test('a new user posts a comment, and the answer has the same body and the new user as author', async ({ request }) => {
    const writer = await signUp(request, 'arjun');
    articleAuthors.push(writer);
    const slug = await createArticle(request, writer);

    const commenter = await signUp(request, 'meera');
    commentOn = { slug, commenter };
    const body = `Price shows ₹1,499 for PIN 682001. Call +91 98450 12345. Run ${runId()}.`;

    const res = await postComment(request, slug, commenter, body);
    expect(res.status()).toBe(201);
    const comment = (await res.json()).comment;
    expect(comment.body).toBe(body);
    expect(comment.author.username).toBe(commenter.username);
  });

  test('a GET of the article comments shows the new comment with the same body and author', async ({ request }) => {
    const writer = await signUp(request, 'suresh');
    articleAuthors.push(writer);
    const slug = await createArticle(request, writer);

    const commenter = await signUp(request, 'divya');
    commentOn = { slug, commenter };
    const body = `Delivered to PIN 560034 for ₹749. Call +91 90080 67890. Run ${runId()}.`;

    // Before: the new article has no comments.
    const before = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(before.status()).toBe(200);
    expect((await before.json()).comments).toHaveLength(0);

    const posted = await postComment(request, slug, commenter, body);
    expect(posted.status()).toBe(201);
    const postedId = (await posted.json()).comment.id;

    // After: GET the comments and find the one just posted.
    const after = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(after.status()).toBe(200);
    const comments = (await after.json()).comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(postedId);
    expect(comments[0].body).toBe(body);
    expect(comments[0].author.username).toBe(commenter.username);
  });
});
