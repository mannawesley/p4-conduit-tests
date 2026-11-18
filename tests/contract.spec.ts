import { test, expect, APIRequestContext } from '@playwright/test';

// Contract tests for the Conduit practice app.
// Source for every check: P4/API.md.

// Exact key lists from API.md, sorted A to Z.
const USER_KEYS = ['bio', 'email', 'image', 'token', 'username'];
const ARTICLE_KEYS = [
  'author',
  'body',
  'createdAt',
  'description',
  'favorited',
  'favoritesCount',
  'slug',
  'tagList',
  'title',
  'updatedAt',
];
const PROFILE_KEYS = ['bio', 'following', 'image', 'username'];

// A unique name for each new user, so tests do not clash.
function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Sign up a new user. API.md: POST /api/users gives 201 and a User with a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('contract-user');
  const response = await request.post('/api/users', {
    data: {
      user: {
        username,
        email: `${username}@example.com`,
        password: 'Password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

// Create an article. API.md: POST /api/articles gives 201 and an Article.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: {
      article: {
        title: uniqueName('Contract article'),
        description: 'An article for the contract tests',
        body: 'Body text for the contract tests.',
        tagList: ['testing', 'api'],
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article as { slug: string; title: string; description: string; body: string };
}

test.describe('Schema checks', () => {
  test('GET /api/articles/:slug answers with the Article shape from API.md', async ({ request }) => {
    const author = await signUp(request);
    const created = await createArticle(request, author.token);

    const response = await request.get(`/api/articles/${created.slug}`);

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact key lists: top level, inside article, inside author.
    expect(Object.keys(json).sort()).toEqual(['article']);
    expect(Object.keys(json.article).sort()).toEqual(ARTICLE_KEYS);
    expect(Object.keys(json.article.author).sort()).toEqual(PROFILE_KEYS);

    // Type of each field.
    expect(json).toMatchObject({
      article: {
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        body: expect.any(String),
        tagList: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
          username: expect.any(String),
          // API.md: a new user has bio and image set to null.
          bio: null,
          image: null,
          following: expect.any(Boolean),
        },
      },
    });
  });

  test('GET /api/user answers with the User shape from API.md', async ({ request }) => {
    const user = await signUp(request);

    const response = await request.get('/api/user', {
      headers: { Authorization: `Token ${user.token}` },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact key lists: top level and inside user.
    expect(Object.keys(json).sort()).toEqual(['user']);
    expect(Object.keys(json.user).sort()).toEqual(USER_KEYS);

    // Type of each field.
    expect(json).toMatchObject({
      user: {
        email: expect.any(String),
        token: expect.any(String),
        username: expect.any(String),
        // API.md: a new user has bio and image set to null.
        bio: null,
        image: null,
      },
    });
  });
});

test.describe('Auth checks', () => {
  test('GET /api/user with no token gives 401 "is missing"', async ({ request }) => {
    const response = await request.get('/api/user');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
  });

  test('GET /api/user with a wrong token gives 401 "is invalid"', async ({ request }) => {
    const response = await request.get('/api/user', {
      headers: { Authorization: 'Token this-is-not-a-real-token' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
  });

  test("PUT /api/articles/:slug on someone else's article gives 403 and changes nothing", async ({ request }) => {
    const owner = await signUp(request);
    const other = await signUp(request);
    const created = await createArticle(request, owner.token);

    const response = await request.put(`/api/articles/${created.slug}`, {
      headers: { Authorization: `Token ${other.token}` },
      data: { article: { title: 'Changed by someone else' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    // The article must stay as it was.
    const after = await request.get(`/api/articles/${created.slug}`);
    expect(after.status()).toBe(200);
    const json = await after.json();
    expect(json.article.title).toBe(created.title);
    expect(json.article.description).toBe(created.description);
    expect(json.article.body).toBe(created.body);

    // Exact key lists from the Article shape in API.md: inside article and inside author.
    expect(Object.keys(json.article).sort()).toEqual(ARTICLE_KEYS);
    expect(Object.keys(json.article.author).sort()).toEqual(PROFILE_KEYS);
  });
});
