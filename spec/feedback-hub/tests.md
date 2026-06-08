# Test Specification

## Overview

Tests should prove the local-only browser workflow: load, submit, search, upvote once, and refresh persistence.

## Test Strategy

- Prefer unit tests for validation, filtering, persistence helpers, and vote ledger logic.
- Use component or integration tests for the main user flows.
- Add browser-level tests for refresh persistence if the repo supports them.

## Requirement Coverage

| Requirement | Acceptance Criteria | Test Coverage |
|---|---|---|
| FR-1 | AC-1 to AC-14 | Static render test verifies the app loads without any backend dependency. |
| FR-2 | AC-1, AC-7, AC-11 | Persistence tests confirm local storage hydration and in-memory fallback behavior. |
| FR-3 | AC-3, AC-8 | Form-flow test covers valid submit and blocked invalid submit. |
| FR-4 | AC-3, AC-4, AC-12 | Model and form tests validate required fields and default values. |
| FR-5 | AC-3 | Integration test confirms a new idea appears in the list after submit. |
| FR-6 | AC-4 | Assertion on created idea status after submit. |
| FR-7 | AC-1, AC-2, AC-12 | Render tests confirm the idea list and empty state. |
| FR-8 | AC-5, AC-9, AC-13 | Search tests confirm filtering and no-results handling. |
| FR-9 | AC-5, AC-13 | Search unit tests confirm match scope is title and description only. |
| FR-10 | AC-6, AC-10 | Voting tests confirm the count increments once and repeat voting is blocked. |
| FR-11 | AC-6, AC-10 | Vote ledger tests confirm there is no downvote or second upvote path. |
| FR-12 | AC-6 | UI test confirms vote count is visible and updates after upvote. |
| FR-13 | AC-1, AC-2 | UI test confirms status is visible on each idea card. |
| FR-14 | AC-2, AC-4, Definition of Done | Data model tests confirm the allowed status list and default status. |
| FR-15 | AC-2 | Seed data test confirms sample records can cover all statuses. |

## Unit Tests

- Validate that new feedback ideas require title, description, requester name, and category.
- Validate that new ideas default to `New` status and zero votes.
- Validate that search matches title and description only.
- Validate that repeated upvotes for the same idea are rejected by the vote ledger.
- Validate local serialization and hydration round-trip for idea data.

## Integration Tests

- Submit a valid idea and verify it appears in the rendered list.
- Submit with missing required fields and verify field-level guidance appears.
- Search the list and verify only matching ideas are visible.
- Upvote an idea and verify the visible count increments once.

## End-to-End Tests

- Open the app with seeded data and verify all supported statuses can render.
- Submit a new idea, refresh, and verify the idea remains when storage is available.
- Upvote an idea, refresh, and verify the vote count remains when storage is available.

## API or Contract Tests

Not applicable.

## Security and Permission Tests

- Verify the app exposes no authenticated or role-gated flows.
- Verify an external requester can complete all intended actions without login.

## Performance and Reliability Tests

- Verify the static app remains responsive with a moderate list of ideas.
- Verify the app still functions in memory when local storage access throws.

## Test Data

- A minimal empty dataset.
- A seeded dataset containing at least one idea for each supported status.
- One idea with a known vote count for persistence assertions.

## Mocking and Fixtures

- Mock `localStorage` success and failure cases.
- Use a fixed clock or timestamp helper for deterministic `createdDate` assertions.
- Use fixture idea records for status coverage and search scenarios.

## Regression Tests

- The app should not allow a second upvote on the same idea in the same browser profile.
- The app should not match search results from fields other than title and description.
- The app should continue to show the list after a refresh when storage is available.

## Out of Scope

- Backend API testing.
- Authentication and role tests.
- Cross-device synchronization tests.

## Open Questions

None.
