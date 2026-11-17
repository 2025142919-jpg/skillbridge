/* Shared UI helpers and components used by every page */
(function () {
  const { fmt, find, db } = SB;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Escapes text before putting it into HTML (prevents broken markup and script injection)
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  const photo = (key) => `assets/images/photos/${key}.webp`;
  const img = (path) => (path.includes("/") ? `assets/images/${path}` : photo(path));
  const logoSrc = (user) => `assets/images/logos/${user.logo || "default"}.svg`;

  /* ---------- Small components ---------- */
  // Students get coloured initials, employers get their logo
  function avatar(user, size = "") {
    if (!user) return "";
    if (user.role === "employer")
      return `<span class="logo ${size}"><img src="${logoSrc(user)}" alt="" loading="lazy"></span>`;
    return `<span class="avatar ${size}" style="--av:${user.color || "var(--accent)"}" aria-hidden="true">${esc(fmt.initials(user.name))}</span>`;
  }

  function stars(value, count) {
    if (!value) return `<span class="muted tiny">No reviews yet</span>`;
    const full = Math.round(value);
    return `<span class="stars" aria-label="${value.toFixed(1)} out of 5">${"★".repeat(full)}<span class="off">${"★".repeat(5 - full)}</span></span> <span class="tiny fw-650">${value.toFixed(1)}</span>${count != null ? ` <span class="tiny muted">(${count})</span>` : ""}`;
  }

  const STATUS_TONE = {
    Open: "ok",
    Available: "ok",
    Active: "ok",
    Hired: "ok",
    Completed: "ok",
    Resolved: "ok",
    Submitted: "info",
    "In progress": "info",
    Interview: "info",
    Shortlisted: "warn",
    Busy: "warn",
    "In review": "warn",
    Draft: "",
    Rejected: "bad",
    Withdrawn: "",
    Closed: "",
  };
  const status = (label, tone) =>
    `<span class="status ${tone ?? STATUS_TONE[label] ?? ""}">${esc(label)}</span>`;

  const tags = (list, cls = "") =>
    list.map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join("");

  function empty(icon, title, text = "", action = "") {
    return `<div class="empty"><i class="bi ${icon}"></i><h3>${esc(title)}</h3>${text ? `<p class="small-text muted mb-3">${text}</p>` : ""}${action}</div>`;
  }

  function statTile(icon, label, value, delta = "") {
    return `<div class="stat-tile"><div class="label"><i class="bi ${icon}"></i>${esc(label)}</div><div class="value tabular">${value}</div>${delta ? `<div class="delta">${delta}</div>` : ""}</div>`;
  }

  function matchRing(m) {
    if (!m) return "";
    return `<span class="match" title="${esc(m.reasons.join(" · "))}"><span class="ring" style="--p:${m.pct}"></span>${m.pct}% match</span>`;
  }

  function isSaved(jobId) {
    const u = SB.me();
    return u?.role === "student" && (db.saved[u.id] || []).includes(jobId);
  }

  // The job card used on the home page, Explore and dashboards
  function jobCard(job, match) {
    const company = find.user(job.employerId);
    const cat = find.cat(job.cat);
    const u = SB.me();
    const saveBtn =
      u?.role === "student"
        ? `<button class="save-btn ${isSaved(job.id) ? "on" : ""}" data-save="${job.id}" aria-label="Save job"><i class="bi ${isSaved(job.id) ? "bi-bookmark-fill" : "bi-bookmark"}"></i></button>`
        : "";
    const est = SB.estimate(job);
    return `<article class="job-card">
      <div class="media">
        <img src="${img(job.image)}" alt="" loading="lazy">
        <div class="badges"><span class="glass-pill"><i class="bi ${cat.icon}"></i>${esc(cat.short)}</span>${cat.group === "physical" ? `<span class="glass-pill dark">${job.mode}</span>` : `<span class="glass-pill dark">${job.mode}</span>`}</div>
        ${saveBtn}
      </div>
      <div class="body">
        <div class="company">${avatar(company, "sm")}<span>${esc(company.name)}</span>${company.verified ? `<i class="bi bi-patch-check-fill text-accent" title="Verified employer"></i>` : ""}</div>
        <h3><a href="#/jobs/${job.id}">${esc(job.title)}</a></h3>
        <div class="facts">
          <span><i class="bi bi-geo-alt"></i>${esc(job.city)}</span>
          <span><i class="bi bi-calendar3"></i>${fmt.shortDate(job.start)}${job.end !== job.start ? " – " + fmt.shortDate(job.end) : ""}</span>
          ${job.days.length ? `<span><i class="bi bi-clock"></i>${fmt.hour(job.from)}–${fmt.hour(job.to)}</span>` : `<span><i class="bi bi-hourglass-split"></i>${esc(job.duration)}</span>`}
        </div>
      </div>
      <div class="foot">
        <div><div class="price">${SB.payLabel(job)} <small>${SB.payUnit(job)}</small></div>${est.allowances ? `<div class="tiny text-ok">+ ${fmt.rm(est.allowances)} allowances</div>` : `<div class="tiny muted">${job.pay.type === "Fixed" ? "Project budget" : "Before allowances"}</div>`}</div>
        ${matchRing(match)}
      </div>
      ${match && match.reasons.length ? `<div class="why-line">${esc(match.reasons.slice(0, 3).join(" · "))}</div>` : ""}
    </article>`;
  }

  // Compact version of the job card for the list view
  function jobRow(job, match) {
    const company = find.user(job.employerId);
    const est = SB.estimate(job);
    return `<article class="job-row">
      <img src="${img(job.image)}" alt="" loading="lazy">
      <div>
        <div class="tiny muted">${esc(company.name)} · ${esc(find.cat(job.cat).short)}</div>
        <h3><a href="#/jobs/${job.id}">${esc(job.title)}</a></h3>
        <div class="facts tiny muted d-flex flex-wrap gap-3">
          <span><i class="bi bi-geo-alt me-1"></i>${esc(job.city)} · ${job.mode}</span>
          <span><i class="bi bi-calendar3 me-1"></i>${fmt.dateRange(job.start, job.end)}</span>
          <span><i class="bi bi-people me-1"></i>${job.slots} needed</span>
        </div>
      </div>
      <div class="right">
        <div class="price">${SB.payLabel(job)} <small>${SB.payUnit(job)}</small></div>
        <div class="tiny muted mb-1">≈ ${fmt.rm(est.net)} take-home</div>
        ${matchRing(match)}
      </div>
    </article>`;
  }

  /* ---------- Toast ---------- */
  // Small message that slides up from the bottom and disappears after 3 seconds
  function toast(message, type = "ok") {
    let stack = $(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const icon = {
      ok: "bi-check-circle-fill",
      bad: "bi-exclamation-circle-fill",
      info: "bi-info-circle-fill",
    }[type];
    const el = document.createElement("div");
    el.className = `toast-x ${type}`;
    el.innerHTML = `<i class="bi ${icon}"></i><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove());
    }, 3200);
  }

  /* ---------- Modal ---------- */
  // Opens a Bootstrap modal with the given content
  function modal({ title, body, footer = "", size = "", onOpen }) {
    const host = $("#modal-host");
    host.innerHTML = `<div class="modal fade" tabindex="-1" aria-labelledby="modal-title" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}">
        <div class="modal-content">
          <div class="modal-header"><h2 class="modal-title" id="modal-title">${title}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
          <div class="modal-body">${body}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
        </div>
      </div>
    </div>`;
    const el = host.firstElementChild;
    const instance = new bootstrap.Modal(el);
    el.addEventListener("hidden.bs.modal", () => {
      instance.dispose();
      host.innerHTML = "";
    });
    if (onOpen) el.addEventListener("shown.bs.modal", () => onOpen(el, instance), { once: true });
    instance.show();
    return { el, close: () => instance.hide() };
  }

  // Used when the route changes so a modal never stays open over a new page.
  function closeModals() {
    // Removing the nodes (instead of dispose) lets any running Bootstrap transition finish safely.
    $("#modal-host").replaceChildren();
    $$(".modal-backdrop").forEach((b) => b.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  }

  // Yes/No dialog that returns a Promise with true or false
  function confirmBox(title, text, okLabel = "Confirm", danger = false) {
    return new Promise((resolve) => {
      let answered = false;
      const m = modal({
        title,
        body: `<p class="mb-0">${text}</p>`,
        footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn ${danger ? "btn-danger-soft" : "btn-accent"}" data-ok>${okLabel}</button>`,
      });
      m.el.querySelector("[data-ok]").addEventListener("click", () => {
        answered = true;
        resolve(true);
        m.close();
      });
      m.el.addEventListener("hidden.bs.modal", () => !answered && resolve(false));
    });
  }

  /* ---------- Buttons that wait for the mock API ---------- */
  async function busy(button, task) {
    const label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border me-2" aria-hidden="true"></span>${button.dataset.busy || "Saving…"}`;
    try {
      return await task();
    } catch (err) {
      toast(esc(err.message), "bad");
      throw err;
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.innerHTML = label;
      }
    }
  }

  /* ---------- Form validation ---------- */
  // Checks form fields. Each rule returns an error message, or "" when the value is fine.
  function validate(form, rules) {
    let firstBad = null;
    for (const [name, check] of Object.entries(rules)) {
      const field = form.elements[name];
      if (!field) continue;
      const message = check(field.value.trim(), field);
      const target = field.length && !field.tagName ? field[0] : field;
      target.classList.toggle("is-invalid", !!message);
      let fb = target.parentElement.querySelector(`.invalid-feedback[data-for="${name}"]`);
      if (message) {
        if (!fb) {
          fb = document.createElement("div");
          fb.className = "invalid-feedback";
          fb.dataset.for = name;
          target.insertAdjacentElement("afterend", fb);
        }
        fb.textContent = message;
        fb.style.display = "block";
        firstBad = firstBad || target;
      } else if (fb) fb.remove();
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  const required = (label) => (v) => (v ? "" : `${label} is required.`);
  const minLen = (label, n) => (v) =>
    v.length >= n ? "" : `${label} needs at least ${n} characters.`;
  const isEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address.";

  /* ---------- Theme & accent (kept in memory only) ---------- */
  const prefs = {
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };
  // Applies light or dark mode to the whole page
  function applyTheme() {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.dataset.bsTheme = prefs.theme;
    $$("[data-theme-icon]").forEach(
      (i) => (i.className = `bi ${prefs.theme === "dark" ? "bi-sun" : "bi-moon-stars"}`),
    );
    document.dispatchEvent(new CustomEvent("themechange"));
  }

  /* ---------- Charts ---------- */
  const SERIES = {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"],
  };
  const charts = new Set();
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  // Creates a Chart.js chart that uses the site colours and fonts
  function chart(canvas, config) {
    if (!canvas || !window.Chart) return null;
    const ink = cssVar("--ink-3");
    const grid = cssVar("--line");
    Chart.defaults.font.family = cssVar("--font") || "Inter";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = ink;
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: config.data.datasets.length > 1 || config.type === "doughnut",
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8, padding: 16 },
        },
        tooltip: {
          backgroundColor: cssVar("--bg-elev"),
          titleColor: cssVar("--ink"),
          bodyColor: cssVar("--ink-2"),
          borderColor: grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          boxPadding: 4,
        },
      },
      scales:
        config.type === "doughnut"
          ? {}
          : {
              x: { grid: { display: false }, border: { color: grid }, ticks: { color: ink } },
              y: {
                beginAtZero: true,
                grid: { color: grid },
                border: { display: false },
                ticks: { color: ink, precision: 0 },
              },
            },
    };
    const merged = { ...config, options: deepMerge(base, config.options || {}) };
    const instance = new Chart(canvas, merged);
    charts.add(instance);
    return instance;
  }
  function deepMerge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b))
      out[k] =
        b[k] && typeof b[k] === "object" && !Array.isArray(b[k])
          ? deepMerge(a[k] || {}, b[k])
          : b[k];
    return out;
  }
  function destroyCharts() {
    charts.forEach((c) => c.destroy());
    charts.clear();
  }
  const seriesColors = () => SERIES[prefs.theme];
  const accentColor = () => cssVar("--accent");

  /* ---------- Reveal on scroll ---------- */
  let observer;
  // Fades sections in as they scroll into view
  function reveal(root = document) {
    if (!("IntersectionObserver" in window))
      return $$(".reveal", root).forEach((el) => el.classList.add("in"));
    observer =
      observer ||
      new IntersectionObserver(
        (entries) =>
          entries.forEach(
            (e) => e.isIntersecting && (e.target.classList.add("in"), observer.unobserve(e.target)),
          ),
        { threshold: 0.12 },
      );
    $$(".reveal", root).forEach((el) => observer.observe(el));
  }

  SB.ui = {
    $,
    $$,
    esc,
    photo,
    img,
    logoSrc,
    avatar,
    stars,
    status,
    tags,
    empty,
    statTile,
    matchRing,
    jobCard,
    jobRow,
    isSaved,
    toast,
    modal,
    closeModals,
    confirmBox,
    busy,
    validate,
    required,
    minLen,
    isEmail,
    prefs,
    applyTheme,
    chart,
    destroyCharts,
    seriesColors,
    accentColor,
    reveal,
  };
})();
