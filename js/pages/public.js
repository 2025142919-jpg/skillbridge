/* Public pages: home, explore, job details, company profile, how it works, about, contact */
(function () {
  const { ui, db, fmt, find, api } = SB;
  const { $, $$, esc } = ui;

  const openJobs = () => db.jobs.filter((j) => j.status === "Open");

  /* ================= Home ================= */
  SB.route("/", () => {
    const featured = openJobs()
      .filter((j) => j.featured)
      .concat(openJobs().filter((j) => !j.featured))
      .slice(0, 8);
    const physical = openJobs().filter((j) => find.cat(j.cat).group === "physical").length;
    const academic = openJobs().length - physical;
    const sample = find.job("j102");
    const est = SB.estimate(sample);
    const employers = db.users.filter((u) => u.role === "employer" && u.verified).slice(0, 7);

    const html = `
    <section class="hero">
      <div class="container-xl">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <span class="eyebrow">For Malaysian university students</span>
            <h1 class="display mt-3">Work that fits <span class="serif">between classes.</span></h1>
            <p class="lead-text mt-4">Freelance projects, event crew shifts and part-time roles, matched to your skills and the hours you're actually free. Pay, allowances and your own costs are shown before you apply.</p>
            <form class="hero-search" id="hero-search" role="search" action="#/jobs" method="get">
              <i class="bi bi-search"></i>
              <input name="q" type="search" placeholder="Try “LED wall”, “barista” or “Figma”" aria-label="Search jobs">
              <button class="btn btn-accent">Search</button>
            </form>
            <div class="quick-chips">
              ${[
                ["Event crew", "events"],
                ["Lighting & sound", "av"],
                ["Web development", "tech"],
                ["Photography", "onsite"],
                ["Design", "design"],
                ["F&B", "hospitality"],
              ]
                .map(([l, c]) => `<a class="chip" href="#/jobs?cat=${c}">${l}</a>`)
                .join("")}
            </div>
          </div>
          <div class="col-lg-6">
            <div class="hero-stage">
              <div class="hero-photo a"><img src="${ui.photo("stage-lights")}" alt="Lighting crew working above a concert crowd"></div>
              <div class="hero-photo b"><img src="${ui.photo("laptop-glow")}" alt="Laptop on a desk"></div>
              <div class="float-card one">
                <div class="d-flex align-items-center gap-2 mb-2">${ui.avatar(find.user("e1"), "sm")}<span class="tiny muted">Teratai Events · Kuala Lumpur</span></div>
                <div class="fw-650 small-text">Booth ambassador – tech expo</div>
                <div class="d-flex justify-content-between align-items-center mt-2"><span class="price" style="font-size:.95rem">RM 150 <small>/ day</small></span><span class="match"><span class="ring" style="--p:88"></span>88%</span></div>
                <div class="tiny text-ok mt-1"><i class="bi bi-check2"></i> Transport + lunch covered</div>
              </div>
              <div class="float-card two">
                <div class="fw-650 small-text">Your free hours</div>
                <div class="tiny muted">Matched against every shift</div>
                <div class="week">${SB.DAYS.map((d) => `<div class="${["Tue", "Sat", "Sun"].includes(d) ? "free" : ""}">${d[0]}</div>`).join("")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container-xl">
      <div class="logo-strip reveal">
        <span class="tiny">Sample employers in this demo</span>
        ${employers.map((e) => `<a class="co" href="#/companies/${e.id}">${ui.avatar(e, "sm")}${esc(e.name)}</a>`).join("")}
      </div>
    </div>

    <section class="section">
      <div class="container-xl">
        <div class="section-head reveal"><span class="eyebrow">Two kinds of work</span><h2 class="mt-2">Not every student job happens at a desk.</h2><p>Some weeks you want a remote design brief. Other weekends you'd rather be rigging lights at a countdown concert. SkillBridge treats both properly.</p></div>
        <div class="row g-4">
          <div class="col-lg-6 reveal"><a class="split-card" href="#/jobs?group=physical"><img src="${ui.photo("event-crowd")}" alt="Crowd at a live event" loading="lazy"><div class="inner"><span class="tag">${physical} open roles</span><h3 class="mt-2">On-site & physical</h3><p class="mb-3">Event crew, LED and sound setup, event photography and F&B. Venue, hours, transport, meals and safety gear listed up front.</p><span class="btn btn-white btn-sm">Browse on-site work <i class="bi bi-arrow-right"></i></span></div></a></div>
          <div class="col-lg-6 reveal"><a class="split-card" href="#/jobs?group=academic"><img src="${ui.photo("desk-creative")}" alt="Designer's desk with laptop and sketches" loading="lazy"><div class="inner"><span class="tag">${academic} open roles</span><h3 class="mt-2">Digital & academic</h3><p class="mb-3">Web builds, design, data and admin, and marketing. Scope, deliverables, software and revision rounds agreed before you start.</p><span class="btn btn-white btn-sm">Browse digital work <i class="bi bi-arrow-right"></i></span></div></a></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 reveal">
          <div class="section-head mb-0"><span class="eyebrow">Categories</span><h2 class="mt-2">Explore beyond your course.</h2></div>
          <a class="btn btn-ghost" href="#/jobs">All jobs <i class="bi bi-arrow-right"></i></a>
        </div>
        <div class="row g-3">
          ${db.categories.map((c) => `<div class="col-6 col-md-4 col-xl-2 reveal"><a class="cat-tile" href="#/jobs?cat=${c.id}"><i class="bi ${c.icon}"></i><h3>${esc(c.short)}</h3><span>${openJobs().filter((j) => j.cat === c.id).length} open · ${c.group === "physical" ? "On-site" : "Digital"}</span></a></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 reveal">
          <div class="section-head mb-0"><span class="eyebrow">Featured</span><h2 class="mt-2">Hiring this month.</h2></div>
          <div class="d-flex gap-2"><button class="icon-btn" data-scroll="-1" aria-label="Scroll left"><i class="bi bi-chevron-left"></i></button><button class="icon-btn" data-scroll="1" aria-label="Scroll right"><i class="bi bi-chevron-right"></i></button></div>
        </div>
        <div class="h-scroll reveal" id="featured">${featured.map((j) => ui.jobCard(j, SB.me()?.role === "student" ? SB.matchScore(j, SB.me()) : null)).join("")}</div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="row g-5 align-items-center">
          <div class="col-lg-5 reveal">
            <span class="eyebrow">Transparent costs</span>
            <h2 class="mt-2">Know what you'll actually take home.</h2>
            <p class="lead-text mt-3">A RM 160 day rate means something different if you have to buy safety boots and take a 6:30 am Grab. Every listing shows what the employer covers, what you pay for, overtime rates and payment terms.</p>
            <ul class="list-clean mt-3">
              <li><i class="bi bi-check2-circle"></i>Transport, meals and accommodation, clearly marked</li>
              <li><i class="bi bi-check2-circle"></i>Equipment provided vs. what you bring</li>
              <li><i class="bi bi-check2-circle"></i>A take-home calculator on every job</li>
            </ul>
          </div>
          <div class="col-lg-6 offset-lg-1 reveal">
            <div class="cost-demo">
              <div class="d-flex align-items-center gap-3 mb-3">${ui.avatar(find.user(sample.employerId))}<div><div class="fw-650">${esc(sample.title)}</div><div class="tiny muted">${esc(find.user(sample.employerId).name)} · ${esc(sample.city)} · ${sample.duration}</div></div></div>
              <div class="cost-line"><span>Day rate × ${sample.pay.units} days</span><span class="tabular">${fmt.rm(est.base)}</span></div>
              <div class="cost-line"><span>Van pickup, lunch & dinner, PPE</span><span class="pos">Covered</span></div>
              ${sample.studentCosts.map((c) => `<div class="cost-line"><span>${esc(c.label)}</span><span class="neg tabular">− ${fmt.rm(c.amount)}</span></div>`).join("")}
              <div class="cost-line"><span>Safety boots (if you don't own a pair)</span><span class="muted">RM 60–90</span></div>
              <div class="cost-line total"><span>Estimated take-home</span><span class="tabular">${fmt.rm(est.net)}</span></div>
              <a class="btn btn-accent w-100 mt-3" href="#/jobs/${sample.id}">See the full listing</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="section-head center reveal"><span class="eyebrow">How it works</span><h2 class="mt-2">From free hours to first payout.</h2></div>
        <div class="text-center mb-4 reveal"><div class="segmented" id="how-toggle"><button class="on" data-how="students">For students</button><button data-how="employers">For employers</button></div></div>
        <div class="row g-4" id="how-steps"></div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="row g-4 text-center text-md-start">
          ${[
            [openJobs().length, "open jobs in this demo"],
            [db.users.filter((u) => u.role === "student").length, "sample student profiles"],
            [db.users.filter((u) => u.role === "employer").length, "sample employers"],
            [db.categories.length, "job categories"],
          ]
            .map(
              ([n, l]) =>
                `<div class="col-6 col-md-3 reveal"><div class="big-stat tabular">${n}</div><div class="muted small-text mt-1">${l}</div></div>`,
            )
            .join("")}
        </div>
        <p class="tiny muted mt-3">Counts reflect the sample data loaded in this demonstration, not live platform figures.</p>
      </div>
    </section>

    <section class="section">
      <div class="container-xl">
        <div class="section-head reveal"><span class="eyebrow">Voices</span><h2 class="mt-2">What it feels like when it works.</h2><p class="tiny">Fictional demo testimonials.</p></div>
        <div class="row g-4">
          ${[
            [
              "I filtered by my free weekends and found a wedding crew job that paid for my semester books. The listing said exactly what to wear and when the carpool left, so there were no surprises.",
              find.user("s4"),
            ],
            [
              "We used to post in five WhatsApp groups and still be short of crew. Now I search by the exact hours I need people and message them the run sheet.",
              find.user("e1"),
            ],
            [
              "I study Information Management, but my favourite job so far was a wedding registration desk. SkillBridge didn't box me into my course.",
              find.user("s1"),
            ],
          ]
            .map(
              ([q, u]) =>
                `<div class="col-md-4 reveal"><figure class="quote-card"><blockquote>“${q}”</blockquote><figcaption class="d-flex align-items-center gap-2">${ui.avatar(u, "sm")}<span><span class="small-text fw-650 d-block">${esc(u.name)}</span><span class="tiny muted">${esc(u.role === "student" ? `${u.course}, ${u.university}` : u.contact)}</span></span></figcaption></figure></div>`,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-xl reveal">
        <div class="cta-band">
          <img src="${ui.photo("city-night")}" alt="" loading="lazy">
          <div class="row align-items-end g-4">
            <div class="col-lg-7"><h2 class="display" style="font-size:clamp(2rem,4.5vw,3.4rem)">Your next shift is <span class="serif">already listed.</span></h2><p class="mt-3 mb-0">Create a profile in two minutes and set the hours you're free.</p></div>
            <div class="col-lg-5 text-lg-end"><a class="btn btn-white btn-lg me-2" href="#/register?role=student">I'm a student</a><a class="btn btn-lg btn-line" style="color:#fff;border-color:rgba(255,255,255,.5)" href="#/register?role=employer">I'm hiring</a></div>
          </div>
        </div>
      </div>
    </section>`;

    return {
      title: "Student freelance & part-time work in Malaysia",
      html,
      mount(page) {
        $("#hero-search", page).addEventListener("submit", (e) => {
          e.preventDefault();
          const q = new FormData(e.target).get("q").trim();
          SB.go(q ? `#/jobs?q=${encodeURIComponent(q)}` : "#/jobs");
        });
        $$("[data-scroll]", page).forEach((b) =>
          b.addEventListener("click", () =>
            $("#featured").scrollBy({ left: Number(b.dataset.scroll) * 320, behavior: "smooth" }),
          ),
        );
        const steps = howSteps();
        const drawSteps = (who) => {
          $("#how-steps").innerHTML = steps[who]
            .slice(0, 3)
            .map(
              ([icon, title, text], i) =>
                `<div class="col-md-4"><div class="step-card route-enter" style="animation-delay:${i * 70}ms"><div class="d-flex justify-content-between align-items-start"><span class="step-num">0${i + 1}</span><i class="bi ${icon} fs-4 text-accent"></i></div><h3 class="mt-3 h5">${title}</h3><p class="small-text mb-0">${text}</p></div></div>`,
            )
            .join("");
        };
        drawSteps("students");
        $$("#how-toggle button").forEach((b) =>
          b.addEventListener("click", () => {
            $$("#how-toggle button").forEach((x) => x.classList.toggle("on", x === b));
            drawSteps(b.dataset.how);
          }),
        );
      },
    };
  });

  function howSteps() {
    return {
      students: [
        [
          "bi-person-badge",
          "Build a profile in minutes",
          "Add your course, skills and portfolio, then paint the hours you're free on a weekly grid. That grid powers every match.",
        ],
        [
          "bi-send",
          "Apply with a short proposal",
          "See the take-home estimate, check what to bring, propose your rate and send a note. Track every application in one place.",
        ],
        [
          "bi-patch-check",
          "Deliver, get reviewed, grow",
          "Tick off milestones, chat with the employer and collect reviews. Completed work levels up your skills and becomes a downloadable record.",
        ],
        [
          "bi-shield-check",
          "Stay safe",
          "Never pay to get a job. Ignore any listing that asks for fees or bank logins, and tell us through the contact page.",
        ],
      ],
      employers: [
        [
          "bi-megaphone",
          "Post a complete listing",
          "A guided form asks for the details students need: venue, hours, transport, meals, equipment, overtime and payment terms.",
        ],
        [
          "bi-funnel",
          "Shortlist the right people",
          "Search students by skill, university and the exact day and time you need them. Review portfolios and ratings side by side.",
        ],
        [
          "bi-kanban",
          "Run the project",
          "Hire in one click, share files and milestones, then mark the work complete and leave a review.",
        ],
        [
          "bi-cash-coin",
          "Pay directly",
          "In this demo, payment is arranged between you and the student. SkillBridge does not process money.",
        ],
      ],
    };
  }
  SB.howSteps = howSteps;

  /* ================= Explore ================= */
  SB.route("/jobs", (params, query) => {
    const cities = [...new Set(openJobs().map((j) => j.city))].sort();
    const isStudent = SB.me()?.role === "student";
    const state = {
      q: query.q || "",
      group: query.group || "",
      cat: query.cat || "",
      mode: query.mode || "",
      city: query.city || "",
      pay: query.pay || "",
      min: query.min || "",
      covered: query.covered || "",
      meals: query.meals || "",
      stay: query.stay || "",
      sort: query.sort || (isStudent ? "match" : "newest"),
      view: query.view || "grid",
    };
    const catSet = () => new Set(state.cat ? state.cat.split(",") : []);
    const modeSet = () => new Set(state.mode ? state.mode.split(",") : []);

    const html = `
    <div class="container-xl py-4 py-lg-5">
      <div class="page-head">
        <div><span class="eyebrow">Explore</span><h1 class="mt-1">Find work that fits.</h1><p>${isStudent ? "Sorted by how well each job fits your course, skills and free hours. You can still apply to anything." : "Digital projects and on-site shifts across Malaysia. Log in as a student to see your match score."}</p></div>
      </div>
      <div class="explore-layout">
        <aside class="filter-panel">
          <button class="btn btn-ghost w-100 d-lg-none mb-3" data-bs-toggle="collapse" data-bs-target="#filters" aria-expanded="false"><i class="bi bi-sliders me-2"></i>Filters</button>
          <form id="filters" class="collapse d-lg-block" aria-label="Job filters">
            <div class="filter-block">
              <h3>Type of work</h3>
              <div class="segmented w-100" id="group-toggle">
                ${[
                  ["", "All"],
                  ["academic", "Digital"],
                  ["physical", "On-site"],
                ]
                  .map(
                    ([v, l]) =>
                      `<button type="button" data-group="${v}" class="${state.group === v ? "on" : ""} flex-fill">${l}</button>`,
                  )
                  .join("")}
              </div>
            </div>
            <div class="filter-block">
              <h3>Category</h3>
              <div id="cat-list"></div>
            </div>
            <div class="filter-block">
              <h3>Arrangement</h3>
              ${["On-site", "Hybrid", "Remote"].map((m) => `<div class="form-check"><input class="form-check-input" type="checkbox" name="mode" value="${m}" id="m-${m}" ${modeSet().has(m) ? "checked" : ""}><label class="form-check-label" for="m-${m}">${m}</label></div>`).join("")}
            </div>
            <div class="filter-block">
              <h3>Location & pay</h3>
              <label class="form-label" for="f-city">City</label>
              <select class="form-select mb-2" id="f-city" name="city"><option value="">Anywhere</option>${cities.map((c) => `<option ${state.city === c ? "selected" : ""}>${c}</option>`).join("")}</select>
              <label class="form-label" for="f-pay">Pay type</label>
              <select class="form-select mb-2" id="f-pay" name="pay"><option value="">Any</option>${["Hourly", "Daily", "Monthly", "Fixed"].map((p) => `<option ${state.pay === p ? "selected" : ""}>${p}</option>`).join("")}</select>
              <label class="form-label d-flex justify-content-between" for="f-min"><span>Minimum total pay</span><span class="tabular" id="min-out">${state.min ? fmt.rm(state.min) : "Any"}</span></label>
              <input type="range" class="form-range" id="f-min" name="min" min="0" max="1000" step="50" value="${state.min || 0}">
            </div>
            <div class="filter-block">
              <h3>Covered by employer</h3>
              ${[
                ["covered", "Transport or travel"],
                ["meals", "Meals"],
                ["stay", "Accommodation"],
              ]
                .map(
                  ([k, l]) =>
                    `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="f-${k}" name="${k}" ${state[k] ? "checked" : ""}><label class="form-check-label" for="f-${k}">${l}</label></div>`,
                )
                .join("")}
            </div>
            <button type="button" class="btn btn-ghost btn-sm w-100 mt-3" id="clear-filters">Clear all filters</button>
          </form>
        </aside>
        <section aria-live="polite">
          <div class="input-icon mb-3"><i class="bi bi-search"></i><input class="form-control form-control-lg" id="f-q" type="search" placeholder="Search title, skill, company or city" value="${esc(state.q)}" aria-label="Search jobs" style="border-radius:999px"></div>
          <div class="active-filters" id="active-filters"></div>
          <div class="result-bar">
            <span class="small-text muted" id="result-count">Loading…</span>
            <div class="d-flex gap-2 align-items-center">
              <select class="form-select form-select-sm" id="f-sort" aria-label="Sort by" style="width:auto">
                ${isStudent ? `<option value="match">Best match</option>` : ""}<option value="newest">Newest</option><option value="pay">Highest take-home</option><option value="deadline">Closing soon</option>
              </select>
              <div class="segmented" role="group" aria-label="View">
                <button type="button" data-view="grid" class="${state.view === "grid" ? "on" : ""}" aria-label="Grid view"><i class="bi bi-grid"></i></button>
                <button type="button" data-view="list" class="${state.view === "list" ? "on" : ""}" aria-label="List view"><i class="bi bi-list-ul"></i></button>
              </div>
            </div>
          </div>
          <div id="results"></div>
        </section>
      </div>
    </div>`;

    return {
      title: "Explore jobs",
      html,
      mount(page) {
        $("#f-sort").value = state.sort;
        const drawCats = () => {
          const cats = db.categories.filter((c) => !state.group || c.group === state.group);
          $("#cat-list").innerHTML = cats
            .map(
              (c) =>
                `<div class="form-check"><input class="form-check-input" type="checkbox" name="cat" value="${c.id}" id="c-${c.id}" ${catSet().has(c.id) ? "checked" : ""}><label class="form-check-label d-flex justify-content-between w-100" for="c-${c.id}"><span>${esc(c.short)}</span><span class="tiny muted">${openJobs().filter((j) => j.cat === c.id).length}</span></label></div>`,
            )
            .join("");
        };
        drawCats();

        let seq = 0;
        async function load() {
          const mine = ++seq;
          SB.setQuery(state);
          $("#results").innerHTML =
            `<div class="row g-3">${Array.from({ length: 6 }, () => `<div class="col-md-6 col-xl-4"><div class="skeleton" style="height:330px"></div></div>`).join("")}</div>`;
          const rows = await api.get("/jobs", state);
          if (mine !== seq) return;
          $("#result-count").textContent =
            `${rows.length} job${rows.length === 1 ? "" : "s"} found`;
          drawActive();
          if (!rows.length) {
            $("#results").innerHTML =
              `<div class="card-x">${ui.empty("bi-search", "No jobs match these filters", "Try removing a filter or searching a broader term.", `<button class="btn btn-accent btn-sm" data-clear>Clear filters</button>`)}</div>`;
            return;
          }
          $("#results").innerHTML =
            state.view === "list"
              ? `<div class="d-grid gap-3">${rows.map((r) => ui.jobRow(r.job, r.match)).join("")}</div>`
              : `<div class="row g-3">${rows.map((r) => `<div class="col-md-6 col-xl-4">${ui.jobCard(r.job, r.match)}</div>`).join("")}</div>`;
        }

        function drawActive() {
          const chips = [];
          if (state.q) chips.push(["q", `“${state.q}”`]);
          if (state.group)
            chips.push(["group", state.group === "physical" ? "On-site work" : "Digital work"]);
          catSet().forEach((c) => chips.push([`cat:${c}`, find.cat(c)?.short]));
          modeSet().forEach((m) => chips.push([`mode:${m}`, m]));
          ["city", "pay"].forEach((k) => state[k] && chips.push([k, state[k]]));
          if (state.min) chips.push(["min", `≥ ${fmt.rm(state.min)}`]);
          if (state.covered) chips.push(["covered", "Transport covered"]);
          if (state.meals) chips.push(["meals", "Meals"]);
          if (state.stay) chips.push(["stay", "Accommodation"]);
          $("#active-filters").innerHTML = chips
            .map(
              ([k, l]) =>
                `<span class="chip on" data-remove="${k}">${esc(l)} <i class="bi bi-x"></i></span>`,
            )
            .join("");
        }

        const debounce = (fn, ms) => {
          let t;
          return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
          };
        };
        const reloadSoon = debounce(load, 220);

        $("#f-q").addEventListener("input", (e) => {
          state.q = e.target.value.trim();
          reloadSoon();
        });
        $("#filters").addEventListener("change", (e) => {
          const t = e.target;
          if (t.name === "cat")
            state.cat = $$("input[name=cat]:checked")
              .map((i) => i.value)
              .join(",");
          else if (t.name === "mode")
            state.mode = $$("input[name=mode]:checked")
              .map((i) => i.value)
              .join(",");
          else if (["covered", "meals", "stay"].includes(t.name))
            state[t.name] = t.checked ? "1" : "";
          else if (t.name) state[t.name] = t.value === "0" ? "" : t.value;
          load();
        });
        $("#f-min").addEventListener(
          "input",
          (e) =>
            ($("#min-out").textContent = Number(e.target.value) ? fmt.rm(e.target.value) : "Any"),
        );
        $$("#group-toggle button").forEach((b) =>
          b.addEventListener("click", () => {
            state.group = b.dataset.group;
            state.cat = "";
            $$("#group-toggle button").forEach((x) => x.classList.toggle("on", x === b));
            drawCats();
            load();
          }),
        );
        $("#f-sort").addEventListener("change", (e) => {
          state.sort = e.target.value;
          load();
        });
        $$("[data-view]").forEach((b) =>
          b.addEventListener("click", () => {
            state.view = b.dataset.view;
            $$("[data-view]").forEach((x) => x.classList.toggle("on", x === b));
            load();
          }),
        );
        const clear = () => SB.go("#/jobs");
        $("#clear-filters").addEventListener("click", clear);
        page.addEventListener("click", (e) => {
          if (e.target.closest("[data-clear]")) return clear();
          const chip = e.target.closest("[data-remove]");
          if (!chip) return;
          const [key, value] = chip.dataset.remove.split(":");
          if (value)
            state[key] = state[key]
              .split(",")
              .filter((x) => x !== value)
              .join(",");
          else state[key] = "";
          SB.go(
            "#/jobs?" + new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString(),
          );
        });
        load();
      },
    };
  });

  /* ================= Job details ================= */
  SB.route("/jobs/:id", async ([id]) => {
    const job = await api.get(`/jobs/${id}`);
    job.views++;
    const company = find.user(job.employerId);
    const cat = find.cat(job.cat);
    const user = SB.me();
    const student = user?.role === "student" ? user : null;
    const match = student ? SB.matchScore(job, student) : null;
    const myApp =
      student && db.applications.find((a) => a.jobId === job.id && a.studentId === student.id);
    const daysLeft = fmt.daysLeft(job.deadline);
    const r = SB.rating(company.id);
    const isPhysical = cat.group === "physical";
    const similar = openJobs()
      .filter((j) => j.id !== job.id && (j.cat === job.cat || find.cat(j.cat).group === cat.group))
      .slice(0, 3);
    const est = SB.estimate(job);
    const coverIcon = {
      Employer: ["bi-check-circle-fill text-ok", "Covered"],
      Student: ["bi-wallet2 text-warn", "You arrange"],
      "Not needed": ["bi-dash-circle muted", "Not needed"],
    };

    let action;
    if (job.status !== "Open")
      action = `<div class="demo-note"><i class="bi bi-info-circle"></i><span>This listing is <b>${esc(job.status.toLowerCase())}</b> and isn't accepting applications.</span></div>`;
    else if (!user)
      action = `<a class="btn btn-accent btn-lg w-100" href="#/login?next=${encodeURIComponent("/jobs/" + job.id)}">Log in to apply</a><p class="tiny muted text-center mt-2 mb-0">New here? <a href="#/register?role=student">Create a free student profile</a></p>`;
    else if (student && myApp)
      action = `<div class="d-flex justify-content-between align-items-center p-3 rounded-4" style="background:var(--surface-2)"><span class="small-text">Your application</span>${ui.status(myApp.status)}</div><a class="btn btn-ghost w-100 mt-2" href="#/applications">View applications</a>`;
    else if (student)
      action = `<button class="btn btn-accent btn-lg w-100" id="apply-btn">Apply now</button>`;
    else if (user.id === job.employerId)
      action = `<a class="btn btn-accent w-100" href="#/employer/jobs/${job.id}">Manage applicants</a><a class="btn btn-ghost w-100 mt-2" href="#/post-job?edit=${job.id}">Edit listing</a>`;
    else
      action = `<p class="small-text muted mb-0">Only student accounts can apply. ${user.role === "employer" ? "Switch to a student demo account to try applying." : ""}</p>`;

    const unitLabel = { Daily: "days", Hourly: "hours", Monthly: "months" }[job.pay.type];

    const html = `
    <div class="container-xl py-4">
      <a href="#/jobs" class="small-text"><i class="bi bi-arrow-left"></i> All jobs</a>
      <div class="job-hero mt-3"><img src="${ui.img(job.image)}" alt="${esc(cat.name)}"><span class="glass-pill"><i class="bi ${cat.icon}"></i>${esc(cat.name)}</span></div>
      <div class="detail-grid mt-4">
        <div>
          <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
            <a class="d-inline-flex align-items-center gap-2 small-text" href="#/companies/${company.id}" style="color:var(--ink-2)">${ui.avatar(company, "sm")}${esc(company.name)}</a>
            ${company.verified ? `<span class="tag accent"><i class="bi bi-patch-check-fill"></i>Verified</span>` : `<span class="tag">Unverified employer</span>`}
            ${ui.status(job.status)}
          </div>
          <h1 style="font-size:clamp(1.7rem,3vw,2.4rem)">${esc(job.title)}</h1>
          <p class="muted mb-4">Posted ${fmt.date(job.posted)} · ${job.views} views · ${((n) => `${n} applicant${n === 1 ? "" : "s"}`)(db.applications.filter((a) => a.jobId === job.id).length)}</p>

          <div class="fact-grid">
            <div class="fact"><div class="k"><i class="bi bi-calendar3"></i>Dates</div><div class="v">${fmt.dateRange(job.start, job.end)}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-clock"></i>Hours</div><div class="v">${job.days.length ? `${job.days.join(", ")}<br><span class="fw-normal small-text">${fmt.hours(job.from, job.to)}</span>` : "Flexible, by deadline"}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-geo-alt"></i>Location</div><div class="v">${esc(job.venue)}<br><span class="fw-normal small-text">${esc(job.city)}, ${esc(job.state)}</span></div></div>
            <div class="fact"><div class="k"><i class="bi bi-laptop"></i>Arrangement</div><div class="v">${job.mode}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-hourglass-split"></i>Duration</div><div class="v">${esc(job.duration)}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-people"></i>Openings</div><div class="v">${job.slots} student${job.slots > 1 ? "s" : ""}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-mortarboard"></i>Level</div><div class="v">${job.level}</div></div>
            <div class="fact"><div class="k"><i class="bi bi-flag"></i>Apply by</div><div class="v">${fmt.date(job.deadline)}<br><span class="fw-normal small-text ${daysLeft <= 3 ? "text-bad" : ""}">${daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left` : "Closed"}</span></div></div>
          </div>

          <div class="detail-section"><h2>About this job</h2><p>${esc(job.summary)}</p></div>
          <div class="detail-section"><h2>What you'll do</h2><ul class="list-clean">${job.responsibilities.map((x) => `<li><i class="bi bi-check2"></i>${esc(x)}</li>`).join("")}</ul></div>
          ${
            job.scope || job.deliverables
              ? `<div class="detail-section"><h2>Scope & deliverables</h2>
            ${job.scope ? `<p>${esc(job.scope)}</p>` : ""}
            <div class="row g-3">
              ${job.deliverables ? `<div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2">Deliverables</div><ul class="list-clean">${job.deliverables.map((d) => `<li><i class="bi bi-box-seam"></i>${esc(d)}</li>`).join("")}</ul></div></div>` : ""}
              <div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2">Software</div>${ui.tags(job.software || [])}<div class="tiny muted mt-3 mb-1">Revisions</div><div class="small-text">${esc(job.revisions || "–")}</div></div></div>
            </div></div>`
              : ""
          }
          ${job.physical ? `<div class="detail-section"><h2>Physical requirements</h2><div class="demo-note"><i class="bi bi-person-walking"></i><span>${esc(job.physical)}</span></div></div>` : ""}
          <div class="detail-section"><h2>Skills</h2>${ui.tags(job.skills, "accent")}${student ? `<p class="tiny muted mt-2">${(db.courses[student.course] || []).includes(job.cat) ? `Related to your course (${esc(student.course)}).` : "Outside your course: a good chance to build something new."}</p>` : ""}</div>

          <div class="detail-section"><h2>What's covered</h2>
            <div class="card-x py-2">
              ${job.logistics.length ? job.logistics.map((l) => `<div class="cover-row"><span class="ic"><i class="bi ${l.icon}"></i></span><div><div class="fw-650">${esc(l.label)}</div><div class="tiny muted">${esc(l.detail)}</div></div><div class="who"><i class="bi ${coverIcon[l.cover][0]}"></i> <span class="small-text">${coverIcon[l.cover][1]}</span>${l.amount ? `<div class="tiny text-ok tabular">+ ${fmt.rm(l.amount)}</div>` : ""}</div></div>`).join("") : `<p class="small-text muted my-2">No logistics listed.</p>`}
            </div>
          </div>

          <div class="detail-section"><h2>Equipment</h2>
            <div class="row g-3">
              <div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2"><i class="bi bi-box2-heart me-1"></i>Provided by ${esc(company.name)}</div><ul class="list-clean">${(job.equipment.provided.length ? job.equipment.provided : ["Nothing specific"]).map((x) => `<li><i class="bi bi-check2"></i>${esc(x)}</li>`).join("")}</ul></div></div>
              <div class="col-md-6"><div class="card-x h-100"><div class="tiny muted mb-2"><i class="bi bi-bag me-1"></i>You bring</div><ul class="list-clean">${(job.equipment.bring.length ? job.equipment.bring : ["Nothing specific"]).map((x) => `<li><i class="bi bi-dot"></i>${esc(x)}</li>`).join("")}</ul></div></div>
            </div>
          </div>

          <div class="detail-section"><h2>Pay, overtime & terms</h2>
            <div class="row g-3">
              <div class="col-md-6"><div class="fact h-100"><div class="k"><i class="bi bi-cash-stack"></i>Payment terms</div><div class="v fw-normal small-text">${esc(job.payTerms)}</div></div></div>
              <div class="col-md-6"><div class="fact h-100"><div class="k"><i class="bi bi-alarm"></i>Overtime</div><div class="v fw-normal small-text">${esc(job.overtime || "Not applicable")}</div></div></div>
            </div>
            <p class="tiny muted mt-2">SkillBridge doesn't process payments in this demo. Never pay an employer to get a job.</p>
          </div>

          <div class="detail-section"><h2>About the employer</h2>
            <a class="card-x hover d-flex gap-3 align-items-start" href="#/companies/${company.id}" style="color:inherit">
              ${ui.avatar(company, "lg")}
              <div><div class="fw-650">${esc(company.name)} ${company.verified ? `<i class="bi bi-patch-check-fill text-accent"></i>` : ""}</div><div class="tiny muted mb-1">${esc(company.industry)} · ${esc(company.city)} · ${esc(company.size)}</div>${ui.stars(r.avg, r.count)}<p class="small-text mt-2 mb-0">${esc(company.about)}</p></div>
            </a>
          </div>

          ${similar.length ? `<div class="detail-section"><h2>Similar jobs</h2><div class="row g-3">${similar.map((j) => `<div class="col-md-6 col-xl-4">${ui.jobCard(j, student ? SB.matchScore(j, student) : null)}</div>`).join("")}</div></div>` : ""}
        </div>

        <aside class="apply-panel">
          <div class="card-x">
            <div class="price" style="font-size:1.7rem">${SB.payLabel(job)} <small>${SB.payUnit(job)}</small></div>
            <div class="tiny muted">${job.pay.type} pay</div>
            <hr class="divider">
            <div class="fw-650 small-text mb-2">Take-home estimate</div>
            ${job.pay.type !== "Fixed" ? `<label class="form-label d-flex justify-content-between" for="units"><span>Number of ${unitLabel}</span><span class="tabular" id="units-out">${job.pay.units}</span></label><input type="range" class="form-range" id="units" min="1" max="${Math.max(job.pay.units * 2, 4)}" value="${job.pay.units}">` : `<p class="tiny muted">Estimated at the midpoint of the budget range.</p>`}
            <div id="calc"></div>
            <hr class="divider">
            ${match ? `<div class="mb-3"><div class="d-flex justify-content-between align-items-center mb-1"><span class="small-text fw-650">Your match</span>${ui.matchRing(match)}</div><div class="tiny muted">${esc(match.reasons.join(" · ") || "Few overlaps, but worth a look")}</div>${job.days.length ? `<div class="week mt-2">${SB.DAYS.map((d) => `<div class="${job.days.includes(d) && (student.avail[d] || []).length ? "free" : ""}" title="${job.days.includes(d) ? "Job runs" : ""}${student.avail[d] ? " · you're free" : ""}" style="${job.days.includes(d) && !(student.avail[d] || []).length ? "outline:1.5px dashed var(--bad)" : ""}">${d}</div>`).join("")}</div><div class="tiny muted mt-1">Filled = job day you're free · dashed = job day you haven't marked free</div>` : ""}</div>` : ""}
            ${action}
            <div class="d-flex gap-2 mt-2">
              ${student ? `<button class="btn btn-ghost flex-fill ${ui.isSaved(job.id) ? "on" : ""}" data-save="${job.id}" data-label="1"><i class="bi ${ui.isSaved(job.id) ? "bi-bookmark-fill" : "bi-bookmark"}"></i> ${ui.isSaved(job.id) ? "Saved" : "Save"}</button>` : ""}
              ${user && user.id !== job.employerId ? `<button class="btn btn-ghost flex-fill" id="msg-btn"><i class="bi bi-chat"></i> Message</button>` : ""}
              <button class="btn btn-ghost" id="share-btn" aria-label="Copy link" title="Copy link"><i class="bi bi-link-45deg"></i></button>
            </div>
          </div>
        </aside>
      </div>
    </div>`;

    return {
      title: job.title,
      html,
      mount(page) {
        const draw = (units) => {
          const e = SB.estimate(job, units);
          $("#calc").innerHTML = `
            <div class="cost-line"><span>Base pay</span><span class="tabular">${fmt.rm(e.base)}</span></div>
            <div class="cost-line"><span>Cash allowances</span><span class="pos tabular">+ ${fmt.rm(e.allowances)}</span></div>
            <div class="cost-line"><span>Your own costs</span><span class="neg tabular">− ${fmt.rm(e.costs)}</span></div>
            <div class="cost-line total"><span>Take-home</span><span class="tabular">${fmt.rm(e.net)}</span></div>`;
        };
        draw();
        $("#units")?.addEventListener("input", (e) => {
          $("#units-out").textContent = e.target.value;
          draw(Number(e.target.value));
        });
        $("#apply-btn")?.addEventListener("click", () => applyModal(job));
        $("#msg-btn")?.addEventListener("click", () => SB.startChat(job.employerId, job.id));
        $("#share-btn").addEventListener("click", async () => {
          const url = location.href;
          try {
            await navigator.clipboard.writeText(url);
            ui.toast("Link copied to clipboard.");
          } catch {
            ui.toast("Copy this link: " + esc(url), "info");
          }
        });
      },
    };
  });

  function applyModal(job) {
    const u = SB.me();
    const costs = job.studentCosts || [];
    const bring = job.logistics.filter((l) => l.cover === "Student");
    const unit =
      job.pay.type === "Fixed" ? "Your quote (RM, total)" : `Your rate (RM ${SB.payUnit(job)})`;
    const suggested =
      job.pay.type === "Fixed" ? Math.round((job.pay.min + job.pay.max) / 2) : job.pay.rate;
    const m = ui.modal({
      title: "Apply for this job",
      size: "modal-lg",
      body: `
        <form id="apply-form" novalidate>
          <div class="d-flex gap-3 align-items-center mb-3 p-3 rounded-4" style="background:var(--surface-2)">
            <img src="${ui.img(job.image)}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:10px">
            <div><div class="fw-650 small-text">${esc(job.title)}</div><div class="tiny muted">${esc(find.user(job.employerId).name)} · ${fmt.dateRange(job.start, job.end)}</div></div>
          </div>
          <div class="row g-3">
            <div class="col-md-5"><label class="form-label" for="amount">${unit}</label><input class="form-control" type="number" id="amount" name="amount" min="1" value="${suggested}"><div class="form-text">Listed: ${SB.payLabel(job)} ${SB.payUnit(job)}</div></div>
            <div class="col-md-7"><label class="form-label" for="availability">Your availability for these dates</label><select class="form-select" id="availability" name="availability"><option value="">Choose one</option><option>Available for all dates and hours</option><option>Available, but need to leave early on one day</option><option>Available for some dates only (explain below)</option></select></div>
            <div class="col-12"><label class="form-label d-flex justify-content-between" for="cover"><span>Why you're a good fit</span><span class="tiny muted" id="cover-count">0 / 600</span></label><textarea class="form-control" id="cover" name="cover" rows="5" maxlength="600" placeholder="Mention similar work you've done, the skills you'll bring and anything the employer should know."></textarea></div>
            ${u.portfolio.length ? `<div class="col-12"><div class="form-label">Attach portfolio items</div><div class="d-flex flex-wrap gap-2">${u.portfolio.map((p) => `<label class="chip"><input type="checkbox" class="form-check-input m-0" name="pf" value="${p.id}"> ${esc(p.title)}</label>`).join("")}</div></div>` : ""}
            ${costs.length || bring.length ? `<div class="col-12"><div class="demo-note"><i class="bi bi-wallet2"></i><div><b>Costs you'll cover yourself</b><ul class="mb-1 ps-3">${costs.map((c) => `<li>${esc(c.label)}: ${fmt.rm(c.amount)}</li>`).join("")}${bring.map((b) => `<li>${esc(b.label)}: ${esc(b.detail)}</li>`).join("")}</ul></div></div><div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="ack" name="ack"><label class="form-check-label small-text" for="ack">I understand these costs and requirements.</label></div></div>` : ""}
          </div>
        </form>
        <div id="apply-done" class="text-center py-4 d-none"><div class="mx-auto mb-3 d-grid" style="width:64px;height:64px;border-radius:50%;background:color-mix(in srgb,var(--ok) 14%,transparent);place-items:center"><i class="bi bi-check-lg text-ok fs-2"></i></div><h3 class="h4">Application sent</h3><p class="muted">The employer has been notified. You'll see updates in Applications and Notifications.</p></div>`,
      footer: `<span class="tiny muted me-auto">Demo: sent as a simulated POST request.</span><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-accent" id="apply-send" data-busy="Sending…">Send application</button>`,
      onOpen(el) {
        $("#cover", el).focus();
      },
    });
    const form = $("#apply-form", m.el);
    $("#cover", m.el).addEventListener(
      "input",
      (e) => ($("#cover-count", m.el).textContent = `${e.target.value.length} / 600`),
    );
    $("#apply-send", m.el).addEventListener("click", async (e) => {
      const ok = ui.validate(form, {
        amount: (v) => (Number(v) > 0 ? "" : "Enter an amount above zero."),
        availability: ui.required("Availability"),
        cover: ui.minLen("Your note", 40),
        ...(form.elements.ack
          ? { ack: (v, f) => (f.checked ? "" : "Please confirm you've read the costs.") }
          : {}),
      });
      if (!ok) return;
      const btn = e.currentTarget;
      await ui.busy(btn, () =>
        api.post("/applications", {
          jobId: job.id,
          amount: Number(form.elements.amount.value),
          cover: form.elements.cover.value.trim(),
          availability: form.elements.availability.value,
        }),
      );
      form.classList.add("d-none");
      $("#apply-done", m.el).classList.remove("d-none");
      m.el.querySelector(".modal-footer").innerHTML =
        `<a class="btn btn-ghost" href="#/applications" data-bs-dismiss="modal">View applications</a><button class="btn btn-accent" data-bs-dismiss="modal" id="apply-ok">Done</button>`;
      $("#apply-ok", m.el).focus();
      m.el.addEventListener("hidden.bs.modal", () => SB.render(), { once: true });
    });
  }

  /* ================= Company profile ================= */
  SB.route("/companies/:id", ([id]) => {
    const c = find.user(id);
    if (!c || c.role !== "employer") throw new Error("Employer not found.");
    const jobs = db.jobs.filter((j) => j.employerId === id && j.status === "Open");
    const r = SB.rating(id);
    const reviews = db.reviews.filter((x) => x.to === id);
    return {
      title: c.name,
      html: `<div class="container-xl py-4">
        <div class="profile-cover"><img src="${ui.photo(c.cover)}" alt=""></div>
        <div class="profile-head">${ui.avatar(c, "lg")}<div class="pb-1"><h1 class="h2 mb-1">${esc(c.name)} ${c.verified ? `<i class="bi bi-patch-check-fill text-accent fs-5" title="Verified"></i>` : ""}</h1><div class="muted small-text">${esc(c.industry)} · ${esc(c.city)} · ${esc(c.type)}</div></div><div class="ms-auto pb-1">${SB.me() && SB.me().id !== id ? `<button class="btn btn-ghost" id="msg-co"><i class="bi bi-chat"></i> Message</button>` : ""}</div></div>
        <div class="row g-4 mt-2">
          <div class="col-lg-4"><div class="card-x">
            <h2 class="h6">About</h2><p class="small-text">${esc(c.about)}</p>
            <dl class="small-text mb-0">
              <dt class="tiny muted">Registered name</dt><dd>${esc(c.legalName)}</dd>
              <dt class="tiny muted">Address</dt><dd>${esc(c.address)}</dd>
              <dt class="tiny muted">Team size</dt><dd>${esc(c.size)}</dd>
              ${c.founded ? `<dt class="tiny muted">Founded</dt><dd>${c.founded}</dd>` : ""}
              <dt class="tiny muted">Hiring contact</dt><dd>${esc(c.contact)}</dd>
              <dt class="tiny muted">Rating</dt><dd>${ui.stars(r.avg, r.count)}</dd>
            </dl>
            ${!c.verified ? `<div class="demo-note mt-3"><i class="bi bi-exclamation-triangle"></i><span>This employer hasn't been verified yet. Meet in public places and never pay fees to get work.</span></div>` : ""}
          </div></div>
          <div class="col-lg-8">
            <h2 class="h5 mb-3">Open jobs (${jobs.length})</h2>
            ${jobs.length ? `<div class="row g-3">${jobs.map((j) => `<div class="col-md-6">${ui.jobCard(j, SB.me()?.role === "student" ? SB.matchScore(j, SB.me()) : null)}</div>`).join("")}</div>` : `<div class="card-x">${ui.empty("bi-briefcase", "No open jobs right now")}</div>`}
            <h2 class="h5 mt-5 mb-3">Reviews from students</h2>
            ${reviews.length ? reviews.map((v) => `<div class="card-x mb-2"><div class="d-flex justify-content-between">${ui.stars(v.stars)}<span class="tiny muted">${fmt.date(v.date)}</span></div><p class="small-text mt-2 mb-1">${esc(v.text)}</p><div class="tiny muted">${esc(find.user(v.from).name)}${v.projectId ? " · " + esc(find.job(find.project(v.projectId).jobId).title) : v.jobTitle ? " · " + esc(v.jobTitle) : ""}</div></div>`).join("") : `<p class="muted small-text">No reviews yet.</p>`}
          </div>
        </div>
      </div>`,
      mount() {
        $("#msg-co")?.addEventListener("click", () => SB.startChat(id));
      },
    };
  });

  /* ================= How it works ================= */
  SB.route("/how-it-works", (params, query) => {
    const steps = howSteps();
    const who = query.for === "employers" ? "employers" : "students";
    return {
      title: "How it works",
      html: `
      <section class="hero pb-0"><div class="container-xl">
        <div class="row g-5 align-items-end">
          <div class="col-lg-7"><span class="eyebrow">How it works</span><h1 class="display mt-3">Simple for students. <span class="serif">Complete</span> for employers.</h1></div>
          <div class="col-lg-5"><p class="lead-text">SkillBridge asks employers for the details students usually have to chase on WhatsApp, and turns a student's free hours into better matches.</p></div>
        </div>
        <div class="segmented mt-4" id="who"><button data-who="students" class="${who === "students" ? "on" : ""}">For students</button><button data-who="employers" class="${who === "employers" ? "on" : ""}">For employers</button></div>
      </div></section>
      <div class="container-xl">
        <div class="row g-4 mt-1" id="steps"></div>

        <section class="section">
          <div class="row g-5 align-items-center">
            <div class="col-lg-6 reveal"><div class="about-photo" style="min-height:420px"><img src="${ui.photo("edison-bulbs")}" alt="Warm stage lights hanging from a rig" loading="lazy"></div></div>
            <div class="col-lg-6 reveal">
              <span class="eyebrow">The matching score</span>
              <h2 class="mt-2">Four signals, one number.</h2>
              <p class="lead-text">Every job gets a match percentage when you're logged in as a student. It's a suggestion, never a filter. You can apply to anything.</p>
              ${[
                [
                  "Course relevance",
                  30,
                  "Does the category relate to your programme or chosen interests?",
                ],
                ["Skills", 30, "How many of the listed skills appear on your profile?"],
                [
                  "Free hours",
                  25,
                  "Do the job's days and hours overlap the times you marked free?",
                ],
                [
                  "Place & arrangement",
                  15,
                  "Remote, near your city, and suited to your preferred arrangement?",
                ],
              ]
                .map(
                  ([t, w, d]) =>
                    `<div class="mb-3"><div class="d-flex justify-content-between small-text"><span class="fw-650">${t}</span><span class="tabular muted">${w}%</span></div><div class="bar my-1"><span style="width:${w * 3.33}%"></span></div><div class="tiny muted">${d}</div></div>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head reveal"><span class="eyebrow">Application lifecycle</span><h2 class="mt-2">Every status means something.</h2></div>
          <div class="row g-3 reveal">
            ${[
              ["Submitted", "info", "Your proposal is with the employer."],
              ["Shortlisted", "warn", "You're on their shortlist."],
              ["Interview", "info", "They'd like a quick chat or call."],
              ["Hired", "ok", "A project space opens with milestones and files."],
              ["Completed", "ok", "Both sides leave a review; skills level up."],
            ]
              .map(
                ([s, t, d]) =>
                  `<div class="col-6 col-lg"><div class="card-x h-100">${ui.status(s, t)}<p class="small-text mt-2 mb-0">${d}</p></div></div>`,
              )
              .join("")}
          </div>
        </section>

        <section class="section">
          <div class="row g-4">
            <div class="col-lg-6 reveal"><div class="card-x h-100"><h2 class="h4"><i class="bi bi-shield-check text-accent me-2"></i>Safety rules</h2><ul class="list-clean mt-3">
              <li><i class="bi bi-check2"></i>Never pay a fee to apply or to "unlock" a job.</li>
              <li><i class="bi bi-check2"></i>Never share banking passwords or TAC codes.</li>
              <li><i class="bi bi-check2"></i>For on-site work, check the venue and meet in public first.</li>
              <li><i class="bi bi-check2"></i>Keep messages inside SkillBridge so there's a record of what was agreed.</li>
            </ul></div></div>
            <div class="col-lg-6 reveal"><div class="card-x h-100"><h2 class="h4"><i class="bi bi-info-circle text-accent me-2"></i>What this demo does not do</h2><ul class="list-clean mt-3">
              <li><i class="bi bi-dash"></i>No real payments: pay is arranged between student and employer.</li>
              <li><i class="bi bi-dash"></i>No secure authentication: demo passwords are stored in plain JavaScript.</li>
              <li><i class="bi bi-dash"></i>No live messaging: replies are simulated in your browser.</li>
              <li><i class="bi bi-dash"></i>No saved data: refreshing the page restores the sample data.</li>
            </ul></div></div>
          </div>
        </section>
      </div>`,
      mount() {
        const draw = (w) =>
          ($("#steps").innerHTML =
            steps[w]
              .map(
                ([icon, title, text], i) =>
                  `<div class="col-md-6 col-lg-3"><div class="step-card route-enter" style="animation-delay:${i * 60}ms"><div class="d-flex justify-content-between"><span class="step-num">0${i + 1}</span><i class="bi ${icon} fs-4 text-accent"></i></div><h3 class="h5 mt-3">${title}</h3><p class="small-text mb-0">${text}</p></div></div>`,
              )
              .join("") +
            `<div class="col-12"><a class="btn btn-accent" href="#/register?role=${w === "students" ? "student" : "employer"}">${w === "students" ? "Create a student profile" : "Start hiring"}</a></div>`);
        draw(who);
        $$("#who button").forEach((b) =>
          b.addEventListener("click", () => {
            $$("#who button").forEach((x) => x.classList.toggle("on", x === b));
            SB.setQuery({ for: b.dataset.who === "employers" ? "employers" : "" });
            draw(b.dataset.who);
          }),
        );
      },
    };
  });

  /* ================= About ================= */
  SB.route("/about", () => ({
    title: "About",
    html: `
    <section class="hero pb-0"><div class="container-xl">
      <span class="eyebrow">About SkillBridge</span>
      <h1 class="display mt-3" style="max-width:14ch">Connecting student skills with <span class="serif">real opportunities.</span></h1>
    </div></section>
    <div class="container-xl">
      <div class="row g-5 mt-1 align-items-stretch">
        <div class="col-lg-6 reveal"><div class="about-photo"><img src="${ui.photo("city-aerial")}" alt="Aerial view of a city at dusk" loading="lazy"></div></div>
        <div class="col-lg-6 reveal">
          <p class="lead-text" style="color:var(--ink-2)">Malaysian students already work: at weekend events, behind café counters, on design briefs from friends of friends. Most of it is arranged in group chats where the important details (what time, who pays for transport, when you get paid) arrive last.</p>
          <p>SkillBridge started as an assignment for IMS566 Advanced Web Design & Development at UiTM. The first version matched projects to a student's course, skills and free hours. This version keeps that idea and widens it: on-site and physical jobs are first-class, every listing must show its real costs, and students are encouraged to explore work outside their programme.</p>
          <div class="value-row"><i class="bi bi-eye"></i><div><h3 class="h6 mb-1">Transparent by default</h3><p class="small-text mb-0">Pay, allowances, equipment and your own costs appear before you apply, not after you arrive.</p></div></div>
          <div class="value-row"><i class="bi bi-compass"></i><div><h3 class="h6 mb-1">Beyond your course</h3><p class="small-text mb-0">An Information Management student can rig lights; a designer can crew a wedding. Matches suggest, they never restrict.</p></div></div>
          <div class="value-row"><i class="bi bi-clock-history"></i><div><h3 class="h6 mb-1">Built around timetables</h3><p class="small-text mb-0">Availability is a weekly grid, not a yes/no switch, so shifts land in the hours you're really free.</p></div></div>
          <div class="value-row"><i class="bi bi-graph-up-arrow"></i><div><h3 class="h6 mb-1">Proof of growth</h3><p class="small-text mb-0">Completed work levels up your skills and becomes an experience record you can download.</p></div></div>
        </div>
      </div>

      <section class="section">
        <div class="row g-4">
          <div class="col-md-4 reveal"><div class="card-x h-100"><span class="eyebrow">Students</span><h3 class="mt-2">A portfolio that grows</h3><p class="small-text mb-0">Profiles, portfolio pieces, availability, applications, projects and reviews in one place.</p></div></div>
          <div class="col-md-4 reveal"><div class="card-x h-100"><span class="eyebrow">Employers</span><h3 class="mt-2">Crew you can plan around</h3><p class="small-text mb-0">Companies post complete listings, search talent by hours and manage projects.</p></div></div>
          <div class="col-md-4 reveal"><div class="card-x h-100"><span class="eyebrow">Projects</span><h3 class="mt-2">Work tracked in one place</h3><p class="small-text mb-0">Once hired, both sides share milestones, files, messages and reviews in a project space.</p></div></div>
        </div>
      </section>

      <section class="section reveal">
        <div class="card-x p-4 p-lg-5">
          <div class="row g-4 align-items-center">
            <div class="col-lg-8"><span class="eyebrow">Project credits</span><h2 class="mt-2 h3">An independent student project</h2><p class="mb-0">Designed and developed by Muhammad Faid bin Mohd Zaid for IMS566, UiTM. Not an official UiTM platform. Every company, person, job, review and payment figure is fictional sample data. Photographs are from Unsplash under the Unsplash License.</p></div>
            <div class="col-lg-4 text-lg-end"><a class="btn btn-accent" href="#/contact">Get in touch</a></div>
          </div>
        </div>
      </section>
    </div>`,
  }));

  /* ================= Contact ================= */
  SB.route("/contact", () => {
    const faqs = [
      [
        "Is SkillBridge free for students?",
        "Yes. Students never pay to create a profile, apply or receive work. Any listing that asks for a fee should be reported.",
      ],
      [
        "How do payments work?",
        "In this demonstration, payment is arranged directly between the employer and the student, and each listing states its payment terms. A production version would add escrow through a licensed payment provider.",
      ],
      [
        "Can I apply to jobs outside my course?",
        "Absolutely. The match score suggests jobs that relate to your programme, but every open job accepts applications from any student.",
      ],
      [
        "What does “covered by employer” mean?",
        "The employer pays or provides that item (for example, a van pickup, meals or a hard hat). Items marked “You arrange” are your responsibility and are included in the take-home estimate.",
      ],
      [
        "Why did my changes disappear after refreshing?",
        "This is a frontend demo with no database. Everything you do is kept in memory and resets when the page reloads.",
      ],
      [
        "What does the blue badge mean?",
        "Verified employers carry a blue badge. In this demo the badge is part of the sample data; a live version would check company registration (SSM) details.",
      ],
    ];
    return {
      title: "Contact & FAQ",
      html: `
      <section class="hero pb-0"><div class="container-xl"><span class="eyebrow">Contact</span><h1 class="display mt-3">We're <span class="serif">listening.</span></h1><p class="lead-text mt-3">Questions about the platform, a listing or a partnership? Send a note and we'll reply within two working days.</p></div></section>
      <div class="container-xl">
        <div class="row g-5 mt-1">
          <div class="col-lg-7">
            <form class="card-x p-4" id="contact-form" method="post" action="/contact" novalidate>
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label" for="c-name">Full name</label><input class="form-control" id="c-name" name="name" autocomplete="name"></div>
                <div class="col-md-6"><label class="form-label" for="c-email">Email</label><input class="form-control" id="c-email" name="email" type="email" autocomplete="email"></div>
                <div class="col-md-6"><label class="form-label" for="c-who">I am a</label><select class="form-select" id="c-who" name="who"><option value="">Choose one</option><option>Student</option><option>Employer / business</option><option>University staff</option><option>Other</option></select></div>
                <div class="col-md-6"><label class="form-label" for="c-topic">Topic</label><select class="form-select" id="c-topic" name="topic"><option value="">Choose one</option><option>Account help</option><option>Report a problem with a job</option><option>Partnership</option><option>Feedback</option></select></div>
                <div class="col-12"><label class="form-label" for="c-msg">Message</label><textarea class="form-control" id="c-msg" name="message" rows="6" placeholder="How can we help?"></textarea></div>
                <div class="col-12 form-check ms-1"><input class="form-check-input" type="checkbox" id="c-ok" name="consent"><label class="form-check-label small-text" for="c-ok">I understand this is a demo and my message is not actually sent.</label></div>
                <div class="col-12 d-flex gap-2 align-items-center"><button class="btn btn-accent" data-busy="Sending…">Send message</button><span class="tiny muted">Simulated POST /contact</span></div>
              </div>
            </form>
            <div id="contact-done" class="card-x p-5 text-center d-none"></div>
          </div>
          <div class="col-lg-5">
            <div class="card-x py-2">
              <div class="contact-card"><i class="bi bi-envelope"></i><div><div class="fw-650">Email</div><div class="small-text muted">support@skillbridge.demo</div></div></div>
              <div class="contact-card"><i class="bi bi-clock"></i><div><div class="fw-650">Response time</div><div class="small-text muted">Within 2 working days (Mon–Fri, 9 am – 6 pm MYT)</div></div></div>
              <div class="contact-card"><i class="bi bi-geo-alt"></i><div><div class="fw-650">Project base</div><div class="small-text muted">Shah Alam, Selangor</div></div></div>
              <div class="contact-card"><i class="bi bi-shield-check"></i><div><div class="fw-650">Problem with a listing?</div><div class="small-text muted">Choose “Report a problem with a job” as the topic and include the job title.</div></div></div>
            </div>
          </div>
        </div>
        <section class="section">
          <div class="section-head"><span class="eyebrow">FAQ</span><h2 class="mt-2">Common questions</h2></div>
          <div class="accordion" id="faq">
            ${faqs.map(([q, a], i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button ${i ? "collapsed" : ""}" type="button" data-bs-toggle="collapse" data-bs-target="#faq${i}" aria-expanded="${!i}">${q}</button></h3><div id="faq${i}" class="accordion-collapse collapse ${i ? "" : "show"}" data-bs-parent="#faq"><div class="accordion-body small-text" style="color:var(--ink-2)">${a}</div></div></div>`).join("")}
          </div>
        </section>
      </div>`,
      mount() {
        const form = $("#contact-form");
        const u = SB.me();
        if (u) {
          form.elements.name.value = u.name;
          form.elements.email.value = u.email;
        }
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const ok = ui.validate(form, {
            name: ui.required("Your name"),
            email: ui.isEmail,
            who: ui.required("This"),
            topic: ui.required("Topic"),
            message: ui.minLen("Your message", 20),
            consent: (v, f) => (f.checked ? "" : "Please tick to continue."),
          });
          if (!ok) return;
          const data = Object.fromEntries(new FormData(form));
          const res = await ui.busy(form.querySelector("button"), () => api.post("/contact", data));
          form.classList.add("d-none");
          const done = $("#contact-done");
          done.classList.remove("d-none");
          done.innerHTML = `<i class="bi bi-envelope-check fs-1 text-accent"></i><h2 class="h4 mt-3">Thanks, ${esc(data.name.split(" ")[0])}.</h2><p class="muted">Your reference is <b class="tabular">${res.ticket}</b>. In a live version we'd email ${esc(data.email)} within two working days.</p><button class="btn btn-ghost" id="again">Send another</button>`;
          $("#again").addEventListener("click", () => {
            form.reset();
            form.classList.remove("d-none");
            done.classList.add("d-none");
          });
        });
      },
    };
  });
})();
