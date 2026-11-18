import { test, expect, APIRequestContext, Page } from '@playwright/test';

// A suffix unique to this run. Every typed value carries it,
// so the API checks at the end cannot pass before the journey.
function runId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Sign up a new user with the API and return the username and token.
async function signUp(request: APIRequestContext, name: string) {
  const username = `${name}${runId()}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username,
        email: `${username}@example.in`,
        password: 'Pass@12345',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

// Give the page the token: the page reads it from localStorage, key jwtToken.
// addInitScript runs before the page's own code on every load.
async function giveToken(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
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
  // The list is read by author, so this also works when the test failed before it knew the slug.
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

test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
  const author = await signUp(request, 'priya');
  articleAuthors.push(author);
  const id = runId();
  const typed = {
    title: `Diwali sale checklist ${id}`,
    description: `Price checks for PIN code 560001 ${id}`,
    body: `Check the price shows ₹2,499 and the helpline +91 98765 43210. Run ${id}.`,
  };

  // Before the journey: the new user has no articles.
  const before = await request.get(`/api/articles?author=${encodeURIComponent(author.username)}`);
  expect(before.status()).toBe(200);
  expect((await before.json()).articlesCount).toBe(0);

  // The journey in the page.
  await giveToken(page, author.token);
  await page.goto('/editor');
  await expect(page.getByRole('heading', { name: 'New Article' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(typed.title);
  await page.getByRole('textbox', { name: "What's this article about?" }).fill(typed.description);
  await page.getByRole('textbox', { name: 'Write your article' }).fill(typed.body);
  await page.getByRole('button', { name: 'Publish Article' }).click();
  await expect(page.getByRole('heading', { level: 1, name: typed.title })).toBeVisible();

  // After the journey: read the result with the API.
  const list = await request.get(`/api/articles?author=${encodeURIComponent(author.username)}`);
  expect(list.status()).toBe(200);
  const listJson = await list.json();
  expect(listJson.articlesCount).toBe(1);
  const slug = listJson.articles[0].slug;

  // The list has no body, so read the one article by its slug.
  const one = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
  expect(one.status()).toBe(200);
  const article = (await one.json()).article;
  expect(article.title).toBe(typed.title);
  expect(article.description).toBe(typed.description);
  expect(article.body).toBe(typed.body);
  expect(article.author.username).toBe(author.username);
});

test('a signed-in user posts a comment on an article', async ({ page, request }) => {
  // A different user writes the article with the API.
  const writer = await signUp(request, 'arjun');
  articleAuthors.push(writer);
  const created = await request.post('/api/articles', {
    headers: { Authorization: `Token ${writer.token}` },
    data: {
      article: {
        title: `Pongal offer ${runId()}`,
        description: 'Offer for PIN code 600001',
        body: 'The offer price is ₹999.',
      },
    },
  });
  expect(created.status()).toBe(201);
  const slug = (await created.json()).article.slug as string;

  // The new user who will comment in the page.
  const commenter = await signUp(request, 'meera');
  commentOn = { slug, commenter };
  const commentBody = `Price shows ₹999 for PIN 600001. Call +91 91234 56789. Run ${runId()}.`;

  // Before the journey: the article has no comments.
  const before = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(before.status()).toBe(200);
  expect((await before.json()).comments).toHaveLength(0);

  // The journey in the page.
  await giveToken(page, commenter.token);
  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await page.getByRole('textbox', { name: 'Write a comment' }).fill(commentBody);
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: commentBody })).toBeVisible();

  // After the journey: read the comments with the API.
  const after = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(after.status()).toBe(200);
  const comments = (await after.json()).comments;
  expect(comments).toHaveLength(1);
  expect(comments[0].body).toBe(commentBody);
  expect(comments[0].author.username).toBe(commenter.username);
});
