// spec: PF-01 Follow persists after reload (button and follower count)
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
  // Unfollow practice-author, even when a check failed.
  if (reader) {
    const res = await request.delete(`/api/profiles/${AUTHOR}/follow`, {
      headers: { Authorization: `Token ${reader.token}` },
    });
    expect(res.status()).toBe(200);
  }
});

test.describe('Profile page and following an author', () => {
  test('PF-01 Follow persists after reload (button and follower count)', async ({ page, request }) => {
    // 1. Sign up a new user by API, then sign in as that user.
    const user = await signUp(request, 'kavya');
    reader = user;
    const profile = new ProfilePage(page, AUTHOR);
    await profile.signIn(user.email, user.password);

    // 2. Open the profile. A new user follows no one, so the start state is "Follow".
    await profile.open();
    await expect(profile.followButton).toBeVisible();
    // NOT IN THE MATERIAL: no follower count is shown on the page, so the +1 check is not written.

    // 3. Click "Follow practice-author"
    await profile.followButton.click();
    await expect(profile.unfollowButton).toBeVisible();

    // 4. Reload the page
    await page.reload();
    await expect(page).toHaveURL(/\/profile\/practice-author$/);

    // 5. The button still shows "Unfollow practice-author"
    await expect(profile.unfollowButton).toBeVisible();
    // NOT IN THE MATERIAL: no follower count is shown on the page, so the +1 check is not written.
  });
});
