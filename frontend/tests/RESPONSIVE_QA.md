# Responsive interface verification

Verified locally on 2026-09-18 with Chrome and the isolated `dev` preview on port 6768.

## Initial responsive baseline (before the sandbox revision)

All 16 routes below were opened at each of these CSS viewport sizes:

| Width | Height | Scenario |
| --- | --- | --- |
| 320 | 740 | Narrow phone |
| 390 | 844 | Phone |
| 768 | 1024 | Portrait tablet |
| 1024 | 768 | Landscape tablet |
| 1440 | 900 | Desktop |
| 2560 | 1440 | Wide desktop |
| 844 | 390 | Short landscape phone |

Routes: `/`, `/login`, `/registro`, `/panel`, `/proyectos`, `/proyectos/nuevo`,
`/proyectos/cognitiva`, `/proyectos/cognitiva/canales`, `/proyectos/cognitiva/fases`,
`/proyectos/cognitiva/entregables`, `/horarios`, `/recordatorios`, `/perfil`,
`/perfil/editar`, `/paleta`, `/navegacion.html`.

Result: 112 route/viewport combinations, no document-level horizontal overflow
(`documentElement.scrollWidth <= documentElement.clientWidth + 1`). Dense schedules
retain keyboard-accessible, local scrolling. The phase diagram at this baseline
was horizontal; the current revision replaces it with vertical branches.
The dashboard switches to a day-by-day agenda on phones.

## Baseline interaction checks

- All 11 tour focuses at 320×740, 844×390 and 1440×900: explanation cards remain inside the visible viewport.
- Real Next navigation within a page and between pages; direct highlighted project/card navigation; stage jumping; finishing and URL cleanup.
- Opening and closing a native reminder dialog without losing the tour.
- Narrow reminder, task, team, document and subject-option forms; expanded password login.
- Mobile landing menu open/close and section navigation.
- Mobile navigation-map selection moves to a readable stacked inspector.
- Visual inspection of spotlight in dark/light mode, narrow phone and short landscape; tablet chat.

These checks cover Chrome at representative sizes, not every physical device or browser engine.
No live WhatsApp messages were sent and no external services were enabled.

## Repeatable checks

```bash
npm run test:ui
npm run css
./mvnw -o test
git diff --check
```

## Sandbox and vertical-branches revision

- New access chooser checked at 320×740, 768×1024, 1440×900, 2560×1440 and
  844×390: no document-level horizontal overflow. Password form opens separately.
- Empty sandbox entered without authentication; manually created a project with
  free assignment and four tasks. Connected a diamond dependency graph using
  task dialogs. Branches are vertical, with genuine forks and merges.
- Diagram and task dialogs inspected at 1440×1000 and 320×740. Changed assignment
  mode after creation and claimed an available task.
- Created a document, channel, chat message and personal reminder at narrow width.
- Minimal tour cards inspected at 320×740 and 390×844; real navigation exercised
  between creation, project, phases, channels, documents, schedules and reminders.
- Completed the tour, confirmed the account-creation offer and chose to keep
  exploring. Reloaded the sandbox and confirmed the dashboard returned to zero
  projects and zero pending tasks.
- Java suite: 59 passing tests, including assignment concurrency/authorization and
  public sandbox isolation, disabled demo access, route allowlisting and CSP.
- Frontend suite: 52 passing tests in five files: tour (16), login (7), branches (7),
  sandbox store (15), and fail-closed iframe bootstrap (7).

The sandbox stores trial content only in parent-page memory. No database or durable
browser storage is used. Refreshing/exiting discards it; WhatsApp and AI API calls
are not forwarded. Native network/form submission is blocked by sandbox-view CSP.
When testing concurrently with the live preview, use
`./mvnw -o test -Dspring.thymeleaf.prefix=file:src/main/resources/templates/` to avoid
the development resource-copy race.
