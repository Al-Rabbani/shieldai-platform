# GDS OS — Control Plane (app-v2)

Static-first SPA. No framework, no build step, no dependencies. Serve the
directory as-is; there is nothing to compile.

## Deploy

    rsync -a --delete web/app-v2/ root@<host>:/var/www/app-v2/
    chown -R www-data:www-data /var/www/app-v2

Served by the existing nginx `root /var/www`, so no nginx change is required.
Reach it at `/app-v2/index.html` on the app host. The directory index 403s on
this nginx config, hence the explicit `index.html` path.

## Layout

    index.html          shell: sidebar, topbar, login gate, view container
    assets/css/app.css  design tokens, dark/light themes, components
    assets/js/api.js    fetch client: cookies, timeout, error normalisation
    assets/js/ui.js     primitives: badges, tables, cards, skeletons, states
    assets/js/views.js  the 8 pages
    assets/js/app.js    hash router, nav, auth flow, theme persistence

## Rules this client holds itself to

- **No mock data.** Every value comes from a real API response.
- **No comforting zeros.** A failed request renders an error panel; it never
  renders `0`, because a broken dependency must not look like a clean result.
- **Honest empty states.** Where the backend genuinely has no records, the page
  says why (for example: no correlation rule has produced an incident yet).

## Authentication

Cookie-based, not bearer. `POST /auth/login` sets `gds_access_token` and
`gds_refresh_token`; requests must send cookies (`credentials: same-origin`).
Sending the token value as `Authorization: Bearer` returns 401.

## Routes

`#/overview` `#/findings` `#/incidents` `#/agents` `#/missions` `#/cloud`
`#/approvals` `#/audit`
