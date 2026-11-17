/* Login and multi-step registration */
(function () {
  const { ui, db, api, find } = SB;
  const { $, $$, esc } = ui;

  const DEMOS = [
    ["student", "student123", "s1", "Student", "Aina · Information Management, UiTM"],
    ["employer", "employer123", "e1", "Employer", "Teratai Events · event company"],
  ];

  function goAfterLogin(user, next) {
    const target = next && !next.startsWith("/login") ? "#" + next : SB.homeFor(user);
    SB.go(target);
  }

  SB.route("/login", (params, query) => {
    if (SB.me()) return { title: "Log in", html: "", mount: () => SB.go(SB.homeFor(SB.me())) };
    return {
      title: "Log in",
      html: `<div class="auth-wrap">
        <div class="auth-visual"><img src="${ui.photo("bokeh-lights")}" alt=""><div><span class="eyebrow" style="color:#fff">Welcome back</span><h2 class="mt-2">Pick up where you left off.</h2><p class="mb-0">Applications, messages and projects are waiting.</p></div></div>
        <div class="auth-form"><div class="box">
          <h1 class="h2">Log in</h1>
          <p class="muted">Don't have an account? <a href="#/register">Create one</a></p>
          <form id="login-form" novalidate class="mt-4">
            <label class="form-label" for="login">Username or email</label>
            <input class="form-control mb-3" id="login" name="login" autocomplete="username" placeholder="e.g. student">
            <label class="form-label" for="password">Password</label>
            <div class="position-relative mb-2">
              <input class="form-control" id="password" name="password" type="password" autocomplete="current-password" style="padding-right:44px">
              <button type="button" class="icon-btn position-absolute end-0 top-50 translate-middle-y me-1" id="peek" aria-label="Show password"><i class="bi bi-eye"></i></button>
            </div>
            <div id="login-error" class="text-bad small-text mb-2" role="alert"></div>
            <button class="btn btn-accent btn-lg w-100 mt-2" data-busy="Signing in…">Log in</button>
          </form>
          <div class="divider"></div>
          <div class="small-text fw-650 mb-2">Demo accounts <span class="tiny muted fw-normal">· click to fill</span></div>
          <div class="demo-accounts">
            ${DEMOS.map(([u, p, id, role, desc]) => `<button class="demo-account" data-user="${u}" data-pass="${p}">${ui.avatar(find.user(id), "sm")}<span class="flex-fill"><b>${role}</b><span class="d-block tiny muted">${desc}</span></span><code class="tiny muted">${u} / ${p}</code></button>`).join("")}
          </div>
          <p class="tiny muted mt-3 mb-0"><i class="bi bi-info-circle"></i> Simulated login for demonstration only. Passwords are not encrypted and nothing is stored after you refresh.</p>
        </div></div>
      </div>`,
      mount() {
        const form = $("#login-form");
        $("#peek").addEventListener("click", (e) => {
          const input = form.elements.password;
          input.type = input.type === "password" ? "text" : "password";
          e.currentTarget.innerHTML = `<i class="bi ${input.type === "password" ? "bi-eye" : "bi-eye-slash"}"></i>`;
        });
        $$(".demo-account").forEach((b) =>
          b.addEventListener("click", () => {
            form.elements.login.value = b.dataset.user;
            form.elements.password.value = b.dataset.pass;
            form.requestSubmit();
          }),
        );
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          $("#login-error").textContent = "";
          if (
            !ui.validate(form, {
              login: ui.required("Username or email"),
              password: ui.required("Password"),
            })
          )
            return;
          try {
            const user = await ui.busy(form.querySelector("button.btn-accent"), () =>
              api.post("/auth/login", {
                login: form.elements.login.value,
                password: form.elements.password.value,
              }),
            );
            ui.toast(`Welcome back, ${esc(user.name.split(" ")[0])}.`);
            goAfterLogin(user, query.next);
          } catch (err) {
            $("#login-error").textContent = err.message;
          }
        });
      },
    };
  });

  SB.route("/register", (params, query) => {
    if (SB.me()) return { title: "Register", html: "", mount: () => SB.go(SB.homeFor(SB.me())) };
    const data = {
      role: query.role === "employer" ? "employer" : "student",
      skills: [],
      interests: [],
    };
    let step = 0;
    const steps = ["Account type", "Your details", "Profile"];

    return {
      title: "Create an account",
      html: `<div class="auth-wrap">
        <div class="auth-visual"><img src="${ui.photo("camera-vintage")}" alt=""><div><span class="eyebrow" style="color:#fff">Join SkillBridge</span><h2 class="mt-2">Two minutes to your first match.</h2><p class="mb-0">Students set skills and free hours. Employers describe the work properly. Everyone wins.</p></div></div>
        <div class="auth-form"><div class="box">
          <h1 class="h2">Create your account</h1>
          <p class="muted">Already registered? <a href="#/login">Log in</a></p>
          <div class="stepper mt-4" id="stepper"></div>
          <form id="reg-form" novalidate></form>
        </div></div>
      </div>`,
      mount() {
        const form = $("#reg-form");

        function drawStepper() {
          $("#stepper").innerHTML = steps
            .map(
              (s, i) =>
                `<div class="step ${i < step ? "done" : i === step ? "on" : ""}">${s}</div>`,
            )
            .join("");
        }

        function draw() {
          drawStepper();
          const isStudent = data.role === "student";
          if (step === 0) {
            form.innerHTML = `<div class="role-pick">
                <label class="role-option"><input type="radio" name="role" value="student" ${isStudent ? "checked" : ""}><i class="bi bi-mortarboard"></i><strong>I'm a student</strong><span>Find freelance and part-time work</span></label>
                <label class="role-option"><input type="radio" name="role" value="employer" ${!isStudent ? "checked" : ""}><i class="bi bi-briefcase"></i><strong>I'm hiring</strong><span>Post jobs for your business</span></label>
              </div>
              <button class="btn btn-accent btn-lg w-100 mt-4">Continue</button>`;
          } else if (step === 1) {
            form.innerHTML = `
              <label class="form-label" for="r-name">${isStudent ? "Full name" : "Company name"}</label>
              <input class="form-control mb-3" id="r-name" name="name" value="${esc(data.name || "")}" autocomplete="name">
              <label class="form-label" for="r-email">Email</label>
              <input class="form-control mb-3" id="r-email" name="email" type="email" value="${esc(data.email || "")}" autocomplete="email" placeholder="${isStudent ? "you@student.uitm.edu.my" : "hiring@company.com"}">
              <label class="form-label" for="r-pass">Password</label>
              <input class="form-control" id="r-pass" name="password" type="password" autocomplete="new-password">
              <div class="pw-meter" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
              <div class="form-text mb-3" id="pw-hint">At least 8 characters with a number.</div>
              <label class="form-label" for="r-pass2">Confirm password</label>
              <input class="form-control mb-3" id="r-pass2" name="password2" type="password" autocomplete="new-password">
              <div class="d-flex gap-2 mt-2"><button type="button" class="btn btn-ghost btn-lg" data-back>Back</button><button class="btn btn-accent btn-lg flex-fill">Continue</button></div>`;
            form.elements.password.addEventListener("input", (e) => {
              const v = e.target.value;
              const score = [
                v.length >= 8,
                /\d/.test(v),
                /[A-Z]/.test(v) && /[a-z]/.test(v),
                /[^A-Za-z0-9]/.test(v) || v.length >= 12,
              ].filter(Boolean).length;
              const colours = ["var(--bad)", "var(--warn)", "var(--warn)", "var(--ok)"];
              $$(".pw-meter span").forEach(
                (s, i) => (s.style.background = i < score ? colours[score - 1] : ""),
              );
              $("#pw-hint").textContent = [
                "At least 8 characters with a number.",
                "Weak",
                "Okay",
                "Good",
                "Strong",
              ][score];
            });
          } else {
            form.innerHTML = isStudent
              ? `<div class="row g-3">
                  <div class="col-12"><label class="form-label" for="r-uni">University</label><select class="form-select" id="r-uni" name="university"><option value="">Choose your university</option>${db.universities.map((u) => `<option>${u}</option>`).join("")}<option>Other</option></select></div>
                  <div class="col-md-7"><label class="form-label" for="r-course">Programme</label><select class="form-select" id="r-course" name="course"><option value="">Choose one</option>${Object.keys(
                    db.courses,
                  )
                    .map((c) => `<option>${c}</option>`)
                    .join("")}</select></div>
                  <div class="col-md-5"><label class="form-label" for="r-city">City</label><input class="form-control" id="r-city" name="city" placeholder="Shah Alam"></div>
                  <div class="col-12"><div class="form-label">Interested in <span class="muted fw-normal">(pick any, even outside your course)</span></div><div class="d-flex flex-wrap gap-2" id="interest-chips">${db.categories.map((c) => `<span class="chip" data-cat="${c.id}" role="checkbox" aria-checked="false" tabindex="0"><i class="bi ${c.icon}"></i>${esc(c.short)}</span>`).join("")}</div></div>
                  <div class="col-12 form-check ms-1"><input class="form-check-input" type="checkbox" id="r-terms" name="terms"><label class="form-check-label small-text" for="r-terms">I agree to the demo terms and understand nothing is saved.</label></div>
                </div>
                <div class="d-flex gap-2 mt-4"><button type="button" class="btn btn-ghost btn-lg" data-back>Back</button><button class="btn btn-accent btn-lg flex-fill" data-busy="Creating account…">Create account</button></div>`
              : `<div class="row g-3">
                  <div class="col-md-7"><label class="form-label" for="r-industry">Industry</label><input class="form-control" id="r-industry" name="industry" placeholder="Events, F&B, retail…"></div>
                  <div class="col-md-5"><label class="form-label" for="r-city">City</label><input class="form-control" id="r-city" name="city" placeholder="Kuala Lumpur"></div>
                  <div class="col-12 form-check ms-1"><input class="form-check-input" type="checkbox" id="r-terms" name="terms"><label class="form-check-label small-text" for="r-terms">I'll describe pay, costs and conditions honestly in every listing.</label></div>
                </div>
                <div class="d-flex gap-2 mt-4"><button type="button" class="btn btn-ghost btn-lg" data-back>Back</button><button class="btn btn-accent btn-lg flex-fill" data-busy="Creating account…">Create account</button></div>`;
            $$("#interest-chips .chip").forEach((chip) => {
              const toggle = () => {
                chip.classList.toggle("on");
                chip.setAttribute("aria-checked", chip.classList.contains("on"));
              };
              chip.addEventListener("click", toggle);
              chip.addEventListener(
                "keydown",
                (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle()),
              );
            });
          }
          form.querySelector("[data-back]")?.addEventListener("click", () => {
            step--;
            draw();
          });
          form.querySelector("input,select")?.focus();
        }

        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          if (step === 0) {
            data.role = form.elements.role.value;
            step = 1;
            return draw();
          }
          if (step === 1) {
            const ok = ui.validate(form, {
              name: ui.minLen("Name", 3),
              email: (v) =>
                ui.isEmail(v) ||
                (db.users.some((u) => u.email === v.toLowerCase())
                  ? "An account with this email already exists."
                  : ""),
              password: (v) =>
                v.length >= 8 && /\d/.test(v)
                  ? ""
                  : "Use at least 8 characters including a number.",
              password2: (v) =>
                v === form.elements.password.value ? "" : "Passwords don't match.",
            });
            if (!ok) return;
            Object.assign(data, {
              name: form.elements.name.value.trim(),
              email: form.elements.email.value.trim(),
              password: form.elements.password.value,
            });
            step = 2;
            return draw();
          }
          const rules =
            data.role === "student"
              ? {
                  university: ui.required("University"),
                  course: ui.required("Programme"),
                  city: ui.required("City"),
                  terms: (v, f) => (f.checked ? "" : "Please accept to continue."),
                }
              : {
                  industry: ui.required("Industry"),
                  city: ui.required("City"),
                  terms: (v, f) => (f.checked ? "" : "Please accept to continue."),
                };
          if (!ui.validate(form, rules)) return;
          Object.assign(data, Object.fromEntries(new FormData(form)));
          data.interests = $$("#interest-chips .chip.on").map((c) => c.dataset.cat);
          const user = await ui.busy(form.querySelector("button.btn-accent"), () =>
            api.post("/auth/register", data),
          );
          ui.toast(`Account created. Welcome, ${esc(user.name.split(" ")[0])}!`);
          SB.go(user.role === "student" ? "#/profile?welcome=1" : "#/post-job?welcome=1");
        });

        draw();
      },
    };
  });
})();
