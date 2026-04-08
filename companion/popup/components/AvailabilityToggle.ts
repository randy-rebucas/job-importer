import { send } from "../utils";

interface ProfileResponse { ok: boolean; isAvailable?: boolean; error?: string }
interface SetResponse     { ok: boolean; error?: string }

export function renderAvailabilityToggle(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>My Availability</h2>
      <span class="subtitle-sm">Toggle your status for clients to find you</span>
    </div>
    <div id="avail-body" class="avail-body">
      <p class="loading">Loading…</p>
    </div>
  `;

  void loadAvailability(container);
}

async function loadAvailability(container: HTMLElement): Promise<void> {
  const body = container.querySelector<HTMLElement>("#avail-body")!;

  const res = await send<ProfileResponse>({ type: "GET_PROVIDER_PROFILE" });

  if (!res.ok) {
    body.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load profile."}</p>`;
    return;
  }

  renderToggleUI(body, res.isAvailable ?? false);
}

function renderToggleUI(body: HTMLElement, initial: boolean): void {
  body.innerHTML = "";

  let isAvailable = initial;

  const card = document.createElement("div");
  card.className = "avail-card";

  const iconEl = document.createElement("div");
  iconEl.className = "avail-icon";
  iconEl.textContent = isAvailable ? "🟢" : "🔴";

  const labelWrap = document.createElement("div");
  labelWrap.className = "avail-label-wrap";
  const label = document.createElement("span");
  label.className = "avail-label";
  label.textContent = isAvailable ? "Available for work" : "Not available";
  const sublabel = document.createElement("span");
  sublabel.className = "avail-sublabel";
  sublabel.textContent = "Clients can see and contact you when available";
  labelWrap.append(label, sublabel);

  // Toggle switch
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
    statusEl.textContent = "Saving…";
    errorEl.classList.add("hidden");

    const res = await send<SetResponse>({ type: "SET_AVAILABILITY", isAvailable: newVal });

    toggleInput.disabled = false;

    if (res.ok) {
      isAvailable = newVal;
      iconEl.textContent = isAvailable ? "🟢" : "🔴";
      label.textContent = isAvailable ? "Available for work" : "Not available";
      statusEl.textContent = isAvailable
        ? "You're now visible to clients."
        : "You're hidden from client searches.";
    } else {
      // Revert the toggle
      toggleInput.checked = isAvailable;
      errorEl.textContent = res.error ?? "Failed to update availability.";
      errorEl.classList.remove("hidden");
      statusEl.textContent = "";
    }
  });

  card.append(iconEl, labelWrap, toggleWrap);
  body.append(card, statusEl, errorEl);

  // Usage tips
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
