/*
  In-memory state and a small mock API.
  Nothing is written to LocalStorage, SessionStorage or cookies: all changes live in the
  `db` object and disappear when the page is refreshed. The API functions imitate
  GET/POST/PATCH/DELETE requests (with a short artificial delay) so the pages are written
  the same way they would be against a real backend.
*/
(function () {
  const DEMO_TODAY = "2026-11-19";
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // One shared object holds every user, job, application and message while the page is open
  const db = SB.seed();
  db.session = null;

  // Availability is seeded as hour ranges ([[18, 22]]) and stored as hour lists ([18, 19, 20, 21]).
  db.users.forEach(normaliseAvailability);
  function normaliseAvailability(u) {
    if (u.role !== "student") return;
    const out = {};
    for (const day of Object.keys(u.avail || {})) {
      const hours = new Set();
      for (const slot of u.avail[day]) {
        if (Array.isArray(slot)) for (let h = slot[0]; h < slot[1]; h++) hours.add(h);
        else hours.add(slot);
      }
      if (hours.size) out[day] = [...hours].sort((a, b) => a - b);
    }
    u.avail = out;
  }

  let counter = 1000;
  // Simple id generator for new records, e.g. "ap1001"
  const newId = (prefix) => prefix + ++counter;

  /* ---------- Formatting helpers ---------- */
  // Helpers that turn raw values into readable text (RM amounts, dates, times)
  const fmt = {
    rm(n) {
      return "RM " + Number(n || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 });
    },
    date(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
      if (!iso) return "–";
      return new Date(iso.length <= 10 ? iso + "T00:00" : iso).toLocaleDateString("en-GB", opts);
    },
    shortDate(iso) {
      return fmt.date(iso, { day: "numeric", month: "short" });
    },
    dateRange(a, b) {
      if (!b || a === b)
        return fmt.date(a, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const same = a.slice(0, 7) === b.slice(0, 7);
      return same ? `${Number(a.slice(8))}–${fmt.date(b)}` : `${fmt.shortDate(a)} – ${fmt.date(b)}`;
    },
    hour(h) {
      const hh = ((h % 24) + 24) % 24;
      const suffix = hh < 12 ? "am" : "pm";
      return (hh % 12 || 12) + suffix;
    },
    hours(from, to) {
      return `${fmt.hour(from)} – ${fmt.hour(to)}${to > 24 ? " (next day)" : ""}`;
    },
    time(iso) {
      return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    },
    ago(iso) {
      const diff = (now() - new Date(iso)) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return Math.floor(diff / 60) + "m ago";
      if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
      if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
      return fmt.shortDate(iso.slice(0, 10));
    },
    daysLeft(iso) {
      return Math.ceil((new Date(iso + "T23:59") - now()) / 86400000);
    },
    initials(name) {
      return name
        .split(" ")
        .filter((w) => /^[A-Z]/.test(w))
        .slice(0, 2)
        .map((w) => w[0])
        .join("");
    },
  };

  // The demo runs on a fixed date so the sample deadlines always make sense.
  function now() {
    const real = new Date();
    const d = new Date(DEMO_TODAY + "T00:00");
    d.setHours(real.getHours(), real.getMinutes(), real.getSeconds());
    return d;
  }
  const todayISO = () => DEMO_TODAY;

  /* ---------- Lookups ---------- */
  // Look up a single record by id
  const find = {
    user: (id) => db.users.find((u) => u.id === id),
    job: (id) => db.jobs.find((j) => j.id === id),
    cat: (id) => db.categories.find((c) => c.id === id),
    project: (id) => db.projects.find((p) => p.id === id),
    application: (id) => db.applications.find((a) => a.id === id),
    conversation: (id) => db.conversations.find((c) => c.id === id),
  };

  // The user who is currently logged in (or null)
  const me = () => (db.session ? find.user(db.session) : null);

  // Average star rating and number of reviews received by a user
  function rating(userId) {
    const list = db.reviews.filter((r) => r.to === userId);
    if (!list.length) return { avg: 0, count: 0 };
    return { avg: list.reduce((s, r) => s + r.stars, 0) / list.length, count: list.length };
  }

  /* ---------- Pay and cost calculations ---------- */
  // "RM 140" for rates, "RM 600–900" for fixed budgets
  function payLabel(job) {
    const p = job.pay;
    if (p.type === "Fixed")
      return p.min === p.max ? fmt.rm(p.min) : `${fmt.rm(p.min)}–${p.max.toLocaleString()}`;
    return fmt.rm(p.rate);
  }
  function payUnit(job) {
    return { Hourly: "/ hour", Daily: "/ day", Monthly: "/ month", Fixed: "fixed" }[job.pay.type];
  }
  // Pay before allowances: rate x days/hours, or the middle of a fixed budget
  function basePay(job, units) {
    const p = job.pay;
    if (p.type === "Fixed") return (p.min + p.max) / 2;
    return p.rate * (units ?? p.units ?? 1);
  }
  // Take-home estimate shown on every job:
  // base pay + cash allowances paid by the employer - costs the student pays themselves
  function estimate(job, units) {
    const base = basePay(job, units);
    const allowances = job.logistics
      .filter((l) => l.cover === "Employer" && l.amount)
      .reduce((s, l) => s + l.amount, 0);
    const costs = (job.studentCosts || []).reduce((s, c) => s + c.amount, 0);
    return { base, allowances, costs, net: base + allowances - costs };
  }

  /* ---------- Matching (kept from the original SkillBridge: course 30, skills 30, time 25, place 15) ---------- */
  // True if the student marked at least one free hour during the job's days and hours
  function overlaps(avail, job) {
    if (!job.days.length) return Object.keys(avail).length > 0;
    return job.days.some((d) =>
      (avail[d] || []).some((h) => h >= job.from && h < Math.min(job.to, 24)),
    );
  }
  // Match score out of 100. Each part also adds a short reason that is shown on the job card.
  function matchScore(job, student) {
    let score = 0;
    const reasons = [];
    const courseCats = db.courses[student.course] || [];
    if (courseCats.includes(job.cat)) {
      score += 30;
      reasons.push("Fits your course");
    } else if ((student.interests || []).includes(job.cat)) {
      score += 18;
      reasons.push("Matches your interests");
    }
    const lower = student.skills.map((s) => s.toLowerCase());
    const hits = job.skills.filter((k) => lower.includes(k.toLowerCase())).length;
    if (hits) {
      score += Math.min(1, hits / 2) * 30;
      reasons.push(`${hits} of your skills`);
    }
    if (overlaps(student.avail, job)) {
      score += 25;
      const free = job.days.filter((d) => student.avail[d]);
      reasons.push(job.days.length ? `Free on ${free.slice(0, 2).join(" & ")}` : "Flexible hours");
    }
    if (student.mode === "Any" || student.mode === job.mode || job.mode === "Hybrid") score += 8;
    if (job.mode === "Remote" || job.city === student.city) {
      score += 7;
      reasons.push(job.mode === "Remote" ? "Remote" : "Near you");
    }
    return { pct: Math.round(score), reasons };
  }

  /* ---------- Skill growth (kept from the original: 1 project Beginner, 2 Intermediate, 3+ Advanced) ---------- */
  // Counts how many completed projects used each skill, plus earnings and course relevance
  function growth(studentId) {
    const done = db.projects.filter((p) => p.studentId === studentId && p.status === "Completed");
    const skills = {};
    done.forEach((p) =>
      find.job(p.jobId).skills.forEach((s) => (skills[s] = (skills[s] || 0) + 1)),
    );
    const student = find.user(studentId);
    const courseCats = db.courses[student.course] || [];
    const relevant = done.filter((p) => courseCats.includes(find.job(p.jobId).cat)).length;
    const earned = done.reduce((s, p) => s + p.budget, 0);
    return {
      done,
      skills,
      relevance: done.length ? Math.round((relevant / done.length) * 100) : 0,
      earned,
    };
  }
  const level = (n) => (n >= 3 ? "Advanced" : n === 2 ? "Intermediate" : "Beginner");

  // Percentage of profile sections the student has filled in
  function profileCompletion(u) {
    const checks = [
      u.bio,
      u.skills.length >= 3,
      Object.keys(u.avail).length,
      u.portfolio.length,
      u.education.length,
      u.experience.length,
      u.headline,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  // Adds a notification for a user (shown in the bell menu)
  function notify(userId, icon, text, link) {
    db.notifications.unshift({
      id: newId("n"),
      userId,
      icon,
      text,
      link,
      at: now().toISOString().slice(0, 16),
      read: false,
    });
  }

  /* ---------- Mock API ---------- */
  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  const fail = (status, message) => {
    throw new ApiError(status, message);
  };
  // Stops a request if nobody is logged in, or the wrong type of user is
  const requireUser = (role) => {
    const u = me();
    if (!u) fail(401, "Please log in first.");
    if (role && u.role !== role) fail(403, "Your account can't do that.");
    return u;
  };

  // Each key is "METHOD /path". The functions below act like a small backend.
  const routes = {
    // Search and filter open jobs. q holds the query string values (q, cat, mode, city...)
    "GET /jobs"(q) {
      let list = db.jobs.filter((j) => j.status === "Open");
      if (q.q) {
        const term = q.q.toLowerCase();
        list = list.filter((j) =>
          [j.title, j.summary, j.city, j.venue, find.user(j.employerId).name, ...j.skills]
            .join(" ")
            .toLowerCase()
            .includes(term),
        );
      }
      if (q.cat) {
        const cats = q.cat.split(",");
        list = list.filter((j) => cats.includes(j.cat));
      }
      if (q.group) list = list.filter((j) => find.cat(j.cat).group === q.group);
      if (q.mode) {
        const modes = q.mode.split(",");
        list = list.filter((j) => modes.includes(j.mode));
      }
      if (q.city) list = list.filter((j) => j.city === q.city);
      if (q.pay) list = list.filter((j) => j.pay.type === q.pay);
      if (q.min) list = list.filter((j) => estimate(j).base >= Number(q.min));
      if (q.covered)
        list = list.filter((j) =>
          j.logistics.some((l) => l.cover === "Employer" && /Transport|Travel/.test(l.label)),
        );
      if (q.meals)
        list = list.filter((j) =>
          j.logistics.some((l) => l.cover === "Employer" && /Meal|Lunch/.test(l.label)),
        );
      if (q.stay)
        list = list.filter((j) =>
          j.logistics.some((l) => l.cover === "Employer" && l.label === "Accommodation"),
        );
      const student = me()?.role === "student" ? me() : null;
      let rows = list.map((job) => ({ job, match: student ? matchScore(job, student) : null }));
      const sorters = {
        newest: (a, b) => b.job.posted.localeCompare(a.job.posted),
        pay: (a, b) => estimate(b.job).net - estimate(a.job).net,
        deadline: (a, b) => a.job.deadline.localeCompare(b.job.deadline),
        match: (a, b) => (b.match?.pct || 0) - (a.match?.pct || 0),
      };
      rows.sort(sorters[q.sort] || (student ? sorters.match : sorters.newest));
      return rows;
    },
    "GET /jobs/:id"(q, id) {
      const job = find.job(id);
      const hidden = job?.status === "Draft" && me()?.id !== job.employerId;
      if (!job || hidden) fail(404, "This job doesn't exist or has been removed.");
      return job;
    },
    "POST /jobs"(body) {
      const u = requireUser("employer");
      const job = { ...body, id: newId("j"), employerId: u.id, posted: todayISO(), views: 0 };
      db.jobs.unshift(job);
      if (job.status === "Open")
        notify(u.id, "bi-megaphone", `Your job <b>${job.title}</b> is live.`, `#/jobs/${job.id}`);
      return job;
    },
    "PATCH /jobs/:id"(body, id) {
      const u = me();
      const job = find.job(id);
      if (!job) fail(404, "Job not found.");
      if (u?.id !== job.employerId) fail(403, "You can only edit your own jobs.");
      Object.assign(job, body);
      return job;
    },
    "DELETE /jobs/:id"(body, id) {
      const u = me();
      const job = find.job(id);
      if (u?.id !== job?.employerId) fail(403, "Not allowed.");
      db.jobs = db.jobs.filter((j) => j.id !== id);
      return { ok: true };
    },
    // A student applies for a job
    "POST /applications"(body) {
      const u = requireUser("student");
      const job = find.job(body.jobId);
      if (!job || job.status !== "Open") fail(400, "This job is no longer accepting applications.");
      if (db.applications.some((a) => a.jobId === job.id && a.studentId === u.id))
        fail(409, "You've already applied for this job.");
      const app = {
        id: newId("ap"),
        jobId: job.id,
        studentId: u.id,
        status: "Submitted",
        amount: body.amount,
        cover: body.cover,
        availability: body.availability,
        submitted: todayISO(),
      };
      db.applications.unshift(app);
      notify(
        job.employerId,
        "bi-person-plus",
        `${u.name} applied for <b>${job.title}</b>.`,
        `#/employer/jobs/${job.id}`,
      );
      notify(u.id, "bi-send-check", `Application sent for <b>${job.title}</b>.`, "#/applications");
      return app;
    },
    // Move an application to a new status. Only certain moves are allowed for each role.
    "PATCH /applications/:id"(body, id) {
      const u = me();
      const app = find.application(id);
      if (!app) fail(404, "Application not found.");
      const job = find.job(app.jobId);
      const allowed = {
        student: { Submitted: ["Withdrawn"], Shortlisted: ["Withdrawn"], Interview: ["Withdrawn"] },
        employer: {
          Submitted: ["Shortlisted", "Rejected", "Hired"],
          Shortlisted: ["Interview", "Hired", "Rejected"],
          Interview: ["Hired", "Rejected"],
        },
      };
      if (u.role === "employer" && job.employerId !== u.id) fail(403, "Not your job.");
      if (u.role === "student" && app.studentId !== u.id) fail(403, "Not your application.");
      if (!allowed[u.role]?.[app.status]?.includes(body.status))
        fail(400, `Can't move from ${app.status} to ${body.status}.`);
      app.status = body.status;
      if (body.note) app.note = body.note;
      const student = find.user(app.studentId);
      if (body.status === "Hired") {
        const project = {
          id: newId("p"),
          jobId: job.id,
          applicationId: app.id,
          studentId: student.id,
          employerId: job.employerId,
          status: "In progress",
          budget: job.pay.type === "Fixed" ? app.amount : Math.round(estimate(job).base),
          start: todayISO(),
          due: job.end,
          milestones: (job.deliverables || job.responsibilities).slice(0, 3).map((t, i, arr) => ({
            title: t,
            due: i === arr.length - 1 ? job.end : job.start,
            done: false,
          })),
          files: [],
          activity: [{ at: todayISO(), text: `${student.name.split(" ")[0]} was hired.` }],
        };
        db.projects.unshift(project);
        notify(
          student.id,
          "bi-briefcase",
          `You're hired for <b>${job.title}</b>!`,
          `#/projects/${project.id}`,
        );
      } else if (u.role === "employer") {
        notify(
          student.id,
          body.status === "Rejected" ? "bi-x-circle" : "bi-stars",
          `Your application for <b>${job.title}</b> is now <b>${body.status}</b>.`,
          "#/applications",
        );
      }
      return app;
    },
    "POST /saved"(body) {
      const u = requireUser("student");
      const list = (db.saved[u.id] = db.saved[u.id] || []);
      const i = list.indexOf(body.jobId);
      if (i >= 0) list.splice(i, 1);
      else list.unshift(body.jobId);
      return { saved: i < 0 };
    },
    "POST /shortlist"(body) {
      const u = requireUser("employer");
      const list = (db.shortlist[u.id] = db.shortlist[u.id] || []);
      const i = list.indexOf(body.studentId);
      if (i >= 0) list.splice(i, 1);
      else list.unshift(body.studentId);
      return { saved: i < 0 };
    },
    // Tick milestones, add files or change the project status
    "PATCH /projects/:id"(body, id) {
      const u = me();
      const p = find.project(id);
      if (!p || (u.id !== p.studentId && u.id !== p.employerId)) fail(403, "Not your project.");
      const name = u.name.split(" ")[0];
      if ("milestone" in body) {
        const m = p.milestones[body.milestone];
        m.done = !m.done;
        p.activity.unshift({
          at: todayISO(),
          text: `${name} ${m.done ? "completed" : "reopened"} “${m.title}”.`,
        });
      }
      if (body.addMilestone) {
        p.milestones.push({ title: body.addMilestone, due: body.due || p.due, done: false });
        p.activity.unshift({
          at: todayISO(),
          text: `${name} added a milestone: “${body.addMilestone}”.`,
        });
      }
      if (body.file) {
        p.files.unshift({ name: body.file.name, size: body.file.size, by: u.id, at: todayISO() });
        p.activity.unshift({ at: todayISO(), text: `${name} uploaded ${body.file.name}.` });
      }
      if (body.status) {
        p.status = body.status;
        if (body.status === "Completed") {
          p.completed = todayISO();
          p.milestones.forEach((m) => (m.done = true));
          notify(
            p.studentId,
            "bi-patch-check",
            `<b>${find.job(p.jobId).title}</b> was marked complete. Payment is released by the employer outside SkillBridge.`,
            `#/projects/${p.id}`,
          );
        }
        if (body.status === "In review")
          notify(
            p.employerId,
            "bi-inbox",
            `${name} submitted <b>${find.job(p.jobId).title}</b> for review.`,
            `#/projects/${p.id}`,
          );
        p.activity.unshift({
          at: todayISO(),
          text: `${name} changed the status to ${body.status}.`,
        });
      }
      return p;
    },
    "POST /reviews"(body) {
      const u = me();
      const p = find.project(body.projectId);
      if (db.reviews.some((r) => r.projectId === p.id && r.from === u.id))
        fail(409, "You've already reviewed this project.");
      const to = u.id === p.studentId ? p.employerId : p.studentId;
      const review = {
        id: newId("r"),
        projectId: p.id,
        from: u.id,
        to,
        stars: body.stars,
        text: body.text,
        date: todayISO(),
      };
      db.reviews.unshift(review);
      notify(to, "bi-star", `${u.name} left you a ${body.stars}-star review.`, "#/profile");
      return review;
    },
    "POST /messages"(body) {
      const u = requireUser();
      let convo = body.conversationId
        ? find.conversation(body.conversationId)
        : db.conversations.find((c) => c.members.includes(u.id) && c.members.includes(body.to));
      if (!convo) {
        convo = {
          id: newId("c"),
          members: [u.id, body.to],
          jobId: body.jobId || null,
          messages: [],
        };
        db.conversations.unshift(convo);
      }
      convo.messages.push({ from: u.id, text: body.text, at: now().toISOString().slice(0, 16) });
      return convo;
    },
    "PATCH /users/:id"(body, id) {
      const u = me();
      if (!u || u.id !== id) fail(403, "You can only edit your own profile.");
      const target = find.user(id);
      Object.assign(target, body);
      return target;
    },
    // Simulated login: compares against the sample users (not secure, demo only)
    "POST /auth/login"(body) {
      const login = body.login.trim().toLowerCase();
      const u = db.users.find(
        (x) => (x.username === login || x.email === login) && x.password === body.password,
      );
      if (!u) fail(401, "That username or password isn't right.");
      db.session = u.id;
      return u;
    },
    "POST /auth/register"(body) {
      if (db.users.some((u) => u.email === body.email.toLowerCase()))
        fail(409, "An account with this email already exists.");
      const base = {
        id: newId(body.role === "student" ? "s" : "e"),
        role: body.role,
        email: body.email.toLowerCase(),
        username: body.email.toLowerCase(),
        password: body.password,
        name: body.name,
        joined: todayISO(),
        status: "Active",
      };
      const extra =
        body.role === "student"
          ? {
              university: body.university,
              course: body.course,
              year: body.year || "Year 1",
              city: body.city,
              mode: "Any",
              rate: 15,
              color: "#0b63f6",
              cover: "desk-creative",
              headline: "",
              bio: "",
              skills: body.skills || [],
              languages: ["Bahasa Melayu", "English"],
              interests: body.interests || [],
              avail: {},
              education: [{ school: body.university, programme: body.course, period: "" }],
              experience: [],
              portfolio: [],
            }
          : {
              type: "Company",
              industry: body.industry,
              city: body.city,
              legalName: body.name,
              address: body.city,
              size: "1–10 staff",
              founded: null,
              website: "",
              contact: body.name,
              verified: false,
              logo: null,
              cover: "city-night",
              about: "",
            };
      const u = { ...base, ...extra };
      db.users.push(u);
      db.session = u.id;
      notify(
        u.id,
        "bi-emoji-smile",
        "Welcome to SkillBridge! Complete your profile to get better matches.",
        "#/profile",
      );
      return u;
    },
    "POST /auth/logout"() {
      db.session = null;
      return { ok: true };
    },
    "POST /contact"(body) {
      return { ticket: "SB-" + (48210 + counter++), received: body.topic };
    },
    "POST /notifications/read"(body) {
      const u = requireUser();
      db.notifications
        .filter((n) => n.userId === u.id && (!body.id || n.id === body.id))
        .forEach((n) => (n.read = true));
      return { ok: true };
    },
  };

  // Finds the route that matches a method and path, e.g. "GET /jobs/j102" -> "GET /jobs/:id" with id j102
  function match(method, path) {
    for (const key of Object.keys(routes)) {
      const [m, pattern] = key.split(" ");
      if (m !== method) continue;
      const a = pattern.split("/");
      const b = path.split("/");
      if (a.length !== b.length) continue;
      const params = [];
      if (
        a.every((part, i) =>
          part.startsWith(":") ? params.push(decodeURIComponent(b[i])) : part === b[i],
        )
      )
        return { handler: routes[key], params };
    }
    return null;
  }

  // Pretends to call a server: waits a moment, runs the matching route and returns a Promise
  function request(method, url, payload = {}) {
    const [path, qs] = url.split("?");
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          const route = match(method, path);
          try {
            if (!route) fail(404, "No such endpoint.");
            // GET requests read from the query string; POST/PATCH send a copy of the body
            const input = method === "GET" ? { ...query, ...payload } : structuredClone(payload);
            resolve(route.handler(input, ...route.params));
          } catch (err) {
            reject(err);
          }
        },
        method === "GET" ? 120 : 380,
      );
    });
  }

  SB.api = {
    get: (url, query) => request("GET", url, query),
    post: (url, body) => request("POST", url, body),
    patch: (url, body) => request("PATCH", url, body),
    del: (url) => request("DELETE", url),
  };

  Object.assign(SB, {
    db,
    DAYS,
    fmt,
    find,
    me,
    now,
    todayISO,
    rating,
    payLabel,
    payUnit,
    basePay,
    estimate,
    matchScore,
    overlaps,
    growth,
    level,
    profileCompletion,
    notify,
  });
})();
