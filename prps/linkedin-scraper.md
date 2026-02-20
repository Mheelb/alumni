# LinkedIn Scraper & Auto-Fill PRP

## Goal
Implement a LinkedIn scraper to automatically populate alumni profiles from a public LinkedIn URL during creation/editing, and enable bulk updates for existing profiles.

## Why
To reduce manual data entry for admins and alumni, ensuring the directory stays up-to-date with professional information (current company, job title) which is critical for the network's value.

## What
1.  **Smart Profile Creation/Edit:** Add a feature to `AlumniForm` to fetch data from a LinkedIn URL and pre-fill the form fields.
2.  **Bulk Update Tool:** A button for admins to trigger a scraping update for all alumni who have a LinkedIn URL.
3.  **Backend Scraper Service:** A secure, headless browser service using Playwright to extract public profile data.
4.  **Schema Update:** Add `avatarUrl` to store profile pictures.

## Technical Context

### Files to Reference (read-only)
- `libs/shared-schema/src/index.ts` — Existing schema to extend.
- `apps/web/src/pages/AnnuairePage.vue` — Where the bulk update button will live.
- `apps/web/src/features/alumni/components/AlumniForm.vue` — Where the single-profile import UI will live.

### Files to Implement/Modify
- `libs/shared-schema/src/index.ts` — Add `avatarUrl` to `AlumniProfileSchema`.
- `apps/api/src/models/Alumni.ts` — Update Mongoose schema to include `avatarUrl`.
- `apps/api/src/services/scraper.ts` (NEW) — Core Playwright logic to scrape a given URL.
- `apps/api/src/routes/scraper.ts` (NEW) — Endpoints for the frontend to request scraping.
- `apps/api/src/index.ts` — Register the new route.
- `apps/web/src/features/alumni/components/AlumniForm.vue` — Add "Import from LinkedIn" input and pre-fill logic.
- `apps/web/src/pages/AnnuairePage.vue` — Add "Sync LinkedIn" button (Admin only).

### Existing Patterns to Follow
- Use `zod` for validation of the scraping response.
- Use `better-auth` session to protect the scraping endpoints (Admin only).
- Use `shadcn-vue` components for the UI.

## Implementation Details

### API/Endpoints
**POST /api/scraper/extract**
- **Input:** `{ url: string }`
- **Output:** `{ firstName, lastName, jobTitle, company, city, avatarUrl, ... }`
- **Logic:** Launch headless browser, navigate to URL, extract text from specific selectors, return JSON. **Crucial:** Handle standard LinkedIn anti-bot redirects (login wall) by attempting to read public meta tags (OpenGraph) first, then falling back to page content if visible.

**POST /api/scraper/sync-batch** (Optional, or handled client-side loop)
- *Recommendation:* Implement a `POST /api/scraper/sync/:id` that updates a specific alumni by their stored LinkedIn URL. The "Bulk" action will be a client-side loop in `AnnuairePage.vue` that calls this endpoint sequentially with a delay to avoid rate limits.

### Components
1.  **AlumniForm.vue**:
    - Add a "Paste LinkedIn URL" input at the top.
    - Add a "Fetch Info" button.
    - On success: Populate `firstName`, `lastName`, `company`, `jobTitle`, `city`, `diploma`.
2.  **AnnuairePage.vue**:
    - Add a "Sync LinkedIn" button next to "Export CSV".
    - Visible only if `isAdmin`.
    - On click: Fetch all alumni with LinkedIn URLs -> Iterate -> Call Sync API -> Show progress bar.

### Validation Criteria

#### Functional Requirements
- [ ] Admin can paste a LinkedIn URL in the form and see fields auto-fill.
- [ ] Admin can save the profile after auto-fill.
- [ ] Admin sees a "Sync LinkedIn" button on the directory page.
- [ ] "Sync LinkedIn" iterates through profiles and updates them.
- [ ] Scraper handles "Page not found" or "Authwall" gracefully (returns error or partial data).

#### Technical Requirements
- [ ] **Rate Limiting:** The bulk tool must wait 5-10 seconds between requests to avoid IP bans.
- [ ] **Error Handling:** If scraping fails, the UI should alert the user but not crash.
- [ ] **Type Safety:** The scraped data must match `AlumniProfileSchema`.

### Testing Steps
1.  **Manual Test:** Open "New Profile", paste a public LinkedIn URL (e.g., a known public profile or your own), click "Fetch". Verify fields are filled.
2.  **Bulk Test:** Create 2-3 dummy profiles with valid LinkedIn URLs. Click "Sync LinkedIn" on the main page. Verify the `updatedAt` timestamp changes and fields are populated.
3.  **Security:** Try to call the scraper API without being logged in (should fail).
