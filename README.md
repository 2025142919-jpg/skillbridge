# SkillBridge

**Live website:** https://2025142919-jpg.github.io/skillbridge/
**Repository:** https://github.com/2025142919-jpg/skillbridge

IMS566 Advanced Web Design Development and Content Management · Individual Project
Muhammad Faid bin Mohd Zaid · UiTM

---

## 1. Project title & description

**SkillBridge: Connecting student skills with real opportunities.**

SkillBridge is a web application interface for a Malaysia-focused freelance and part-time job
platform for university students. Students can find digital work (web development, design,
admin, marketing) and on-site work (event crew, lighting and sound, photography, F&B), apply with
a proposal and track their projects. Employers can post jobs, review applicants, search for
students by their free hours and manage hired projects.

Every job listing shows its real costs up front: pay, allowances (transport, meals,
accommodation), equipment the student must bring, overtime and payment terms. A take-home
calculator helps students decide before they apply.

This is a front-end prototype. All companies, people, jobs and reviews are fictional sample data,
and no real payments or messages are processed.

## 2. Features included

**Authentication**
- Login with hardcoded demo accounts and clear error messages for wrong username or password
- 3-step registration (account type → details → profile) with form validation and a password-strength meter

**Navigation**
- Consistent top navigation bar on every page, plus a sidebar menu after login
- Responsive layout for desktop, tablet and mobile (slide-out menu on small screens)
- Light and dark mode

**Dashboards**
- Student dashboard: summary statistics, upcoming milestones, applications chart, recommended jobs, free-hours overview and recent messages
- Employer dashboard: summary statistics, applicants-per-listing chart, hiring pipeline chart, recent applicants table and active projects

**Data view pages**
- Explore Jobs: search, filters (type, category, arrangement, city, pay, perks), sorting, and grid or list view
- Job Details: dates, hours, venue, logistics, equipment, pay terms and a take-home calculator
- Applications & Saved Jobs: table of applications with status tabs, sorting and withdraw option
- Job Listings & Applicants (employer): shortlist, interview, hire or decline applicants
- Talent Search (employer): find students by skill, programme, university and available day/time
- Projects: board view (In progress / In review / Completed) with milestones, files and activity

**Data visualisation (Chart.js)**
- Applications by status (doughnut), Applicants per listing (bar), Hiring pipeline (doughnut) and Skills practised from completed projects (bar)
- Charts use real data from the app, show tooltips on hover, and legend items can be clicked to hide or show data

**Other features**
- Student profile and portfolio with image upload preview and a weekly free-hours grid (click or drag)
- Match score for each job based on course, skills, free hours and location
- Post a job with a 4-step form and live preview
- Messages between students and employers (demo replies are simulated)
- Notifications, reviews and star ratings
- CV download as PDF (jsPDF)
- Home, How It Works, About and Contact (with validated form and FAQ) pages
- Footer on every page, page titles that change per page, meta description and structured sections

## 3. Instructions to test login

1. Open the live website link above in **Google Chrome**.
2. Click **Log in** (top right).
3. Enter one of the demo accounts below, or click a demo account button on the login page to fill it in automatically.

| Role | Username | Password | Lands on |
|---|---|---|---|
| Student | `student` | `student123` | Student dashboard (Aina Sofea Rahman, UiTM Shah Alam) |
| Employer | `employer` | `employer123` | Employer dashboard (Teratai Events) |

To see the error message, enter a wrong username or password.

More sample accounts: `student2` to `student5` (password `student123`); `employer2`, `employer3`,
`employer4`, `employer7`, `employer8` (password `employer123`).

**Note:** this is a demo without a database. Logins and changes (applications, posted jobs,
messages) are kept in memory and reset when the page is refreshed. Move between pages using the
menu instead of refreshing.

**Suggested test flow**
- *Student:* Explore jobs → open "LED wall installation & dismantling assistant" → move the take-home slider → Apply → check Applications and Notifications → Growth & records → Download CV.
- *Employer:* My job listings → "Year-end corporate dinner crew" → Shortlist and Hire an applicant (a project is created) → Post a job → Find talent free on Saturday 9am–5pm.

## 4. Frameworks / libraries used

| Framework / library | Version | Used for |
|---|---|---|
| [Bootstrap](https://getbootstrap.com) | 5.3.3 | Grid layout, responsive utilities, modals, dropdowns, collapse, offcanvas menu |
| [Bootstrap Icons](https://icons.getbootstrap.com) | 1.11.3 | Icons throughout the interface |
| [Chart.js](https://www.chartjs.org) | 4.4.3 | Dashboard and growth charts |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Generating the downloadable CV (PDF) |
| [Inter](https://rsms.me/inter/) & [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | – | Typography |

All libraries and fonts are stored locally in `assets/vendor/`, so the site works without loading
anything from a CDN.

The rest is written by hand in **HTML5, CSS3** (custom properties, Grid, Flexbox, light/dark
themes) and **vanilla JavaScript** (hash router, in-memory data, form validation, DOM rendering).

---

## Running locally

1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.

## Project structure

```
index.html            Page shell: navigation, main area, footer, script order
css/base.css          Colours, light/dark themes and typography
css/components.css    Buttons, forms, cards, tables, chat, sidebar
css/pages.css         Page layouts and responsive rules
js/data.js            Sample data: categories, students, employers, jobs, applications…
js/store.js           In-memory data, match score, cost estimate, mock GET/POST API
js/ui.js              Reusable components, modal, toast, form validation, charts
js/app.js             Router (hash URLs), navigation, sidebar, footer
js/pages/*.js         Pages: public, auth, student, employer, shared
assets/images/        Photos, employer logos, portfolio images, favicon
assets/vendor/        Bootstrap, Bootstrap Icons, Chart.js, jsPDF, fonts
```

SkillBridge is a single-page application: `index.html` loads once and pages are switched with
JavaScript using URLs such as `#/jobs`, `#/jobs/j102` and `#/student`. This keeps the logged-in
user and their changes in memory while moving between pages, without LocalStorage or a database.

## Image credits

- Photographs: [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license), via the [ServiceStack/images](https://github.com/ServiceStack/images) collection. Full list in `assets/images/CREDITS.txt`.
- Employer logos, favicon and portfolio images were created for this project.
