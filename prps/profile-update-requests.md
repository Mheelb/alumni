# Alumni Profile Update Request System PRP

## Goal
Implement a system allowing alumni to request updates to their profile information. Admins can review, accept, or refuse these requests, with automatic profile updates upon acceptance.

## Why
Ensures data accuracy by allowing alumni to keep their profiles current while maintaining administrative control over the database content.

## What
- A "Request Update" feature for alumni on their profile page.
- An administrative dashboard for reviewing and managing these requests.
- Automatic synchronization of accepted changes to the alumni profile.
- Notification system for admins.

### Scope Boundaries
- Only logged-in users can request updates.
- Only admins can see and process requests.
- The request contains only the fields that have changed.

## Technical Context

### Files to Reference (read-only)
- `libs/shared-schema/src/index.ts`: For `AlumniProfileSchema` and related types.
- `apps/api/src/models/Alumni.ts`: For the existing Alumni model.
- `apps/web/src/features/alumni/components/AlumniSheet.vue`: As a base for the request form.
- `apps/web/src/pages/ProfilDetailPage.vue`: To see where to add the request button.
- `apps/web/src/pages/HomePage.vue`: To see where to add the notifications block.

### Files to Implement/Modify
- `libs/shared-schema/src/index.ts`: Add `ProfileUpdateRequestSchema`.
- `apps/api/src/models/ProfileUpdateRequest.ts`: New Mongoose model.
- `apps/api/src/routes/profile-update-requests.ts`: New Fastify routes.
- `apps/api/src/index.ts`: Register the new routes.
- `apps/web/src/features/alumni/composables/useProfileUpdateRequests.ts`: New TanStack Query composable.
- `apps/web/src/features/alumni/components/ProfileUpdateRequestSheet.vue`: Form for alumni to request changes.
- `apps/web/src/pages/admin/ProfileUpdateRequestsPage.vue`: Admin list of requests.
- `apps/web/src/pages/admin/ProfileUpdateRequestDetailPage.vue`: Admin view of a specific request with diff highlighting.
- `apps/web/src/pages/ProfilDetailPage.vue`: Add "Demander une modification" button.
- `apps/web/src/pages/HomePage.vue`: Update Notifications block to show pending requests.
- `apps/web/src/App.vue`: Add "Demandes" link in the header for admins.
- `apps/web/src/router.ts`: Register the new routes.

### Existing Patterns to Follow
- Use **Bun** for all commands and runtime.
- Use **Fastify** and **Mongoose** for the backend.
- Use **Vue 3** (Composition API) and **Shadcn-vue** for the frontend.
- Use **TanStack Query** (Vue Query) for data fetching.
- Use **Zod** (via shared-schema) for validation.

## Implementation Details

### API/Endpoints

- `POST /profile-update-requests`:
  - Request body: `{ alumniId: string, changes: Partial<AlumniProfileType> }`
  - Auth: `requireAuth`
- `GET /profile-update-requests`:
  - Query: `?status=pending|accepted|refused`
  - Auth: `requireAdmin`
- `GET /profile-update-requests/:id`:
  - Auth: `requireAdmin`
- `PATCH /profile-update-requests/:id/accept`:
  - Action: Update the Alumni profile with the changes and set request status to `accepted`.
  - Auth: `requireAdmin`
- `PATCH /profile-update-requests/:id/refuse`:
  - Action: Set request status to `refused`.
  - Auth: `requireAdmin`

### Database Changes

New collection `ProfileUpdateRequests`:
- `alumniId`: ObjectId (Ref Alumni)
- `userId`: ObjectId (Ref User - the requester)
- `changes`: Object (partial AlumniProfileType)
- `status`: String ('pending', 'accepted', 'refused')
- `createdAt`, `updatedAt`: Timestamps

### Components

#### ProfileUpdateRequestSheet.vue
- Opens with current alumni data.
- Submits only the fields that are different from the initial data.
- Show a success message upon submission.

#### ProfileUpdateRequestDetailPage.vue (Admin)
- Displays current values vs requested changes.
- Fields that are different should be highlighted (e.g., with a background color or text color).
- Buttons: "Accepter", "Refuser", "Retour".

## Validation Criteria

### Functional Requirements
- [ ] Alumni can open the request form and see their current data.
- [ ] Sending a request only includes changed fields.
- [ ] Admins see a notification on the dashboard for pending requests.
- [ ] Admins can list all requests.
- [ ] Admins can view the diff in a request.
- [ ] Accepting a request updates the alumni profile automatically.
- [ ] Refusing a request does not change the profile.

### Technical Requirements
- [ ] TypeScript compiles without errors.
- [ ] Zod validation is applied on both frontend and backend.
- [ ] API routes are protected by proper middleware.
- [ ] Frontend uses TanStack Query for caching and mutations.

### Testing Steps
1. Log in as an alumni.
2. Go to your own profile or another profile.
3. Click "Demander une modification".
4. Change some fields (e.g., Company, Job Title).
5. Submit the request.
6. Log in as an admin.
7. Check the dashboard notifications.
8. Go to the "Demandes" list.
9. Open the request.
10. Verify that changes are highlighted.
11. Click "Accepter".
12. Verify that the alumni profile has been updated.
13. Repeat for "Refuser" and verify no change occurs.
