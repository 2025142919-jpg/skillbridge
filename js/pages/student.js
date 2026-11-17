/* Student pages: dashboard, applications & saved jobs, profile & portfolio, growth & PDF records */
(function () {
  const { ui, db, fmt, find, api } = SB;
  const { $, $$, esc } = ui;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  /* ================= Dashboard ================= */
  SB.route(
    "/student",
    () => {
      const u = SB.me();
      const apps = db.applications.filter((a) => a.studentId === u.id);
      const active = apps.filter((a) =>
        ["Submitted", "Shortlisted", "Interview"].includes(a.status),
      );
      const projects = db.projects.filter((p) => p.studentId === u.id);
      const live = projects.filter((p) => p.status !== "Completed");
      const g = SB.growth(u.id);
      const r = SB.rating(u.id);
      const courseCats = db.courses[u.course] || [];
      const scored = db.jobs
        .filter((j) => j.status === "Open" && !apps.some((a) => a.jobId === j.id))
        .map((job) => ({ job, match: SB.matchScore(job, u) }))
        .sort((a, b) => b.match.pct - a.match.pct);
      const forYou = scored
        .filter((x) => courseCats.includes(x.job.cat) || x.match.pct >= 50)
        .slice(0, 3);
      const beyond = scored.filter((x) => !courseCats.includes(x.job.cat)).slice(0, 3);
      const upcoming = live
        .flatMap((p) => p.milestones.filter((m) => !m.done).map((m) => ({ ...m, project: p })))
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 4);
      const convos = db.conversations
        .filter((c) => c.members.includes(u.id))
        .sort((a, b) => b.messages.at(-1).at.localeCompare(a.messages.at(-1).at))
        .slice(0, 3);
      const completion = SB.profileCompletion(u);
      const statuses = ["Submitted", "Shortlisted", "Interview", "Hired", "Rejected", "Withdrawn"];

      return {
        title: "Dashboard",
        html: `
      <div class="page-head">
        <div><span class="tiny muted">${fmt.date(SB.todayISO(), { weekday: "long", day: "numeric", month: "long" })}</span><h1>${greeting()}, ${esc(u.name.split(" ")[0])}.</h1><p>${active.length ? `You have ${active.length} application${active.length > 1 ? "s" : ""} in progress` : "No open applications yet"}${upcoming.length ? ` and ${upcoming.length} milestone${upcoming.length > 1 ? "s" : ""} coming up.` : "."}</p></div>
        <div class="d-flex gap-2"><a class="btn btn-ghost" href="#/profile?tab=availability"><i class="bi bi-calendar-week me-1"></i>Free hours</a><a class="btn btn-accent" href="#/jobs"><i class="bi bi-search me-1"></i>Find work</a></div>
      </div>

      <div class="row g-3">
        <div class="col-6 col-xl">${ui.statTile("bi-send", "Active applications", active.length, `${apps.filter((a) => a.status === "Shortlisted").length} shortlisted`)}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-kanban", "Live projects", live.length, `${projects.filter((p) => p.status === "Completed").length} completed`)}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-cash-coin", "Earned via SkillBridge", fmt.rm(g.earned), "Completed projects")}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-star", "Rating", r.count ? r.avg.toFixed(1) : "–", r.count ? `${r.count} review${r.count > 1 ? "s" : ""}` : "No reviews yet")}</div>
        <div class="col-12 col-xl">${ui.statTile("bi-mortarboard", "Course-relevant work", g.relevance + "%", `of completed projects relate to ${esc(u.course)}`)}</div>
      </div>

      <div class="row g-3 section-gap">
        <div class="col-lg-7">
          <div class="card-x h-100">
            <div class="card-title-row"><h2>Coming up</h2><a class="small-text" href="#/projects">All projects</a></div>
            ${
              upcoming.length
                ? upcoming
                    .map((m) => {
                      const d = fmt.daysLeft(m.due);
                      return `<a class="check-row" href="#/projects/${m.project.id}" style="color:inherit"><span class="tick"><i class="bi bi-check"></i></span><div class="flex-fill"><div class="what small-text fw-650">${esc(m.title)}</div><div class="tiny muted">${esc(find.job(m.project.jobId).title)}</div></div><span class="status ${d <= 2 ? "bad" : d <= 6 ? "warn" : ""}">${d < 0 ? "Overdue" : d === 0 ? "Today" : `${fmt.shortDate(m.due)} · ${d}d`}</span></a>`;
                    })
                    .join("")
                : ui.empty(
                    "bi-calendar2-check",
                    "Nothing due",
                    "Milestones from your projects will appear here.",
                  )
            }
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card-x h-100">
            <div class="card-title-row"><h2>Applications by status</h2><a class="small-text" href="#/applications">Manage</a></div>
            <div style="height:220px"><canvas id="app-chart" aria-label="Doughnut chart of applications by status" role="img"></canvas></div>
          </div>
        </div>
      </div>

      ${completion < 100 ? `<div class="card-x section-gap d-flex flex-wrap gap-3 align-items-center"><div style="flex:1;min-width:220px"><div class="fw-650">Your profile is ${completion}% complete</div><div class="tiny muted mb-2">Complete profiles get better match scores and more replies from employers.</div><div class="bar"><span style="width:${completion}%"></span></div></div><a class="btn btn-ghost" href="#/profile">Finish profile</a></div>` : ""}

      <div class="section-gap">
        <div class="card-title-row"><h2 class="h5">Recommended for you</h2><span class="tiny muted">Based on ${esc(u.course)}, your skills and free hours</span></div>
        <div class="row g-3">${forYou.map((x) => `<div class="col-md-6 col-xxl-4">${ui.jobCard(x.job, x.match)}</div>`).join("") || `<div class="col-12">${ui.empty("bi-search", "No matches yet", "Add skills and free hours to your profile.")}</div>`}</div>
      </div>
      <div class="section-gap">
        <div class="card-title-row"><h2 class="h5">Explore beyond your course</h2><a class="small-text" href="#/jobs?group=physical">On-site work</a></div>
        <div class="row g-3">${beyond.map((x) => `<div class="col-md-6 col-xxl-4">${ui.jobCard(x.job, x.match)}</div>`).join("")}</div>
      </div>

      <div class="row g-3 section-gap">
        <div class="col-lg-7"><div class="card-x h-100"><div class="card-title-row"><h2>Your free hours</h2><a class="small-text" href="#/profile?tab=availability">Edit</a></div>${availabilityGrid(u.avail, true)}</div></div>
        <div class="col-lg-5"><div class="card-x h-100"><div class="card-title-row"><h2>Messages</h2><a class="small-text" href="#/messages">Inbox</a></div>
          ${
            convos
              .map((c) => {
                const other = find.user(c.members.find((m) => m !== u.id));
                const last = c.messages.at(-1);
                return `<a class="d-flex gap-3 py-2 align-items-center" href="#/messages/${c.id}" style="color:inherit">${ui.avatar(other)}<div class="flex-fill" style="min-width:0"><div class="d-flex justify-content-between"><span class="small-text fw-650">${esc(other.name)}</span><span class="tiny muted">${fmt.ago(last.at)}</span></div><div class="tiny muted text-truncate">${last.from === u.id ? "You: " : ""}${esc(last.text)}</div></div></a>`;
              })
              .join("") || ui.empty("bi-chat", "No messages yet")
          }
        </div></div>
      </div>`,
        mount() {
          const colors = ui.seriesColors();
          ui.chart($("#app-chart"), {
            type: "doughnut",
            data: {
              labels: statuses,
              datasets: [
                {
                  data: statuses.map((s) => apps.filter((a) => a.status === s).length),
                  backgroundColor: colors.slice(0, statuses.length),
                  borderColor: getComputedStyle(document.documentElement).getPropertyValue(
                    "--surface",
                  ),
                  borderWidth: 2,
                  hoverOffset: 6,
                },
              ],
            },
            options: { cutout: "68%", plugins: { legend: { position: "right" } } },
          });
        },
      };
    },
    { auth: "student", shell: "app" },
  );

  /* ---------- Availability grid (shared with talent profiles) ---------- */
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
  function availabilityGrid(avail, readonly) {
    return `<div class="avail-grid ${readonly ? "readonly" : ""}" ${readonly ? "" : 'id="avail-editor"'} role="grid" aria-label="Weekly availability">
      <span></span>${HOURS.map((h) => `<span class="hdr">${h % 3 === 1 ? fmt.hour(h).replace("m", "") : ""}</span>`).join("")}
      ${SB.DAYS.map((d) => `<span class="day">${d}</span>${HOURS.map((h) => `<button type="button" class="slot ${(avail[d] || []).includes(h) ? "on" : ""}" data-day="${d}" data-hour="${h}" ${readonly ? 'tabindex="-1" disabled' : ""} aria-label="${d} ${fmt.hour(h)}" aria-pressed="${(avail[d] || []).includes(h)}"></button>`).join("")}`).join("")}
    </div>`;
  }
  SB.availabilityGrid = availabilityGrid;

  /* ================= Applications & saved ================= */
  SB.route(
    "/applications",
    (params, query) => {
      const u = SB.me();
      const tab = query.tab || "active";
      const apps = db.applications.filter((a) => a.studentId === u.id);
      const groups = {
        active: apps.filter((a) => ["Submitted", "Shortlisted", "Interview"].includes(a.status)),
        hired: apps.filter((a) => a.status === "Hired"),
        closed: apps.filter((a) => ["Rejected", "Withdrawn"].includes(a.status)),
      };
      const saved = (db.saved[u.id] || []).map(find.job).filter(Boolean);
      const tabs = [
        ["active", "In progress", groups.active.length],
        ["hired", "Hired", groups.hired.length],
        ["closed", "Closed", groups.closed.length],
        ["saved", "Saved jobs", saved.length],
      ];

      const table = (list) =>
        list.length
          ? `<div class="card-x flush"><div class="table-wrap"><table class="table-x">
      <thead><tr><th>Job</th><th class="sortable" data-sort="submitted">Applied</th><th>Your rate</th><th>Status</th><th></th></tr></thead>
      <tbody>${list
        .map((a) => {
          const job = find.job(a.jobId);
          const co = find.user(job.employerId);
          const project = db.projects.find((p) => p.applicationId === a.id);
          return `<tr>
          <td><div class="d-flex gap-3 align-items-center"><img src="${ui.img(job.image)}" alt="" style="width:52px;height:40px;object-fit:cover;border-radius:8px"><div><a class="strong" href="#/jobs/${job.id}">${esc(job.title)}</a><div class="tiny muted">${esc(co.name)} · ${esc(job.city)}</div></div></div></td>
          <td class="tabular">${fmt.date(a.submitted)}</td>
          <td class="tabular">${fmt.rm(a.amount)}${job.pay.type !== "Fixed" ? `<span class="tiny muted"> ${SB.payUnit(job)}</span>` : ""}</td>
          <td>${ui.status(a.status)}</td>
          <td class="text-end text-nowrap">
            <button class="btn btn-ghost btn-sm" data-view="${a.id}">Details</button>
            ${project ? `<a class="btn btn-accent btn-sm" href="#/projects/${project.id}">Project</a>` : ""}
            ${["Submitted", "Shortlisted", "Interview"].includes(a.status) ? `<button class="btn btn-danger-soft btn-sm" data-withdraw="${a.id}">Withdraw</button>` : ""}
          </td></tr>`;
        })
        .join("")}</tbody></table></div></div>`
          : `<div class="card-x">${ui.empty("bi-inbox", "Nothing here yet", "Find something that fits your free hours.", `<a class="btn btn-accent btn-sm" href="#/jobs">Explore jobs</a>`)}</div>`;

      return {
        title: "Applications",
        html: `<div class="page-head"><div><h1>Applications</h1><p>Track every proposal from submission to hire.</p></div><a class="btn btn-accent" href="#/jobs"><i class="bi bi-search me-1"></i>Find more work</a></div>
        <div class="segmented mb-4" role="tablist">${tabs.map(([k, l, n]) => `<a href="#/applications?tab=${k}" role="tab" class="${tab === k ? "on" : ""}">${l}<span class="count">${n}</span></a>`).join("")}</div>
        ${
          tab === "saved"
            ? saved.length
              ? `<div class="row g-3">${saved.map((j) => `<div class="col-md-6 col-xxl-4">${ui.jobCard(j, SB.matchScore(j, u))}</div>`).join("")}</div>`
              : `<div class="card-x">${ui.empty("bi-bookmark", "No saved jobs", "Tap the bookmark on any job to keep it here.")}</div>`
            : table(groups[tab] || [])
        }`,
        mount(page) {
          page.addEventListener("click", async (e) => {
            const view = e.target.closest("[data-view]");
            const wd = e.target.closest("[data-withdraw]");
            const sort = e.target.closest("[data-sort]");
            if (view) detailModal(find.application(view.dataset.view));
            if (sort) {
              const body = sort.closest("table").tBodies[0];
              const rows = [...body.rows];
              const dir = sort.dataset.dir === "asc" ? "desc" : "asc";
              sort.dataset.dir = dir;
              rows.sort(
                (a, b) =>
                  (dir === "asc" ? 1 : -1) *
                  a.cells[1].textContent.localeCompare(b.cells[1].textContent),
              );
              rows.forEach((r) => body.appendChild(r));
            }
            if (
              wd &&
              (await ui.confirmBox(
                "Withdraw application?",
                "The employer will no longer see this application. You can't undo this.",
                "Withdraw",
                true,
              ))
            ) {
              await api.patch(`/applications/${wd.dataset.withdraw}`, { status: "Withdrawn" });
              ui.toast("Application withdrawn.", "info");
              SB.render();
            }
          });
        },
      };
    },
    { auth: "student", shell: "app" },
  );

  function detailModal(a) {
    const job = find.job(a.jobId);
    const stages = ["Submitted", "Shortlisted", "Interview", "Hired"];
    const reached = a.status === "Hired" ? 3 : stages.indexOf(a.status);
    ui.modal({
      title: esc(job.title),
      body: `<div class="d-flex justify-content-between align-items-center mb-3"><span class="small-text muted">${esc(find.user(job.employerId).name)}</span>${ui.status(a.status)}</div>
        <ol class="timeline mb-3">${stages.map((s, i) => `<li class="${i > reached || (["Rejected", "Withdrawn"].includes(a.status) && i > 0) ? "muted-dot" : ""}"><span class="${i <= reached ? "fw-650" : "muted"}">${s}</span>${i === 0 ? `<span class="tiny muted"> · ${fmt.date(a.submitted)}</span>` : ""}</li>`).join("")}${["Rejected", "Withdrawn"].includes(a.status) ? `<li><span class="fw-650 text-bad">${a.status}</span></li>` : ""}</ol>
        <div class="tiny muted mb-1">Your note</div><p class="small-text">${esc(a.cover)}</p>
        ${a.availability ? `<div class="tiny muted mb-1">Availability</div><p class="small-text">${esc(a.availability)}</p>` : ""}
        ${a.note ? `<div class="demo-note"><i class="bi bi-chat-quote"></i><span><b>Employer note:</b> ${esc(a.note)}</span></div>` : ""}`,
      footer: `<button class="btn btn-ghost" data-bs-dismiss="modal" onclick="SB.startChat('${job.employerId}','${job.id}')"><i class="bi bi-chat me-1"></i>Message employer</button><a class="btn btn-accent" href="#/jobs/${job.id}" data-bs-dismiss="modal">View job</a>`,
    });
  }

  /* ================= Profile (students and employers) ================= */
  SB.route(
    "/profile",
    (params, query) => {
      const u = SB.me();
      return u.role === "student" ? studentProfile(u, query) : employerProfile(u, query);
    },
    { auth: ["student", "employer"], shell: "app" },
  );

  function studentProfile(u, query) {
    const tab = query.tab || "about";
    const tabs = [
      ["about", "About"],
      ["portfolio", "Portfolio"],
      ["availability", "Free hours"],
      ["experience", "Experience"],
      ["reviews", "Reviews"],
    ];
    const r = SB.rating(u.id);
    let body = "";

    if (tab === "about") {
      body = `<form class="card-x" id="about-form" novalidate><div class="row g-3">
        <div class="col-md-6"><label class="form-label" for="p-name">Full name</label><input class="form-control" id="p-name" name="name" value="${esc(u.name)}"></div>
        <div class="col-md-6"><label class="form-label" for="p-status">Status</label><select class="form-select" id="p-status" name="status">${["Available", "Busy", "Unavailable"].map((s) => `<option ${u.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="col-12"><label class="form-label" for="p-head">Headline</label><input class="form-control" id="p-head" name="headline" maxlength="90" value="${esc(u.headline)}" placeholder="One line employers will see first"></div>
        <div class="col-12"><label class="form-label" for="p-bio">Bio</label><textarea class="form-control" id="p-bio" name="bio" rows="4">${esc(u.bio)}</textarea></div>
        <div class="col-md-6"><label class="form-label" for="p-uni">University</label><select class="form-select" id="p-uni" name="university">${db.universities
          .concat(db.universities.includes(u.university) ? [] : [u.university])
          .map((x) => `<option ${u.university === x ? "selected" : ""}>${esc(x)}</option>`)
          .join("")}</select></div>
        <div class="col-md-6"><label class="form-label" for="p-course">Programme</label><select class="form-select" id="p-course" name="course">${Object.keys(
          db.courses,
        )
          .map((c) => `<option ${u.course === c ? "selected" : ""}>${c}</option>`)
          .join("")}</select></div>
        <div class="col-md-4"><label class="form-label" for="p-year">Year</label><select class="form-select" id="p-year" name="year">${["Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"].map((y) => `<option ${u.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></div>
        <div class="col-md-4"><label class="form-label" for="p-city">City</label><input class="form-control" id="p-city" name="city" value="${esc(u.city)}"></div>
        <div class="col-md-4"><label class="form-label" for="p-mode">Preferred arrangement</label><select class="form-select" id="p-mode" name="mode">${["Any", "On-site", "Hybrid", "Remote"].map((m) => `<option ${u.mode === m ? "selected" : ""}>${m}</option>`).join("")}</select></div>
        <div class="col-md-4"><label class="form-label" for="p-rate">Typical rate (RM / hour)</label><input class="form-control" type="number" min="5" id="p-rate" name="rate" value="${u.rate}"></div>
        <div class="col-md-8"><label class="form-label" for="skill-input">Skills <span class="muted fw-normal">(press Enter to add)</span></label><div class="form-control d-flex flex-wrap gap-1 align-items-center" style="min-height:46px" id="skill-box">${u.skills.map((s) => `<span class="tag removable">${esc(s)}<button type="button" data-rm-skill="${esc(s)}" aria-label="Remove ${esc(s)}">×</button></span>`).join("")}<input id="skill-input" class="border-0 flex-fill" style="outline:0;min-width:120px;background:transparent;color:inherit" placeholder="Add a skill"></div></div>
        <div class="col-12"><div class="form-label">Interested in</div><div class="d-flex flex-wrap gap-2">${db.categories.map((c) => `<span class="chip ${u.interests.includes(c.id) ? "on" : ""}" data-interest="${c.id}"><i class="bi ${c.icon}"></i>${esc(c.short)}</span>`).join("")}</div></div>
        <div class="col-12 d-flex gap-2"><button class="btn btn-accent">Save changes</button><a class="btn btn-ghost" href="#/talent/${u.id}">Preview public profile</a></div>
      </div></form>`;
    } else if (tab === "portfolio") {
      body = `<div class="d-flex justify-content-between align-items-center mb-3"><p class="muted mb-0 small-text">Show work that proves your skills: designs, photos, sites, spreadsheets, event photos.</p><button class="btn btn-accent btn-sm" id="add-pf"><i class="bi bi-plus-lg me-1"></i>Add item</button></div>
        ${u.portfolio.length ? `<div class="portfolio-grid">${u.portfolio.map((p) => `<div class="pf-item"><button class="btn btn-ghost btn-sm remove" data-rm-pf="${p.id}" aria-label="Remove"><i class="bi bi-trash"></i></button><button class="thumb" data-zoom="${p.id}"><img src="${p.img.startsWith("data:") ? p.img : ui.img(p.img)}" alt="${esc(p.title)}" loading="lazy"></button><div class="meta"><strong>${esc(p.title)}</strong><span>${esc(p.type)}</span></div></div>`).join("")}</div>` : `<div class="card-x">${ui.empty("bi-images", "No portfolio items yet", "Add your first piece of work.")}</div>`}`;
    } else if (tab === "availability") {
      body = `<div class="card-x"><div class="card-title-row"><h2>When are you free for work?</h2><div class="d-flex gap-2"><button class="btn btn-ghost btn-sm" id="clear-avail">Clear</button><button class="btn btn-ghost btn-sm" id="weekend-avail">Weekends 9–5</button></div></div>
        <p class="small-text muted">Click or drag across the grid. Employers searching for crew see students whose hours overlap their shifts, and your match scores use this too.</p>
        ${availabilityGrid(u.avail, false)}
        <div class="d-flex justify-content-between align-items-center mt-3"><span class="tiny muted" id="avail-sum"></span><button class="btn btn-accent" id="save-avail">Save free hours</button></div></div>`;
    } else if (tab === "experience") {
      body = `<div class="row g-3">
        <div class="col-lg-6"><div class="card-x h-100"><div class="card-title-row"><h2>Experience</h2><button class="btn btn-ghost btn-sm" data-add="experience"><i class="bi bi-plus-lg"></i> Add</button></div>
          ${u.experience.map((x, i) => `<div class="d-flex gap-3 py-2 border-bottom" style="border-color:var(--line)!important"><i class="bi bi-briefcase text-accent mt-1"></i><div class="flex-fill"><div class="fw-650 small-text">${esc(x.title)}</div><div class="tiny muted">${esc(x.org)} · ${esc(x.period)}</div><div class="small-text mt-1">${esc(x.desc)}</div></div><button class="icon-btn" data-rm="experience" data-i="${i}" aria-label="Remove"><i class="bi bi-x"></i></button></div>`).join("") || `<p class="small-text muted">Add part-time work, volunteering or club roles.</p>`}</div></div>
        <div class="col-lg-6"><div class="card-x h-100"><div class="card-title-row"><h2>Education</h2><button class="btn btn-ghost btn-sm" data-add="education"><i class="bi bi-plus-lg"></i> Add</button></div>
          ${u.education.map((x, i) => `<div class="d-flex gap-3 py-2"><i class="bi bi-mortarboard text-accent mt-1"></i><div class="flex-fill"><div class="fw-650 small-text">${esc(x.programme)}</div><div class="tiny muted">${esc(x.school)} · ${esc(x.period)}</div></div><button class="icon-btn" data-rm="education" data-i="${i}" aria-label="Remove"><i class="bi bi-x"></i></button></div>`).join("")}</div></div>
      </div>`;
    } else {
      const list = db.reviews.filter((v) => v.to === u.id);
      body = list.length
        ? list
            .map(
              (v) =>
                `<div class="card-x mb-2"><div class="d-flex justify-content-between">${ui.stars(v.stars)}<span class="tiny muted">${fmt.date(v.date)}</span></div><p class="small-text mt-2 mb-1">${esc(v.text)}</p><div class="tiny muted">${esc(find.user(v.from).name)} · ${esc(v.projectId ? find.job(find.project(v.projectId).jobId).title : v.jobTitle)}</div></div>`,
            )
            .join("")
        : `<div class="card-x">${ui.empty("bi-star", "No reviews yet", "Reviews appear after employers mark your work complete.")}</div>`;
    }

    return {
      title: "Profile & portfolio",
      html: `
        ${query.welcome ? `<div class="demo-note mb-3"><i class="bi bi-stars"></i><span><b>Welcome to SkillBridge!</b> Add a few skills and paint your free hours to unlock match scores.</span></div>` : ""}
        <div class="profile-cover" style="height:150px"><img src="${ui.photo(u.cover)}" alt=""></div>
        <div class="profile-head">${ui.avatar(u, "xl")}<div class="pb-2 flex-fill"><h1 class="h3 mb-0">${esc(u.name)}</h1><div class="muted small-text">${esc(u.course)} · ${esc(u.university)} · ${esc(u.city)}</div></div><div class="pb-2 d-flex gap-2 align-items-center">${ui.status(u.status)} ${ui.stars(r.avg, r.count)}</div></div>
        <div class="segmented my-4">${tabs.map(([k, l]) => `<a href="#/profile?tab=${k}" class="${tab === k ? "on" : ""}">${l}</a>`).join("")}</div>
        ${body}`,
      mount(page) {
        if (tab === "about") mountAbout(u);
        if (tab === "portfolio") mountPortfolio(u, page);
        if (tab === "availability") mountAvailability(u);
        if (tab === "experience") mountExperience(u, page);
      },
    };
  }

  function mountAbout(u) {
    const form = $("#about-form");
    const skills = [...u.skills];
    const interests = new Set(u.interests);
    const redrawSkills = () => {
      $$("#skill-box .tag").forEach((t) => t.remove());
      $("#skill-input").insertAdjacentHTML(
        "beforebegin",
        skills
          .map(
            (s) =>
              `<span class="tag removable">${esc(s)}<button type="button" data-rm-skill="${esc(s)}" aria-label="Remove ${esc(s)}">×</button></span>`,
          )
          .join(""),
      );
    };
    $("#skill-input").addEventListener("keydown", (e) => {
      const v = e.target.value.trim().replace(/,$/, "");
      if ((e.key === "Enter" || e.key === ",") && v) {
        e.preventDefault();
        if (!skills.some((s) => s.toLowerCase() === v.toLowerCase())) skills.push(v);
        e.target.value = "";
        redrawSkills();
      } else if (e.key === "Backspace" && !e.target.value && skills.length) {
        skills.pop();
        redrawSkills();
      }
    });
    $("#skill-box").addEventListener("click", (e) => {
      const b = e.target.closest("[data-rm-skill]");
      if (b) {
        skills.splice(skills.indexOf(b.dataset.rmSkill), 1);
        redrawSkills();
      } else $("#skill-input").focus();
    });
    $$("[data-interest]").forEach((c) =>
      c.addEventListener("click", () => {
        c.classList.toggle("on");
        interests[c.classList.contains("on") ? "add" : "delete"](c.dataset.interest);
      }),
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (
        !ui.validate(form, {
          name: ui.minLen("Name", 3),
          bio: ui.minLen("Bio", 30),
          city: ui.required("City"),
          rate: (v) => (Number(v) >= 5 ? "" : "Enter a rate of at least RM 5."),
        })
      )
        return;
      if (skills.length < 3) return ui.toast("Add at least three skills.", "bad");
      const data = Object.fromEntries(new FormData(form));
      await ui.busy(form.querySelector(".btn-accent"), () =>
        api.patch(`/users/${u.id}`, {
          ...data,
          rate: Number(data.rate),
          skills,
          interests: [...interests],
        }),
      );
      ui.toast("Profile saved.");
      SB.render();
    });
  }

  function mountPortfolio(u, page) {
    page.addEventListener("click", async (e) => {
      const rm = e.target.closest("[data-rm-pf]");
      const zoom = e.target.closest("[data-zoom]");
      if (
        rm &&
        (await ui.confirmBox(
          "Remove this item?",
          "It will no longer appear on your public profile.",
          "Remove",
          true,
        ))
      ) {
        await api.patch(`/users/${u.id}`, {
          portfolio: u.portfolio.filter((p) => p.id !== rm.dataset.rmPf),
        });
        ui.toast("Item removed.", "info");
        SB.render();
      }
      if (zoom) SB.lightbox(u.portfolio.find((p) => p.id === zoom.dataset.zoom));
    });
    $("#add-pf").addEventListener("click", () => {
      let imageData = null;
      const m = ui.modal({
        title: "Add portfolio item",
        body: `<form id="pf-form" novalidate><div class="row g-3">
          <div class="col-12"><label class="form-label" for="pf-file">Image</label><input class="form-control" type="file" id="pf-file" name="file" accept="image/*"><div class="form-text">PNG or JPG up to 3 MB. The image stays in this browser tab only.</div><img id="pf-preview" class="mt-2 rounded-3 d-none" style="max-height:180px;object-fit:cover" alt="Preview"></div>
          <div class="col-md-7"><label class="form-label" for="pf-title">Title</label><input class="form-control" id="pf-title" name="title"></div>
          <div class="col-md-5"><label class="form-label" for="pf-type">Type</label><input class="form-control" id="pf-type" name="type" placeholder="e.g. Photography, Excel"></div>
          <div class="col-12"><label class="form-label" for="pf-desc">Short description</label><textarea class="form-control" id="pf-desc" name="desc" rows="3"></textarea></div>
        </div></form>`,
        footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-accent" id="pf-save">Add to portfolio</button>`,
      });
      const form = $("#pf-form", m.el);
      $("#pf-file", m.el).addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
          e.target.value = "";
          return ui.toast("That image is larger than 3 MB.", "bad");
        }
        const reader = new FileReader();
        reader.onload = () => {
          imageData = reader.result;
          const prev = $("#pf-preview", m.el);
          prev.src = imageData;
          prev.classList.remove("d-none");
          if (!form.elements.title.value)
            form.elements.title.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        };
        reader.readAsDataURL(file);
      });
      $("#pf-save", m.el).addEventListener("click", async (e) => {
        if (
          !ui.validate(form, {
            file: () => (imageData ? "" : "Choose an image."),
            title: ui.minLen("Title", 3),
            type: ui.required("Type"),
          })
        )
          return;
        const item = {
          id: "pf" + Date.now(),
          title: form.elements.title.value.trim(),
          type: form.elements.type.value.trim(),
          desc: form.elements.desc.value.trim(),
          img: imageData,
        };
        await ui.busy(e.currentTarget, () =>
          api.patch(`/users/${u.id}`, { portfolio: [item, ...u.portfolio] }),
        );
        m.close();
        ui.toast("Added to your portfolio.");
        SB.render();
      });
    });
  }

  function mountAvailability(u) {
    const grid = $("#avail-editor");
    const summary = () => {
      const on = $$(".slot.on", grid);
      const days = new Set(on.map((s) => s.dataset.day));
      $("#avail-sum").textContent =
        `${on.length} hours a week across ${days.size} day${days.size === 1 ? "" : "s"}`;
    };
    let painting = null;
    const set = (slot, value) => {
      slot.classList.toggle("on", value);
      slot.setAttribute("aria-pressed", value);
    };
    grid.addEventListener("pointerdown", (e) => {
      const slot = e.target.closest(".slot");
      if (!slot) return;
      e.preventDefault();
      painting = !slot.classList.contains("on");
      set(slot, painting);
      summary();
    });
    grid.addEventListener("pointerover", (e) => {
      const slot = e.target.closest(".slot");
      if (slot && painting !== null) {
        set(slot, painting);
        summary();
      }
    });
    window.addEventListener("pointerup", () => (painting = null));
    grid.addEventListener("keydown", (e) => {
      const slot = e.target.closest(".slot");
      if (slot && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        set(slot, !slot.classList.contains("on"));
        summary();
      }
    });
    $("#clear-avail").addEventListener("click", () => {
      $$(".slot", grid).forEach((s) => set(s, false));
      summary();
    });
    $("#weekend-avail").addEventListener("click", () => {
      $$(".slot", grid).forEach(
        (s) =>
          ["Sat", "Sun"].includes(s.dataset.day) &&
          s.dataset.hour >= 9 &&
          s.dataset.hour < 17 &&
          set(s, true),
      );
      summary();
    });
    $("#save-avail").addEventListener("click", async (e) => {
      const avail = {};
      $$(".slot.on", grid).forEach((s) =>
        (avail[s.dataset.day] = avail[s.dataset.day] || []).push(Number(s.dataset.hour)),
      );
      await ui.busy(e.currentTarget, () => api.patch(`/users/${u.id}`, { avail }));
      ui.toast("Free hours saved. Your match scores have been updated.");
    });
    summary();
  }

  function mountExperience(u, page) {
    page.addEventListener("click", async (e) => {
      const rm = e.target.closest("[data-rm]");
      const add = e.target.closest("[data-add]");
      if (rm) {
        const key = rm.dataset.rm;
        await api.patch(`/users/${u.id}`, {
          [key]: u[key].filter((_, i) => i !== Number(rm.dataset.i)),
        });
        SB.render();
      }
      if (add) {
        const isExp = add.dataset.add === "experience";
        const m = ui.modal({
          title: isExp ? "Add experience" : "Add education",
          body: `<form id="x-form" novalidate><div class="row g-3">
            <div class="col-12"><label class="form-label" for="x1">${isExp ? "Role" : "Programme"}</label><input class="form-control" id="x1" name="a"></div>
            <div class="col-md-7"><label class="form-label" for="x2">${isExp ? "Organisation" : "Institution"}</label><input class="form-control" id="x2" name="b"></div>
            <div class="col-md-5"><label class="form-label" for="x3">Period</label><input class="form-control" id="x3" name="c" placeholder="2025 – now"></div>
            ${isExp ? `<div class="col-12"><label class="form-label" for="x4">What you did</label><textarea class="form-control" id="x4" name="d" rows="3"></textarea></div>` : ""}
          </div></form>`,
          footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-accent" id="x-save">Add</button>`,
        });
        $("#x-save", m.el).addEventListener("click", async () => {
          const f = $("#x-form", m.el);
          if (
            !ui.validate(f, {
              a: ui.required("This"),
              b: ui.required("This"),
              c: ui.required("Period"),
            })
          )
            return;
          const v = (n) => f.elements[n]?.value.trim() || "";
          const entry = isExp
            ? { title: v("a"), org: v("b"), period: v("c"), desc: v("d") }
            : { programme: v("a"), school: v("b"), period: v("c") };
          await api.patch(`/users/${u.id}`, { [add.dataset.add]: [entry, ...u[add.dataset.add]] });
          m.close();
          SB.render();
        });
      }
    });
  }

  function employerProfile(u) {
    const r = SB.rating(u.id);
    const reviews = db.reviews.filter((v) => v.to === u.id);
    return {
      title: "Company profile",
      html: `<div class="page-head"><div><h1>Company profile</h1><p>This is what students see on your listings and public page.</p></div><a class="btn btn-ghost" href="#/companies/${u.id}">View public page</a></div>
        <div class="row g-4">
          <div class="col-lg-8"><form class="card-x" id="co-form" novalidate><div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="co-name">Display name</label><input class="form-control" id="co-name" name="name" value="${esc(u.name)}"></div>
            <div class="col-md-6"><label class="form-label" for="co-legal">Registered name</label><input class="form-control" id="co-legal" name="legalName" value="${esc(u.legalName)}"></div>
            <div class="col-md-6"><label class="form-label" for="co-ind">Industry</label><input class="form-control" id="co-ind" name="industry" value="${esc(u.industry)}"></div>
            <div class="col-md-6"><label class="form-label" for="co-size">Size</label><select class="form-select" id="co-size" name="size">${["1–10 staff", "11–50 staff", "51–200 staff", "201–500 staff", "500+ staff"].map((s) => `<option ${u.size === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
            <div class="col-md-6"><label class="form-label" for="co-city">City</label><input class="form-control" id="co-city" name="city" value="${esc(u.city)}"></div>
            <div class="col-md-6"><label class="form-label" for="co-contact">Hiring contact</label><input class="form-control" id="co-contact" name="contact" value="${esc(u.contact)}"></div>
            <div class="col-12"><label class="form-label" for="co-addr">Address</label><input class="form-control" id="co-addr" name="address" value="${esc(u.address)}"></div>
            <div class="col-12"><label class="form-label" for="co-about">About</label><textarea class="form-control" id="co-about" name="about" rows="4">${esc(u.about)}</textarea></div>
            <div class="col-12"><button class="btn btn-accent">Save profile</button></div>
          </div></form></div>
          <div class="col-lg-4">
            <div class="card-x text-center">${ui.avatar(u, "lg")}<div class="fw-650 mt-2">${esc(u.name)}</div><div class="tiny muted">${esc(u.industry)}</div><div class="mt-2">${u.verified ? `<span class="tag accent"><i class="bi bi-patch-check-fill"></i>Verified employer</span>` : `<span class="tag">Verification pending</span>`}</div><div class="mt-2">${ui.stars(r.avg, r.count)}</div></div>
            <div class="card-x mt-3"><h2 class="h6">Latest reviews</h2>${
              reviews
                .slice(0, 3)
                .map(
                  (v) =>
                    `<div class="py-2"><div>${ui.stars(v.stars)}</div><div class="small-text">${esc(v.text)}</div><div class="tiny muted">${esc(find.user(v.from).name)}</div></div>`,
                )
                .join("") || `<p class="small-text muted mb-0">No reviews yet.</p>`
            }</div>
          </div>
        </div>`,
      mount() {
        const form = $("#co-form");
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          if (
            !ui.validate(form, {
              name: ui.minLen("Name", 2),
              industry: ui.required("Industry"),
              city: ui.required("City"),
              about: ui.minLen("About", 30),
            })
          )
            return;
          await ui.busy(form.querySelector(".btn-accent"), () =>
            api.patch(`/users/${u.id}`, Object.fromEntries(new FormData(form))),
          );
          ui.toast("Profile saved.");
          SB.refreshNav();
        });
      },
    };
  }

  /* ================= Growth & PDF records ================= */
  SB.route(
    "/growth",
    () => {
      const u = SB.me();
      const g = SB.growth(u.id);
      const skills = Object.entries(g.skills).sort((a, b) => b[1] - a[1]);
      const records = g.done.filter((p) =>
        db.reviews.some((r) => r.projectId === p.id && r.from === p.employerId),
      );
      return {
        title: "Growth & records",
        html: `<div class="page-head"><div><h1>Growth & records</h1><p>Every completed project adds to the skills it used. 1 project = Beginner, 2 = Intermediate, 3 or more = Advanced.</p></div><button class="btn btn-accent" id="cv-btn"><i class="bi bi-file-earmark-person me-1"></i>Download CV (PDF)</button></div>
        <div class="row g-3">
          <div class="col-6 col-lg-3">${ui.statTile("bi-patch-check", "Projects completed", g.done.length)}</div>
          <div class="col-6 col-lg-3">${ui.statTile("bi-lightning", "Skills practised", skills.length)}</div>
          <div class="col-6 col-lg-3">${ui.statTile("bi-mortarboard", "Course-relevant", g.relevance + "%", esc(u.course))}</div>
          <div class="col-6 col-lg-3">${ui.statTile("bi-cash-coin", "Earned", fmt.rm(g.earned))}</div>
        </div>
        <div class="row g-3 section-gap">
          <div class="col-lg-7"><div class="card-x h-100"><div class="card-title-row"><h2>Skills practised</h2><span class="tiny muted">Completed projects per skill</span></div>${skills.length ? `<div style="height:${Math.max(180, skills.length * 34)}px"><canvas id="skill-chart" role="img" aria-label="Bar chart of skills practised"></canvas></div>` : ui.empty("bi-bar-chart", "No completed projects yet", "Finish your first project to start tracking growth.")}</div></div>
          <div class="col-lg-5"><div class="card-x flush h-100"><div class="p-3 pb-0"><h2 class="h6 mb-2">Skill levels</h2></div><table class="table-x"><thead><tr><th>Skill</th><th>Projects</th><th>Level</th></tr></thead><tbody>${skills.map(([s, n]) => `<tr><td class="strong">${esc(s)}</td><td class="tabular">${n}</td><td>${ui.status(SB.level(n), n >= 3 ? "ok" : n === 2 ? "info" : "")}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div></div>
        </div>
        <div class="card-x section-gap"><div class="card-title-row"><h2>Completed work</h2><span class="tiny muted">Reviewed projects are included in your CV</span></div>
          ${
            records.length
              ? records
                  .map((p) => {
                    const job = find.job(p.jobId);
                    const rev = db.reviews.find(
                      (r) => r.projectId === p.id && r.from === p.employerId,
                    );
                    return `<div class="d-flex flex-wrap gap-3 align-items-center py-3 border-top" style="border-color:var(--line)!important"><img src="${ui.img(job.image)}" alt="" style="width:64px;height:48px;border-radius:10px;object-fit:cover"><div class="flex-fill"><div class="fw-650 small-text">${esc(job.title)}</div><div class="tiny muted">${esc(find.user(p.employerId).name)} · completed ${fmt.date(p.completed)} · ${ui.stars(rev.stars)}</div></div><span class="status ok">Completed</span></div>`;
                  })
                  .join("")
              : `<p class="small-text muted mb-0">No records yet.</p>`
          }
          <p class="tiny muted mt-3 mb-0">Demo data only. The CV is not an official or accredited document.</p>
        </div>`,
        mount() {
          if (skills.length) {
            ui.chart($("#skill-chart"), {
              type: "bar",
              data: {
                labels: skills.map((s) => s[0]),
                datasets: [
                  {
                    label: "Projects",
                    data: skills.map((s) => s[1]),
                    backgroundColor: ui.accentColor(),
                    borderRadius: 4,
                    barThickness: 14,
                  },
                ],
              },
              options: {
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: {
                      display: true,
                      color: getComputedStyle(document.documentElement).getPropertyValue("--line"),
                    },
                    ticks: { stepSize: 1 },
                  },
                  y: { grid: { display: false } },
                },
              },
            });
          }
          $("#cv-btn").addEventListener("click", () => SB.pdf.cv(u));
        },
      };
    },
    { auth: "student", shell: "app" },
  );

  /* ---------- PDF generation with jsPDF ---------- */
  SB.pdf = {
    doc() {
      const { jsPDF } = window.jspdf;
      return new jsPDF({ unit: "mm", format: "a4" });
    },
    header(doc, title, subtitle) {
      const accent = ui.accentColor() || "#0b63f6";
      doc.setFillColor(accent);
      doc.rect(0, 0, 210, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("SKILLBRIDGE", 20, 18);
      doc.setFontSize(22);
      doc.setTextColor(29, 29, 31);
      doc.text(title, 20, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(subtitle, 20, 37);
    },
    section(doc, y, label) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(29, 29, 31);
      doc.text(label.toUpperCase(), 20, y);
      doc.setDrawColor(220);
      doc.line(20, y + 2, 190, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      return y + 8;
    },
    para(doc, y, text, size = 10) {
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, 20, y);
      return y + lines.length * (size * 0.45) + 2;
    },
    footer(doc) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        "Generated by the SkillBridge demo (IMS566 project). Fictional data, not an official or accredited document.",
        20,
        287,
      );
    },
    cv(u) {
      const doc = this.doc();
      this.header(doc, u.name, `${u.course} · ${u.university} · ${u.city}`);
      let y = 46;
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`${u.email}   ·   ${u.languages.join(", ")}`, 20, y);
      y = this.para(doc, y + 8, u.headline || "", 12);
      y = this.para(doc, y + 2, u.bio);
      y = this.section(doc, y + 6, "Skills");
      y = this.para(doc, y, u.skills.join("  ·  "));
      y = this.section(doc, y + 6, "Experience");
      const done = SB.growth(u.id).done;
      done.forEach((p) => {
        const job = find.job(p.jobId);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(job.title, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${find.user(p.employerId).name} (via SkillBridge) · ${fmt.date(p.completed)}`,
          20,
          y + 5,
        );
        y += 11;
      });
      u.experience.forEach((x) => {
        doc.setFont("helvetica", "bold");
        doc.text(x.title, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${x.org} · ${x.period}`, 20, y + 5);
        y = this.para(doc, y + 10, x.desc, 9.5) + 2;
      });
      y = this.section(doc, y + 4, "Education");
      u.education.forEach((x) => {
        doc.setFont("helvetica", "bold");
        doc.text(x.programme, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${x.school} · ${x.period}`, 20, y + 5);
        y += 12;
      });
      if (u.portfolio.length) {
        y = this.section(doc, y + 2, "Selected work");
        u.portfolio
          .slice(0, 5)
          .forEach((p) => (y = this.para(doc, y, `${p.title} (${p.type}): ${p.desc || ""}`, 9.5)));
      }
      this.footer(doc);
      doc.save(`${u.name.replace(/\s+/g, "_")}_CV.pdf`);
      ui.toast("CV downloaded.");
    },
  };

  /* ---------- Lightbox ---------- */
  SB.lightbox = (item) => {
    if (!item) return;
    ui.modal({
      title: esc(item.title),
      size: "modal-lg",
      body: `<img src="${item.img.startsWith("data:") ? item.img : ui.img(item.img)}" alt="${esc(item.title)}" class="w-100 rounded-3" style="max-height:70vh;object-fit:contain;background:var(--surface-2)"><div class="mt-3"><span class="tag">${esc(item.type)}</span><p class="small-text mt-2 mb-0">${esc(item.desc || "")}</p></div>`,
    });
  };
})();
