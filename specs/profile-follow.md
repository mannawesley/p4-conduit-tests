# Profile page and follow an author

## Application Overview

Plan for /profile/practice-author in Conduit (http://127.0.0.1:3000). Sources: the page, README.md, API.md only. Visible names: button "Follow practice-author" / "Unfollow practice-author"; sign-in fields "Email" and "Password"; button "Sign in". Follower count text: NOT IN THE MATERIAL (no follower count is shown on the page, README.md or API.md). Test data: practice-reader, practice-reader@example.com, Practice123. ASSUMPTION: each scenario starts from a fresh app start (README: every start gives fresh data). ASSUMPTION: on a fresh start practice-reader follows practice-author already, because the button showed "Unfollow practice-author" at first sign-in. This must be confirmed on a fresh start, so scenario 1 starts by checking the button and, if needed, clicking it to reach the "Follow practice-author" state.

## Test Scenarios

### 1. Profile page and following an author

**Seed:** `tests/seed.spec.ts`

#### 1.1. PF-01 Follow persists after reload (button and follower count)

**File:** `tests/profile-follow/follow-persists.spec.ts`

**Steps:**
  1. Open /login. Fill the textbox "Email" with practice-reader@example.com and the textbox "Password" with Practice123. Click the button "Sign in".
    - expect: The user is signed in and the page leaves /login.
  2. Open /profile/practice-author. If the button is "Unfollow practice-author", click it first (ASSUMPTION: needed, see overview). Then read the follower count. The follower count text is NOT IN THE MATERIAL: no count is visible on the page.
    - expect: The button is named "Follow practice-author".
    - expect: Follower count before: NOT IN THE MATERIAL. The tester must raise this before the test can be written.
  3. Click the button "Follow practice-author".
    - expect: The button changes to "Unfollow practice-author".
  4. Reload the page.
    - expect: The page still shows /profile/practice-author.
  5. Check the button and the follower count again.
    - expect: The button is "Unfollow practice-author" after reload.
    - expect: The follower count is the before-value plus 1. NOT IN THE MATERIAL: this part cannot be checked until a visible count exists.

#### 1.2. PF-02 Unfollow persists after reload

**File:** `tests/profile-follow/unfollow-persists.spec.ts`

**Steps:**
  1. Sign in as practice-reader (fields "Email" and "Password", button "Sign in") and open /profile/practice-author. If the button is "Follow practice-author", click it so the user is following.
    - expect: The button is named "Unfollow practice-author".
  2. Click the button "Unfollow practice-author".
    - expect: The button changes to "Follow practice-author".
  3. Reload the page.
    - expect: The button is still "Follow practice-author". The follower count goes down by one: NOT IN THE MATERIAL (no count visible).
