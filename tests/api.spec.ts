import { test, expect, APIRequestContext } from '@playwright/test';

// Sign up a new user and return the username and token.
// A time-based suffix keeps each username and email unique.
async function signUp(request: APIRequestContext, name: string) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const username = `${name}${id}`;
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

// Create an article as the given user and return the article from the answer.
async function createArticle(request: APIRequestContext, token: string, article: object) {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: { article },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article;
}

const newArticle = {
  title: 'Monsoon sale checklist',
  description: 'Steps to test the Mumbai monsoon sale',
  body: 'Check the price shows ₹1,499 for PIN code 400001.',
  tagList: ['testing', 'api'],
};

// ---------- Positive tests ----------

test('create an article returns 201 with the sent values and the token user as author', async ({ request }) => {
  const author = await signUp(request, 'priya');

  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${author.token}` },
    data: { article: newArticle },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.body).toBe(newArticle.body);
  expect(json.article.tagList).toEqual(newArticle.tagList);
  expect(json.article.author.username).toBe(author.username);
});

test('read an article by slug returns 200 with the saved values', async ({ request }) => {
  const author = await signUp(request, 'arjun');
  const created = await createArticle(request, author.token, newArticle);

  const response = await request.get(`/api/articles/${created.slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(created.slug);
  expect(json.article.title).toBe(newArticle.title);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.body).toBe(newArticle.body);
  expect(json.article.author.username).toBe(author.username);
});

test('change an article returns 200 with the new values and keeps the fields not sent', async ({ request }) => {
  const author = await signUp(request, 'kavya');
  const created = await createArticle(request, author.token, newArticle);
  const changes = {
    title: 'Diwali sale checklist',
    body: 'Check the price shows ₹2,999 for PIN code 560001.',
  };

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: { Authorization: `Token ${author.token}` },
    data: { article: changes },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.title).toBe(changes.title);
  expect(json.article.body).toBe(changes.body);
  expect(json.article.description).toBe(newArticle.description);
  expect(json.article.author.username).toBe(author.username);
});

test('delete an article returns 204 with no body, then the article is not found', async ({ request }) => {
  const author = await signUp(request, 'rahul');
  const created = await createArticle(request, author.token, newArticle);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: { Authorization: `Token ${author.token}` },
  });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe('');

  const readAgain = await request.get(`/api/articles/${created.slug}`);
  expect(readAgain.status()).toBe(404);
  expect(await readAgain.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('create an article with no token returns 401 token is missing', async ({ request }) => {
  const response = await request.post('/api/articles', {
    data: { article: newArticle },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('create an article with no title returns 422 title cannot be blank', async ({ request }) => {
  const author = await signUp(request, 'sneha');
  const { title, ...noTitle } = newArticle;

  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${author.token}` },
    data: { article: noTitle },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
});

test('read an article that does not exist returns 404 article not found', async ({ request }) => {
  const response = await request.get('/api/articles/no-such-article-999999');

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});

test("change someone else's article returns 403 article forbidden", async ({ request }) => {
  const author = await signUp(request, 'meera');
  const otherUser = await signUp(request, 'vikram');
  const created = await createArticle(request, author.token, newArticle);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: { Authorization: `Token ${otherUser.token}` },
    data: { article: { title: 'Taken over' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });
});

test('delete an article with a wrong token returns 401 token is invalid', async ({ request }) => {
  const author = await signUp(request, 'anil');
  const created = await createArticle(request, author.token, newArticle);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: { Authorization: 'Token wrong-token-123' },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});
