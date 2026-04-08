"use strict";
(() => {
  // popup/utils.ts
  function send(msg) {
    return chrome.runtime.sendMessage(msg);
  }
  function formatRelative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 6e4);
    const h = Math.floor(diff / 36e5);
    const d = Math.floor(diff / 864e5);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }
  function formatPHP(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0
    }).format(amount);
  }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    for (const child of children) {
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  // popup/components/LoginView.ts
  function renderLoginView(container, onLogin) {
    container.innerHTML = `
    <div class="login-view">
      <div class="logo">
        <img src="icons/icon48.png" alt="LocalPro" width="40" height="40" />
        <h1>LocalPro</h1>
      </div>
      <p class="subtitle">Sign in to access your companion</p>
      <form id="login-form" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="current-password" required />
        </div>
        <div id="login-error" class="error hidden"></div>
        <button type="submit" id="login-btn" class="btn-primary">Sign in</button>
      </form>
    </div>
  `;
    const form = container.querySelector("#login-form");
    const emailEl = container.querySelector("#email");
    const passEl = container.querySelector("#password");
    const errorEl = container.querySelector("#login-error");
    const btn = container.querySelector("#login-btn");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      btn.disabled = true;
      btn.textContent = "Signing in\u2026";
      const res = await send({
        type: "LOGIN",
        email: emailEl.value.trim(),
        password: passEl.value
      });
      if (res.ok && res.user) {
        onLogin(res.user);
      } else {
        errorEl.textContent = res.error ?? "Login failed";
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Sign in";
      }
    });
  }

  // popup/components/NotificationList.ts
  function renderNotificationList(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Notifications</h2>
      <span id="notif-count" class="badge hidden"></span>
    </div>
    <div id="review-prompts"></div>
    <div id="notif-list" class="list-container">
      <div class="loading">Loading\u2026</div>
    </div>
  `;
    void loadReviewPrompts(container);
    void loadNotifications(container);
  }
  async function loadReviewPrompts(container) {
    const promptsEl = container.querySelector("#review-prompts");
    const res = await send({ type: "GET_COMPLETED_JOBS" });
    if (!res.ok || !res.jobs?.length) return;
    const unreviewed = res.jobs.filter((j) => !j.hasReview && j.assignedProvider);
    if (!unreviewed.length) return;
    unreviewed.forEach((job) => {
      const card = buildReviewCard(job, () => card.remove());
      promptsEl.appendChild(card);
    });
  }
  function buildReviewCard(job, onDone) {
    const card = el("div", { class: "review-prompt-card" });
    const heading = el("p", { class: "review-prompt-title" });
    heading.textContent = `Rate your experience with ${job.assignedProvider.name}`;
    const sub = el("p", { class: "review-prompt-sub" });
    sub.textContent = job.title;
    const stars = el("div", { class: "star-row" });
    let selectedRating = 0;
    const starBtns = [];
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.className = "star-btn";
      btn.textContent = "\u2605";
      btn.setAttribute("data-star", String(i));
      btn.addEventListener("click", () => {
        selectedRating = i;
        starBtns.forEach(
          (b, idx) => b.classList.toggle("selected", idx < i)
        );
      });
      starBtns.push(btn);
      stars.appendChild(btn);
    }
    const commentEl = document.createElement("textarea");
    commentEl.className = "review-comment";
    commentEl.placeholder = "Optional comment\u2026";
    commentEl.rows = 2;
    const errEl = el("div", { class: "error hidden" });
    const submitBtn = document.createElement("button");
    submitBtn.className = "btn-primary btn-sm";
    submitBtn.textContent = "Submit Review";
    const skipBtn = document.createElement("button");
    submitBtn.className = "btn-primary btn-sm";
    skipBtn.className = "btn-ghost-inline";
    skipBtn.textContent = "Skip";
    skipBtn.addEventListener("click", onDone);
    const btnRow = el("div", { class: "review-btn-row" });
    btnRow.append(submitBtn, skipBtn);
    submitBtn.addEventListener("click", async () => {
      errEl.classList.add("hidden");
      if (selectedRating === 0) {
        errEl.textContent = "Please select a star rating.";
        errEl.classList.remove("hidden");
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting\u2026";
      const res = await send({
        type: "POST_REVIEW",
        payload: {
          jobId: job._id,
          providerId: job.assignedProvider._id,
          rating: selectedRating,
          comment: commentEl.value.trim() || void 0
        }
      });
      if (!res.ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Review";
        errEl.textContent = res.error ?? "Failed to submit review.";
        errEl.classList.remove("hidden");
        return;
      }
      card.innerHTML = `<p class="review-submitted">Thanks for your review!</p>`;
      setTimeout(onDone, 1500);
    });
    card.append(heading, sub, stars, commentEl, errEl, btnRow);
    return card;
  }
  async function loadNotifications(container) {
    const listEl = container.querySelector("#notif-list");
    const countEl = container.querySelector("#notif-count");
    const res = await send({ type: "GET_NOTIFICATIONS" });
    if (!res.ok) {
      listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
      return;
    }
    const notifications = res.notifications ?? [];
    const unread = res.unreadCount ?? 0;
    if (unread > 0) {
      countEl.textContent = String(unread);
      countEl.classList.remove("hidden");
    }
    if (notifications.length === 0) {
      listEl.innerHTML = `<div class="empty">No notifications yet.</div>`;
      return;
    }
    listEl.innerHTML = "";
    notifications.forEach((n) => {
      const row = el("div", { class: `notif-row${n.read ? "" : " unread"}` });
      const dot = el("span", { class: "notif-dot" });
      const content = el("div", { class: "notif-content" });
      const title = el("p", { class: "notif-title" });
      title.textContent = n.title;
      const msg = el("p", { class: "notif-msg" });
      msg.textContent = n.message;
      const time = el("span", { class: "notif-time" });
      time.textContent = formatRelative(n.createdAt);
      content.append(title, msg, time);
      row.append(dot, content);
      if (!n.read) {
        row.addEventListener("click", async () => {
          await send({ type: "MARK_NOTIFICATION_READ", id: n._id });
          row.classList.remove("unread");
          dot.style.visibility = "hidden";
          if (n.link) window.open(n.link, "_blank");
        });
      } else if (n.link) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => window.open(n.link, "_blank"));
      }
      listEl.appendChild(row);
    });
  }

  // popup/components/QuickJobPost.ts
  function renderQuickJobPost(container, prefill) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Post a Job</h2>
    </div>
    <form id="job-form" class="form" novalidate>
      <div class="field">
        <label for="job-title">Title</label>
        <input id="job-title" type="text" placeholder="e.g. Fix kitchen sink" required maxlength="100" />
      </div>
      <div class="field">
        <label for="job-desc">Description</label>
        <textarea id="job-desc" rows="3" placeholder="Describe the job\u2026" required maxlength="2000"></textarea>
      </div>
      <div class="field">
        <label for="job-category">Category</label>
        <input id="job-category" type="text" placeholder="e.g. Plumbing" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="budget-min">Min Budget (\u20B1)</label>
          <input id="budget-min" type="number" min="0" placeholder="500" required />
        </div>
        <div class="field">
          <label for="budget-max">Max Budget (\u20B1)</label>
          <input id="budget-max" type="number" min="0" placeholder="2000" required />
        </div>
      </div>
      <div class="field">
        <label for="job-address">Address</label>
        <input id="job-address" type="text" placeholder="Street / Barangay" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="job-city">City</label>
          <input id="job-city" type="text" placeholder="City" required />
        </div>
        <div class="field">
          <label for="job-province">Province</label>
          <input id="job-province" type="text" placeholder="Province" required />
        </div>
      </div>
      <div id="job-error" class="error hidden"></div>
      <div id="job-success" class="success hidden"></div>
      <button type="submit" id="job-btn" class="btn-primary">Post Job</button>
    </form>
  `;
    const form = container.querySelector("#job-form");
    const titleEl = container.querySelector("#job-title");
    const descEl = container.querySelector("#job-desc");
    const catEl = container.querySelector("#job-category");
    const minEl = container.querySelector("#budget-min");
    const maxEl = container.querySelector("#budget-max");
    const addrEl = container.querySelector("#job-address");
    const cityEl = container.querySelector("#job-city");
    const provEl = container.querySelector("#job-province");
    const errorEl = container.querySelector("#job-error");
    const successEl = container.querySelector("#job-success");
    const btn = container.querySelector("#job-btn");
    if (prefill) {
      titleEl.value = prefill.slice(0, 100);
      descEl.value = prefill.slice(0, 2e3);
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      successEl.classList.add("hidden");
      const min = Number(minEl.value);
      const max = Number(maxEl.value);
      if (max < min) {
        errorEl.textContent = "Max budget must be \u2265 min budget";
        errorEl.classList.remove("hidden");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Posting\u2026";
      const payload = {
        title: titleEl.value.trim(),
        description: descEl.value.trim(),
        category: catEl.value.trim(),
        budget: { min, max },
        location: {
          address: addrEl.value.trim(),
          city: cityEl.value.trim(),
          province: provEl.value.trim()
        }
      };
      const res = await send({
        type: "POST_JOB",
        payload
      });
      if (res.ok) {
        const link = el("a", {
          href: `https://www.localpro.asia/client/my-jobs`,
          target: "_blank",
          rel: "noopener",
          class: "success-link"
        });
        link.textContent = "View my jobs \u2192";
        successEl.textContent = "Job posted! ";
        successEl.appendChild(link);
        successEl.classList.remove("hidden");
        form.reset();
      } else {
        errorEl.textContent = res.error ?? "Failed to post job";
        errorEl.classList.remove("hidden");
      }
      btn.disabled = false;
      btn.textContent = "Post Job";
    });
  }

  // popup/components/QuickQuote.ts
  var activeTemplate = null;
  function renderQuickQuote(container) {
    activeTemplate = null;
    container.innerHTML = `
    <div class="section-header">
      <h2>Job Alerts</h2>
      <span class="subtitle-sm">Top AI-ranked open jobs</span>
    </div>
    <div id="template-bar" class="template-bar hidden">
      <label class="template-label">Template:</label>
      <select id="template-select" class="template-select">
        <option value="">\u2014 None \u2014</option>
      </select>
    </div>
    <div id="quote-list" class="list-container">
      <div class="loading">Loading jobs\u2026</div>
    </div>
  `;
    void loadTemplates(container);
    void loadJobs(container);
  }
  async function loadTemplates(container) {
    const bar = container.querySelector("#template-bar");
    const select = container.querySelector("#template-select");
    const res = await send({ type: "GET_QUOTE_TEMPLATES" });
    if (!res.ok || !res.templates?.length) return;
    res.templates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t._id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
    bar.classList.remove("hidden");
    select.addEventListener("change", () => {
      const id = select.value;
      activeTemplate = res.templates.find((t) => t._id === id) ?? null;
      container.dispatchEvent(new CustomEvent("templatechange", { detail: activeTemplate }));
    });
  }
  async function loadJobs(container) {
    const listEl = container.querySelector("#quote-list");
    const res = await send({ type: "GET_JOBS", aiRank: true, limit: 3 });
    if (!res.ok) {
      listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load jobs"}</div>`;
      return;
    }
    const jobs = res.jobs ?? [];
    if (jobs.length === 0) {
      listEl.innerHTML = `<div class="empty">No open jobs right now.</div>`;
      return;
    }
    listEl.innerHTML = "";
    jobs.forEach((job) => {
      const card = el("div", { class: "job-card" });
      const header = el("div", { class: "job-card-header" });
      const titleEl = el("p", { class: "job-title" });
      titleEl.textContent = job.title;
      const budget = el("span", { class: "job-budget" });
      budget.textContent = `${formatPHP(job.budget.min)}\u2013${formatPHP(job.budget.max)}`;
      header.append(titleEl, budget);
      const desc = el("p", { class: "job-desc-preview" });
      desc.textContent = job.description.slice(0, 80) + (job.description.length > 80 ? "\u2026" : "");
      const toggleBtn = el("button", { class: "btn-ghost btn-sm" });
      toggleBtn.textContent = "Quote this job";
      const quoteForm = buildQuoteForm(job._id, card, container);
      quoteForm.classList.add("hidden");
      toggleBtn.addEventListener("click", () => {
        quoteForm.classList.toggle("hidden");
        toggleBtn.textContent = quoteForm.classList.contains("hidden") ? "Quote this job" : "Cancel";
      });
      card.append(header, desc, toggleBtn, quoteForm);
      listEl.appendChild(card);
    });
  }
  function buildQuoteForm(jobId, card, root) {
    const form = el("form", { class: "quote-form" });
    const amountField = el("div", { class: "field" });
    const amountLabel = el("label");
    amountLabel.textContent = "Your Amount (\u20B1)";
    const amountInput = el("input", { type: "number", min: "0", placeholder: "1500", required: "" });
    amountField.append(amountLabel, amountInput);
    const daysField = el("div", { class: "field" });
    const daysLabel = el("label");
    daysLabel.textContent = "Estimated Days";
    const daysInput = el("input", { type: "number", min: "1", placeholder: "3", required: "" });
    daysField.append(daysLabel, daysInput);
    const notesField = el("div", { class: "field" });
    const notesLabel = el("label");
    notesLabel.textContent = "Message (optional)";
    const notesInput = el("textarea", { rows: "2", placeholder: "Why you're the right fit\u2026" });
    notesField.append(notesLabel, notesInput);
    function applyTemplate(t) {
      if (!t) return;
      amountInput.value = String(t.proposedAmount);
      daysInput.value = String(t.timeline);
      notesInput.value = t.notes ?? "";
    }
    applyTemplate(activeTemplate);
    const onTemplateChange = (e) => applyTemplate(e.detail);
    root.addEventListener("templatechange", onTemplateChange);
    form.addEventListener("submit", () => root.removeEventListener("templatechange", onTemplateChange), { once: true });
    const errorEl = el("div", { class: "error hidden" });
    const successEl = el("div", { class: "success hidden" });
    const submitBtn = el("button", { type: "submit", class: "btn-primary btn-sm" });
    submitBtn.textContent = "Send Quote";
    form.append(amountField, daysField, notesField, errorEl, successEl, submitBtn);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      successEl.classList.add("hidden");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending\u2026";
      const payload = {
        jobId,
        proposedAmount: Number(amountInput.value),
        timeline: Number(daysInput.value),
        notes: notesInput.value.trim() || void 0
      };
      const res = await send({ type: "POST_QUOTE", payload });
      if (res.ok) {
        successEl.textContent = "Quote sent!";
        successEl.classList.remove("hidden");
        form.classList.add("hidden");
        card.classList.add("quoted");
      } else {
        errorEl.textContent = res.error ?? "Failed to send quote";
        errorEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Quote";
      }
    });
    return form;
  }

  // popup/components/ChatView.ts
  function renderChatView(container, auth) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Messages</h2>
    </div>
    <div id="chat-content">
      <div id="thread-list" class="list-container">
        <div class="loading">Loading threads\u2026</div>
      </div>
    </div>
  `;
    void loadThreads(container, auth);
  }
  async function loadThreads(container, auth) {
    const listEl = container.querySelector("#thread-list");
    const res = await send({ type: "GET_THREADS" });
    if (!res.ok) {
      listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
      return;
    }
    const threads = res.threads ?? [];
    if (threads.length === 0) {
      listEl.innerHTML = `<div class="empty">No active message threads.</div>`;
      return;
    }
    listEl.innerHTML = "";
    threads.forEach((thread) => {
      const row = el("div", { class: `thread-row${thread.unreadCount > 0 ? " unread" : ""}` });
      const name = el("p", { class: "thread-name" });
      name.textContent = thread.otherParty.name;
      const preview = el("p", { class: "thread-preview" });
      preview.textContent = thread.lastMessage ? thread.lastMessage.slice(0, 50) + (thread.lastMessage.length > 50 ? "\u2026" : "") : "No messages yet";
      const meta = el("div", { class: "thread-meta" });
      if (thread.unreadCount > 0) {
        const badge = el("span", { class: "badge" });
        badge.textContent = String(thread.unreadCount);
        meta.appendChild(badge);
      }
      const time = el("span", { class: "thread-time" });
      time.textContent = formatRelative(thread.updatedAt);
      meta.appendChild(time);
      row.append(name, preview, meta);
      row.addEventListener("click", () => openThread(container, thread, auth));
      listEl.appendChild(row);
    });
  }
  function openThread(container, thread, auth) {
    const chatContent = container.querySelector("#chat-content");
    chatContent.innerHTML = `
    <div class="chat-header">
      <button id="back-btn" class="btn-ghost btn-sm">\u2190 Back</button>
      <span class="chat-title">${thread.jobTitle}</span>
    </div>
    <div id="message-list" class="message-list">
      <div class="loading">Loading\u2026</div>
    </div>
    <form id="chat-form" class="chat-input-row">
      <input id="chat-input" type="text" placeholder="Type a message\u2026" required autocomplete="off" />
      <button type="submit" class="btn-primary btn-sm">Send</button>
    </form>
  `;
    const backBtn = chatContent.querySelector("#back-btn");
    backBtn.addEventListener("click", () => {
      chatContent.innerHTML = `<div id="thread-list" class="list-container"><div class="loading">Loading\u2026</div></div>`;
      void loadThreads(container, auth);
    });
    void loadMessages(chatContent, thread._id, auth._id);
    const form = chatContent.querySelector("#chat-form");
    const input = chatContent.querySelector("#chat-input");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (!body) return;
      input.value = "";
      input.disabled = true;
      const res = await send({ type: "SEND_MESSAGE", threadId: thread._id, body });
      input.disabled = false;
      input.focus();
      if (res.ok) {
        void loadMessages(chatContent, thread._id, auth._id);
      }
    });
  }
  async function loadMessages(chatContent, threadId, myUserId) {
    const msgList = chatContent.querySelector("#message-list");
    const res = await send({ type: "GET_MESSAGES", threadId });
    if (!res.ok) {
      msgList.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
      return;
    }
    const messages = (res.messages ?? []).slice(-10);
    msgList.innerHTML = "";
    messages.forEach((m) => {
      const isMine = m.sender._id === myUserId;
      const row = el("div", { class: `msg-row ${isMine ? "mine" : "theirs"}` });
      const bubble = el("div", { class: "msg-bubble" });
      bubble.textContent = m.body;
      const time = el("span", { class: "msg-time" });
      time.textContent = formatRelative(m.createdAt);
      row.append(bubble, time);
      msgList.appendChild(row);
    });
    msgList.scrollTop = msgList.scrollHeight;
  }

  // popup/components/PaymentStatus.ts
  function renderPaymentStatus(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Payment Tracker</h2>
    </div>
    <p class="help-text">
      Paste the PayMongo session ID from your checkout URL to track payment status.
    </p>
    <form id="payment-form" class="form" novalidate>
      <div class="field">
        <label for="session-id">Session ID</label>
        <input id="session-id" type="text" placeholder="cs_live_\u2026" required />
      </div>
      <div class="field">
        <label for="job-id">Job ID <span class="optional">(optional)</span></label>
        <input id="job-id" type="text" placeholder="Job ID for escrow confirmation" />
      </div>
      <div id="pay-error" class="error hidden"></div>
      <div id="pay-result" class="pay-result hidden"></div>
      <div class="btn-row">
        <button type="submit" id="check-btn" class="btn-primary">Check Status</button>
        <button type="button" id="track-btn" class="btn-secondary">Track (30s)</button>
      </div>
    </form>
  `;
    const form = container.querySelector("#payment-form");
    const sessionEl = container.querySelector("#session-id");
    const jobEl = container.querySelector("#job-id");
    const errorEl = container.querySelector("#pay-error");
    const resultEl = container.querySelector("#pay-result");
    const checkBtn = container.querySelector("#check-btn");
    const trackBtn = container.querySelector("#track-btn");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? "";
      const match = url.match(/[?&]session_id=([^&]+)/);
      if (match) sessionEl.value = match[1];
    });
    async function checkPayment() {
      errorEl.classList.add("hidden");
      resultEl.classList.add("hidden");
      const sessionId = sessionEl.value.trim();
      const jobId = jobEl.value.trim() || void 0;
      if (!sessionId) {
        errorEl.textContent = "Please enter a session ID";
        errorEl.classList.remove("hidden");
        return;
      }
      checkBtn.disabled = true;
      checkBtn.textContent = "Checking\u2026";
      const res = await send({ type: "GET_PAYMENT", sessionId, jobId });
      checkBtn.disabled = false;
      checkBtn.textContent = "Check Status";
      if (!res.ok || !res.payment) {
        errorEl.textContent = res.error ?? "Payment not found";
        errorEl.classList.remove("hidden");
        return;
      }
      showPaymentResult(resultEl, res.payment);
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await checkPayment();
    });
    trackBtn.addEventListener("click", async () => {
      const sessionId = sessionEl.value.trim();
      const jobId = jobEl.value.trim() || void 0;
      if (!sessionId) {
        errorEl.textContent = "Please enter a session ID";
        errorEl.classList.remove("hidden");
        return;
      }
      const res = await send({ type: "TRACK_PAYMENT", sessionId, jobId });
      if (res.ok) {
        trackBtn.textContent = "Tracking\u2026";
        trackBtn.disabled = true;
        resultEl.innerHTML = `<div class="success">Tracking started. You'll get a notification when payment is confirmed.</div>`;
        resultEl.classList.remove("hidden");
      }
    });
  }
  function showPaymentResult(resultEl, payment) {
    const statusClass = payment.status === "paid" ? "status-paid" : "status-pending";
    resultEl.innerHTML = "";
    const statusRow = el("div", { class: "pay-status-row" });
    const label = el("span", { class: "pay-label" });
    label.textContent = "Status:";
    const badge = el("span", { class: `pay-status-badge ${statusClass}` });
    badge.textContent = payment.status.toUpperCase();
    const amountEl = el("p", { class: "pay-amount" });
    amountEl.textContent = `Amount: ${formatPHP(payment.amount)}`;
    statusRow.append(label, badge);
    resultEl.append(statusRow, amountEl);
    resultEl.classList.remove("hidden");
  }

  // popup/components/PesoReferral.ts
  function renderPesoReferral(container, prefill) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Refer a Provider</h2>
      <span class="subtitle-sm">PESO Officer Tool</span>
    </div>
    <form id="referral-form" class="form" novalidate>
      <div class="field">
        <label for="ref-name">Full Name</label>
        <input id="ref-name" type="text" placeholder="Juan dela Cruz" required />
      </div>
      <div class="field">
        <label for="ref-email">Email <span class="optional">(optional)</span></label>
        <input id="ref-email" type="email" placeholder="juan@example.com" />
      </div>
      <div class="field">
        <label for="ref-phone">Phone <span class="optional">(optional)</span></label>
        <input id="ref-phone" type="tel" placeholder="+63 9XX XXX XXXX" />
      </div>
      <div class="field">
        <label for="ref-barangay">Barangay</label>
        <input id="ref-barangay" type="text" placeholder="Barangay" required />
      </div>
      <div class="field">
        <label for="ref-skills">Skills <span class="help">(comma-separated)</span></label>
        <input id="ref-skills" type="text" placeholder="Carpentry, Painting, Welding" required />
      </div>
      <div class="field">
        <label for="ref-program">Livelihood Program <span class="optional">(optional)</span></label>
        <input id="ref-program" type="text" placeholder="TUPAD, DOLE, etc." />
      </div>
      <div id="ref-error" class="error hidden"></div>
      <div id="ref-success" class="success hidden"></div>
      <button type="submit" id="ref-btn" class="btn-primary">Submit Referral</button>
    </form>
  `;
    const form = container.querySelector("#referral-form");
    const nameEl = container.querySelector("#ref-name");
    const emailEl = container.querySelector("#ref-email");
    const phoneEl = container.querySelector("#ref-phone");
    const barangayEl = container.querySelector("#ref-barangay");
    const skillsEl = container.querySelector("#ref-skills");
    const programEl = container.querySelector("#ref-program");
    const errorEl = container.querySelector("#ref-error");
    const successEl = container.querySelector("#ref-success");
    const btn = container.querySelector("#ref-btn");
    if (prefill) nameEl.value = prefill.slice(0, 100);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      successEl.classList.add("hidden");
      btn.disabled = true;
      btn.textContent = "Submitting\u2026";
      const skills = skillsEl.value.split(",").map((s) => s.trim()).filter(Boolean);
      if (skills.length === 0) {
        errorEl.textContent = "Please enter at least one skill";
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Submit Referral";
        return;
      }
      const payload = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim() || void 0,
        phone: phoneEl.value.trim() || void 0,
        barangay: barangayEl.value.trim(),
        skills,
        livelihoodProgram: programEl.value.trim() || void 0
      };
      const res = await send({ type: "POST_REFERRAL", payload });
      if (res.ok) {
        const link = el("a", {
          href: "https://www.localpro.asia/peso/providers",
          target: "_blank",
          rel: "noopener",
          class: "success-link"
        });
        link.textContent = "View Provider Registry \u2192";
        successEl.textContent = "Referral submitted! ";
        successEl.appendChild(link);
        successEl.classList.remove("hidden");
        form.reset();
      } else {
        errorEl.textContent = res.error ?? "Failed to submit referral";
        errorEl.classList.remove("hidden");
      }
      btn.disabled = false;
      btn.textContent = "Submit Referral";
    });
  }

  // popup/components/SupportTickets.ts
  var CATEGORIES = [
    "General Inquiry",
    "Payment Issue",
    "Job Dispute",
    "Account Problem",
    "Technical Bug",
    "Other"
  ];
  var STATUS_META = {
    "waiting": { label: "Waiting", cls: "ticket-status-waiting" },
    "in-progress": { label: "In Progress", cls: "ticket-status-inprogress" },
    "resolved": { label: "Resolved", cls: "ticket-status-resolved" }
  };
  function renderSupportTickets(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Support</h2>
    </div>
    <div class="support-tabs">
      <button class="support-tab-btn active" data-view="new">New Ticket</button>
      <button class="support-tab-btn" data-view="list">My Tickets</button>
    </div>
    <div id="support-new-view">
      <form id="ticket-form" class="form" novalidate>
        <div class="field">
          <label for="ticket-subject">Subject</label>
          <input id="ticket-subject" type="text" placeholder="Brief summary of your issue" required />
        </div>
        <div class="field">
          <label for="ticket-category">Category</label>
          <select id="ticket-category">
            ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="ticket-desc">Description</label>
          <textarea id="ticket-desc" rows="4" placeholder="Describe your issue in detail\u2026" required></textarea>
        </div>
        <div id="ticket-error" class="error hidden"></div>
        <div id="ticket-success" class="success hidden"></div>
        <button type="submit" id="ticket-submit" class="btn-primary">Submit Ticket</button>
      </form>
    </div>
    <div id="support-list-view" class="hidden">
      <div id="ticket-list" class="list-container">
        <p class="loading">Loading tickets\u2026</p>
      </div>
    </div>
  `;
    const tabBtns = container.querySelectorAll(".support-tab-btn");
    const newView = container.querySelector("#support-new-view");
    const listView = container.querySelector("#support-list-view");
    const form = container.querySelector("#ticket-form");
    const subjectEl = container.querySelector("#ticket-subject");
    const catEl = container.querySelector("#ticket-category");
    const descEl = container.querySelector("#ticket-desc");
    const errorEl = container.querySelector("#ticket-error");
    const successEl = container.querySelector("#ticket-success");
    const submitBtn = container.querySelector("#ticket-submit");
    function switchView(view) {
      tabBtns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));
      newView.classList.toggle("hidden", view !== "new");
      listView.classList.toggle("hidden", view !== "list");
      if (view === "list") void loadTickets();
    }
    tabBtns.forEach((btn) => {
      btn.addEventListener(
        "click",
        () => switchView(btn.getAttribute("data-view"))
      );
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      successEl.classList.add("hidden");
      const subject = subjectEl.value.trim();
      const category = catEl.value;
      const description = descEl.value.trim();
      if (!subject || !description) {
        errorEl.textContent = "Subject and description are required.";
        errorEl.classList.remove("hidden");
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting\u2026";
      const res = await send({
        type: "POST_SUPPORT_TICKET",
        payload: { subject, category, description }
      });
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Ticket";
      if (!res.ok) {
        errorEl.textContent = res.error ?? "Failed to submit ticket.";
        errorEl.classList.remove("hidden");
        return;
      }
      successEl.textContent = "Ticket submitted! We'll get back to you shortly.";
      successEl.classList.remove("hidden");
      form.reset();
    });
    async function loadTickets() {
      const listEl = container.querySelector("#ticket-list");
      listEl.innerHTML = `<p class="loading">Loading tickets\u2026</p>`;
      const res = await send({ type: "GET_SUPPORT_TICKETS" });
      if (!res.ok || !res.tickets) {
        listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load tickets."}</p>`;
        return;
      }
      if (res.tickets.length === 0) {
        listEl.innerHTML = `<p class="empty">No tickets yet.</p>`;
        return;
      }
      listEl.innerHTML = "";
      res.tickets.forEach((ticket) => {
        const meta = STATUS_META[ticket.status] ?? { label: ticket.status, cls: "ticket-status-waiting" };
        const row = document.createElement("div");
        row.className = "ticket-row";
        row.innerHTML = `
        <div class="ticket-row-top">
          <span class="ticket-subject">${ticket.subject}</span>
          <span class="ticket-status-badge ${meta.cls}">${meta.label}</span>
        </div>
        <div class="ticket-row-meta">
          <span class="ticket-category">${ticket.category}</span>
          <span class="ticket-time">${formatRelative(ticket.createdAt)}</span>
        </div>
      `;
        listEl.appendChild(row);
      });
    }
  }

  // popup/components/LoyaltyPoints.ts
  function renderLoyaltyPoints(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Loyalty Points</h2>
    </div>
    <div id="loyalty-body">
      <p class="loading">Loading\u2026</p>
    </div>
  `;
    void loadAll(container);
  }
  async function loadAll(container) {
    const body = container.querySelector("#loyalty-body");
    const [loyaltyRes, referralRes] = await Promise.all([
      send({ type: "GET_LOYALTY" }),
      send({ type: "GET_LOYALTY_REFERRAL" })
    ]);
    if (!loyaltyRes.ok) {
      body.innerHTML = `<p class="error-msg">${loyaltyRes.error ?? "Failed to load loyalty data."}</p>`;
      return;
    }
    const points = loyaltyRes.points ?? 0;
    const tier = loyaltyRes.tier;
    const nextTierPoints = loyaltyRes.nextTierPoints;
    const referralCode = referralRes.ok ? referralRes.referralCode ?? "" : "";
    const referralLink = referralRes.ok ? referralRes.referralLink ?? "" : "";
    const referralCount = referralRes.ok ? referralRes.referralCount ?? 0 : 0;
    body.innerHTML = `
    <div class="loyalty-balance-card">
      <div class="loyalty-points-label">Your Points</div>
      <div class="loyalty-points-value">${points.toLocaleString()}</div>
      ${tier ? `<div class="loyalty-tier">${tier} tier</div>` : ""}
      ${nextTierPoints != null ? `<div class="loyalty-next">
             <div class="loyalty-progress-bar">
               <div class="loyalty-progress-fill" style="width:${Math.min(100, Math.round(points / nextTierPoints * 100))}%"></div>
             </div>
             <span class="loyalty-next-label">${nextTierPoints - points} pts to next tier</span>
           </div>` : ""}
    </div>

    <div class="loyalty-redeem-section">
      <h3 class="loyalty-section-title">Redeem Points</h3>
      <div class="field">
        <label for="redeem-amount">Points to redeem</label>
        <input id="redeem-amount" type="number" min="1" max="${points}" placeholder="Enter amount" />
      </div>
      <div id="redeem-error" class="error hidden"></div>
      <div id="redeem-success" class="success hidden"></div>
      <button id="redeem-btn" class="btn-primary btn-sm" ${points === 0 ? "disabled" : ""}>
        Redeem
      </button>
    </div>

    ${referralCode ? `
    <div class="loyalty-referral-section">
      <h3 class="loyalty-section-title">Earn More Points</h3>
      <p class="loyalty-referral-info">Share your referral link \u2014 earn points for every signup!</p>
      <div class="referral-link-row">
        <input id="referral-link-input" type="text" readonly value="${referralLink || referralCode}" class="referral-link-input" />
        <button id="copy-referral-btn" class="btn-secondary btn-sm">Copy</button>
      </div>
      <p class="loyalty-referral-count">${referralCount} referral${referralCount !== 1 ? "s" : ""} so far</p>
    </div>` : ""}
  `;
    const redeemBtn = body.querySelector("#redeem-btn");
    const redeemInput = body.querySelector("#redeem-amount");
    const redeemError = body.querySelector("#redeem-error");
    const redeemOk = body.querySelector("#redeem-success");
    redeemBtn.addEventListener("click", async () => {
      redeemError.classList.add("hidden");
      redeemOk.classList.add("hidden");
      const amount = parseInt(redeemInput.value, 10);
      if (isNaN(amount) || amount < 1) {
        redeemError.textContent = "Enter a valid number of points.";
        redeemError.classList.remove("hidden");
        return;
      }
      if (amount > points) {
        redeemError.textContent = `You only have ${points} points.`;
        redeemError.classList.remove("hidden");
        return;
      }
      redeemBtn.disabled = true;
      redeemBtn.textContent = "Redeeming\u2026";
      const res = await send({ type: "POST_LOYALTY_REDEEM", points: amount });
      redeemBtn.disabled = false;
      redeemBtn.textContent = "Redeem";
      if (!res.ok) {
        redeemError.textContent = res.error ?? "Redemption failed.";
        redeemError.classList.remove("hidden");
        return;
      }
      redeemOk.textContent = res.message ?? "Points redeemed successfully!";
      redeemOk.classList.remove("hidden");
      redeemInput.value = "";
      setTimeout(() => void loadAll(container), 1500);
    });
    const copyBtn = body.querySelector("#copy-referral-btn");
    const linkInput = body.querySelector("#referral-link-input");
    if (copyBtn && linkInput) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(linkInput.value).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2e3);
        }).catch(() => {
          linkInput.select();
          document.execCommand("copy");
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2e3);
        });
      });
    }
  }

  // popup/components/ProviderSearch.ts
  function renderProviderSearch(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Find Providers</h2>
    </div>
    <div class="provider-search-row">
      <input id="provider-query" type="text" placeholder="Search by name or skill\u2026" />
      <button id="provider-search-btn" class="btn-primary btn-sm">Search</button>
    </div>
    <div id="provider-error" class="error hidden"></div>
    <div id="provider-results" class="list-container" style="margin-top:10px"></div>
  `;
    const input = container.querySelector("#provider-query");
    const btn = container.querySelector("#provider-search-btn");
    const errorEl = container.querySelector("#provider-error");
    const results = container.querySelector("#provider-results");
    async function doSearch() {
      const q = input.value.trim();
      if (!q) return;
      errorEl.classList.add("hidden");
      results.innerHTML = `<p class="loading">Searching\u2026</p>`;
      btn.disabled = true;
      const res = await send({ type: "SEARCH_PROVIDERS", q });
      btn.disabled = false;
      if (!res.ok) {
        results.innerHTML = "";
        errorEl.textContent = res.error ?? "Search failed.";
        errorEl.classList.remove("hidden");
        return;
      }
      if (!res.providers?.length) {
        results.innerHTML = `<p class="empty">No providers found.</p>`;
        return;
      }
      results.innerHTML = "";
      res.providers.forEach((p) => {
        results.appendChild(buildProviderCard(p));
      });
    }
    btn.addEventListener("click", () => void doSearch());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void doSearch();
    });
  }
  function buildProviderCard(provider) {
    const card = document.createElement("div");
    card.className = "provider-card";
    const avatar = document.createElement("div");
    avatar.className = "provider-avatar";
    if (provider.avatar) {
      const img = document.createElement("img");
      img.src = provider.avatar;
      img.alt = provider.name;
      img.className = "provider-avatar-img";
      img.onerror = () => {
        img.replaceWith(makeInitials(provider.name));
      };
      avatar.appendChild(img);
    } else {
      avatar.appendChild(makeInitials(provider.name));
    }
    const info = document.createElement("div");
    info.className = "provider-info";
    const nameEl = document.createElement("div");
    nameEl.className = "provider-name";
    nameEl.textContent = provider.name;
    const ratingEl = document.createElement("div");
    ratingEl.className = "provider-rating";
    if (provider.rating != null) {
      const stars = "\u2605".repeat(Math.round(provider.rating)) + "\u2606".repeat(5 - Math.round(provider.rating));
      ratingEl.innerHTML = `<span class="stars">${stars}</span> <span class="rating-val">${provider.rating.toFixed(1)}</span>`;
      if (provider.reviewCount) {
        ratingEl.innerHTML += ` <span class="review-count">(${provider.reviewCount})</span>`;
      }
    } else {
      ratingEl.textContent = "No ratings yet";
      ratingEl.style.color = "var(--gray-400)";
    }
    const metaEl = document.createElement("div");
    metaEl.className = "provider-meta";
    if (provider.hourlyRate != null) {
      const rate = document.createElement("span");
      rate.className = "provider-rate";
      rate.textContent = `\u20B1${provider.hourlyRate}/hr`;
      metaEl.appendChild(rate);
    }
    if (provider.skills?.length) {
      const skillsEl = document.createElement("div");
      skillsEl.className = "provider-skills";
      provider.skills.slice(0, 3).forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "skill-chip";
        chip.textContent = skill;
        skillsEl.appendChild(chip);
      });
      info.append(nameEl, ratingEl, metaEl, skillsEl);
    } else {
      info.append(nameEl, ratingEl, metaEl);
    }
    const favBtn = document.createElement("button");
    favBtn.className = `fav-btn${provider.isFavorite ? " fav-active" : ""}`;
    favBtn.title = provider.isFavorite ? "Remove from favorites" : "Save provider";
    favBtn.textContent = provider.isFavorite ? "\u2665" : "\u2661";
    let isFav = !!provider.isFavorite;
    favBtn.addEventListener("click", async () => {
      favBtn.disabled = true;
      const res = await send({
        type: isFav ? "REMOVE_FAVORITE" : "ADD_FAVORITE",
        providerId: provider._id
      });
      favBtn.disabled = false;
      if (res.ok) {
        isFav = !isFav;
        favBtn.textContent = isFav ? "\u2665" : "\u2661";
        favBtn.title = isFav ? "Remove from favorites" : "Save provider";
        favBtn.classList.toggle("fav-active", isFav);
      }
    });
    card.append(avatar, info, favBtn);
    return card;
  }
  function makeInitials(name) {
    const el2 = document.createElement("div");
    el2.className = "provider-avatar-initials";
    el2.textContent = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
    return el2;
  }

  // popup/components/JobTracker.ts
  var STATUS_CFG = {
    "open": { label: "Open", cls: "js-open" },
    "assigned": { label: "Assigned", cls: "js-assigned" },
    "in-progress": { label: "In Progress", cls: "js-inprogress" },
    "complete": { label: "Complete", cls: "js-complete" }
  };
  function renderJobTracker(container, user) {
    const isClient = user.role === "client";
    const isProvider = user.role === "provider";
    container.innerHTML = `
    <div class="section-header">
      <h2>My Jobs</h2>
    </div>
    ${isClient || isProvider ? `
    <div class="jt-filter-bar">
      <button class="jt-filter-btn active" data-status="">All Active</button>
      <button class="jt-filter-btn" data-status="in-progress">In Progress</button>
      ${isClient ? `<button class="jt-filter-btn" data-status="assigned">Assigned</button>` : ""}
      <button class="jt-filter-btn" data-status="complete">Complete</button>
    </div>` : ""}
    <div id="jt-list" class="list-container">
      <p class="loading">Loading\u2026</p>
    </div>
  `;
    const filterBtns = container.querySelectorAll(".jt-filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        void loadJobs2(container, user, btn.getAttribute("data-status") ?? void 0);
      });
    });
    void loadJobs2(container, user, void 0);
  }
  async function loadJobs2(container, user, status) {
    const listEl = container.querySelector("#jt-list");
    listEl.innerHTML = `<p class="loading">Loading\u2026</p>`;
    const res = await send({ type: "GET_MY_JOBS", status: status || void 0 });
    if (!res.ok) {
      listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load jobs."}</p>`;
      return;
    }
    const jobs = res.jobs ?? [];
    if (jobs.length === 0) {
      listEl.innerHTML = `<p class="empty">No jobs found.</p>`;
      return;
    }
    listEl.innerHTML = "";
    jobs.forEach((job) => listEl.appendChild(buildJobCard(job, user)));
  }
  function buildJobCard(job, user) {
    const cfg = STATUS_CFG[job.status] ?? { label: job.status, cls: "js-open" };
    const isClient = user.role === "client";
    const card = document.createElement("div");
    card.className = "jt-card";
    const headerRow = document.createElement("div");
    headerRow.className = "jt-card-header";
    const titleEl = document.createElement("span");
    titleEl.className = "jt-title";
    titleEl.textContent = job.title;
    const pill = document.createElement("span");
    pill.className = `jt-status-pill ${cfg.cls}`;
    pill.textContent = cfg.label;
    headerRow.append(titleEl, pill);
    const metaRow = document.createElement("div");
    metaRow.className = "jt-meta";
    if (job.budget) {
      const budgetEl = document.createElement("span");
      budgetEl.className = "jt-budget";
      budgetEl.textContent = `${formatPHP(job.budget.min)}\u2013${formatPHP(job.budget.max)}`;
      metaRow.appendChild(budgetEl);
    }
    if (job.assignedProvider && isClient) {
      const provEl = document.createElement("span");
      provEl.className = "jt-provider";
      provEl.textContent = `Provider: ${job.assignedProvider.name}`;
      metaRow.appendChild(provEl);
    }
    const timeEl = document.createElement("span");
    timeEl.className = "jt-time";
    timeEl.textContent = formatRelative(job.updatedAt ?? job.createdAt);
    metaRow.appendChild(timeEl);
    const milestonesWrap = document.createElement("div");
    milestonesWrap.className = "jt-milestones hidden";
    const actionsRow = document.createElement("div");
    actionsRow.className = "jt-actions";
    const detailBtn = document.createElement("button");
    detailBtn.className = "btn-secondary btn-xs";
    detailBtn.textContent = "Milestones";
    let milestonesLoaded = false;
    detailBtn.addEventListener("click", async () => {
      const isHidden = milestonesWrap.classList.contains("hidden");
      milestonesWrap.classList.toggle("hidden", !isHidden);
      detailBtn.textContent = isHidden ? "Hide" : "Milestones";
      if (isHidden && !milestonesLoaded) {
        milestonesLoaded = true;
        milestonesWrap.innerHTML = `<p class="loading" style="font-size:11px">Loading\u2026</p>`;
        const res = await send({ type: "GET_JOB_MILESTONES", jobId: job._id });
        renderMilestones(milestonesWrap, res.ok ? res.milestones ?? [] : []);
      }
    });
    actionsRow.appendChild(detailBtn);
    if (isClient && (job.status === "in-progress" || job.status === "assigned")) {
      const completeBtn = document.createElement("button");
      completeBtn.className = "btn-primary btn-xs";
      completeBtn.textContent = "Mark Complete";
      completeBtn.addEventListener("click", async () => {
        completeBtn.disabled = true;
        completeBtn.textContent = "Marking\u2026";
        const res = await send({ type: "MARK_JOB_COMPLETE", jobId: job._id });
        if (res.ok) {
          pill.textContent = "Complete";
          pill.className = "jt-status-pill js-complete";
          completeBtn.remove();
        } else {
          completeBtn.disabled = false;
          completeBtn.textContent = "Mark Complete";
        }
      });
      actionsRow.appendChild(completeBtn);
    }
    card.append(headerRow, metaRow, milestonesWrap, actionsRow);
    return card;
  }
  function renderMilestones(wrap, milestones) {
    if (milestones.length === 0) {
      wrap.innerHTML = `<p style="font-size:11px;color:var(--gray-400)">No milestones defined.</p>`;
      return;
    }
    const done = milestones.filter((m) => m.completed).length;
    const total = milestones.length;
    const pct = Math.round(done / total * 100);
    wrap.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "milestone-bar-wrap";
    bar.innerHTML = `
    <div class="milestone-bar-track">
      <div class="milestone-bar-fill" style="width:${pct}%"></div>
    </div>
    <span class="milestone-bar-label">${done}/${total} done</span>
  `;
    wrap.appendChild(bar);
    milestones.sort((a, b) => a.order - b.order).forEach((m) => {
      const row = document.createElement("div");
      row.className = `milestone-row${m.completed ? " done" : ""}`;
      row.innerHTML = `
        <span class="milestone-check">${m.completed ? "\u2713" : "\u25CB"}</span>
        <span class="milestone-title">${m.title}</span>
      `;
      wrap.appendChild(row);
    });
  }

  // popup/components/RecurringJobs.ts
  var DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function renderRecurringJobs(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>Recurring Jobs</h2>
    </div>
    <div id="cal-strip" class="cal-strip">
      ${buildCalendarStrip()}
    </div>
    <div id="recurring-list" class="list-container">
      <p class="loading">Loading\u2026</p>
    </div>
  `;
    void loadRecurring(container);
  }
  function buildCalendarStrip() {
    const today = /* @__PURE__ */ new Date();
    const cols = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      cols.push(`
      <div class="cal-day${isToday ? " cal-today" : ""}" data-date="${d.toISOString().slice(0, 10)}">
        <span class="cal-day-name">${DAY_LABELS[d.getDay()]}</span>
        <span class="cal-day-num">${d.getDate()}</span>
        <div class="cal-dots" id="dots-${d.toISOString().slice(0, 10)}"></div>
      </div>
    `);
    }
    return cols.join("");
  }
  async function loadRecurring(container) {
    const listEl = container.querySelector("#recurring-list");
    const res = await send({ type: "GET_RECURRING_JOBS" });
    if (!res.ok) {
      listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load recurring jobs."}</p>`;
      return;
    }
    const jobs = res.jobs ?? [];
    if (jobs.length === 0) {
      listEl.innerHTML = `<p class="empty">No upcoming recurring jobs this week.</p>`;
      return;
    }
    jobs.forEach((job) => {
      const date = job.nextOccurrence.slice(0, 10);
      const dotsEl = container.querySelector(`#dots-${date}`);
      if (dotsEl) {
        const dot = document.createElement("div");
        dot.className = "cal-dot";
        dotsEl.appendChild(dot);
      }
    });
    listEl.innerHTML = "";
    jobs.slice().sort((a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime()).forEach((job) => listEl.appendChild(buildJobRow(job)));
  }
  function buildJobRow(job) {
    const next = new Date(job.nextOccurrence);
    const isToday = next.toDateString() === (/* @__PURE__ */ new Date()).toDateString();
    const minsUntil = Math.round((next.getTime() - Date.now()) / 6e4);
    let timeLabel;
    if (minsUntil < 0) {
      timeLabel = "Overdue";
    } else if (minsUntil < 60) {
      timeLabel = `In ${minsUntil}m`;
    } else if (isToday) {
      timeLabel = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      timeLabel = next.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    }
    const row = document.createElement("div");
    row.className = `recurring-row${isToday ? " recurring-today" : ""}`;
    const info = document.createElement("div");
    info.className = "recurring-info";
    const title = document.createElement("span");
    title.className = "recurring-title";
    title.textContent = job.title;
    const freq = document.createElement("span");
    freq.className = "recurring-freq";
    freq.textContent = job.frequency;
    const time = document.createElement("span");
    time.className = `recurring-time${minsUntil < 0 ? " overdue" : ""}`;
    time.textContent = timeLabel;
    info.append(title, freq);
    row.append(info, time);
    if (job.url) {
      const startBtn = document.createElement("button");
      startBtn.className = "btn-primary btn-xs";
      startBtn.textContent = "Start Now";
      startBtn.addEventListener("click", () => window.open(job.url, "_blank"));
      row.appendChild(startBtn);
    }
    return row;
  }

  // utils/api.ts
  var API_BASE_URL = "https://www.localpro.asia";

  // popup/components/DisputeWizard.ts
  var CATEGORIES2 = [
    {
      value: "Payment Issue",
      icon: "\u{1F4B0}",
      label: "Payment Issue",
      hint: "Include the amount, date of payment, and what went wrong (not released, overcharged, etc.)."
    },
    {
      value: "Service Quality",
      icon: "\u2B50",
      label: "Service Quality",
      hint: "Describe what was agreed vs what was delivered. Mention specific defects or missed work."
    },
    {
      value: "No-show",
      icon: "\u{1F6AB}",
      label: "No-show",
      hint: "State the scheduled date/time and when you realised the provider did not arrive or respond."
    },
    {
      value: "Fraud",
      icon: "\u26A0\uFE0F",
      label: "Fraud",
      hint: "Describe the fraudulent behaviour clearly. Attach screenshots of suspicious messages or transactions."
    },
    {
      value: "Other",
      icon: "\u{1F4DD}",
      label: "Other",
      hint: "Be as specific as possible so our team can investigate promptly."
    }
  ];
  var STATUS_META2 = {
    "open": { label: "Open", icon: "\u{1F535}", cls: "ds-open" },
    "under-review": { label: "Under Review", icon: "\u{1F7E1}", cls: "ds-under-review" },
    "resolved": { label: "Resolved", icon: "\u{1F7E2}", cls: "ds-resolved" },
    "closed": { label: "Closed", icon: "\u26AA", cls: "ds-closed" }
  };
  var STATUS_TIMELINE = [
    { key: "open", label: "Opened" },
    { key: "under-review", label: "In Review" },
    { key: "resolved", label: "Resolved" }
  ];
  var MIN_DESC_CHARS = 30;
  var MAX_FILE_MB = 5;
  var DRAFT_KEY = "lp_dispute_draft";
  var draft = {
    job: null,
    category: CATEGORIES2[0].value,
    description: "",
    urgent: false,
    file: null,
    previewUrl: null
  };
  function saveDraft() {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      job: draft.job,
      category: draft.category,
      description: draft.description,
      urgent: draft.urgent
    }));
  }
  function loadDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.job) draft.job = d.job;
      if (d.category) draft.category = d.category;
      if (d.description) draft.description = d.description;
      if (typeof d.urgent === "boolean") draft.urgent = d.urgent;
      return !!(draft.job || draft.description);
    } catch {
      return false;
    }
  }
  function clearDraft() {
    sessionStorage.removeItem(DRAFT_KEY);
    Object.assign(draft, { job: null, category: CATEGORIES2[0].value, description: "", urgent: false, file: null, previewUrl: null });
  }
  function renderFileDispute(container) {
    container.innerHTML = "";
    const panel = el("div", { class: "dsp-panel" });
    container.appendChild(panel);
    const activate = (tab) => {
      if (tab === "list") renderMyDisputes(container);
      else {
        container.innerHTML = "";
        container.appendChild(panel);
        renderStep1(panel, activate);
      }
    };
    const hasDraft = loadDraft();
    if (hasDraft) {
      renderDraftBanner(panel, activate);
    } else {
      Object.assign(draft, { job: null, category: CATEGORIES2[0].value, description: "", urgent: false, file: null, previewUrl: null });
      renderStep1(panel, activate);
    }
  }
  function renderMyDisputes(container) {
    container.innerHTML = "";
    const panel = el("div", { class: "dsp-panel" });
    container.appendChild(panel);
    const activate = (tab) => {
      if (tab === "new") renderFileDispute(container);
      else void renderDisputeList(panel, activate);
    };
    void renderDisputeList(panel, activate);
  }
  function renderDraftBanner(panel, activate) {
    panel.innerHTML = "";
    const banner = el("div", { class: "dsp-draft-banner" });
    const icon = el("span", { class: "dsp-draft-icon" });
    icon.textContent = "\u270F\uFE0F";
    const text = el("div", { class: "dsp-draft-text" });
    const title = el("p", { class: "dsp-draft-title" });
    title.textContent = "Resume saved draft?";
    const sub = el("p", { class: "dsp-draft-sub" });
    sub.textContent = draft.job ? `Job: ${draft.job.title}` : draft.description ? `"${draft.description.slice(0, 50)}\u2026"` : "You have an unfinished dispute.";
    text.append(title, sub);
    const btns = el("div", { class: "dsp-draft-btns" });
    const resumeBtn = el("button", { class: "btn-primary btn-sm" });
    resumeBtn.textContent = "Resume";
    const freshBtn = el("button", { class: "btn-ghost btn-sm" });
    freshBtn.textContent = "Start fresh";
    resumeBtn.addEventListener("click", () => {
      if (draft.job) renderStep2(panel, activate);
      else renderStep1(panel, activate);
    });
    freshBtn.addEventListener("click", () => {
      clearDraft();
      renderStep1(panel, activate);
    });
    btns.append(resumeBtn, freshBtn);
    banner.append(icon, text, btns);
    panel.appendChild(banner);
  }
  function buildProgressBar(current, panel, activate) {
    const steps = ["Job", "Details", "Evidence", "Review"];
    const bar = el("div", { class: "dsp-progress" });
    const goTo = [
      () => renderStep1(panel, activate),
      () => renderStep2(panel, activate),
      () => renderStep3(panel, activate),
      () => renderStep4(panel, activate)
    ];
    steps.forEach((label, i) => {
      const n = i + 1;
      const done = n < current;
      const item = el("div", {
        class: `dsp-prog-item${done ? " done" : n === current ? " active" : ""}${done ? " clickable" : ""}`
      });
      if (done) item.setAttribute("title", `Go back to ${label}`);
      const dot = el("span", { class: "dsp-prog-dot" });
      dot.textContent = done ? "\u2713" : String(n);
      const lbl = el("span", { class: "dsp-prog-label" });
      lbl.textContent = label;
      item.append(dot, lbl);
      if (done) item.addEventListener("click", () => goTo[i]());
      if (i < steps.length - 1) {
        const line = el("div", { class: `dsp-prog-line${done ? " done" : ""}` });
        bar.append(item, line);
      } else {
        bar.append(item);
      }
    });
    return bar;
  }
  function renderStep1(panel, activate) {
    panel.innerHTML = "";
    panel.append(buildProgressBar(1, panel, activate));
    const hint = el("p", { class: "wizard-hint" });
    hint.textContent = "Which job is this dispute about?";
    panel.appendChild(hint);
    const searchWrap = el("div", { class: "dsp-search-wrap" });
    const searchIcon = el("span", { class: "dsp-search-icon" });
    searchIcon.textContent = "\u{1F50D}";
    const searchInput = el("input", {
      type: "text",
      class: "dsp-search",
      placeholder: "Filter jobs\u2026"
    });
    searchWrap.append(searchIcon, searchInput);
    panel.appendChild(searchWrap);
    const listEl = el("div", { class: "list-container dsp-job-list" });
    renderSkeletons(listEl, 3);
    panel.appendChild(listEl);
    void (async () => {
      const res = await send({ type: "GET_MY_JOBS" });
      if (!res.ok) {
        showRetry(listEl, res.error ?? "Failed to load jobs.", () => renderStep1(panel, activate));
        return;
      }
      if (!res.jobs?.length) {
        listEl.innerHTML = "";
        const empty = el("div", { class: "dsp-empty-state" });
        empty.innerHTML = `<span class="dsp-empty-icon">\u{1F4CB}</span><p>No jobs found. Jobs appear here once you have active or completed work.</p>`;
        listEl.appendChild(empty);
        return;
      }
      const jobs = res.jobs;
      const renderJobs = (filter) => {
        listEl.innerHTML = "";
        const filtered = filter ? jobs.filter((j) => j.title.toLowerCase().includes(filter.toLowerCase())) : jobs;
        if (!filtered.length) {
          const msg = el("p", { class: "empty" });
          msg.textContent = "No jobs match your search.";
          listEl.appendChild(msg);
          return;
        }
        filtered.forEach((job) => {
          const row = el("button", { class: "dsp-job-row" });
          const top = el("div", { class: "dsp-job-top" });
          const title = el("span", { class: "dsp-job-title" });
          title.textContent = job.title;
          const pill = el("span", { class: `status-pill js-${job.status}` });
          pill.textContent = job.status;
          top.append(title, pill);
          const meta = el("div", { class: "dsp-job-meta" });
          const cat = el("span", { class: "dsp-job-chip" });
          cat.textContent = job.category;
          meta.appendChild(cat);
          if (job.assignedProvider?.name) {
            const prov = el("span", { class: "dsp-job-chip dsp-job-chip-prov" });
            prov.textContent = `\u{1F464} ${job.assignedProvider.name}`;
            meta.appendChild(prov);
          }
          const date = el("span", { class: "dsp-job-date" });
          date.textContent = relativeTime(job.createdAt);
          meta.appendChild(date);
          row.append(top, meta);
          row.addEventListener("click", () => {
            draft.job = job;
            saveDraft();
            renderStep2(panel, activate);
          });
          listEl.appendChild(row);
        });
      };
      renderJobs("");
      searchInput.addEventListener("input", () => renderJobs(searchInput.value.trim()));
    })();
  }
  function renderStep2(panel, activate) {
    panel.innerHTML = "";
    panel.append(buildProgressBar(2, panel, activate));
    const jobBadge = el("div", { class: "dsp-job-badge" });
    jobBadge.textContent = `\u{1F4CB} ${draft.job.title}`;
    panel.appendChild(jobBadge);
    const catLabel = el("p", { class: "dsp-field-label" });
    catLabel.textContent = "Category";
    panel.appendChild(catLabel);
    const cardGrid = el("div", { class: "dsp-cat-grid" });
    let selectedCat = draft.category;
    const catHint = el("p", { class: "cat-hint" });
    catHint.textContent = CATEGORIES2.find((c) => c.value === selectedCat)?.hint ?? "";
    const cards = [];
    CATEGORIES2.forEach((cat, i) => {
      const card = el("button", {
        class: `dsp-cat-card${cat.value === selectedCat ? " selected" : ""}`
      });
      if (i === CATEGORIES2.length - 1) card.classList.add("dsp-cat-card-full");
      const icon = el("span", { class: "dsp-cat-icon" });
      icon.textContent = cat.icon;
      const lbl = el("span", { class: "dsp-cat-label" });
      lbl.textContent = cat.label;
      card.append(icon, lbl);
      card.addEventListener("click", () => {
        selectedCat = cat.value;
        draft.category = cat.value;
        cards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        catHint.textContent = cat.hint;
        saveDraft();
      });
      cards.push(card);
      cardGrid.appendChild(card);
    });
    panel.append(cardGrid, catHint);
    const urgencyRow = el("div", { class: "dsp-urgency-row" });
    const urgLabel = el("label", { class: "dsp-urgency-label" });
    const urgCheck = el("input", { type: "checkbox" });
    urgCheck.checked = draft.urgent;
    const urgText = el("span");
    urgText.textContent = "\u26A1 Mark as urgent";
    urgLabel.append(urgCheck, urgText);
    const urgNote = el("span", { class: "dsp-urgency-note" });
    urgNote.textContent = "For serious cases needing priority review";
    urgencyRow.append(urgLabel, urgNote);
    urgCheck.addEventListener("change", () => {
      draft.urgent = urgCheck.checked;
      saveDraft();
    });
    panel.appendChild(urgencyRow);
    const descField = el("div", { class: "field" });
    const descLabelRow = el("div", { class: "field-label-row" });
    const descLabel = el("label");
    descLabel.textContent = "Describe the issue";
    const charCount = el("span", { class: "char-count" });
    descLabelRow.append(descLabel, charCount);
    const descInput = el("textarea", {
      rows: "5",
      placeholder: "What happened? Include dates, amounts, names, and specific details\u2026"
    });
    descInput.value = draft.description;
    const charBar = el("div", { class: "char-bar" });
    const charBarFill = el("div", { class: "char-bar-fill" });
    charBar.appendChild(charBarFill);
    const updateCount = () => {
      const len = descInput.value.trim().length;
      const pct = Math.min(len / MIN_DESC_CHARS * 100, 100);
      charCount.textContent = len >= MIN_DESC_CHARS ? `\u2713 ${len} chars` : `${len} / ${MIN_DESC_CHARS} min`;
      charCount.className = `char-count${len >= MIN_DESC_CHARS ? " char-ok" : ""}`;
      charBarFill.style.width = `${pct}%`;
      charBarFill.className = `char-bar-fill${len >= MIN_DESC_CHARS ? " full" : pct > 50 ? " mid" : ""}`;
    };
    updateCount();
    descInput.addEventListener("input", () => {
      draft.description = descInput.value;
      saveDraft();
      updateCount();
    });
    descField.append(descLabelRow, descInput, charBar);
    const errorEl = el("div", { class: "error hidden" });
    const actions = el("div", { class: "wizard-actions" });
    const backBtn = el("button", { class: "btn-ghost btn-sm" });
    backBtn.textContent = "\u2190 Back";
    backBtn.addEventListener("click", () => renderStep1(panel, activate));
    const nextBtn = el("button", { class: "btn-primary btn-sm" });
    nextBtn.textContent = "Next: Add Evidence";
    nextBtn.addEventListener("click", () => {
      draft.category = selectedCat;
      draft.description = descInput.value.trim();
      if (draft.description.length < MIN_DESC_CHARS) {
        errorEl.textContent = `Please write at least ${MIN_DESC_CHARS} characters.`;
        errorEl.classList.remove("hidden");
        descInput.focus();
        return;
      }
      saveDraft();
      renderStep3(panel, activate);
    });
    actions.append(backBtn, nextBtn);
    panel.append(descField, errorEl, actions);
  }
  function renderStep3(panel, activate) {
    panel.innerHTML = "";
    panel.append(buildProgressBar(3, panel, activate));
    const jobBadge = el("div", { class: "dsp-job-badge" });
    jobBadge.textContent = `\u{1F4CB} ${draft.job.title}`;
    panel.appendChild(jobBadge);
    const hint = el("p", { class: "wizard-hint" });
    hint.textContent = "Attach a screenshot or photo as evidence (optional but recommended).";
    panel.appendChild(hint);
    const dropZone = el("div", { class: "dsp-drop-zone" });
    const dropIcon = el("div", { class: "dsp-drop-icon" });
    dropIcon.textContent = "\u{1F4CE}";
    const dropText = el("p", { class: "dsp-drop-text" });
    dropText.textContent = "Drag & drop here or click to choose";
    const dropSub = el("p", { class: "dsp-drop-sub" });
    dropSub.textContent = `Images only \xB7 max ${MAX_FILE_MB} MB`;
    const fileInput = el("input", { type: "file", accept: "image/*,application/pdf" });
    fileInput.style.display = "none";
    dropZone.append(dropIcon, dropText, dropSub, fileInput);
    const previewWrap = el("div", { class: "dsp-preview-wrap hidden" });
    const previewImg = el("img", { class: "dsp-preview-img", alt: "evidence" });
    const previewInfo = el("div", { class: "dsp-preview-info" });
    const previewName = el("span", { class: "dsp-preview-name" });
    const previewSize = el("span", { class: "dsp-preview-size" });
    const removeBtn = el("button", { class: "dsp-preview-remove", title: "Remove" });
    removeBtn.textContent = "\xD7";
    previewInfo.append(previewName, previewSize);
    previewWrap.append(previewImg, previewInfo, removeBtn);
    const sizeWarning = el("p", { class: "error hidden" });
    sizeWarning.textContent = `File is too large. Maximum size is ${MAX_FILE_MB} MB.`;
    const typeWarning = el("p", { class: "error hidden" });
    typeWarning.textContent = "Only image files and PDFs are accepted.";
    if (draft.file && draft.previewUrl) applyPreview(draft.file, draft.previewUrl);
    function applyPreview(file, url) {
      if (file.type.startsWith("image/")) {
        previewImg.src = url;
        previewImg.style.display = "";
      } else {
        previewImg.style.display = "none";
      }
      previewName.textContent = file.name;
      previewSize.textContent = formatBytes(file.size);
      previewWrap.classList.remove("hidden");
      dropZone.classList.add("has-file");
    }
    function clearPreview() {
      if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
      draft.file = null;
      draft.previewUrl = null;
      previewImg.src = "";
      previewName.textContent = "";
      previewSize.textContent = "";
      previewWrap.classList.add("hidden");
      dropZone.classList.remove("has-file");
      fileInput.value = "";
      sizeWarning.classList.add("hidden");
      typeWarning.classList.add("hidden");
    }
    function handleFile(file) {
      sizeWarning.classList.add("hidden");
      typeWarning.classList.add("hidden");
      const validType = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!validType) {
        typeWarning.classList.remove("hidden");
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        sizeWarning.classList.remove("hidden");
        clearPreview();
        return;
      }
      if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
      draft.file = file;
      draft.previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      applyPreview(file, draft.previewUrl);
    }
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
    });
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    });
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearPreview();
    });
    const actions = el("div", { class: "wizard-actions" });
    const backBtn = el("button", { class: "btn-ghost btn-sm" });
    backBtn.textContent = "\u2190 Back";
    backBtn.addEventListener("click", () => renderStep2(panel, activate));
    const nextBtn = el("button", { class: "btn-primary btn-sm" });
    nextBtn.textContent = "Review & Submit";
    nextBtn.addEventListener("click", () => renderStep4(panel, activate));
    const skipLink = el("button", { class: "btn-link btn-sm" });
    skipLink.textContent = "Skip \u2014 no evidence to attach";
    skipLink.addEventListener("click", () => {
      clearPreview();
      renderStep4(panel, activate);
    });
    actions.append(backBtn, nextBtn);
    panel.append(dropZone, previewWrap, sizeWarning, typeWarning, actions, skipLink);
  }
  function renderStep4(panel, activate) {
    panel.innerHTML = "";
    panel.append(buildProgressBar(4, panel, activate));
    const heading = el("p", { class: "wizard-hint" });
    heading.textContent = "Review your dispute before submitting.";
    panel.appendChild(heading);
    const summary = el("div", { class: "dsp-summary" });
    const mkRow = (lbl, val) => {
      const row = el("div", { class: "dsp-summary-row" });
      const l = el("span", { class: "dsp-summary-label" });
      l.textContent = lbl;
      const v = el("span", { class: "dsp-summary-value" });
      v.textContent = val;
      row.append(l, v);
      return row;
    };
    summary.append(mkRow("Job", draft.job.title), mkRow("Category", draft.category));
    if (draft.urgent) summary.append(mkRow("Priority", "\u26A1 Urgent"));
    const descRow = el("div", { class: "dsp-summary-row dsp-summary-desc-row" });
    const descLbl = el("span", { class: "dsp-summary-label" });
    descLbl.textContent = "Description";
    const descVal = el("p", { class: "dsp-summary-desc" });
    descVal.textContent = draft.description;
    descRow.append(descLbl, descVal);
    summary.appendChild(descRow);
    if (draft.file) {
      const evidRow = el("div", { class: "dsp-summary-row" });
      const evidLbl = el("span", { class: "dsp-summary-label" });
      evidLbl.textContent = "Evidence";
      const evidVal = el("div", { class: "dsp-summary-evid" });
      if (draft.previewUrl) {
        const thumb = el("img", { class: "dsp-summary-thumb", alt: "evidence", src: draft.previewUrl });
        evidVal.appendChild(thumb);
      }
      const fname = el("span");
      fname.textContent = `${draft.file.name} (${formatBytes(draft.file.size)})`;
      evidVal.appendChild(fname);
      evidRow.append(evidLbl, evidVal);
      summary.appendChild(evidRow);
    } else {
      summary.append(mkRow("Evidence", "None attached"));
    }
    const errorEl = el("div", { class: "error hidden" });
    const actions = el("div", { class: "wizard-actions" });
    const backBtn = el("button", { class: "btn-ghost btn-sm" });
    backBtn.textContent = "\u2190 Back";
    backBtn.addEventListener("click", () => renderStep3(panel, activate));
    const submitBtn = el("button", { class: "btn-primary btn-sm" });
    submitBtn.textContent = "Submit Dispute";
    submitBtn.addEventListener("click", async () => {
      submitBtn.disabled = true;
      errorEl.classList.add("hidden");
      let evidenceUrl;
      if (draft.file) {
        submitBtn.textContent = "Uploading evidence\u2026";
        try {
          const form = new FormData();
          form.append("file", draft.file);
          const upRes = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: form, credentials: "include" });
          if (upRes.ok) {
            const d = await upRes.json();
            evidenceUrl = d.url;
          }
        } catch {
        }
      }
      submitBtn.textContent = "Submitting dispute\u2026";
      const payload = {
        jobId: draft.job._id,
        category: draft.category,
        description: draft.description,
        evidenceUrl,
        urgent: draft.urgent
      };
      const res = await send({ type: "POST_DISPUTE", payload });
      if (res.ok) {
        clearDraft();
        renderSuccess(panel, activate);
      } else {
        errorEl.textContent = res.error ?? "Failed to submit dispute.";
        errorEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Dispute";
      }
    });
    actions.append(backBtn, submitBtn);
    panel.append(summary, errorEl, actions);
  }
  function renderSuccess(panel, activate) {
    panel.innerHTML = "";
    const wrap = el("div", { class: "wizard-step wizard-success" });
    const iconEl = el("div", { class: "success-icon" });
    iconEl.textContent = "\u2705";
    const titleEl = el("p", { class: "success-title" });
    titleEl.textContent = "Dispute Submitted";
    const subEl = el("p", { class: "success-sub" });
    subEl.textContent = "Our team will review your case within 2\u20133 business days. You'll be notified of any updates.";
    const viewBtn = el("button", { class: "btn-primary btn-sm" });
    viewBtn.style.marginTop = "16px";
    viewBtn.textContent = "View My Disputes";
    viewBtn.addEventListener("click", () => activate("list"));
    wrap.append(iconEl, titleEl, subEl, viewBtn);
    panel.appendChild(wrap);
  }
  async function renderDisputeList(panel, activate) {
    panel.innerHTML = "";
    renderSkeletons(panel, 2);
    const res = await send({ type: "GET_DISPUTES" });
    if (!res.ok) {
      showRetry(panel, res.error ?? "Failed to load disputes.", () => void renderDisputeList(panel, activate));
      return;
    }
    const disputes = (res.disputes ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    panel.innerHTML = "";
    if (disputes.length === 0) {
      const empty = el("div", { class: "dsp-empty-state" });
      const eIcon = el("span", { class: "dsp-empty-icon" });
      eIcon.textContent = "\u2696\uFE0F";
      const eText = el("p");
      eText.textContent = "No disputes filed yet.";
      const eLink = el("button", { class: "btn-primary btn-sm" });
      eLink.style.marginTop = "12px";
      eLink.textContent = "File a Dispute";
      eLink.addEventListener("click", () => activate("new"));
      empty.append(eIcon, eText, eLink);
      panel.appendChild(empty);
      return;
    }
    const searchWrap = el("div", { class: "dsp-search-wrap" });
    const searchIcon = el("span", { class: "dsp-search-icon" });
    searchIcon.textContent = "\u{1F50D}";
    const searchInput = el("input", { type: "text", class: "dsp-search", placeholder: "Search disputes\u2026" });
    searchWrap.append(searchIcon, searchInput);
    const statuses = ["all", ...Array.from(new Set(disputes.map((d) => d.status)))];
    let activeFilter = "all";
    let searchQuery = "";
    const filterRow = el("div", { class: "dsp-filter-row" });
    const filterBtns = [];
    statuses.forEach((s) => {
      const btn = el("button", { class: `dsp-filter-btn${s === "all" ? " active" : ""}` });
      btn.textContent = s === "all" ? "All" : STATUS_META2[s]?.label ?? s;
      btn.dataset["status"] = s;
      filterBtns.push(btn);
      filterRow.appendChild(btn);
    });
    const listEl = el("div", { class: "dsp-list" });
    const applyFilters = () => {
      filterBtns.forEach((b) => b.classList.toggle("active", b.dataset["status"] === activeFilter));
      listEl.innerHTML = "";
      const filtered = disputes.filter((d) => activeFilter === "all" || d.status === activeFilter).filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (d.jobTitle ?? d.jobId).toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      });
      if (!filtered.length) {
        const msg = el("p", { class: "empty" });
        msg.textContent = searchQuery ? "No disputes match your search." : "No disputes with this status.";
        listEl.appendChild(msg);
        return;
      }
      filtered.forEach((d) => listEl.appendChild(buildDisputeCard(d)));
    };
    filterBtns.forEach((b) => b.addEventListener("click", () => {
      activeFilter = b.dataset["status"];
      applyFilters();
    }));
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      applyFilters();
    });
    applyFilters();
    panel.append(searchWrap, filterRow, listEl);
  }
  function buildDisputeCard(d) {
    const meta = STATUS_META2[d.status] ?? { label: d.status, icon: "\u26AA", cls: "ds-closed" };
    const card = el("div", { class: "dispute-card" });
    const header = el("div", { class: "dispute-card-header" });
    const titleRow = el("div", { class: "dispute-title-row" });
    const iconEl = el("span", { class: "dispute-icon" });
    iconEl.textContent = meta.icon;
    const titleEl = el("span", { class: "dispute-job-title" });
    titleEl.textContent = d.jobTitle ?? d.jobId;
    titleRow.append(iconEl, titleEl);
    const statusEl = el("span", { class: `dispute-status ${meta.cls}` });
    statusEl.textContent = meta.label;
    header.append(titleRow, statusEl);
    const subRow = el("div", { class: "dispute-sub-row" });
    const catEl = el("span", { class: "dispute-category" });
    catEl.textContent = d.category;
    const dateEl = el("span", { class: "dispute-date" });
    dateEl.textContent = relativeTime(d.createdAt);
    subRow.append(catEl, dateEl);
    const isLong = d.description.length > 90;
    const descEl = el("p", { class: "dispute-desc" });
    descEl.textContent = isLong ? d.description.slice(0, 90) + "\u2026" : d.description;
    let expanded = false;
    let expandBtn = null;
    if (isLong) {
      expandBtn = el("button", { class: "btn-link btn-xs" });
      expandBtn.textContent = "Read more";
      expandBtn.addEventListener("click", () => {
        expanded = !expanded;
        descEl.textContent = expanded ? d.description : d.description.slice(0, 90) + "\u2026";
        expandBtn.textContent = expanded ? "Show less" : "Read more";
      });
    }
    const footer = el("div", { class: "dispute-footer" });
    if (d.evidenceUrl) {
      const evidLink = el("a", { class: "dispute-evid-link", href: d.evidenceUrl, target: "_blank" });
      evidLink.textContent = "\u{1F4CE} View Evidence";
      footer.appendChild(evidLink);
    }
    const timeline = buildStatusTimeline(d.status);
    card.append(header, subRow, descEl);
    if (expandBtn) card.appendChild(expandBtn);
    card.append(footer, timeline);
    return card;
  }
  function buildStatusTimeline(currentStatus) {
    const resolvedIdx = STATUS_TIMELINE.findIndex((s) => s.key === "resolved");
    const currentIdx = currentStatus === "closed" ? resolvedIdx : STATUS_TIMELINE.findIndex((s) => s.key === currentStatus);
    const tl = el("div", { class: "dsp-timeline" });
    STATUS_TIMELINE.forEach((step, i) => {
      const reached = i <= currentIdx;
      const dotWrap = el("div", { class: "dsp-tl-item" });
      const dot = el("span", { class: `dsp-tl-dot${reached ? " reached" : ""}` });
      const lbl = el("span", { class: `dsp-tl-label${reached ? " reached" : ""}` });
      lbl.textContent = step.label;
      dotWrap.append(dot, lbl);
      tl.appendChild(dotWrap);
      if (i < STATUS_TIMELINE.length - 1) {
        const line = el("div", { class: `dsp-tl-line${i < currentIdx ? " reached" : ""}` });
        tl.appendChild(line);
      }
    });
    return tl;
  }
  function renderSkeletons(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = el("div", { class: "dsp-skeleton" });
      s.innerHTML = `
      <div class="skel skel-title"></div>
      <div class="skel skel-meta"></div>
    `;
      container.appendChild(s);
    }
  }
  function showRetry(container, message, onRetry) {
    container.innerHTML = "";
    const wrap = el("div", { class: "dsp-empty-state" });
    const msg = el("p", { class: "error-msg" });
    msg.textContent = message;
    const btn = el("button", { class: "btn-ghost btn-sm" });
    btn.textContent = "\u21BA Retry";
    btn.style.marginTop = "8px";
    btn.addEventListener("click", onRetry);
    wrap.append(msg, btn);
    container.appendChild(wrap);
  }
  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // popup/components/AvailabilityToggle.ts
  function renderAvailabilityToggle(container) {
    container.innerHTML = `
    <div class="section-header">
      <h2>My Availability</h2>
      <span class="subtitle-sm">Toggle your status for clients to find you</span>
    </div>
    <div id="avail-body" class="avail-body">
      <p class="loading">Loading\u2026</p>
    </div>
  `;
    void loadAvailability(container);
  }
  async function loadAvailability(container) {
    const body = container.querySelector("#avail-body");
    const res = await send({ type: "GET_PROVIDER_PROFILE" });
    if (!res.ok) {
      body.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load profile."}</p>`;
      return;
    }
    renderToggleUI(body, res.isAvailable ?? false);
  }
  function renderToggleUI(body, initial) {
    body.innerHTML = "";
    let isAvailable = initial;
    const card = document.createElement("div");
    card.className = "avail-card";
    const iconEl = document.createElement("div");
    iconEl.className = "avail-icon";
    iconEl.textContent = isAvailable ? "\u{1F7E2}" : "\u{1F534}";
    const labelWrap = document.createElement("div");
    labelWrap.className = "avail-label-wrap";
    const label = document.createElement("span");
    label.className = "avail-label";
    label.textContent = isAvailable ? "Available for work" : "Not available";
    const sublabel = document.createElement("span");
    sublabel.className = "avail-sublabel";
    sublabel.textContent = "Clients can see and contact you when available";
    labelWrap.append(label, sublabel);
    const toggleWrap = document.createElement("label");
    toggleWrap.className = "toggle-switch";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = isAvailable;
    const toggleSlider = document.createElement("span");
    toggleSlider.className = "toggle-slider";
    toggleWrap.append(toggleInput, toggleSlider);
    const statusEl = document.createElement("p");
    statusEl.className = "avail-status-msg";
    const errorEl = document.createElement("p");
    errorEl.className = "error-msg hidden";
    toggleInput.addEventListener("change", async () => {
      const newVal = toggleInput.checked;
      toggleInput.disabled = true;
      statusEl.textContent = "Saving\u2026";
      errorEl.classList.add("hidden");
      const res = await send({ type: "SET_AVAILABILITY", isAvailable: newVal });
      toggleInput.disabled = false;
      if (res.ok) {
        isAvailable = newVal;
        iconEl.textContent = isAvailable ? "\u{1F7E2}" : "\u{1F534}";
        label.textContent = isAvailable ? "Available for work" : "Not available";
        statusEl.textContent = isAvailable ? "You're now visible to clients." : "You're hidden from client searches.";
      } else {
        toggleInput.checked = isAvailable;
        errorEl.textContent = res.error ?? "Failed to update availability.";
        errorEl.classList.remove("hidden");
        statusEl.textContent = "";
      }
    });
    card.append(iconEl, labelWrap, toggleWrap);
    body.append(card, statusEl, errorEl);
    const tips = document.createElement("div");
    tips.className = "avail-tips";
    tips.innerHTML = `
    <p class="avail-tips-title">Tips</p>
    <ul class="avail-tips-list">
      <li>Turn off availability when you're fully booked</li>
      <li>Being available boosts your ranking in search results</li>
      <li>Clients can still message you when you're unavailable</li>
    </ul>
  `;
    body.appendChild(tips);
  }

  // popup/popup.ts
  var TABS = [
    {
      id: "notifications",
      icon: "\u{1F514}",
      name: "Alerts",
      render: (c) => renderNotificationList(c)
    },
    {
      id: "post-job",
      icon: "\u2795",
      name: "Post Job",
      roles: ["client"],
      render: (c, _u, prefill) => renderQuickJobPost(c, prefill)
    },
    {
      id: "quotes",
      icon: "\u{1F4CB}",
      name: "Quotes",
      roles: ["provider"],
      render: (c) => renderQuickQuote(c)
    },
    {
      id: "chat",
      icon: "\u{1F4AC}",
      name: "Chat",
      render: (c, u) => renderChatView(c, u)
    },
    {
      id: "payment",
      icon: "\u{1F4B3}",
      name: "Payment",
      roles: ["client"],
      render: (c) => renderPaymentStatus(c)
    },
    {
      id: "referral",
      icon: "\u{1F464}",
      name: "Referral",
      roles: ["peso"],
      render: (c, _u, prefill) => renderPesoReferral(c, prefill)
    },
    {
      id: "jobs",
      icon: "\u{1F5C2}\uFE0F",
      name: "My Jobs",
      roles: ["client", "provider"],
      render: (c, u) => renderJobTracker(c, u)
    },
    {
      id: "recurring",
      icon: "\u{1F501}",
      name: "Schedule",
      roles: ["client", "provider"],
      render: (c) => renderRecurringJobs(c)
    },
    {
      id: "providers",
      icon: "\u{1F50D}",
      name: "Find",
      roles: ["client"],
      render: (c) => renderProviderSearch(c)
    },
    {
      id: "file-dispute",
      icon: "\u2696\uFE0F",
      name: "File Dispute",
      render: (c) => renderFileDispute(c)
    },
    {
      id: "my-disputes",
      icon: "\u{1F4CB}",
      name: "My Disputes",
      render: (c) => renderMyDisputes(c)
    },
    {
      id: "availability",
      icon: "\u{1F7E2}",
      name: "Availability",
      roles: ["provider"],
      render: (c) => renderAvailabilityToggle(c)
    },
    {
      id: "support",
      icon: "\u{1F3AB}",
      name: "Support",
      render: (c) => renderSupportTickets(c)
    },
    {
      id: "loyalty",
      icon: "\u2B50",
      name: "Points",
      render: (c) => renderLoyaltyPoints(c)
    }
  ];
  var app = document.getElementById("app");
  async function main() {
    const { user } = await send({ type: "GET_AUTH" });
    if (!user) {
      renderLogin();
      return;
    }
    const prefillRes = await send(
      { type: "GET_PREFILL", keys: ["job", "referral"] }
    );
    const prefillJob = prefillRes.job ?? void 0;
    const prefillRef = prefillRes.referral ?? void 0;
    renderShell(user, prefillJob, prefillRef);
  }
  function renderLogin() {
    app.innerHTML = "";
    renderLoginView(app, (user) => renderShell(user));
  }
  function renderShell(user, prefillJob, prefillRef) {
    const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(user.role));
    const header = document.createElement("div");
    header.className = "popup-header";
    const logoWrap = document.createElement("div");
    logoWrap.className = "header-logo";
    const logoImg = document.createElement("img");
    logoImg.src = "icons/icon16.png";
    logoImg.alt = "LP";
    logoImg.width = 16;
    logoImg.height = 16;
    const logoText = document.createElement("span");
    logoText.textContent = "LocalPro";
    logoWrap.append(logoImg, logoText);
    const userInfo = document.createElement("div");
    userInfo.className = "header-user";
    const userName = document.createElement("span");
    userName.className = "user-name";
    userName.textContent = user.name;
    const searchBtn = document.createElement("button");
    searchBtn.className = "btn-ghost btn-xs";
    searchBtn.title = "Search";
    searchBtn.textContent = "\u{1F50D}";
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "btn-ghost btn-xs";
    logoutBtn.textContent = "Sign out";
    logoutBtn.addEventListener("click", async () => {
      await send({ type: "LOGOUT" });
      renderLogin();
    });
    userInfo.append(userName, searchBtn, logoutBtn);
    const headerRow = document.createElement("div");
    headerRow.className = "header-row";
    headerRow.append(logoWrap, userInfo);
    header.append(headerRow);
    const searchPanel = document.createElement("div");
    searchPanel.className = "omni-panel hidden";
    searchPanel.innerHTML = `
    <input id="omni-input" type="text" placeholder="Search jobs, providers, categories\u2026" class="omni-input" />
    <div id="omni-results" class="omni-results"></div>
  `;
    const bannerSlot = document.createElement("div");
    bannerSlot.id = "banner-slot";
    const mainEl = document.createElement("div");
    mainEl.className = "main-content";
    app.innerHTML = "";
    app.append(header, searchPanel, bannerSlot, mainEl);
    wireOmniSearch(searchBtn, searchPanel);
    if (user.role === "client" || user.role === "provider") {
      void loadWalletBar(header);
    }
    if (user.role === "provider") {
      void loadKycBar(header);
    }
    void loadAnnouncementBanner(bannerSlot);
    if (prefillJob) {
      const tab = visibleTabs.find((t) => t.id === "post-job");
      if (tab) {
        openFeature(mainEl, user, visibleTabs, tab, prefillJob);
        return;
      }
    }
    if (prefillRef) {
      const tab = visibleTabs.find((t) => t.id === "referral");
      if (tab) {
        openFeature(mainEl, user, visibleTabs, tab, prefillRef);
        return;
      }
    }
    showHome(mainEl, user, visibleTabs);
  }
  function showHome(mainEl, user, tabs) {
    mainEl.innerHTML = "";
    mainEl.className = "main-content";
    const grid = document.createElement("div");
    grid.className = "home-grid";
    tabs.forEach((tab) => {
      const tile = document.createElement("button");
      tile.className = "home-tile";
      tile.setAttribute("data-tab", tab.id);
      const iconEl = document.createElement("span");
      iconEl.className = "home-tile-icon";
      iconEl.textContent = tab.icon;
      const nameEl = document.createElement("span");
      nameEl.className = "home-tile-name";
      nameEl.textContent = tab.name;
      tile.append(iconEl, nameEl);
      tile.addEventListener("click", () => openFeature(mainEl, user, tabs, tab));
      grid.appendChild(tile);
    });
    mainEl.appendChild(grid);
    void loadHomeBadges(grid);
  }
  async function loadHomeBadges(grid) {
    const res = await send({ type: "GET_NOTIFICATIONS" });
    if (!res.ok || !res.unreadCount) return;
    const alertTile = grid.querySelector('[data-tab="notifications"]');
    if (!alertTile) return;
    const badge = document.createElement("span");
    badge.className = "home-tile-badge";
    badge.textContent = res.unreadCount > 99 ? "99+" : String(res.unreadCount);
    alertTile.appendChild(badge);
  }
  function openFeature(mainEl, user, tabs, tab, prefill) {
    mainEl.innerHTML = "";
    mainEl.className = "main-content feature-view";
    const nav = document.createElement("div");
    nav.className = "feature-nav";
    const backBtn = document.createElement("button");
    backBtn.className = "back-btn";
    backBtn.innerHTML = `<span class="back-arrow">\u2039</span> Back`;
    backBtn.addEventListener("click", () => showHome(mainEl, user, tabs));
    const navTitle = document.createElement("div");
    navTitle.className = "feature-nav-title";
    const titleIcon = document.createElement("span");
    titleIcon.textContent = tab.icon;
    const titleText = document.createElement("span");
    titleText.textContent = tab.name;
    navTitle.append(titleIcon, titleText);
    nav.append(backBtn, navTitle);
    const featureContent = document.createElement("div");
    featureContent.className = "feature-content";
    mainEl.append(nav, featureContent);
    tab.render(featureContent, user, prefill);
  }
  function wireOmniSearch(toggleBtn, panel) {
    const input = panel.querySelector("#omni-input");
    const results = panel.querySelector("#omni-results");
    let debounce = null;
    toggleBtn.addEventListener("click", () => {
      const open = panel.classList.toggle("hidden") === false;
      if (open) {
        input.focus();
      } else {
        results.innerHTML = "";
        input.value = "";
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        panel.classList.add("hidden");
        results.innerHTML = "";
        input.value = "";
      }
    });
    input.addEventListener("input", () => {
      if (debounce) clearTimeout(debounce);
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = "";
        return;
      }
      debounce = setTimeout(() => void doOmniSearch(q, results), 300);
    });
  }
  async function doOmniSearch(q, results) {
    results.innerHTML = `<p class="omni-loading">Searching\u2026</p>`;
    const res = await send({ type: "OMNI_SEARCH", q });
    if (!res.ok || !res.results?.length) {
      results.innerHTML = `<p class="omni-empty">No results for "${q}"</p>`;
      return;
    }
    const grouped = {};
    for (const r of res.results) {
      (grouped[r.type] ??= []).push(r);
    }
    results.innerHTML = "";
    const labels = { job: "Jobs", provider: "Providers", category: "Categories" };
    for (const [type, items] of Object.entries(grouped)) {
      const groupEl = document.createElement("div");
      groupEl.className = "omni-group";
      const groupLabel = document.createElement("p");
      groupLabel.className = "omni-group-label";
      groupLabel.textContent = labels[type] ?? type;
      groupEl.appendChild(groupLabel);
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "omni-result-row";
        row.innerHTML = `
        <span class="omni-result-title">${item.title}</span>
        ${item.subtitle ? `<span class="omni-result-sub">${item.subtitle}</span>` : ""}
      `;
        row.addEventListener("click", () => window.open(item.url, "_blank"));
        groupEl.appendChild(row);
      });
      results.appendChild(groupEl);
    }
  }
  async function loadWalletBar(header) {
    const res = await send({
      type: "GET_WALLET"
    });
    if (!res.ok) return;
    const bar = document.createElement("div");
    bar.className = "wallet-bar";
    const balanceEl = document.createElement("span");
    balanceEl.className = "wallet-balance";
    balanceEl.textContent = `${formatPHP(res.balance ?? 0)}`;
    const pendingEl = document.createElement("span");
    pendingEl.className = "wallet-pending";
    pendingEl.textContent = `+${formatPHP(res.pending ?? 0)} escrow`;
    const actions = document.createElement("div");
    actions.className = "wallet-actions";
    const topUpBtn = document.createElement("a");
    topUpBtn.className = "wallet-link";
    topUpBtn.textContent = "Top Up";
    topUpBtn.href = "#";
    topUpBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.open("https://www.localpro.asia/wallet/topup", "_blank");
    });
    const sepEl = document.createElement("span");
    sepEl.className = "wallet-sep";
    sepEl.textContent = "\xB7";
    const withdrawBtn = document.createElement("a");
    withdrawBtn.className = "wallet-link";
    withdrawBtn.textContent = "Withdraw";
    withdrawBtn.href = "#";
    withdrawBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.open("https://www.localpro.asia/wallet/withdraw", "_blank");
    });
    actions.append(topUpBtn, sepEl, withdrawBtn);
    bar.append(balanceEl, pendingEl, actions);
    header.appendChild(bar);
  }
  async function loadKycBar(header) {
    const res = await send({ type: "GET_KYC" });
    if (!res.ok) return;
    if (res.status === "verified" || res.status === "not-submitted") return;
    const bar = document.createElement("div");
    const isRejected = res.status === "rejected";
    bar.className = `kyc-bar ${isRejected ? "kyc-rejected" : "kyc-pending"}`;
    const icon = isRejected ? "\u274C" : "\u23F3";
    const text = isRejected ? `KYC rejected${res.rejectionReason ? `: ${res.rejectionReason}` : ""}. Please re-upload.` : "Identity verification pending \u2014 complete KYC to unlock all features.";
    const msgEl = document.createElement("span");
    msgEl.className = "kyc-bar-msg";
    msgEl.textContent = `${icon} ${text}`;
    const link = document.createElement("a");
    link.className = "kyc-bar-link";
    link.textContent = "Upload docs \u2192";
    link.href = "#";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const uploadUrl = res.uploadUrl ?? "https://www.localpro.asia/kyc/upload";
      window.open(uploadUrl, "_blank");
    });
    bar.append(msgEl, link);
    header.appendChild(bar);
  }
  var DISMISSED_KEY = "lp_dismissed_announcements";
  async function loadAnnouncementBanner(bannerSlot) {
    const res = await send({
      type: "GET_ANNOUNCEMENTS"
    });
    if (!res.ok || !res.announcements?.length) return;
    const dismissed = new Set(
      JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]")
    );
    const active = res.announcements.filter((a) => !dismissed.has(a._id));
    if (!active.length) return;
    const ann = active[0];
    const typeClass = ann.type === "warning" ? "banner-warning" : ann.type === "promotion" ? "banner-promotion" : "banner-info";
    const banner = document.createElement("div");
    banner.className = `announcement-banner ${typeClass}`;
    banner.innerHTML = `
    <div class="banner-text">
      <span class="banner-title">${ann.title}</span>
      <span class="banner-msg">${ann.message}</span>
    </div>
    <button class="banner-dismiss" title="Dismiss">\xD7</button>
  `;
    banner.querySelector(".banner-dismiss").addEventListener("click", () => {
      dismissed.add(ann._id);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
      banner.remove();
    });
    bannerSlot.appendChild(banner);
  }
  void main();
})();
