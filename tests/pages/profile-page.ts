import { Page, Locator, expect } from '@playwright/test';

// Page object for sign-in and an author's profile page.
// Shared by PF-01 (follow) and PF-02 (unfollow).
export class ProfilePage {
  readonly page: Page;
  readonly username: string;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly signInButton: Locator;
  readonly followButton: Locator;
  readonly unfollowButton: Locator;

  constructor(page: Page, username: string) {
    this.page = page;
    this.username = username;
    this.emailField = page.getByRole('textbox', { name: 'Email' });
    this.passwordField = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    // exact: true is needed because "Follow <name>" is a substring of "Unfollow <name>".
    this.followButton = page.getByRole('button', { name: `Follow ${username}`, exact: true });
    this.unfollowButton = page.getByRole('button', { name: `Unfollow ${username}`, exact: true });
  }

  async signIn(email: string, password: string) {
    await this.page.goto('/login');
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.signInButton.click();
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async open() {
    await this.page.goto(`/profile/${encodeURIComponent(this.username)}`);
  }
}
