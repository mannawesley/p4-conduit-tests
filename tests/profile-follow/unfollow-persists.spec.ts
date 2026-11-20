// spec: PF-02 Unfollow persists after reload
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext } from '@playwright/test';
import { ProfilePage } from '../pages/profile-page';

const AUTHOR = 'practice-author';

function runId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Sign up a new user with the API. Return what the test needs to sign in and clean up.
async function signUp(request: APIRequestContext, name: string) {
  const username = `${name}${runId()}`;
  const email = `${username}@example.in`;
  const password = 'Pass@12345';
  const response = await request.post('/api/users', {
    data: { user: { username, email, password } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, email, password, token: json.user.token as string };
}

// ---------- Clean-up ----------
// NOTE: API.md has no request to delete a user. So the new user stays in the app after every run.
let reader: { token: string } | null = null;

test.beforeEach(() => {
  reader = null;
});

test.afterEach(async ({ request }) => {
  // Unfollow practice-author, in case the test failed before the unfollow click.
  if (reader) {
    const res = await request.delete(`/api/profiles/${AUTHOR}/follow`, {
      headers: { Authorization: `Token ${reader.token}` },
    });
    expect(res.status()).toBe(200);
  }
});

test.describe('Profile page and following an author', () => {
  test('PF-02 Unfollow persists after reload', async ({ page, request }) => {
    // 1. Sign up a new user by API, and make that user follow practice-author by API.
    const user = await signUp(request, 'rohan');
    reader = user;
    const followed = await request.post(`/api/profiles/${AUTHOR}/follow`, {
      headers: { Authorization: `Token ${user.token}` },
    });
    expect(followed.status()).toBe(200);
    expect((await followed.json()).profile.following).toBe(true);

    // Sign in as the new user and open the profile. The start state is always "Unfollow".
    const profile = new ProfilePage(page, AUTHOR);
    await profile.signIn(user.email, user.password);
    await profile.open();
    await expect(profile.unfollowButton).toBeVisible();

    // 2. Click button "Unfollow practice-author".
    await profile.unfollowButton.click();
    await expect(profile.followButton).toBeVisible();

    // 3. Reload the page.
    await page.reload();
    await expect(profile.followButton).toBeVisible();

    // NOT IN THE MATERIAL: no follower count is shown on the page, so the -1 check is not written.
  });
});
