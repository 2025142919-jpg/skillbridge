/* Pages shared by students and employers: messages, notifications, projects and reviews */
(function () {
  const { ui, db, fmt, find, api } = SB;
  const { $, $$, esc } = ui;

  /* ================= Messages ================= */
  SB.startChat = (otherId, jobId) => {
    const u = SB.me();
    if (!u) return SB.go("#/login");
    let convo =
      db.conversations.find(
        (c) =>
          c.members.includes(u.id) && c.members.includes(otherId) && (!jobId || c.jobId === jobId),
      ) || db.conversations.find((c) => c.members.includes(u.id) && c.members.includes(otherId));
    if (!convo) {
      convo = {
        id: "c" + Date.now(),
        members: [u.id, otherId],
        jobId: jobId || null,
        messages: [],
      };
      db.conversations.unshift(convo);
    }
    $(".modal.show") && bootstrap.Modal.getInstance($(".modal.show"))?.hide();
    SB.go(`#/messages/${convo.id}`);
  };

  const lastAt = (c) => c.messages.at(-1)?.at || "9999";

  function messagesPage(params) {
    const u = SB.me();
    const activeId = params[0];
    const convos = db.conversations
      .filter((c) => c.members.includes(u.id))
      .sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
    const active = activeId ? convos.find((c) => c.id === activeId) : null;
    if (activeId && !active) throw new Error("Conversation not found.");
    if (active) active.seen = [...new Set([...(active.seen || []), u.id])];

    const listItem = (c) => {
      const other = find.user(c.members.find((m) => m !== u.id));
      const last = c.messages.at(-1);
      const unread = last && last.from !== u.id && !c.seen?.includes(u.id);
      return `<a class="chat-item ${c === active ? "active" : ""}" href="#/messages/${c.id}" data-name="${esc(other.name.toLowerCase())}">${ui.avatar(other)}<div class="flex-fill" style="min-width:0"><div class="d-flex justify-content-between gap-2"><span class="small-text fw-650 text-truncate">${esc(other.name)}</span><span class="tiny muted text-nowrap">${last ? fmt.ago(last.at) : "New"}</span></div>${c.jobId ? `<div class="tiny text-accent text-truncate">${esc(find.job(c.jobId)?.title || "")}</div>` : ""}<div class="preview">${last ? (last.from === u.id ? "You: " : "") + esc(last.text) : "Start the conversation"}</div></div>${unread ? `<span class="unread"></span>` : ""}</a>`;
    };

    let pane = `<div class="d-flex flex-column align-items-center justify-content-center h-100 p-4">${ui.empty("bi-chat-square-text", "Select a conversation", "Messages with employers and students appear here.")}</div>`;
    if (active) {
      const other = find.user(active.members.find((m) => m !== u.id));
      const job = active.jobId ? find.job(active.jobId) : null;
      pane = `<div class="chat-head">
          <a class="icon-btn d-lg-none" href="#/messages" aria-label="Back to conversations"><i class="bi bi-chevron-left"></i></a>
          ${ui.avatar(other)}
          <div class="flex-fill" style="min-width:0"><a class="fw-650 small-text d-block" href="${other.role === "student" ? `#/talent/${other.id}` : `#/companies/${other.id}`}" style="color:var(--ink)">${esc(other.name)}</a>${job ? `<a class="tiny text-truncate d-block" href="#/jobs/${job.id}">${esc(job.title)}</a>` : `<span class="tiny muted">${esc(other.role === "student" ? other.university : other.industry)}</span>`}</div>
          <div class="dropdown"><button class="icon-btn" data-bs-toggle="dropdown" aria-label="Conversation options"><i class="bi bi-three-dots"></i></button><div class="dropdown-menu dropdown-menu-end"><a class="dropdown-item" href="${other.role === "student" ? `#/talent/${other.id}` : `#/companies/${other.id}`}"><i class="bi bi-person"></i>View profile</a></div></div>
        </div>
        <div class="chat-body" id="chat-body">${renderMessages(active, u)}</div>
        <form class="chat-compose" id="compose" autocomplete="off">
          <input class="form-control" name="text" placeholder="Write a message…" aria-label="Message" maxlength="1000">
          <button class="btn btn-accent" aria-label="Send"><i class="bi bi-send"></i></button>
        </form>`;
    }

    return {
      title: "Messages",
      html: `<div class="page-head"><div><h1>Messages</h1><p>Replies from the other person are simulated in this demo.</p></div></div>
        <div class="chat-shell ${active ? "has-active" : ""}">
          <div class="chat-list"><div class="p-3 border-bottom" style="border-color:var(--line)!important"><div class="input-icon"><i class="bi bi-search"></i><input class="form-control form-control-sm" id="chat-search" placeholder="Search people" aria-label="Search conversations" style="border-radius:999px"></div></div><div id="chat-items">${convos.map(listItem).join("") || `<p class="tiny muted p-3">No conversations yet.</p>`}</div></div>
          <div class="chat-pane">${pane}</div>
        </div>`,
      mount() {
        $("#chat-search").addEventListener("input", (e) => {
          const q = e.target.value.toLowerCase();
          $$("#chat-items .chat-item").forEach(
            (a) => (a.style.display = a.dataset.name.includes(q) ? "" : "none"),
          );
        });
        if (!active) return;
        const drawList = () => {
          active.seen = [...new Set([...(active.seen || []), u.id])];
          const sorted = db.conversations
            .filter((c) => c.members.includes(u.id))
            .sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
          $("#chat-items").innerHTML = sorted.map(listItem).join("");
        };
        const body = $("#chat-body");
        body.scrollTop = body.scrollHeight;
        const form = $("#compose");
        form.elements.text.focus();
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const text = form.elements.text.value.trim();
          if (!text) return;
          form.elements.text.value = "";
          await api.post("/messages", { conversationId: active.id, text });
          body.innerHTML = renderMessages(active, u);
          body.scrollTop = body.scrollHeight;
          drawList();
          SB.refreshNav();
          simulateReply(active, u, body, drawList);
        });
      },
    };
  }

  function renderMessages(c, u) {
    if (!c.messages.length)
      return `<div class="m-auto text-center muted small-text">Say hello and mention the job you're writing about.</div>`;
    let lastDay = "";
    return c.messages
      .map((m) => {
        const day = m.at.slice(0, 10);
        const mine = m.from === u.id;
        const sep =
          day !== lastDay
            ? `<div class="chat-day">${fmt.date(day, { weekday: "short", day: "numeric", month: "short" })}</div>`
            : "";
        lastDay = day;
        return `${sep}<div class="bubble ${mine ? "me" : ""}">${esc(m.text).replace(/\n/g, "<br>")}</div><div class="bubble-meta ${mine ? "me" : ""}">${fmt.time(m.at)}${m.demo ? " · demo auto-reply" : ""}</div>`;
      })
      .join("");
  }

  const REPLIES = {
    employer: [
      "Thanks for the message! I'll check and get back to you by tonight.",
      "Noted. Could you share your availability for the briefing?",
      "Sounds good. The details are in the listing; let me know if anything is unclear.",
      "Great, see you there. Please arrive 15 minutes early.",
    ],
    student: [
      "Thank you! I'm available on those dates.",
      "Noted, I'll prepare everything before the deadline.",
      "Sure, a quick call works for me. Any time after 6 pm?",
      "Thanks for the update!",
    ],
  };

  function simulateReply(c, u, body, after) {
    const otherId = c.members.find((m) => m !== u.id);
    const other = find.user(otherId);
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    setTimeout(() => {
      if (!body.isConnected) return;
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;
    }, 600);
    setTimeout(() => {
      const pool = REPLIES[other.role] || REPLIES.employer;
      c.messages.push({
        from: otherId,
        text: pool[c.messages.length % pool.length],
        at: SB.now().toISOString().slice(0, 16),
        demo: true,
      });
      typing.remove();
      if (body.isConnected) {
        body.innerHTML = renderMessages(c, u);
        body.scrollTop = body.scrollHeight;
        after?.();
      }
    }, 2000);
  }

  SB.route("/messages", messagesPage, { auth: ["student", "employer"], shell: "app" });
  SB.route("/messages/:id", messagesPage, {
    auth: ["student", "employer"],
    shell: "app",
    nav: "/messages",
  });

  /* ================= Notifications ================= */
  SB.route(
    "/notifications",
    (params, query) => {
      const u = SB.me();
      const onlyUnread = query.filter === "unread";
      const list = db.notifications
        .filter((n) => n.userId === u.id && (!onlyUnread || !n.read))
        .sort((a, b) => b.at.localeCompare(a.at));
      const today = SB.todayISO();
      const groups = [
        ["Today", list.filter((n) => n.at.startsWith(today))],
        ["Earlier", list.filter((n) => !n.at.startsWith(today))],
      ];
      return {
        title: "Notifications",
        html: `<div class="page-head"><div><h1>Notifications</h1><p>Updates about applications, projects and messages.</p></div><button class="btn btn-ghost" data-read-all>Mark all as read</button></div>
        <div class="segmented mb-3"><a href="#/notifications" class="${onlyUnread ? "" : "on"}">All</a><a href="#/notifications?filter=unread" class="${onlyUnread ? "on" : ""}">Unread</a></div>
        ${
          list.length
            ? groups
                .filter(([, l]) => l.length)
                .map(
                  ([label, l]) =>
                    `<div class="tiny muted fw-650 text-uppercase mt-3 mb-2">${label}</div><div class="card-x flush">${l.map((n) => `<a class="d-flex gap-3 p-3 border-bottom align-items-start" href="${n.link}" data-note="${n.id}" style="color:inherit;border-color:var(--line)!important;${n.read ? "" : "background:var(--accent-soft)"}"><span class="d-grid flex-none" style="width:36px;height:36px;border-radius:10px;background:var(--surface-2);place-items:center"><i class="bi ${n.icon} ${n.read ? "muted" : "text-accent"}"></i></span><div class="flex-fill"><div class="small-text">${n.text}</div><div class="tiny muted">${fmt.ago(n.at)}</div></div>${n.read ? "" : `<span class="unread" style="width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:6px"></span>`}</a>`).join("")}</div>`,
                )
                .join("")
            : `<div class="card-x">${ui.empty("bi-bell", onlyUnread ? "No unread notifications" : "No notifications yet")}</div>`
        }`,
      };
    },
    { auth: true, shell: "app" },
  );

  /* ================= Projects ================= */
  SB.route(
    "/projects",
    () => {
      const u = SB.me();
      const mine = db.projects.filter((p) => p.studentId === u.id || p.employerId === u.id);
      const cols = [
        ["In progress", "bi-play-circle"],
        ["In review", "bi-hourglass-split"],
        ["Completed", "bi-check2-circle"],
      ];
      return {
        title: "Projects",
        html: `<div class="page-head"><div><h1>Projects</h1><p>Everything you've been hired for${u.role === "employer" ? " or hired someone to do" : ""}, with milestones and files.</p></div></div>
        <div class="board">${cols
          .map(([status, icon]) => {
            const list = mine.filter((p) => p.status === status);
            return `<div class="board-col"><h3><span><i class="bi ${icon} me-1"></i>${status}</span><span class="muted">${list.length}</span></h3>${
              list
                .map((p) => {
                  const job = find.job(p.jobId);
                  const other = find.user(u.id === p.studentId ? p.employerId : p.studentId);
                  const done = p.milestones.filter((m) => m.done).length;
                  const d = fmt.daysLeft(p.due);
                  return `<a class="board-card" href="#/projects/${p.id}"><div class="d-flex gap-2 align-items-center mb-2">${ui.avatar(other, "sm")}<span class="tiny muted text-truncate">${esc(other.name)}</span></div><div class="small-text fw-650 mb-2">${esc(job.title)}</div><div class="bar mb-2"><span style="width:${(done / p.milestones.length) * 100}%"></span></div><div class="d-flex justify-content-between tiny muted"><span>${done}/${p.milestones.length} milestones</span><span>${p.status === "Completed" ? fmt.shortDate(p.completed) : d < 0 ? `<span class="text-bad">Overdue</span>` : `Due ${fmt.shortDate(p.due)}`}</span></div></a>`;
                })
                .join("") || `<p class="tiny muted px-2">Nothing here.</p>`
            }</div>`;
          })
          .join("")}</div>`,
      };
    },
    { auth: ["student", "employer"], shell: "app" },
  );

  SB.route(
    "/projects/:id",
    ([id]) => {
      const u = SB.me();
      const p = find.project(id);
      if (!p || (p.studentId !== u.id && p.employerId !== u.id))
        throw new Error("Project not found.");
      const job = find.job(p.jobId);
      const isStudent = u.id === p.studentId;
      const other = find.user(isStudent ? p.employerId : p.studentId);
      const done = p.milestones.filter((m) => m.done).length;
      const myReview = db.reviews.find((r) => r.projectId === p.id && r.from === u.id);
      const theirReview = db.reviews.find((r) => r.projectId === p.id && r.from === other.id);

      let actions = "";
      if (p.status === "In progress" && isStudent)
        actions = `<button class="btn btn-accent" data-status="In review" data-busy="Submitting…"><i class="bi bi-send-check me-1"></i>Submit for review</button>`;
      if (p.status !== "Completed" && !isStudent)
        actions = `${p.status === "In review" ? `<button class="btn btn-ghost" data-status="In progress">Request changes</button>` : ""}<button class="btn btn-accent" data-status="Completed" data-busy="Completing…"><i class="bi bi-patch-check me-1"></i>Mark complete</button>`;
      if (p.status === "Completed" && !myReview)
        actions = `<button class="btn btn-accent" id="review-btn"><i class="bi bi-star me-1"></i>Leave a review</button>`;

      return {
        title: job.title,
        html: `<a class="small-text" href="#/projects"><i class="bi bi-arrow-left"></i> Projects</a>
        <div class="page-head mt-2"><div><div class="d-flex gap-2 align-items-center mb-1">${ui.status(p.status)}<span class="tiny muted">${esc(find.cat(job.cat).name)}</span></div><h1 class="h2">${esc(job.title)}</h1><p>With <a href="${other.role === "student" ? `#/talent/${other.id}` : `#/companies/${other.id}`}">${esc(other.name)}</a> · ${fmt.date(p.start)} – ${fmt.date(p.due)}</p></div><div class="d-flex gap-2 flex-wrap"><button class="btn btn-ghost" id="chat-btn"><i class="bi bi-chat me-1"></i>Message</button>${actions}</div></div>
        <div class="row g-3">
          <div class="col-lg-8">
            <div class="card-x">
              <div class="card-title-row"><h2>Milestones</h2><span class="tiny muted tabular">${done} of ${p.milestones.length} done</span></div>
              <div class="bar mb-2"><span style="width:${(done / p.milestones.length) * 100}%"></span></div>
              ${p.milestones.map((m, i) => `<div class="check-row ${m.done ? "done" : ""}"><button class="tick ${m.done ? "on" : ""}" data-ms="${i}" ${p.status === "Completed" ? "disabled" : ""} aria-label="${m.done ? "Mark not done" : "Mark done"}: ${esc(m.title)}"><i class="bi bi-check"></i></button><span class="what flex-fill small-text">${esc(m.title)}</span><span class="tiny muted tabular">${fmt.shortDate(m.due)}</span></div>`).join("")}
              ${p.status !== "Completed" ? `<form class="d-flex gap-2 mt-3" id="ms-form"><input class="form-control form-control-sm" name="title" placeholder="Add a milestone" aria-label="New milestone"><input class="form-control form-control-sm" type="date" name="due" value="${p.due}" style="max-width:160px" aria-label="Due date"><button class="btn btn-ghost btn-sm">Add</button></form>` : ""}
            </div>
            <div class="card-x section-gap">
              <div class="card-title-row"><h2>Files</h2>${p.status !== "Completed" ? `<label class="btn btn-ghost btn-sm mb-0"><i class="bi bi-upload me-1"></i>Upload<input type="file" id="file-in" class="d-none" multiple></label>` : ""}</div>
              ${p.files.map((f) => `<div class="d-flex align-items-center gap-3 py-2 border-bottom" style="border-color:var(--line)!important"><i class="bi bi-file-earmark-text fs-5 text-accent"></i><div class="flex-fill"><div class="small-text fw-650">${esc(f.name)}</div><div class="tiny muted">${esc(f.size)} · ${esc(find.user(f.by).name)} · ${fmt.date(f.at)}</div></div></div>`).join("") || `<p class="small-text muted mb-0">No files yet. Upload drafts, run sheets or final deliverables.</p>`}
              <p class="tiny muted mt-2 mb-0">Demo: only the file name and size are recorded; nothing is uploaded.</p>
            </div>
            ${
              p.status === "Completed"
                ? `<div class="card-x section-gap"><div class="card-title-row"><h2>Reviews</h2></div>
              ${[
                [theirReview, `${esc(other.name)} reviewed you`],
                [myReview, "Your review"],
              ]
                .map(
                  ([r, l]) =>
                    `<div class="py-2"><div class="tiny muted mb-1">${l}</div>${r ? `${ui.stars(r.stars)}<p class="small-text mb-0 mt-1">${esc(r.text)}</p>` : `<span class="small-text muted">Not yet</span>`}</div>`,
                )
                .join("")}</div>`
                : ""
            }
          </div>
          <div class="col-lg-4">
            <div class="card-x"><h2 class="h6">Payment</h2>
              <div class="cost-line"><span>Agreed amount</span><span class="tabular fw-650">${fmt.rm(p.budget)}</span></div>
              <div class="cost-line"><span>Terms</span><span class="small-text text-end" style="max-width:60%">${esc(job.payTerms)}</span></div>
              <div class="cost-line"><span>Status</span><span>${p.status === "Completed" ? ui.status("Released by employer", "ok") : ui.status("Pending completion", "warn")}</span></div>
              <p class="tiny muted mt-2 mb-0">SkillBridge doesn't process payments in this demo.</p>
            </div>
            <div class="card-x mt-3"><h2 class="h6 mb-3">Activity</h2><ul class="timeline">${p.activity.map((a) => `<li><div class="small-text">${esc(a.text)}</div><div class="tiny muted">${fmt.date(a.at)}</div></li>`).join("")}</ul></div>
          </div>
        </div>`,
        mount(page) {
          $("#chat-btn").addEventListener("click", () => SB.startChat(other.id, job.id));
          page.addEventListener("click", async (e) => {
            const ms = e.target.closest("[data-ms]");
            const st = e.target.closest("[data-status]");
            if (ms) {
              await api.patch(`/projects/${id}`, { milestone: Number(ms.dataset.ms) });
              SB.render();
            }
            if (st) {
              const to = st.dataset.status;
              if (
                to === "Completed" &&
                !(await ui.confirmBox(
                  "Mark this project complete?",
                  "All milestones will be ticked and the student's skills will level up. Please release payment as agreed.",
                  "Mark complete",
                ))
              )
                return;
              await ui.busy(st, () => api.patch(`/projects/${id}`, { status: to }));
              ui.toast(
                to === "Completed"
                  ? "Project completed. Leave a review!"
                  : to === "In review"
                    ? "Submitted for review."
                    : "Sent back for changes.",
              );
              SB.render();
            }
          });
          $("#review-btn")?.addEventListener("click", () => reviewModal(p, other));
          $("#ms-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const f = e.target;
            if (!ui.validate(f, { title: ui.minLen("Milestone", 3) })) return;
            await api.patch(`/projects/${id}`, {
              addMilestone: f.elements.title.value.trim(),
              due: f.elements.due.value,
            });
            SB.render();
          });
          $("#file-in")?.addEventListener("change", async (e) => {
            for (const file of e.target.files) {
              const size =
                file.size > 1048576
                  ? (file.size / 1048576).toFixed(1) + " MB"
                  : Math.max(1, Math.round(file.size / 1024)) + " KB";
              await api.patch(`/projects/${id}`, { file: { name: file.name, size } });
            }
            ui.toast("File recorded.");
            SB.render();
          });
        },
      };
    },
    { auth: ["student", "employer"], shell: "app", nav: "/projects" },
  );

  function reviewModal(p, other) {
    let stars = 0;
    const m = ui.modal({
      title: `Review ${esc(other.name)}`,
      body: `<div class="text-center mb-3" id="star-pick" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn p-1 fs-2" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? "s" : ""}" style="color:var(--surface-3)">★</button>`).join("")}<div class="tiny muted" id="star-label">Tap to rate</div></div>
        <label class="form-label" for="rv-text">Your review</label><textarea class="form-control" id="rv-text" rows="4" placeholder="What went well? What could be better?"></textarea>`,
      footer: `<button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-accent" id="rv-send" data-busy="Posting…">Post review</button>`,
    });
    const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
    const paint = (n) =>
      $$("[data-star]", m.el).forEach((b) => {
        b.style.color = Number(b.dataset.star) <= n ? "#f5a623" : "var(--surface-3)";
        b.setAttribute("aria-checked", Number(b.dataset.star) === stars);
      });
    $$("[data-star]", m.el).forEach((b) => {
      b.addEventListener("mouseenter", () => paint(Number(b.dataset.star)));
      b.addEventListener("mouseleave", () => paint(stars));
      b.addEventListener("click", () => {
        stars = Number(b.dataset.star);
        $("#star-label", m.el).textContent = labels[stars];
        paint(stars);
      });
    });
    $("#rv-send", m.el).addEventListener("click", async (e) => {
      const text = $("#rv-text", m.el).value.trim();
      if (!stars) return ui.toast("Choose a star rating.", "bad");
      if (text.length < 15) return ui.toast("Write at least a sentence (15+ characters).", "bad");
      await ui.busy(e.currentTarget, () => api.post("/reviews", { projectId: p.id, stars, text }));
      m.close();
      ui.toast("Thanks for your review!");
      SB.render();
    });
  }
})();
