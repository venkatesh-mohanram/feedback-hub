# Feedback Hub

Node.js application for a static browser-only feedback prototype implemented under `src`.

## Run

Start the Node.js app:

```sh
node src/server.mjs
```

Then open `http://127.0.0.1:5173`.

## Test

```sh
node --test src/*.test.mjs
```

If `npm` is available, `npm start`, `npm test`, and `npm run check` run the same project commands.

## Implementation Notes

- Feedback ideas and the local vote ledger are stored in `localStorage`.
- The Node.js server only serves the static app assets; it does not provide backend APIs or shared persistence.
- If browser storage is unavailable, the app keeps working with session-only memory.
- Upvotes are limited to one vote per idea in the same browser profile.
- There are no accounts, roles, backend APIs, or cross-device synchronization.
