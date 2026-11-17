/* Employer pages: dashboard, listings, applicants, post a job, talent search and talent profiles */
(function () {
  const { ui, db, fmt, find, api } = SB;
  const { $, $$, esc } = ui;

  const myJobs = (u) => db.jobs.filter((j) => j.employerId === u.id);
  const appsFor = (jobId) => db.applications.filter((a) => a.jobId === jobId);

  /* ================= Dashboard ================= */
  SB.route(
    "/employer",
    () => {
      const u = SB.me();
      const jobs = myJobs(u);
      const open = jobs.filter((j) => j.status === "Open");
      const apps = db.applications.filter((a) => jobs.some((j) => j.id === a.jobId));
      const fresh = apps.filter((a) => a.status === "Submitted");
      const projects = db.projects.filter((p) => p.employerId === u.id);
      const live = projects.filter((p) => p.status !== "Completed");
      const committed = projects.reduce((s, p) => s + p.budget, 0);
      const r = SB.rating(u.id);
      const recent = [...apps].sort((a, b) => b.submitted.localeCompare(a.submitted)).slice(0, 6);
      const pipeline = ["Submitted", "Shortlisted", "Interview", "Hired", "Rejected"];
      const closing = open.filter((j) => fmt.daysLeft(j.deadline) <= 7);

      return {
        title: "Employer dashboard",
        html: `
      <div class="page-head">
        <div><span class="tiny muted">${esc(u.name)}</span><h1>Hiring overview</h1><p>${fresh.length} new application${fresh.length === 1 ? "" : "s"} waiting for review${closing.length ? ` · ${closing.length} listing${closing.length > 1 ? "s" : ""} closing this week` : ""}.</p></div>
        <div class="d-flex gap-2"><a class="btn btn-ghost" href="#/talent"><i class="bi bi-people me-1"></i>Find talent</a><a class="btn btn-accent" href="#/post-job"><i class="bi bi-plus-lg me-1"></i>Post a job</a></div>
      </div>
      <div class="row g-3">
        <div class="col-6 col-xl">${ui.statTile("bi-briefcase", "Open listings", open.length, `${jobs.filter((j) => j.status === "Draft").length} draft`)}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-person-plus", "New applicants", fresh.length, `${apps.length} total`)}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-kanban", "Active projects", live.length, `${projects.length - live.length} completed`)}</div>
        <div class="col-6 col-xl">${ui.statTile("bi-cash-stack", "Committed budget", fmt.rm(committed), "Across all projects")}</div>
        <div class="col-12 col-xl">${ui.statTile("bi-star", "Rating from students", r.count ? r.avg.toFixed(1) : "–", r.count ? `${r.count} reviews` : "")}</div>
      </div>
      <div class="row g-3 section-gap">
        <div class="col-lg-7"><div class="card-x h-100"><div class="card-title-row"><h2>Applicants per listing</h2><a class="small-text" href="#/employer/jobs">All listings</a></div><div style="height:260px"><canvas id="per-job" role="img" aria-label="Bar chart of applicants per listing"></canvas></div></div></div>
        <div class="col-lg-5"><div class="card-x h-100"><div class="card-title-row"><h2>Pipeline</h2></div><div style="height:260px"><canvas id="pipeline" role="img" aria-label="Doughnut chart of applications by status"></canvas></div></div></div>
      </div>
      <div class="card-x flush section-gap">
        <div class="p-3 d-flex justify-content-between align-items-center"><h2 class="h6 mb-0">Recent applicants</h2><span class="tiny muted">Click a name to view the profile</span></div>
        <div class="table-wrap"><table class="table-x"><thead><tr><th>Student</th><th>Job</th><th>Match</th><th>Applied</th><th>Status</th><th></th></tr></thead><tbody>
          ${
            recent
              .map((a) => {
                const s = find.user(a.studentId);
                const j = find.job(a.jobId);
                return `<tr><td><a class="d-flex gap-2 align-items-center strong" href="#/talent/${s.id}" style="color:inherit">${ui.avatar(s, "sm")}${esc(s.name)}</a></td><td class="small-text">${esc(j.title)}</td><td>${ui.matchRing(SB.matchScore(j, s))}</td><td class="tabular">${fmt.shortDate(a.submitted)}</td><td>${ui.status(a.status)}</td><td class="text-end"><a class="btn btn-ghost btn-sm" href="#/employer/jobs/${j.id}">Review</a></td></tr>`;
              })
              .join("") ||
            `<tr><td colspan="6">${ui.empty("bi-inbox", "No applicants yet")}</td></tr>`
          }
        </tbody></table></div>
      </div>
      <div class="row g-3 section-gap">
        <div class="col-lg-6"><div class="card-x h-100"><div class="card-title-row"><h2>Active projects</h2><a class="small-text" href="#/projects">All</a></div>
          ${
            live
              .map((p) => {
                const done = p.milestones.filter((m) => m.done).length;
                return `<a class="d-block py-2" href="#/projects/${p.id}" style="color:inherit"><div class="d-flex justify-content-between"><span class="small-text fw-650">${esc(find.job(p.jobId).title)}</span>${ui.status(p.status)}</div><div class="tiny muted mb-1">${esc(find.user(p.studentId).name)} · due ${fmt.shortDate(p.due)}</div><div class="bar"><span style="width:${(done / p.milestones.length) * 100}%"></span></div></a>`;
              })
              .join("") || ui.empty("bi-kanban", "No active projects")
          }
        </div></div>
        <div class="col-lg-6"><div class="card-x h-100"><div class="card-title-row"><h2>Closing soon</h2></div>
          ${closing.map((j) => `<a class="d-flex justify-content-between align-items-center py-2" href="#/employer/jobs/${j.id}" style="color:inherit"><span><span class="small-text fw-650 d-block">${esc(j.title)}</span><span class="tiny muted">${appsFor(j.id).length} applicants · ${j.slots} openings</span></span><span class="status warn">${fmt.daysLeft(j.deadline)}d left</span></a>`).join("") || ui.empty("bi-calendar-check", "Nothing closing this week")}
        </div></div>
      </div>`,
        mount() {
          const listed = jobs.filter((j) => j.status !== "Draft");
          ui.chart($("#per-job"), {
            type: "bar",
            data: {
              labels: listed.map((j) =>
                j.title.length > 22 ? j.title.slice(0, 21) + "…" : j.title,
              ),
              datasets: [
                {
                  label: "Applicants",
                  data: listed.map((j) => appsFor(j.id).length),
                  backgroundColor: ui.accentColor(),
                  borderRadius: 4,
                  maxBarThickness: 36,
                },
              ],
            },
            options: { plugins: { legend: { display: false } } },
          });
          ui.chart($("#pipeline"), {
            type: "doughnut",
            data: {
              labels: pipeline,
              datasets: [
                {
                  data: pipeline.map((s) => apps.filter((a) => a.status === s).length),
                  backgroundColor: ui.seriesColors(),
                  borderColor: getComputedStyle(document.documentElement).getPropertyValue(
                    "--surface",
                  ),
                  borderWidth: 2,
                },
              ],
            },
            options: { cutout: "66%", plugins: { legend: { position: "right" } } },
          });
        },
      };
    },
    { auth: "employer", shell: "app" },
  );

  /* ================= My listings ================= */
  SB.route(
    "/employer/jobs",
    (params, query) => {
      const u = SB.me();
      const filter = query.status || "All";
      const jobs = myJobs(u).filter((j) => filter === "All" || j.status === filter);
      const counts = (s) => myJobs(u).filter((j) => s === "All" || j.status === s).length;
      return {
        title: "My job listings",
        html: `<div class="page-head"><div><h1>Job listings</h1><p>Manage listings, applicants and status.</p></div><a class="btn btn-accent" href="#/post-job"><i class="bi bi-plus-lg me-1"></i>Post a job</a></div>
        <div class="segmented mb-3">${["All", "Open", "Draft", "Closed"].map((s) => `<a href="#/employer/jobs?status=${s}" class="${filter === s ? "on" : ""}">${s}<span class="count">${counts(s)}</span></a>`).join("")}</div>
        <div class="card-x flush"><div class="table-wrap"><table class="table-x"><thead><tr><th>Listing</th><th>Dates</th><th>Applicants</th><th>Views</th><th>Status</th><th></th></tr></thead><tbody>
          ${
            jobs
              .map((j) => {
                const a = appsFor(j.id);
                const fresh = a.filter((x) => x.status === "Submitted").length;
                return `<tr>
              <td><div class="d-flex gap-3 align-items-center"><img src="${ui.img(j.image)}" alt="" style="width:52px;height:40px;object-fit:cover;border-radius:8px"><div><a class="strong" href="#/employer/jobs/${j.id}">${esc(j.title)}</a><div class="tiny muted">${esc(find.cat(j.cat).short)} · ${j.mode} · ${esc(j.city)}</div></div></div></td>
              <td class="small-text text-nowrap">${fmt.dateRange(j.start, j.end)}</td>
              <td class="tabular">${a.length}${fresh ? ` <span class="status info">${fresh} new</span>` : ""}</td>
              <td class="tabular">${j.views}</td>
              <td>${ui.status(j.status)}</td>
              <td class="text-end text-nowrap">
                <div class="dropdown d-inline-block"><button class="btn btn-ghost btn-sm" data-bs-toggle="dropdown" aria-label="Actions"><i class="bi bi-three-dots"></i></button>
                  <div class="dropdown-menu dropdown-menu-end">
                    <a class="dropdown-item" href="#/employer/jobs/${j.id}"><i class="bi bi-people"></i>Applicants</a>
                    <a class="dropdown-item" href="#/jobs/${j.id}"><i class="bi bi-eye"></i>View listing</a>
                    <a class="dropdown-item" href="#/post-job?edit=${j.id}"><i class="bi bi-pencil"></i>Edit</a>
                    ${j.status === "Open" ? `<button class="dropdown-item" data-status="${j.id}" data-to="Closed"><i class="bi bi-pause-circle"></i>Close listing</button>` : ""}
                    ${j.status === "Closed" || j.status === "Draft" ? `<button class="dropdown-item" data-status="${j.id}" data-to="Open"><i class="bi bi-play-circle"></i>${j.status === "Draft" ? "Publish" : "Reopen"}</button>` : ""}
                    ${j.status === "Draft" ? `<button class="dropdown-item text-bad" data-delete="${j.id}"><i class="bi bi-trash"></i>Delete draft</button>` : ""}
                  </div></div>
              </td></tr>`;
              })
              .join("") ||
            `<tr><td colspan="6">${ui.empty("bi-briefcase", "No listings here", "", `<a class="btn btn-accent btn-sm" href="#/post-job">Post a job</a>`)}</td></tr>`
          }
        </tbody></table></div></div>`,
        mount(page) {
          page.addEventListener("click", async (e) => {
            const st = e.target.closest("[data-status]");
            const del = e.target.closest("[data-delete]");
            if (st) {
              await api.patch(`/jobs/${st.dataset.status}`, { status: st.dataset.to });
              ui.toast(st.dataset.to === "Open" ? "Listing is live." : "Listing closed.");
              SB.render();
            }
            if (
              del &&
              (await ui.confirmBox("Delete this draft?", "This can't be undone.", "Delete", true))
            ) {
              await api.del(`/jobs/${del.dataset.delete}`);
              ui.toast("Draft deleted.", "info");
              SB.render();
            }
          });
        },
      };
    },
    { auth: "employer", shell: "app", nav: "/employer/jobs" },
  );

  /* ================= Applicants for one job ================= */
  SB.route(
    "/employer/jobs/:id",
    ([id], query) => {
      const u = SB.me();
      const job = find.job(id);
      if (!job || job.employerId !== u.id)
        throw new Error("This listing isn't yours or no longer exists.");
      const tab = query.tab || "All";
      const sort = query.sort || "match";
      let apps = appsFor(id).filter((a) => tab === "All" || a.status === tab);
      const score = (a) => SB.matchScore(job, find.user(a.studentId)).pct;
      apps.sort(
        sort === "rate"
          ? (a, b) => a.amount - b.amount
          : sort === "date"
            ? (a, b) => b.submitted.localeCompare(a.submitted)
            : (a, b) => score(b) - score(a),
      );
      const count = (s) => appsFor(id).filter((a) => s === "All" || a.status === s).length;
      const hired = appsFor(id).filter((a) => a.status === "Hired").length;

      return {
        title: "Applicants",
        html: `<a class="small-text" href="#/employer/jobs"><i class="bi bi-arrow-left"></i> All listings</a>
        <div class="page-head mt-2"><div><h1 class="h2">${esc(job.title)}</h1><p>${fmt.dateRange(job.start, job.end)} · ${esc(job.city)} · ${SB.payLabel(job)} ${SB.payUnit(job)} · ${ui.status(job.status)}</p></div>
          <div class="d-flex gap-2"><a class="btn btn-ghost" href="#/jobs/${job.id}">View listing</a><a class="btn btn-ghost" href="#/post-job?edit=${job.id}">Edit</a></div></div>
        <div class="card-x mb-3 d-flex flex-wrap gap-4 align-items-center"><div><div class="tiny muted">Openings filled</div><div class="fw-650 tabular">${hired} / ${job.slots}</div></div><div class="flex-fill" style="min-width:200px"><div class="bar"><span style="width:${Math.min(100, (hired / job.slots) * 100)}%"></span></div></div><div class="tiny muted">${appsFor(id).length} applicant${appsFor(id).length === 1 ? "" : "s"} in total</div></div>
        <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div class="segmented">${["All", "Submitted", "Shortlisted", "Interview", "Hired", "Rejected"].map((s) => `<a href="#/employer/jobs/${id}?tab=${s}&sort=${sort}" class="${tab === s ? "on" : ""}">${s}<span class="count">${count(s)}</span></a>`).join("")}</div>
          <select class="form-select form-select-sm" style="width:auto" id="sort" aria-label="Sort applicants"><option value="match">Best match</option><option value="date">Newest</option><option value="rate">Lowest rate</option></select>
        </div>
        <div class="d-grid gap-3">
          ${
            apps
              .map((a) => {
                const s = find.user(a.studentId);
                const m = SB.matchScore(job, s);
                const r = SB.rating(s.id);
                const free = job.days.filter((d) =>
                  (s.avail[d] || []).some((h) => h >= job.from && h < Math.min(job.to, 24)),
                );
                return `<div class="card-x">
              <div class="d-flex flex-wrap gap-3 align-items-start">
                ${ui.avatar(s, "lg")}
                <div style="flex:1 1 0;min-width:240px">
                  <div class="d-flex flex-wrap gap-2 align-items-center"><a class="fw-650" href="#/talent/${s.id}" style="color:var(--ink)">${esc(s.name)}</a>${ui.status(a.status)}${ui.matchRing(m)}</div>
                  <div class="tiny muted">${esc(s.course)} · ${esc(s.university)} · ${esc(s.city)}</div>
                  <div class="mt-1">${ui.stars(r.avg, r.count)}</div>
                  <p class="small-text mt-2 mb-2">“${esc(a.cover)}”</p>
                  <div class="d-flex flex-wrap gap-3 tiny muted"><span><i class="bi bi-cash me-1"></i>Proposes ${fmt.rm(a.amount)}${job.pay.type !== "Fixed" ? " " + SB.payUnit(job) : ""}</span><span><i class="bi bi-calendar-check me-1"></i>${job.days.length ? (free.length === job.days.length ? `<span class="text-ok">Free on all ${job.days.length} job day${job.days.length > 1 ? "s" : ""}</span>` : `Free on ${free.length} of ${job.days.length} job days`) : "Flexible schedule"}</span><span><i class="bi bi-clock me-1"></i>Applied ${fmt.date(a.submitted)}</span>${a.availability ? `<span><i class="bi bi-info-circle me-1"></i>${esc(a.availability)}</span>` : ""}</div>
                  <div class="mt-2">${ui.tags(s.skills.slice(0, 6))}</div>
                </div>
                <div class="d-flex flex-column gap-2" style="flex:0 0 170px">
                  ${a.status === "Submitted" ? `<button class="btn btn-ghost btn-sm" data-move="${a.id}" data-to="Shortlisted"><i class="bi bi-star me-1"></i>Shortlist</button>` : ""}
                  ${a.status === "Shortlisted" ? `<button class="btn btn-ghost btn-sm" data-move="${a.id}" data-to="Interview"><i class="bi bi-camera-video me-1"></i>Invite to interview</button>` : ""}
                  ${["Submitted", "Shortlisted", "Interview"].includes(a.status) ? `<button class="btn btn-accent btn-sm" data-move="${a.id}" data-to="Hired"><i class="bi bi-check2 me-1"></i>Hire</button><button class="btn btn-danger-soft btn-sm" data-reject="${a.id}">Decline</button>` : ""}
                  ${a.status === "Hired" ? `<a class="btn btn-accent btn-sm" href="#/projects/${db.projects.find((p) => p.applicationId === a.id)?.id}">Open project</a>` : ""}
                  <button class="btn btn-ghost btn-sm" data-chat="${s.id}"><i class="bi bi-chat me-1"></i>Message</button>
                </div>
              </div>
            </div>`;
              })
              .join("") ||
            `<div class="card-x">${ui.empty("bi-people", "No applicants in this stage", "Try another tab, or invite students from talent search.", `<a class="btn btn-accent btn-sm" href="#/talent">Find talent</a>`)}</div>`
          }
        </div>`,
        mount(page) {
          $("#sort").value = sort;
          $("#sort").addEventListener("change", (e) =>
            SB.go(`#/employer/jobs/${id}?tab=${tab}&sort=${e.target.value}`),
          );
          page.addEventListener("click", async (e) => {
            const mv = e.target.closest("[data-move]");
            const rj = e.target.closest("[data-reject]");
            const ch = e.target.closest("[data-chat]");
            if (ch) SB.startChat(ch.dataset.chat, job.id);
            if (mv) {
              const to = mv.dataset.to;
              if (
                to === "Hired" &&
                !(await ui.confirmBox(
                  "Hire this student?",
                  "A project space will be created with milestones from your listing, and the student will be notified.",
                  "Hire",
                ))
              )
                return;
              await ui.busy(mv, () =>
                api.patch(`/applications/${mv.dataset.move}`, { status: to }),
              );
              ui.toast(to === "Hired" ? "Hired! A project has been created." : `Moved to ${to}.`);
              SB.render();
            }
            if (rj) {
              const m = ui.modal({
                title: "Decline application",
                body: `<label class="form-label" for="rj-note">Optional note to the student</label><textarea class="form-control" id="rj-note" rows="3" placeholder="Thanks for applying. We chose someone free on all three days."></textarea><p class="tiny muted mt-2 mb-0">A short, kind reason helps students improve.</p>`,
                footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-danger-soft" id="rj-go">Decline</button>`,
              });
              $("#rj-go", m.el).addEventListener("click", async () => {
                await api.patch(`/applications/${rj.dataset.reject}`, {
                  status: "Rejected",
                  note: $("#rj-note", m.el).value.trim(),
                });
                m.close();
                ui.toast("Application declined.", "info");
                SB.render();
              });
            }
          });
        },
      };
    },
    { auth: "employer", shell: "app", nav: "/employer/jobs" },
  );

  /* ================= Post / edit a job ================= */
  SB.route(
    "/post-job",
    (params, query) => {
      const u = SB.me();
      const editing = query.edit ? find.job(query.edit) : null;
      if (editing && editing.employerId !== u.id)
        throw new Error("You can only edit your own listings.");
      const draft = editing
        ? structuredClone(editing)
        : {
            title: "",
            cat: "events",
            mode: "On-site",
            summary: "",
            responsibilities: [],
            skills: [],
            level: "Beginner",
            slots: 1,
            venue: "",
            city: u.city || "",
            state: "Selangor",
            start: "2026-12-12",
            end: "2026-12-12",
            days: ["Sat"],
            from: 9,
            to: 18,
            duration: "1 day",
            pay: { type: "Daily", rate: 120, units: 1 },
            payTerms: "Bank transfer within 7 working days.",
            overtime: "",
            logistics: [
              {
                icon: "bi-bus-front",
                label: "Transport",
                detail: "",
                cover: "Employer",
                amount: 0,
              },
              { icon: "bi-egg-fried", label: "Meals", detail: "", cover: "Employer", amount: 0 },
              {
                icon: "bi-house",
                label: "Accommodation",
                detail: "",
                cover: "Not needed",
                amount: 0,
              },
            ],
            equipment: { provided: [], bring: [] },
            studentCosts: [],
            physical: "",
            deliverables: [],
            software: [],
            revisions: "",
            scope: "",
            deadline: "2026-12-05",
            image: "event-crowd",
            status: "Open",
          };
      const STEPS = ["Basics", "Where & when", "Pay & costs", "Review"];
      const STATES = [
        "Johor",
        "Kedah",
        "Kelantan",
        "Melaka",
        "Negeri Sembilan",
        "Pahang",
        "Penang",
        "Perak",
        "Perlis",
        "Sabah",
        "Sarawak",
        "Selangor",
        "Terengganu",
        "W.P. Kuala Lumpur",
        "W.P. Putrajaya",
        "W.P. Labuan",
      ];
      const PHOTOS = [
        "event-crowd",
        "stage-lights",
        "edison-bulbs",
        "sparklers",
        "camera-lens",
        "camera-vintage",
        "latte",
        "coffee-hands",
        "market-basket",
        "open-road",
        "light-trails",
        "laptop-glow",
        "keyboard-backlit",
        "desk-creative",
        "desk-notebook",
        "flatlay-letter",
        "typewriter",
        "city-night",
      ];
      let step = 0;

      return {
        title: editing ? "Edit listing" : "Post a job",
        html: `${query.welcome ? `<div class="demo-note mb-3"><i class="bi bi-stars"></i><span><b>Welcome!</b> Post your first job. The more complete it is, the better students can decide.</span></div>` : ""}
        <div class="page-head"><div><h1>${editing ? "Edit listing" : "Post a job"}</h1><p>Students see everything you enter here before they apply.</p></div></div>
        <div class="row g-4">
          <div class="col-xl-8"><div class="card-x p-4"><div class="stepper" id="steps"></div><form id="job-form" novalidate></form></div></div>
          <div class="col-xl-4"><div style="position:sticky;top:calc(var(--nav-h) + 20px)"><div class="tiny muted mb-2 fw-650">LIVE PREVIEW</div><div id="preview"></div><div class="card-x mt-3" id="preview-calc"></div></div></div>
        </div>`,
        mount() {
          const form = $("#job-form");
          const isDigital = () => find.cat(draft.cat).group === "academic";
          let icons = {},
            drawLogs = () => {},
            drawCosts = () => {};
          const lines = (arr) => (arr || []).join("\n");
          const fromLines = (v) =>
            v
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);

          function preview() {
            const job = {
              ...draft,
              id: "preview",
              employerId: u.id,
              title: draft.title || "Your job title",
              posted: SB.todayISO(),
              views: 0,
            };
            $("#preview").innerHTML = ui
              .jobCard(job, null)
              .replace(/href="#\/jobs\/preview"/, 'href="javascript:void(0)"');
            const e = SB.estimate(job);
            $("#preview-calc").innerHTML =
              `<div class="fw-650 small-text mb-2">What students will see</div><div class="cost-line"><span>Base pay</span><span class="tabular">${fmt.rm(e.base)}</span></div><div class="cost-line"><span>Cash allowances</span><span class="pos tabular">+ ${fmt.rm(e.allowances)}</span></div><div class="cost-line"><span>Student's own costs</span><span class="neg tabular">− ${fmt.rm(e.costs)}</span></div><div class="cost-line total"><span>Take-home</span><span class="tabular">${fmt.rm(e.net)}</span></div>`;
          }

          function draw() {
            $("#steps").innerHTML = STEPS.map(
              (s, i) =>
                `<div class="step ${i < step ? "done" : i === step ? "on" : ""}">${i + 1}. ${s}</div>`,
            ).join("");
            const opt = (list, v) =>
              list
                .map((x) =>
                  Array.isArray(x)
                    ? `<option value="${x[0]}" ${x[0] === v ? "selected" : ""}>${x[1]}</option>`
                    : `<option ${x === v ? "selected" : ""}>${x}</option>`,
                )
                .join("");
            if (step === 0) {
              form.innerHTML = `<div class="row g-3">
              <div class="col-12"><label class="form-label" for="j-title">Job title</label><input class="form-control" id="j-title" name="title" value="${esc(draft.title)}" maxlength="80" placeholder="e.g. Event crew for a product launch"></div>
              <div class="col-md-6"><label class="form-label" for="j-cat">Category</label><select class="form-select" id="j-cat" name="cat">${[
                "academic",
                "physical",
              ]
                .map(
                  (g) =>
                    `<optgroup label="${g === "academic" ? "Digital & academic" : "On-site & physical"}">${db.categories
                      .filter((c) => c.group === g)
                      .map(
                        (c) =>
                          `<option value="${c.id}" ${c.id === draft.cat ? "selected" : ""}>${esc(c.name)}</option>`,
                      )
                      .join("")}</optgroup>`,
                )
                .join("")}</select></div>
              <div class="col-md-3"><label class="form-label" for="j-mode">Arrangement</label><select class="form-select" id="j-mode" name="mode">${opt(["On-site", "Hybrid", "Remote"], draft.mode)}</select></div>
              <div class="col-md-3"><label class="form-label" for="j-slots">Students needed</label><input class="form-control" type="number" min="1" max="200" id="j-slots" name="slots" value="${draft.slots}"></div>
              <div class="col-12"><label class="form-label" for="j-summary">Summary</label><textarea class="form-control" id="j-summary" name="summary" rows="3" placeholder="Two or three sentences on what the job is and why it matters.">${esc(draft.summary)}</textarea></div>
              <div class="col-md-7"><label class="form-label" for="j-resp">Responsibilities <span class="muted fw-normal">(one per line)</span></label><textarea class="form-control" id="j-resp" name="responsibilities" rows="4">${esc(lines(draft.responsibilities))}</textarea></div>
              <div class="col-md-5"><label class="form-label" for="j-skills">Skills <span class="muted fw-normal">(comma separated)</span></label><textarea class="form-control" id="j-skills" name="skills" rows="2">${esc(draft.skills.join(", "))}</textarea><label class="form-label mt-2" for="j-level">Learning level</label><select class="form-select" id="j-level" name="level">${opt(["Beginner", "Intermediate", "Advanced"], draft.level)}</select></div>
              <div class="col-12"><div class="form-label">Cover photo</div><div class="d-flex flex-wrap gap-2" id="photo-pick">${PHOTOS.map((p) => `<button type="button" class="p-0 border-0 rounded-3 overflow-hidden" data-photo="${p}" style="width:76px;height:52px;outline:${draft.image === p ? "3px solid var(--accent)" : "none"};outline-offset:2px"><img src="${ui.photo(p)}" alt="${p.replace(/-/g, " ")}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></button>`).join("")}</div></div>
            </div>`;
              $$("#photo-pick [data-photo]").forEach((b) =>
                b.addEventListener("click", () => {
                  draft.image = b.dataset.photo;
                  $$("#photo-pick [data-photo]").forEach(
                    (x) => (x.style.outline = x === b ? "3px solid var(--accent)" : "none"),
                  );
                  preview();
                }),
              );
            } else if (step === 1) {
              form.innerHTML = `<div class="row g-3">
              <div class="col-md-12"><label class="form-label" for="j-venue">Venue / work location</label><input class="form-control" id="j-venue" name="venue" value="${esc(draft.venue)}" placeholder="${draft.mode === "Remote" ? "Remote" : "e.g. Convention centre, Seksyen 13"}"></div>
              <div class="col-md-6"><label class="form-label" for="j-city">City</label><input class="form-control" id="j-city" name="city" value="${esc(draft.city)}"></div>
              <div class="col-md-6"><label class="form-label" for="j-state">State</label><select class="form-select" id="j-state" name="state">${opt(STATES, draft.state)}</select></div>
              <div class="col-md-4"><label class="form-label" for="j-start">Start date</label><input class="form-control" type="date" id="j-start" name="start" value="${draft.start}" min="${SB.todayISO()}"></div>
              <div class="col-md-4"><label class="form-label" for="j-end">End date</label><input class="form-control" type="date" id="j-end" name="end" value="${draft.end}" min="${SB.todayISO()}"></div>
              <div class="col-md-4"><label class="form-label" for="j-deadline">Apply by</label><input class="form-control" type="date" id="j-deadline" name="deadline" value="${draft.deadline}" min="${SB.todayISO()}"></div>
              <div class="col-12"><div class="form-label">Working days <span class="muted fw-normal">(leave empty for flexible/remote)</span></div><div class="d-flex flex-wrap gap-2">${SB.DAYS.map((d) => `<label class="chip ${draft.days.includes(d) ? "on" : ""}"><input type="checkbox" class="d-none" name="days" value="${d}" ${draft.days.includes(d) ? "checked" : ""}>${d}</label>`).join("")}</div></div>
              <div class="col-md-4"><label class="form-label" for="j-from">From</label><select class="form-select" id="j-from" name="from">${Array.from(
                { length: 18 },
                (_, i) => i + 6,
              )
                .map(
                  (h) =>
                    `<option value="${h}" ${h === draft.from ? "selected" : ""}>${fmt.hour(h)}</option>`,
                )
                .join("")}</select></div>
              <div class="col-md-4"><label class="form-label" for="j-to">To</label><select class="form-select" id="j-to" name="to">${Array.from(
                { length: 22 },
                (_, i) => i + 8,
              )
                .map(
                  (h) =>
                    `<option value="${h}" ${h === draft.to ? "selected" : ""}>${fmt.hour(h)}${h > 24 ? " (next day)" : ""}</option>`,
                )
                .join("")}</select></div>
              <div class="col-md-4"><label class="form-label" for="j-duration">Duration label</label><input class="form-control" id="j-duration" name="duration" value="${esc(draft.duration)}" placeholder="e.g. 2 days (10-hour shifts)"></div>
              <div class="col-12"><label class="form-label" for="j-physical">Physical requirements <span class="muted fw-normal">(optional)</span></label><input class="form-control" id="j-physical" name="physical" value="${esc(draft.physical || "")}" placeholder="e.g. Lifting up to 20 kg in pairs, standing for long hours"></div>
            </div>`;
              $$("label.chip input", form).forEach((i) =>
                i.addEventListener("change", () =>
                  i.parentElement.classList.toggle("on", i.checked),
                ),
              );
            } else if (step === 2) {
              const p = draft.pay;
              form.innerHTML = `<div class="row g-3">
              <div class="col-md-4"><label class="form-label" for="j-paytype">Pay type</label><select class="form-select" id="j-paytype" name="paytype">${opt(["Hourly", "Daily", "Monthly", "Fixed"], p.type)}</select></div>
              <div class="col-md-8" id="pay-fields"></div>
              <div class="col-md-6"><label class="form-label" for="j-terms">Payment terms</label><input class="form-control" id="j-terms" name="payTerms" value="${esc(draft.payTerms)}"></div>
              <div class="col-md-6"><label class="form-label" for="j-ot">Overtime</label><input class="form-control" id="j-ot" name="overtime" value="${esc(draft.overtime)}" placeholder="e.g. RM 20 per hour after 7 pm"></div>
              <div class="col-12"><div class="d-flex justify-content-between align-items-center"><div class="form-label mb-0">Logistics & allowances</div><button type="button" class="btn btn-ghost btn-sm" id="add-log"><i class="bi bi-plus-lg"></i> Add item</button></div>
                <div class="tiny muted mb-2">Say who covers each item. Cash allowances are added to the student's take-home estimate.</div>
                <div id="log-rows"></div></div>
              <div class="col-md-6"><label class="form-label" for="j-prov">Equipment you provide <span class="muted fw-normal">(one per line)</span></label><textarea class="form-control" id="j-prov" name="provided" rows="3">${esc(lines(draft.equipment.provided))}</textarea></div>
              <div class="col-md-6"><label class="form-label" for="j-bring">Students should bring <span class="muted fw-normal">(one per line)</span></label><textarea class="form-control" id="j-bring" name="bring" rows="3">${esc(lines(draft.equipment.bring))}</textarea></div>
              <div class="col-12"><div class="d-flex justify-content-between align-items-center"><div class="form-label mb-0">Costs students pay themselves</div><button type="button" class="btn btn-ghost btn-sm" id="add-cost"><i class="bi bi-plus-lg"></i> Add cost</button></div><div class="tiny muted mb-2">Be honest: early-morning Grab rides, safety boots, parking. It builds trust.</div><div id="cost-rows"></div></div>
              <div class="col-12 ${isDigital() ? "" : "d-none"}"><hr class="divider"><div class="fw-650 small-text mb-2">Digital project details</div><div class="row g-3">
                <div class="col-md-6"><label class="form-label" for="j-deliv">Deliverables <span class="muted fw-normal">(one per line)</span></label><textarea class="form-control" id="j-deliv" name="deliverables" rows="3">${esc(lines(draft.deliverables))}</textarea></div>
                <div class="col-md-6"><label class="form-label" for="j-soft">Software <span class="muted fw-normal">(comma separated)</span></label><input class="form-control" id="j-soft" name="software" value="${esc((draft.software || []).join(", "))}"><label class="form-label mt-2" for="j-rev">Revisions</label><input class="form-control" id="j-rev" name="revisions" value="${esc(draft.revisions || "")}" placeholder="e.g. 2 rounds included"></div>
                <div class="col-12"><label class="form-label" for="j-scope">Scope</label><input class="form-control" id="j-scope" name="scope" value="${esc(draft.scope || "")}" placeholder="e.g. One page, 6 sections, mobile-first"></div>
              </div></div>
            </div>`;
              const drawPay = () => {
                const t = $("#j-paytype").value;
                $("#pay-fields").innerHTML =
                  t === "Fixed"
                    ? `<div class="row g-3"><div class="col-6"><label class="form-label" for="j-min">Budget from (RM)</label><input class="form-control" type="number" min="1" id="j-min" name="min" value="${p.min || 300}"></div><div class="col-6"><label class="form-label" for="j-max">Budget to (RM)</label><input class="form-control" type="number" min="1" id="j-max" name="max" value="${p.max || p.min || 500}"></div></div>`
                    : `<div class="row g-3"><div class="col-6"><label class="form-label" for="j-rate">Rate (RM ${t === "Hourly" ? "per hour" : t === "Daily" ? "per day" : "per month"})</label><input class="form-control" type="number" min="1" id="j-rate" name="rate" value="${p.rate || 100}"></div><div class="col-6"><label class="form-label" for="j-units">Number of ${t === "Hourly" ? "hours" : t === "Daily" ? "days" : "months"}</label><input class="form-control" type="number" min="1" id="j-units" name="units" value="${p.units || 1}"></div></div>`;
              };
              drawPay();
              $("#j-paytype").addEventListener("change", () => {
                draft.pay = { type: $("#j-paytype").value };
                drawPay();
                collect();
              });
              icons = {
                Transport: "bi-bus-front",
                Travel: "bi-bus-front",
                Meals: "bi-egg-fried",
                Accommodation: "bi-house",
                "Safety gear": "bi-shield-check",
                Uniform: "bi-person-badge",
                Equipment: "bi-tools",
                Parking: "bi-p-circle",
              };
              drawLogs = () => {
                $("#log-rows").innerHTML =
                  draft.logistics
                    .map(
                      (l, i) => `<div class="row g-2 mb-2 align-items-center" data-log="${i}">
                <div class="col-md-3"><input class="form-control form-control-sm" data-k="label" value="${esc(l.label)}" placeholder="Item" list="log-names" aria-label="Item"></div>
                <div class="col-md-3"><input class="form-control form-control-sm" data-k="detail" value="${esc(l.detail)}" placeholder="Details" aria-label="Details"></div>
                <div class="col-md-3"><select class="form-select form-select-sm" data-k="cover" aria-label="Covered by">${opt(
                  [
                    ["Employer", "We cover"],
                    ["Student", "Student"],
                    ["Not needed", "Not needed"],
                  ],
                  l.cover,
                )}</select></div>
                <div class="col-md-2"><input class="form-control form-control-sm" type="number" min="0" data-k="amount" value="${l.amount || ""}" placeholder="RM cash" aria-label="Cash allowance (RM)"></div>
                <div class="col-md-1 text-end"><button type="button" class="icon-btn" data-rm-log="${i}" aria-label="Remove"><i class="bi bi-x"></i></button></div></div>`,
                    )
                    .join("") +
                  `<datalist id="log-names">${Object.keys(icons)
                    .map((k) => `<option>${k}</option>`)
                    .join("")}</datalist>`;
              };
              drawCosts = () => {
                $("#cost-rows").innerHTML =
                  draft.studentCosts
                    .map(
                      (c, i) =>
                        `<div class="row g-2 mb-2" data-cost="${i}"><div class="col-8"><input class="form-control form-control-sm" data-k="label" value="${esc(c.label)}" placeholder="e.g. Grab to the venue at 6 am" aria-label="Cost"></div><div class="col-3"><input class="form-control form-control-sm" type="number" min="0" data-k="amount" value="${c.amount}" aria-label="Amount (RM)"></div><div class="col-1 text-end"><button type="button" class="icon-btn" data-rm-cost="${i}" aria-label="Remove"><i class="bi bi-x"></i></button></div></div>`,
                    )
                    .join("") || `<p class="tiny muted mb-0">No student costs listed.</p>`;
              };
              drawLogs();
              drawCosts();
              $("#add-log").addEventListener("click", () => {
                draft.logistics.push({
                  icon: "bi-check2-square",
                  label: "",
                  detail: "",
                  cover: "Employer",
                  amount: 0,
                });
                drawLogs();
              });
              $("#add-cost").addEventListener("click", () => {
                draft.studentCosts.push({ label: "", amount: 0 });
                drawCosts();
              });
            } else {
              const e = SB.estimate(draft);
              const ok = (b) =>
                `<i class="bi ${b ? "bi-check-circle-fill text-ok" : "bi-exclamation-circle text-warn"}"></i>`;
              const checks = [
                [draft.summary.length >= 40, "Clear summary"],
                [draft.responsibilities.length >= 2, "At least two responsibilities"],
                [draft.logistics.length > 0 || draft.mode === "Remote", "Logistics listed"],
                [!!draft.payTerms, "Payment terms stated"],
                [draft.mode === "Remote" || !!draft.venue, "Venue given"],
                [
                  find.cat(draft.cat).group === "academic"
                    ? (draft.deliverables || []).length > 0
                    : true,
                  "Deliverables (digital work)",
                ],
              ];
              form.innerHTML = `<h2 class="h5">Ready to publish?</h2>
              <div class="row g-3 mt-1">
                <div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2">Listing quality</div>${checks.map(([b, l]) => `<div class="small-text py-1">${ok(b)} ${l}</div>`).join("")}</div></div>
                <div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2">Summary</div><div class="small-text"><b>${esc(draft.title)}</b><br>${esc(find.cat(draft.cat).name)} · ${draft.mode}<br>${fmt.dateRange(draft.start, draft.end)}${draft.days.length ? `, ${draft.days.join("/")} ${fmt.hours(draft.from, draft.to)}` : ""}<br>${esc(draft.venue || "–")}, ${esc(draft.city)}<br>${SB.payLabel(draft)} ${SB.payUnit(draft)} · ${draft.slots} opening${draft.slots > 1 ? "s" : ""}<br>Take-home ≈ <b>${fmt.rm(e.net)}</b></div></div></div>
              </div>
              <div class="demo-note mt-3"><i class="bi bi-shield-check"></i><span>By publishing you confirm the pay and costs are accurate and that students won't be asked to pay any fee.</span></div>`;
            }
            form.insertAdjacentHTML(
              "beforeend",
              `<div class="d-flex flex-wrap gap-2 mt-4 pt-3 border-top" style="border-color:var(--line)!important">
            ${step > 0 ? `<button type="button" class="btn btn-ghost" data-nav="-1"><i class="bi bi-arrow-left"></i> Back</button>` : ""}
            <span class="flex-fill"></span>
            <button type="button" class="btn btn-ghost" data-submit="Draft" data-busy="Saving…">Save draft</button>
            ${step < 3 ? `<button type="button" class="btn btn-accent" data-nav="1">Continue <i class="bi bi-arrow-right"></i></button>` : `<button type="button" class="btn btn-accent" data-submit="Open" data-busy="Publishing…">${editing && editing.status === "Open" ? "Save changes" : "Publish job"}</button>`}
          </div>`,
            );
            preview();
            form.querySelector("input,select,textarea")?.focus({ preventScroll: true });
          }

          // Read the current step's fields into the draft object.
          function collect() {
            const f = form.elements;
            const val = (n) => (f[n] ? f[n].value.trim() : undefined);
            if (step === 0) {
              Object.assign(draft, {
                title: val("title"),
                cat: val("cat"),
                mode: val("mode"),
                slots: Number(val("slots")) || 1,
                summary: val("summary"),
                responsibilities: fromLines(val("responsibilities")),
                skills: val("skills")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                level: val("level"),
              });
            } else if (step === 1) {
              Object.assign(draft, {
                venue: val("venue") || (draft.mode === "Remote" ? "Remote" : ""),
                city: val("city"),
                state: val("state"),
                start: val("start"),
                end: val("end"),
                deadline: val("deadline"),
                days: $$("input[name=days]:checked", form).map((i) => i.value),
                from: Number(val("from")),
                to: Number(val("to")),
                duration: val("duration"),
                physical: val("physical"),
              });
            } else if (step === 2) {
              const type = val("paytype");
              draft.pay =
                type === "Fixed"
                  ? { type, min: Number(val("min")), max: Number(val("max")) }
                  : { type, rate: Number(val("rate")), units: Number(val("units")) || 1 };
              Object.assign(draft, {
                payTerms: val("payTerms"),
                overtime: val("overtime"),
                equipment: { provided: fromLines(val("provided")), bring: fromLines(val("bring")) },
                deliverables: fromLines(val("deliverables") || ""),
                software: (val("software") || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                revisions: val("revisions"),
                scope: val("scope"),
              });
            }
          }

          function prune() {
            draft.logistics = draft.logistics.filter((l) => l.label);
            draft.studentCosts = draft.studentCosts.filter((c) => c.label);
          }

          function check() {
            const f = form;
            if (step === 0)
              return ui.validate(f, {
                title: ui.minLen("Title", 8),
                summary: ui.minLen("Summary", 40),
                responsibilities: (v) =>
                  fromLines(v).length >= 2 ? "" : "List at least two responsibilities.",
                skills: (v) =>
                  v.split(",").filter((s) => s.trim()).length ? "" : "Add at least one skill.",
                slots: (v) => (Number(v) >= 1 ? "" : "At least one student."),
              });
            if (step === 1)
              return ui.validate(f, {
                venue: (v) =>
                  draft.mode !== "Remote" && !v ? "Tell students where the work happens." : "",
                city: ui.required("City"),
                end: (v) =>
                  v < f.elements.start.value ? "End date can't be before the start date." : "",
                deadline: (v) =>
                  v > f.elements.start.value
                    ? "Applications should close before the job starts."
                    : "",
                to: (v) =>
                  Number(v) <= Number(f.elements.from.value)
                    ? "End time must be after the start time."
                    : "",
                duration: ui.required("Duration"),
              });
            if (step === 2) {
              const t = f.elements.paytype.value;
              return ui.validate(
                f,
                t === "Fixed"
                  ? {
                      min: (v) => (Number(v) > 0 ? "" : "Enter a budget."),
                      max: (v) =>
                        Number(v) >= Number(f.elements.min.value)
                          ? ""
                          : "Maximum must be at least the minimum.",
                      payTerms: ui.required("Payment terms"),
                    }
                  : {
                      rate: (v) => (Number(v) > 0 ? "" : "Enter a rate."),
                      units: (v) => (Number(v) > 0 ? "" : "Enter a number."),
                      payTerms: ui.required("Payment terms"),
                    },
              );
            }
            return true;
          }

          form.addEventListener("input", (e) => {
            const row = e.target.closest("[data-log],[data-cost]");
            if (!row) return;
            const k = e.target.dataset.k;
            const v = k === "amount" ? Number(e.target.value) || 0 : e.target.value;
            if (row.dataset.log) {
              const item = draft.logistics[row.dataset.log];
              item[k] = v;
              if (k === "label") item.icon = icons[v] || "bi-check2-square";
            } else draft.studentCosts[row.dataset.cost][k] = v;
            preview();
          });
          form.addEventListener("click", (e) => {
            const rl = e.target.closest("[data-rm-log]");
            const rc = e.target.closest("[data-rm-cost]");
            if (rl) (draft.logistics.splice(rl.dataset.rmLog, 1), drawLogs(), preview());
            if (rc) (draft.studentCosts.splice(rc.dataset.rmCost, 1), drawCosts(), preview());
          });
          form.addEventListener("input", () => {
            if (step < 3) {
              collect();
              preview();
            }
          });
          form.addEventListener("click", async (e) => {
            const nav = e.target.closest("[data-nav]");
            const save = e.target.closest("[data-submit]");
            if (nav) {
              const dir = Number(nav.dataset.nav);
              if (dir > 0 && !check()) return;
              collect();
              if (step === 2) prune();
              step += dir;
              draw();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
            if (save) {
              if (step < 3) {
                if (save.dataset.submit === "Open" && !check()) return;
                collect();
              }
              if (!draft.title || draft.title.length < 3)
                return ui.toast("Add a title before saving.", "bad");
              prune();
              const status = save.dataset.submit;
              const body = { ...draft, status };
              delete body.id;
              const job = await ui.busy(save, () =>
                editing ? api.patch(`/jobs/${editing.id}`, body) : api.post("/jobs", body),
              );
              ui.toast(
                status === "Draft"
                  ? "Draft saved."
                  : editing
                    ? "Listing updated."
                    : "Your job is live!",
              );
              SB.go(status === "Draft" ? "#/employer/jobs?status=Draft" : `#/jobs/${job.id}`);
            }
          });

          draw();
        },
      };
    },
    { auth: "employer", shell: "app" },
  );

  /* ================= Talent search ================= */
  SB.route(
    "/talent",
    (params, query) => {
      const u = SB.me();
      const tab = query.tab || "all";
      const shortlist = db.shortlist[u.id] || [];
      const html = `<div class="page-head"><div><h1>Find talent</h1><p>Search students by skill, programme and the exact hours you need them. Availability is self-reported by students.</p></div>
        <div class="segmented"><a href="#/talent" class="${tab === "all" ? "on" : ""}">All students</a><a href="#/talent?tab=shortlist" class="${tab === "shortlist" ? "on" : ""}">Shortlist<span class="count">${shortlist.length}</span></a></div></div>
      <form class="card-x mb-3" id="talent-filters" ${tab === "shortlist" ? 'style="display:none"' : ""}>
        <div class="row g-2 align-items-end">
          <div class="col-lg-4"><label class="form-label" for="t-q">Keyword</label><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="t-q" name="q" placeholder="Skill or name, e.g. LED, Figma" value="${esc(query.q || "")}"></div></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-cat">Interest</label><select class="form-select" id="t-cat" name="cat"><option value="">Any</option>${db.categories.map((c) => `<option value="${c.id}">${esc(c.short)}</option>`).join("")}</select></div>
          <div class="col-6 col-lg-3"><label class="form-label" for="t-course">Programme</label><select class="form-select" id="t-course" name="course"><option value="">Any</option>${Object.keys(
            db.courses,
          )
            .map((c) => `<option>${c}</option>`)
            .join("")}</select></div>
          <div class="col-6 col-lg-3"><label class="form-label" for="t-uni">University</label><select class="form-select" id="t-uni" name="uni"><option value="">Any</option>${db.universities.map((x) => `<option>${x}</option>`).join("")}</select></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-day">Free on</label><select class="form-select" id="t-day" name="day"><option value="">Any day</option>${SB.DAYS.map((d) => `<option>${d}</option>`).join("")}</select></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-from">From</label><select class="form-select" id="t-from" name="from">${Array.from(
            { length: 16 },
            (_, i) => i + 7,
          )
            .map((h) => `<option value="${h}" ${h === 9 ? "selected" : ""}>${fmt.hour(h)}</option>`)
            .join("")}</select></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-to">To</label><select class="form-select" id="t-to" name="to">${Array.from(
            { length: 16 },
            (_, i) => i + 8,
          )
            .map(
              (h) => `<option value="${h}" ${h === 17 ? "selected" : ""}>${fmt.hour(h)}</option>`,
            )
            .join("")}</select></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-mode">Arrangement</label><select class="form-select" id="t-mode" name="mode"><option value="">Any</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select></div>
          <div class="col-6 col-lg-2"><label class="form-label" for="t-rating">Min rating</label><select class="form-select" id="t-rating" name="rating"><option value="0">Any</option><option value="4">4★ and up</option><option value="4.5">4.5★ and up</option></select></div>
          <div class="col-6 col-lg-2"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" role="switch" id="t-avail" name="available" checked><label class="form-check-label small-text" for="t-avail">Available only</label></div></div>
        </div>
      </form>
      <div class="result-bar"><span class="small-text muted" id="t-count"></span><select class="form-select form-select-sm" id="t-sort" style="width:auto" aria-label="Sort"><option value="rating">Top rated</option><option value="hours">Most free hours</option><option value="rate">Lowest rate</option><option value="projects">Most completed work</option></select></div>
      <div class="row g-3" id="t-results"></div>`;

      return {
        title: "Find talent",
        html,
        mount(page) {
          const form = $("#talent-filters");
          const run = () => {
            const f = Object.fromEntries(new FormData(form));
            const from = Number(f.from);
            const to = Number(f.to);
            const term = (f.q || "").toLowerCase();
            let list = db.users.filter((s) => s.role === "student");
            if (tab === "shortlist")
              list = list.filter((s) => (db.shortlist[u.id] || []).includes(s.id));
            else {
              list = list.filter(
                (s) =>
                  (!term ||
                    [s.name, s.headline, ...s.skills].join(" ").toLowerCase().includes(term)) &&
                  (!f.cat ||
                    s.interests.includes(f.cat) ||
                    (db.courses[s.course] || []).includes(f.cat)) &&
                  (!f.course || s.course === f.course) &&
                  (!f.uni || s.university === f.uni) &&
                  (!f.mode || s.mode === "Any" || s.mode === f.mode) &&
                  SB.rating(s.id).avg >= Number(f.rating || 0) &&
                  (!f.available || s.status === "Available") &&
                  (!f.day || (s.avail[f.day] || []).some((h) => h >= from && h < to)),
              );
            }
            const hours = (s) => Object.values(s.avail).reduce((n, h) => n + h.length, 0);
            const sort = $("#t-sort").value;
            list.sort(
              {
                rating: (a, b) => SB.rating(b.id).avg - SB.rating(a.id).avg,
                hours: (a, b) => hours(b) - hours(a),
                rate: (a, b) => a.rate - b.rate,
                projects: (a, b) => SB.growth(b.id).done.length - SB.growth(a.id).done.length,
              }[sort],
            );
            $("#t-count").textContent =
              `${list.length} student${list.length === 1 ? "" : "s"}${f.day && tab !== "shortlist" ? ` free on ${f.day} between ${fmt.hour(from)} and ${fmt.hour(to)}` : ""}`;
            $("#t-results").innerHTML =
              list.map((s) => talentCard(s, u, f.day)).join("") ||
              `<div class="col-12"><div class="card-x">${ui.empty("bi-people", tab === "shortlist" ? "Your shortlist is empty" : "No students match", tab === "shortlist" ? "Tap the heart on a student to save them here." : "Try a wider time range, another day or fewer filters.")}</div></div>`;
          };
          form.addEventListener("input", run);
          form.addEventListener("submit", (e) => e.preventDefault());
          $("#t-sort").addEventListener("change", run);
          page.addEventListener("click", (e) => {
            const sl = e.target.closest("[data-shortlist]");
            const ch = e.target.closest("[data-chat]");
            const inv = e.target.closest("[data-invite]");
            if (sl) toggleShortlist(sl.dataset.shortlist).then(run);
            if (ch) SB.startChat(ch.dataset.chat);
            if (inv) inviteModal(find.user(inv.dataset.invite));
          });
          run();
        },
      };
    },
    { auth: "employer", shell: "app" },
  );

  function talentCard(s, employer, day) {
    const r = SB.rating(s.id);
    const listed = (db.shortlist[employer.id] || []).includes(s.id);
    const hours = Object.values(s.avail).reduce((n, h) => n + h.length, 0);
    return `<div class="col-md-6 col-xxl-4"><div class="card-x h-100 d-flex flex-column">
      <div class="d-flex gap-3">
        ${ui.avatar(s, "lg")}
        <div class="flex-fill" style="min-width:0"><a class="fw-650 d-block" href="#/talent/${s.id}" style="color:var(--ink)">${esc(s.name)}</a><div class="tiny muted text-truncate">${esc(s.course)} · ${esc(s.university)}</div><div class="mt-1">${ui.stars(r.avg, r.count)}</div></div>
        <button class="icon-btn" data-shortlist="${s.id}" aria-label="${listed ? "Remove from" : "Add to"} shortlist" title="Shortlist"><i class="bi ${listed ? "bi-heart-fill text-accent" : "bi-heart"}"></i></button>
      </div>
      <p class="small-text mt-3 mb-2">${esc(s.headline)}</p>
      <div>${ui.tags(s.skills.slice(0, 5))}</div>
      ${
        s.portfolio.length
          ? `<div class="d-flex gap-2 mt-2">${s.portfolio
              .slice(0, 3)
              .map(
                (p) =>
                  `<img src="${p.img.startsWith("data:") ? p.img : ui.img(p.img)}" alt="${esc(p.title)}" style="width:33%;aspect-ratio:4/3;object-fit:cover;border-radius:10px" loading="lazy">`,
              )
              .join("")}</div>`
          : ""
      }
      <div class="week mt-3">${SB.DAYS.map((d) => `<div class="${s.avail[d] ? "free" : ""}" title="${s.avail[d] ? `${fmt.hour(s.avail[d][0])}–${fmt.hour(s.avail[d].at(-1) + 1)}` : "Not free"}" style="${day === d ? "outline:2px solid var(--ink);outline-offset:1px" : ""}">${d}</div>`).join("")}</div>
      <div class="d-flex justify-content-between tiny muted mt-2"><span>${hours} free hrs / week · ${esc(s.city)}</span><span>${ui.status(s.status)}</span></div>
      <div class="d-flex gap-2 mt-3 pt-1" style="margin-top:auto!important"><a class="btn btn-ghost btn-sm flex-fill" href="#/talent/${s.id}">Profile</a><button class="btn btn-ghost btn-sm flex-fill" data-chat="${s.id}">Message</button><button class="btn btn-accent btn-sm flex-fill" data-invite="${s.id}">Invite</button></div>
    </div></div>`;
  }

  async function toggleShortlist(studentId) {
    const { saved } = await api.post("/shortlist", { studentId });
    ui.toast(saved ? "Added to your shortlist." : "Removed from shortlist.", saved ? "ok" : "info");
    SB.refreshNav();
    return saved;
  }

  function inviteModal(s) {
    const u = SB.me();
    const jobs = myJobs(u).filter((j) => j.status === "Open");
    if (!jobs.length) return ui.toast("Publish a job first, then invite students to it.", "info");
    const m = ui.modal({
      title: `Invite ${esc(s.name.split(" ")[0])} to apply`,
      body: `<label class="form-label" for="inv-job">Job</label><select class="form-select mb-3" id="inv-job">${jobs.map((j) => `<option value="${j.id}">${esc(j.title)}</option>`).join("")}</select>
        <label class="form-label" for="inv-msg">Message</label><textarea class="form-control" id="inv-msg" rows="4">Hi ${esc(s.name.split(" ")[0])}, we think you'd be a great fit for this role. Have a look at the listing and apply if you're interested!</textarea>`,
      footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-accent" id="inv-send" data-busy="Sending…">Send invite</button>`,
    });
    $("#inv-send", m.el).addEventListener("click", async (e) => {
      const job = find.job($("#inv-job", m.el).value);
      const text = `${$("#inv-msg", m.el).value.trim()}\n\nJob: ${job.title}`;
      await ui.busy(e.currentTarget, () =>
        api.post("/messages", { to: s.id, text, jobId: job.id }),
      );
      SB.notify(
        s.id,
        "bi-envelope-open",
        `${esc(u.name)} invited you to apply for <b>${esc(job.title)}</b>.`,
        `#/jobs/${job.id}`,
      );
      m.close();
      ui.toast("Invite sent.");
    });
  }

  /* ================= Public talent profile ================= */
  SB.route(
    "/talent/:id",
    ([id]) => {
      const s = find.user(id);
      if (!s || s.role !== "student") throw new Error("Student not found.");
      const viewer = SB.me();
      const r = SB.rating(id);
      const g = SB.growth(id);
      const reviews = db.reviews.filter((v) => v.to === id);
      const isEmployer = viewer?.role === "employer";
      const listed = isEmployer && (db.shortlist[viewer.id] || []).includes(id);
      return {
        title: s.name,
        html: `<div class="${viewer ? "" : "container-xl py-4"}">
        <div class="profile-cover"><img src="${ui.photo(s.cover)}" alt=""></div>
        <div class="profile-head">${ui.avatar(s, "xl")}
          <div class="pb-2 flex-fill"><h1 class="h2 mb-1">${esc(s.name)}</h1><div class="muted small-text">${esc(s.course)} · ${esc(s.year)} · ${esc(s.university)}</div></div>
          <div class="pb-2 d-flex gap-2 flex-wrap">${isEmployer ? `<button class="btn btn-ghost" id="sl-btn"><i class="bi ${listed ? "bi-heart-fill text-accent" : "bi-heart"} me-1"></i>${listed ? "Shortlisted" : "Shortlist"}</button><button class="btn btn-ghost" id="msg-btn"><i class="bi bi-chat me-1"></i>Message</button><button class="btn btn-accent" id="inv-btn">Invite to a job</button>` : viewer?.id === id ? `<a class="btn btn-accent" href="#/profile">Edit profile</a>` : ""}</div>
        </div>
        <div class="row g-4 mt-2">
          <div class="col-lg-4">
            <div class="card-x">
              <p class="fw-650">${esc(s.headline)}</p>
              <p class="small-text">${esc(s.bio)}</p>
              <div class="d-flex flex-wrap gap-2 mb-3">${ui.status(s.status)} <span class="tag"><i class="bi bi-geo-alt"></i>${esc(s.city)}</span><span class="tag">${s.mode === "Any" ? "Any arrangement" : s.mode}</span><span class="tag">~${fmt.rm(s.rate)}/hr</span></div>
              <div class="tiny muted mb-1">Rating</div><div class="mb-3">${ui.stars(r.avg, r.count)}</div>
              <div class="tiny muted mb-1">Skills</div><div class="mb-2">${ui.tags(s.skills, "accent")}</div>
              <div class="tiny muted mb-1">Languages</div><div class="small-text mb-3">${esc(s.languages.join(", "))}</div>
              <div class="tiny muted mb-1">Interested in</div><div>${ui.tags(s.interests.map((c) => find.cat(c)?.short).filter(Boolean))}</div>
            </div>
            <div class="card-x mt-3"><div class="row text-center g-0"><div class="col"><div class="big-stat" style="font-size:1.6rem">${g.done.length}</div><div class="tiny muted">Completed</div></div><div class="col"><div class="big-stat" style="font-size:1.6rem">${Object.keys(g.skills).length}</div><div class="tiny muted">Skills used</div></div><div class="col"><div class="big-stat" style="font-size:1.6rem">${reviews.length}</div><div class="tiny muted">Reviews</div></div></div></div>
          </div>
          <div class="col-lg-8">
            <h2 class="h5 mb-3">Portfolio</h2>
            ${s.portfolio.length ? `<div class="portfolio-grid">${s.portfolio.map((p) => `<div class="pf-item"><button class="thumb" data-zoom="${p.id}" aria-label="Open ${esc(p.title)}"><img src="${p.img.startsWith("data:") ? p.img : ui.img(p.img)}" alt="${esc(p.title)}" loading="lazy"></button><div class="meta"><strong>${esc(p.title)}</strong><span>${esc(p.type)}</span></div></div>`).join("")}</div>` : `<p class="muted small-text">No portfolio items yet.</p>`}
            <h2 class="h5 mt-5 mb-3">Free hours</h2>
            <div class="card-x">${SB.availabilityGrid(s.avail, true)}</div>
            <div class="row g-3 mt-4">
              <div class="col-md-6"><h2 class="h6">Experience</h2>${s.experience.map((x) => `<div class="mb-3"><div class="fw-650 small-text">${esc(x.title)}</div><div class="tiny muted">${esc(x.org)} · ${esc(x.period)}</div><div class="small-text">${esc(x.desc)}</div></div>`).join("") || `<p class="small-text muted">–</p>`}</div>
              <div class="col-md-6"><h2 class="h6">Education</h2>${s.education.map((x) => `<div class="mb-3"><div class="fw-650 small-text">${esc(x.programme)}</div><div class="tiny muted">${esc(x.school)} · ${esc(x.period)}</div></div>`).join("")}</div>
            </div>
            <h2 class="h5 mt-4 mb-3">Reviews</h2>
            ${reviews.map((v) => `<div class="card-x mb-2"><div class="d-flex justify-content-between">${ui.stars(v.stars)}<span class="tiny muted">${fmt.date(v.date)}</span></div><p class="small-text mt-2 mb-1">${esc(v.text)}</p><div class="tiny muted">${esc(find.user(v.from).name)}</div></div>`).join("") || `<p class="muted small-text">No reviews yet.</p>`}
          </div>
        </div>
      </div>`,
        mount(page) {
          page.addEventListener("click", (e) => {
            const z = e.target.closest("[data-zoom]");
            if (z) SB.lightbox(s.portfolio.find((p) => p.id === z.dataset.zoom));
          });
          $("#sl-btn")?.addEventListener("click", async () => {
            await toggleShortlist(id);
            SB.render();
          });
          $("#msg-btn")?.addEventListener("click", () => SB.startChat(id));
          $("#inv-btn")?.addEventListener("click", () => inviteModal(s));
        },
      };
    },
    { shell: "auto", nav: "/talent" },
  );
})();
