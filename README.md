# Focus Flow

A student task and deadline tracker. React + Vite frontend, Express API, SQLite database, JWT auth.

```
Focus Flow/
  backend/    Express API, SQLite (better-sqlite3), JWT + bcrypt
  frontend/   React 19, Vite, React Router, Axios, plain CSS with variables
  package.json  npm workspaces + one-command dev/test scripts
```

## Run it

Requires Node 20+.

```bash
npm install
cp backend/.env.example backend/.env   # then set JWT_SECRET to a long random string
npm run dev                            # API on :4000, web app on :5173
```

Open http://localhost:5173 and create an account. The SQLite file is created at `backend/data/focusflow.db`.
In development the Vite server proxies `/api` to the backend, so there is no CORS setup to do.

Other scripts: `npm test` (backend + frontend tests), `npm run build` (production frontend bundle),
`npm start` (API only; with `NODE_ENV=production` and a built frontend it serves the app too).

## API (all under `/api`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness + database check |
| POST | `/auth/signup` | `{ name, email, password, confirmPassword? }` -> `{ token, user }` |
| POST | `/auth/signin` | `{ email, password }` -> `{ token, user }` |
| GET | `/auth/me` | Current user (needs token) |
| GET | `/tasks` | Query: `search`, `status`, `priority`, `category` (comma lists allowed), `overdue`, `dueFrom`, `dueTo`, `sort`, `order` |
| GET | `/tasks/stats` | `{ total, pending, completed, overdue, inProgress }` |
| GET/PUT/DELETE | `/tasks/:id` | Scoped to the signed-in user; other users' ids return 404 |
| POST | `/tasks` | `{ title, dueDate, description?, category?, priority?, status? }` |
| PATCH | `/tasks/:id/complete` | Marks completed (idempotent) |

Errors share one shape: `{ success: false, message, errors? }`, where `errors` maps field names to messages.

## Decisions worth knowing

- **Overdue is never stored.** It is `due date passed AND status != completed`, computed in SQL for stats/filters and in the serializer (`isOverdue`).
- **"Pending" means unfinished** (pending + in progress), so `total = pending + completed`. `inProgress` is returned separately.
- **Priorities:** low, medium, high, urgent. **Statuses:** pending, in progress, completed. **Categories:** Assignment, Exam, Project, Lab, Reading, Personal, Other.
- **Due dates carry a time** (stored as UTC ISO strings, shown in local time). The form defaults to tomorrow 23:59.
- **48-hour banner** counts unfinished tasks due between now and +48h (already-overdue tasks are shown in the Overdue card instead).
- **Today page:** overdue (most important first), then due today (earliest first), then high/urgent tasks due later.
- **401 handling:** the Axios instance logs the user out on any 401 from a protected request, but not on a wrong-password 401 from the sign-in form.

## Task calendar (dashboard)

`frontend/src/components/TaskCalendar.jsx` is a hand-built month calendar (no calendar or tooltip library). It sits at the bottom of the dashboard and uses the existing `GET /api/tasks` endpoint, so there is no new backend route.

- Dates are matched by **local** year/month/day (`utils/calendar.js` `dayKey`), never by the ISO string, so a task due at 00:30 or 23:45 stays on its own day in any time zone.
- Dates with tasks get a soft tint and up to three priority-coloured dots. A past date with an unfinished task gets a red outline; today gets a teal outline.
- Hover (mouse), tap (touch) or keyboard focus opens one bubble per task, coloured by priority. More than five tasks show five bubbles plus "Plus N more". Escape, or a click or tap elsewhere, closes them. Clicking a bubble opens the task's edit page.
- Within a date, bubbles list unfinished tasks first, then by priority, then by time.
- Bubbles are positioned in JS (`computeBubblePosition`) so they flip left/right and up/down and never leave the screen.
