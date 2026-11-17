# SkillBridge

**Connecting student skills with real opportunities.**
A Malaysia-focused freelance and part-time platform for university students, built as a frontend
demonstration for IMS566 Advanced Web Design & Development (UiTM) by Muhammad Faid bin Mohd Zaid.

> Independent student project, not an official UiTM service. Every person, company, job, review and
> payment figure is fictional sample data. Place names are real Malaysian locations.

---

## Running it locally

1. Unzip the folder and open it in **VS Code**.
2. Install the **Live Server** extension (Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

Any static server works too, for example `python -m http.server 8000` and then visit
`http://localhost:8000`. No build step, no npm install and no internet connection are needed: Bootstrap, Bootstrap Icons, Chart.js, jsPDF and the fonts are all stored in `assets/vendor/`.

## Publishing on GitHub Pages

1. Create a new public repository on GitHub (e.g. `skillbridge`).
2. Upload the **contents** of this folder so that `index.html` sits in the repository root
   (not inside a `skillbridge/` subfolder).
3. Go to **Settings → Pages**, set *Source* to **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. After a minute the site is live at `https://<username>.github.io/skillbridge/`.

Hash routing (`#/jobs`) means every page works on GitHub Pages without any server configuration.
Developed and tested in Google Chrome.

## Demo logins

The login page has one-click buttons for these accounts.

| Role | Username | Password | Who |
|---|---|---|---|
| Student | `student` | `student123` | Aina Sofea Rahman, Information Management, UiTM Shah Alam |
| Employer | `employer` | `employer123` | Teratai Events (event management, KL) |

More sample students: `student2` to `student5` (password `student123`).
More sample employers: `employer2`, `employer3`, `employer4`, `employer7`, `employer8` (password `employer123`).
You can also register a new student or employer account. It lasts until you refresh.

## Demo vs. real backend

* **No LocalStorage, SessionStorage or cookies.** All data lives in memory (`js/store.js`) and is
  restored to the sample data when the page is refreshed.
* Because of that, SkillBridge is a **single-page app with hash routing** (`#/jobs`, `#/jobs/j102`,
  `#/student`…). Moving between pages keeps your session and changes. A full page reload resets them.
* Every page reads and writes through a **mock API** (`SB.api.get / post / patch / del`) with a short
  artificial delay, so the GET/POST request flow is the same as with a real server. Explore filters
  are reflected in the URL query string (GET), and forms submit POST/PATCH requests.
* **Not real:** authentication (passwords are plain JavaScript), payments (pay is arranged between
  employer and student), messaging (replies are simulated and labelled "demo auto-reply") and file
  uploads (only the file name is recorded; portfolio images stay in the browser tab).
* Sample data: 5 students, 6 employers, 8 job categories and 13 open jobs.
* The app runs on a fixed demo date of **19 November 2026**, so sample deadlines always make sense.

## Pages (routes)

| Area | Route |
|---|---|
| Home | `#/` |
| Explore jobs (search, filters, sort, grid/list) | `#/jobs` |
| Job details (logistics, costs, take-home calculator, apply) | `#/jobs/:id` |
| Company profile | `#/companies/:id` |
| How it works · About · Contact & FAQ | `#/how-it-works` · `#/about` · `#/contact` |
| Log in · Register (3-step) | `#/login` · `#/register` |
| Student dashboard | `#/student` |
| Applications & saved jobs | `#/applications` |
| Profile, portfolio, free-hours grid, experience, reviews | `#/profile` |
| Growth & records (skills chart, CV download as PDF) | `#/growth` |
| Employer dashboard | `#/employer` |
| Job listings & applicants (shortlist, interview, hire, decline) | `#/employer/jobs`, `#/employer/jobs/:id` |
| Post / edit a job (4-step form with live preview) | `#/post-job` |
| Talent search & student profiles | `#/talent`, `#/talent/:id` |
| Projects board & project detail (milestones, files, reviews) | `#/projects`, `#/projects/:id` |
| Messages · Notifications | `#/messages` · `#/notifications` |

## Things to try

1. **Student:** explore on-site jobs with "Transport covered", open *LED wall installation*, move the
   take-home slider, apply, then check Applications and Notifications. Paint your free hours in
   Profile → Free hours and watch match scores change. Download your CV from Growth & records.
2. **Employer:** open *Year-end corporate dinner crew*, shortlist and hire an applicant (a project is
   created), then post a new job and watch the live preview and take-home estimate update.
   Search talent free on Saturday 9am–5pm.
3. Switch to **dark mode** (moon icon) and see the charts adapt.

## Project structure

```
index.html            App shell (nav, main, footer) and script order
css/base.css          Design tokens, light/dark themes, typography
css/components.css    Buttons, forms, cards, job cards, tables, chat, sidebar, toasts
css/pages.css         Page layouts and responsive rules
js/data.js            Sample data: categories, users, jobs, applications, projects, reviews…
js/store.js           In-memory state, formatting, matching score, cost estimates, mock API
js/ui.js              Components, modal, toast, validation, theme, Chart.js helper
js/app.js             Hash router, navigation, sidebar, footer
js/pages/*.js         One file per area: public, auth, student, employer, shared
assets/images/        Photos (WebP), employer logos (SVG), portfolio pieces, favicon
assets/vendor/        Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Chart.js 4.4.3, jsPDF 2.5.1, fonts
```

## Kept from the original SkillBridge

The match score (course 30 · skills 30 · free hours 25 · place 15), the weekly availability overlap
used for talent search, recommendations "for your course" and "beyond your course", skill levels
from completed projects (1 = Beginner, 2 = Intermediate, 3+ = Advanced), course-relevance %, PDF
export with jsPDF and the proposal status rules.

## Image credits

* **Photographs** are from [Unsplash](https://unsplash.com) under the
  [Unsplash License](https://unsplash.com/license), sourced from the curated
  [ServiceStack/images](https://github.com/ServiceStack/images) collection. Original Unsplash file
  IDs are listed in `assets/images/CREDITS.txt`.
* **Employer logos, favicon and portfolio pieces** (posters, spreadsheet, website and calendar
  mock-ups) were created for this project.
* Student avatars use initials rather than photos, since the students are fictional.

## Browser support

Latest Chrome, Edge, Firefox and Safari. Uses CSS `color-mix()`, `:has()` and `backdrop-filter`.
