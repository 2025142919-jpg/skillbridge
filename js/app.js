/* Hash router, page shell (navigation, sidebar, footer) and start-up */
(function () {
  const { ui, db, fmt, find } = SB;
  const { $, $$, esc } = ui;

  // List of every page: its URL pattern, the function that builds it, and options (login needed, layout)
  const routes = [];
  SB.route = (pattern, handler, options = {}) =>
    routes.push({ pattern, handler, options, keys: [], regex: compile(pattern) });

  // Turns "/jobs/:id" into a regular expression that matches "/jobs/j102"
  function compile(pattern) {
    return new RegExp("^" + pattern.replace(/:[a-z]+/gi, "([^/]+)") + "$");
  }

  // Reads the part after # in the URL, e.g. "#/jobs?cat=events" -> path "/jobs", query {cat: "events"}
  function parseHash() {
    const raw = location.hash.slice(1) || "/";
    const [path, qs] = raw.split("?");
    return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs || "")) };
  }

  SB.go = (hash) => {
    if (location.hash === hash) render();
    else location.hash = hash;
  };

  // Update the query string (used by filters) without re-rendering the whole page.
  SB.setQuery = (query) => {
    const { path } = parseHash();
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== "" && v != null),
    ).toString();
    history.replaceState(null, "", `#${path}${qs ? "?" + qs : ""}`);
  };

  const homeFor = (u) => (u ? (u.role === "student" ? "#/student" : "#/employer") : "#/");
  SB.homeFor = homeFor;

  // Runs every time the URL changes: finds the page, checks login, then draws it
  async function render() {
    const { path, query } = parseHash();
    const route = routes.find((r) => r.regex.test(path));
    const user = SB.me();
    ui.destroyCharts();
    ui.closeModals();
    bootstrap.Offcanvas.getInstance($("#mobile-menu"))?.hide();

    if (!route) return paint({ title: "Page not found", html: notFound() }, "public");
    const params = path.match(route.regex).slice(1).map(decodeURIComponent);
    const { auth } = route.options;
    if (auth && !user) {
      ui.toast("Please log in to continue.", "info");
      return SB.go(`#/login?next=${encodeURIComponent(path)}`);
    }
    if (auth && auth !== true && ![].concat(auth).includes(user.role)) {
      ui.toast("That page belongs to a different account type.", "info");
      return SB.go(homeFor(user));
    }
    if (route.options.redirect) return SB.go(route.options.redirect(user));

    let page;
    try {
      page = await route.handler(params, query);
    } catch (err) {
      page = {
        title: "Not available",
        html: `<div class="container-xl py-5">${ui.empty("bi-exclamation-triangle", err.message || "Something went wrong.", "", `<a class="btn btn-accent" href="#/jobs">Browse jobs</a>`)}</div>`,
      };
    }
    const shell =
      route.options.shell === "app" || (route.options.shell === "auto" && user) ? "app" : "public";
    paint(page, shell, route.options.nav || path);
  }

  // Puts the page HTML on screen, inside either the public layout or the dashboard layout
  function paint(page, shell, navKey) {
    document.title = `${page.title} · SkillBridge`;
    const user = SB.me();
    $("#topnav").innerHTML = topnav(user, navKey);
    const main = $("#app");
    if (shell === "app" && user) {
      main.innerHTML = `<div class="app-shell"><aside class="sidebar" aria-label="Account navigation">${sidebar(user, navKey)}</aside><div class="app-main"><div class="route-enter" id="page">${page.html}</div>${appFooter()}</div></div>`;
      $("#footer").innerHTML = "";
    } else {
      main.innerHTML = `<div class="route-enter" id="page">${page.html}</div>`;
      $("#footer").innerHTML = footer();
    }
    if (!page.keepScroll) window.scrollTo({ top: 0, behavior: "instant" });
    bindShell();
    page.mount?.($("#page"));
    ui.reveal();
    $("#app").focus({ preventScroll: true });
  }

  /* ---------- Navigation ---------- */
  const brandSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 17c3-7 15-7 18 0"/><path d="M7 13.3V19M12 11.6V19M17 13.3V19"/></svg>`;
  SB.brandSvg = brandSvg;

  function unreadCount(user) {
    return db.notifications.filter((n) => n.userId === user.id && !n.read).length;
  }
  function unreadMessages(user) {
    return db.conversations.filter(
      (c) =>
        c.members.includes(user.id) &&
        c.messages.length &&
        c.messages.at(-1).from !== user.id &&
        !c.seen?.includes(user.id),
    ).length;
  }

  // Top navigation bar (changes when a user is logged in)
  function topnav(user, navKey) {
    const links = [
      ["#/jobs", "Explore jobs", "/jobs"],
      ["#/how-it-works", "How it works", "/how-it-works"],
      ["#/about", "About", "/about"],
      ["#/contact", "Contact", "/contact"],
    ];
    let right;
    if (user) {
      const notes = db.notifications.filter((n) => n.userId === user.id).slice(0, 5);
      const count = unreadCount(user);
      const msgs = unreadMessages(user);
      right = `
        <button class="icon-btn" data-toggle-theme aria-label="Toggle dark mode" title="Toggle dark mode"><i data-theme-icon class="bi ${ui.prefs.theme === "dark" ? "bi-sun" : "bi-moon-stars"}"></i></button>
        <a class="icon-btn" href="#/messages" aria-label="Messages" title="Messages"><i class="bi bi-chat"></i>${msgs ? `<span class="dot">${msgs}</span>` : ""}</a>
        <div class="dropdown">
          <button class="icon-btn" data-bs-toggle="dropdown" aria-label="Notifications" title="Notifications"><i class="bi bi-bell"></i>${count ? `<span class="dot">${count}</span>` : ""}</button>
          <div class="dropdown-menu dropdown-menu-end" style="width:340px">
            <div class="d-flex justify-content-between align-items-center px-2 pb-2"><strong class="small-text">Notifications</strong><button class="link-btn tiny" data-read-all>Mark all read</button></div>
            ${notes.length ? notes.map((n) => `<a class="dropdown-item align-items-start" href="${n.link}" data-note="${n.id}" style="white-space:normal"><i class="bi ${n.icon} ${n.read ? "muted" : "text-accent"} mt-1"></i><span><span class="small-text d-block">${n.text}</span><span class="tiny muted">${fmt.ago(n.at)}</span></span></a>`).join("") : `<p class="tiny muted px-2 mb-2">You're all caught up.</p>`}
            <div class="dropdown-divider"></div><a class="dropdown-item justify-content-center small-text" href="#/notifications">See all</a>
          </div>
        </div>
        <div class="dropdown">
          <button class="icon-btn" data-bs-toggle="dropdown" aria-label="Account menu" style="width:auto;padding:0 2px">${ui.avatar(user, "sm")}</button>
          <div class="dropdown-menu dropdown-menu-end">
            <div class="px-2 py-1"><div class="fw-650 small-text">${esc(user.name)}</div><div class="tiny muted text-capitalize">${user.role}</div></div>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="${homeFor(user)}"><i class="bi bi-grid"></i>Dashboard</a>
            <a class="dropdown-item" href="#/profile"><i class="bi bi-person"></i>${user.role === "student" ? "Profile & portfolio" : "Company profile"}</a>
            <a class="dropdown-item" href="#/jobs"><i class="bi bi-search"></i>Explore jobs</a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" data-logout><i class="bi bi-box-arrow-right"></i>Log out</button>
          </div>
        </div>`;
    } else {
      right = `
        <button class="icon-btn" data-toggle-theme aria-label="Toggle dark mode" title="Toggle dark mode"><i data-theme-icon class="bi ${ui.prefs.theme === "dark" ? "bi-sun" : "bi-moon-stars"}"></i></button>
        <a class="btn btn-ghost btn-sm d-none d-sm-inline-block" href="#/login">Log in</a>
        <a class="btn btn-accent btn-sm" href="#/register">Get started</a>`;
    }
    return `<div class="container-xl inner">
      <button class="icon-btn d-md-none" data-bs-toggle="offcanvas" data-bs-target="#mobile-menu" aria-label="Open menu"><i class="bi bi-list"></i></button>
      <a class="brand" href="${user ? homeFor(user) : "#/"}" aria-label="SkillBridge home"><span class="brand-mark">${brandSvg}</span>SkillBridge</a>
      <ul class="nav-links ms-2">${links.map(([h, t, key]) => `<li><a href="${h}" class="${String(navKey).startsWith(key) ? "active" : ""}">${t}</a></li>`).join("")}</ul>
      <div class="nav-actions">${right}</div>
    </div>`;
  }

  // Sidebar links for students and employers
  function sideLinks(user) {
    const msgs = unreadMessages(user);
    const notes = unreadCount(user);
    const common = [
      ["#/messages", "bi-chat", "Messages", "/messages", msgs],
      ["#/notifications", "bi-bell", "Notifications", "/notifications", notes],
    ];
    if (user.role === "student") {
      const apps = db.applications.filter(
        (a) =>
          a.studentId === user.id && ["Submitted", "Shortlisted", "Interview"].includes(a.status),
      ).length;
      return [
        [
          "Work",
          [
            ["#/student", "bi-grid", "Overview", "/student"],
            ["#/jobs", "bi-search", "Explore jobs", "/jobs"],
            ["#/applications", "bi-send", "Applications", "/applications", apps],
            ["#/projects", "bi-kanban", "Projects", "/projects"],
          ],
        ],
        ["Inbox", common],
        [
          "You",
          [
            ["#/profile", "bi-person", "Profile & portfolio", "/profile"],
            ["#/growth", "bi-graph-up", "Growth & records", "/growth"],
          ],
        ],
      ];
    }
    // Employer menu
    const pending = db.applications.filter(
      (a) => find.job(a.jobId)?.employerId === user.id && a.status === "Submitted",
    ).length;
    return [
      [
        "Hiring",
        [
          ["#/employer", "bi-grid", "Overview", "/employer"],
          ["#/employer/jobs", "bi-briefcase", "My job listings", "/employer/jobs", pending],
          ["#/post-job", "bi-plus-circle", "Post a job", "/post-job"],
          ["#/talent", "bi-people", "Find talent", "/talent"],
          ["#/projects", "bi-kanban", "Projects", "/projects"],
        ],
      ],
      ["Inbox", common],
      ["Account", [["#/profile", "bi-building", "Company profile", "/profile"]]],
    ];
  }

  function sidebar(user, navKey) {
    const groups = sideLinks(user);
    const best = groups
      .flatMap(([, l]) => l)
      .map((l) => l[3])
      .filter((k) => String(navKey).startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    const extra =
      user.role === "student"
        ? `<div class="side-card"><div class="d-flex justify-content-between mb-2"><span class="fw-650">Profile strength</span><span class="tabular">${SB.profileCompletion(user)}%</span></div><div class="bar"><span style="width:${SB.profileCompletion(user)}%"></span></div><a class="tiny d-inline-block mt-2" href="#/profile">Improve your matches →</a></div>`
        : `<div class="side-card"><div class="fw-650 mb-1">Need crew fast?</div><p class="tiny muted mb-2">Search students by the exact hours you need them.</p><a class="btn btn-accent btn-sm w-100" href="#/talent">Find talent</a></div>`;
    return (
      groups
        .map(
          ([title, links]) =>
            `<div class="side-group"><div class="title">${title}</div>${links.map(([h, icon, label, key, count]) => `<a class="side-link ${key === best ? "active" : ""}" href="${h}"><i class="bi ${icon}"></i>${label}${count ? `<span class="count">${count}</span>` : ""}</a>`).join("")}</div>`,
        )
        .join("") + extra
    );
  }

  function mobileMenu(user) {
    const groups = user ? sideLinks(user) : [];
    const pub = [
      ["#/jobs", "bi-search", "Explore jobs"],
      ["#/how-it-works", "bi-signpost-split", "How it works"],
      ["#/about", "bi-info-circle", "About"],
      ["#/contact", "bi-envelope", "Contact"],
    ];
    return `<div class="offcanvas-header"><a class="brand" href="#/"><span class="brand-mark">${brandSvg}</span>SkillBridge</a><button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button></div>
      <div class="offcanvas-body">
        ${groups.map(([title, links]) => `<div class="side-group"><div class="title">${title}</div>${links.map(([h, icon, label]) => `<a class="side-link" href="${h}"><i class="bi ${icon}"></i>${label}</a>`).join("")}</div>`).join("")}
        <div class="side-group"><div class="title">SkillBridge</div>${pub.map(([h, icon, label]) => `<a class="side-link" href="${h}"><i class="bi ${icon}"></i>${label}</a>`).join("")}</div>
        ${user ? `<button class="btn btn-ghost w-100 mt-2" data-logout>Log out</button>` : `<a class="btn btn-accent w-100 mt-2" href="#/register">Get started</a><a class="btn btn-ghost w-100 mt-2" href="#/login">Log in</a>`}
      </div>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="container-xl">
      <div class="row g-4">
        <div class="col-lg-4"><a class="brand mb-3" href="#/"><span class="brand-mark">${brandSvg}</span>SkillBridge</a><p class="small-text muted mt-3" style="max-width:30em">A Malaysian freelance and part-time platform for university students: digital projects, on-site crew work and everything in between, with costs shown up front.</p></div>
        <div class="col-6 col-lg-2"><h4>Students</h4><ul><li><a href="#/jobs">Explore jobs</a></li><li><a href="#/jobs?group=physical">On-site work</a></li><li><a href="#/jobs?group=academic">Digital & academic</a></li><li><a href="#/register?role=student">Create a profile</a></li></ul></div>
        <div class="col-6 col-lg-2"><h4>Employers</h4><ul><li><a href="#/register?role=employer">Post a job</a></li><li><a href="#/talent">Find talent</a></li><li><a href="#/how-it-works?for=employers">How hiring works</a></li></ul></div>
        <div class="col-6 col-lg-2"><h4>SkillBridge</h4><ul><li><a href="#/about">About</a></li><li><a href="#/how-it-works">How it works</a></li><li><a href="#/contact">Contact & FAQ</a></li></ul></div>
        <div class="col-6 col-lg-2"><h4>Demo</h4><ul><li><a href="#/login">Demo logins</a></li><li><button class="link-btn" style="color:inherit;font-weight:400" data-reset>Reset demo data</button></li></ul></div>
      </div>
      <div class="legal d-flex flex-wrap justify-content-between gap-2">
        <span>© 2026 SkillBridge · IMS566 Advanced Web Design & Development project by Muhammad Faid bin Mohd Zaid, UiTM. Independent student project, not an official UiTM service.</span>
        <span>All people, companies, jobs and reviews are fictional demo data. Photos: Unsplash.</span>
      </div>
    </div></footer>`;
  }

  // Compact footer for signed-in pages, so every page keeps a footer.
  function appFooter() {
    return `<footer class="app-footer"><span>© 2026 SkillBridge · IMS566 project by Muhammad Faid bin Mohd Zaid, UiTM. Fictional demo data.</span><span><a href="#/about">About</a> · <a href="#/how-it-works">How it works</a> · <a href="#/contact">Contact & FAQ</a></span></footer>`;
  }

  function notFound() {
    return `<div class="container-xl not-found"><div class="display mb-3">404</div><h1 class="h3">We couldn't find that page.</h1><p class="muted">The link may be old or the job may have been removed.</p><a class="btn btn-accent mt-2" href="#/">Back home</a> <a class="btn btn-ghost mt-2" href="#/jobs">Explore jobs</a></div>`;
  }

  /* ---------- Shell events (delegated once) ---------- */
  function bindShell() {
    $("#mobile-menu").innerHTML = mobileMenu(SB.me());
  }

  document.addEventListener("click", async (e) => {
    const t = e.target.closest(
      "[data-toggle-theme],[data-logout],[data-read-all],[data-note],[data-save],[data-reset]",
    );
    if (!t) return;
    if (t.matches("[data-toggle-theme]")) {
      ui.prefs.theme = ui.prefs.theme === "dark" ? "light" : "dark";
      ui.applyTheme();
      rerenderCharts();
    } else if (t.matches("[data-logout]")) {
      await SB.api.post("/auth/logout");
      bootstrap.Offcanvas.getInstance($("#mobile-menu"))?.hide();
      ui.toast("You've been logged out.", "info");
      SB.go("#/");
    } else if (t.matches("[data-read-all]")) {
      e.stopPropagation();
      await SB.api.post("/notifications/read", {});
      render();
    } else if (t.matches("[data-note]")) {
      SB.api.post("/notifications/read", { id: t.dataset.note });
    } else if (t.matches("[data-save]")) {
      e.preventDefault();
      e.stopPropagation();
      const { saved } = await SB.api.post("/saved", { jobId: t.dataset.save });
      $$(`[data-save="${t.dataset.save}"]`).forEach((b) => {
        b.classList.toggle("on", saved);
        const icon = b.querySelector("i");
        if (icon) icon.className = `bi ${saved ? "bi-bookmark-fill" : "bi-bookmark"}`;
        if (b.dataset.label) b.lastChild.textContent = saved ? " Saved" : " Save";
      });
      ui.toast(saved ? "Saved to your list." : "Removed from saved jobs.", saved ? "ok" : "info");
    } else if (t.matches("[data-reset]")) {
      if (
        await ui.confirmBox(
          "Reset demo data?",
          "This reloads the page and restores every sample job, application and message.",
          "Reset",
        )
      )
        location.reload();
    }
  });

  // Close the mobile menu when a link inside it is followed.
  document.addEventListener("click", (e) => {
    if (e.target.closest("#mobile-menu a"))
      bootstrap.Offcanvas.getInstance($("#mobile-menu"))?.hide();
  });

  let chartTimer;
  function rerenderCharts() {
    clearTimeout(chartTimer);
    if (!$("#page canvas")) return;
    chartTimer = setTimeout(() => {
      const y = window.scrollY;
      render().then(() => window.scrollTo(0, y));
    }, 60);
  }

  SB.render = render;
  SB.refreshNav = () => {
    const { path } = parseHash();
    $("#topnav").innerHTML = topnav(SB.me(), path);
    const side = $(".sidebar");
    if (side) side.innerHTML = sidebar(SB.me(), path);
  };

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", () => {
    ui.applyTheme();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
      ui.prefs.theme = e.matches ? "dark" : "light";
      ui.applyTheme();
      rerenderCharts();
    });
    render();
  });
})();
