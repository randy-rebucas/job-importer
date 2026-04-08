import { send } from "../utils";
import type { Provider } from "../../utils/api";

interface SearchResponse  { ok: boolean; providers?: Provider[]; error?: string }
interface FavoriteResponse { ok: boolean; error?: string }

export function renderProviderSearch(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Find Providers</h2>
    </div>
    <div class="provider-search-row">
      <input id="provider-query" type="text" placeholder="Search by name or skill…" />
      <button id="provider-search-btn" class="btn-primary btn-sm">Search</button>
    </div>
    <div id="provider-error" class="error hidden"></div>
    <div id="provider-results" class="list-container" style="margin-top:10px"></div>
  `;

  const input   = container.querySelector<HTMLInputElement>("#provider-query")!;
  const btn     = container.querySelector<HTMLButtonElement>("#provider-search-btn")!;
  const errorEl = container.querySelector<HTMLDivElement>("#provider-error")!;
  const results = container.querySelector<HTMLDivElement>("#provider-results")!;

  async function doSearch(): Promise<void> {
    const q = input.value.trim();
    if (!q) return;

    errorEl.classList.add("hidden");
    results.innerHTML = `<p class="loading">Searching…</p>`;
    btn.disabled = true;

    const res = await send<SearchResponse>({ type: "SEARCH_PROVIDERS", q });

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

function buildProviderCard(provider: Provider): HTMLElement {
  const card = document.createElement("div");
  card.className = "provider-card";

  // ── Avatar ──────────────────────────────────────────────────────────────
  const avatar = document.createElement("div");
  avatar.className = "provider-avatar";
  if (provider.avatar) {
    const img = document.createElement("img");
    img.src = provider.avatar;
    img.alt = provider.name;
    img.className = "provider-avatar-img";
    img.onerror = () => { img.replaceWith(makeInitials(provider.name)); };
    avatar.appendChild(img);
  } else {
    avatar.appendChild(makeInitials(provider.name));
  }

  // ── Info ─────────────────────────────────────────────────────────────────
  const info = document.createElement("div");
  info.className = "provider-info";

  const nameEl = document.createElement("div");
  nameEl.className = "provider-name";
  nameEl.textContent = provider.name;

  const ratingEl = document.createElement("div");
  ratingEl.className = "provider-rating";
  if (provider.rating != null) {
    const stars = "★".repeat(Math.round(provider.rating)) + "☆".repeat(5 - Math.round(provider.rating));
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
    rate.textContent = `₱${provider.hourlyRate}/hr`;
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

  // ── Favorite button ───────────────────────────────────────────────────────
  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn${provider.isFavorite ? " fav-active" : ""}`;
  favBtn.title = provider.isFavorite ? "Remove from favorites" : "Save provider";
  favBtn.textContent = provider.isFavorite ? "♥" : "♡";

  let isFav = !!provider.isFavorite;
  favBtn.addEventListener("click", async () => {
    favBtn.disabled = true;
    const res = await send<FavoriteResponse>({
      type: isFav ? "REMOVE_FAVORITE" : "ADD_FAVORITE",
      providerId: provider._id,
    });
    favBtn.disabled = false;
    if (res.ok) {
      isFav = !isFav;
      favBtn.textContent = isFav ? "♥" : "♡";
      favBtn.title = isFav ? "Remove from favorites" : "Save provider";
      favBtn.classList.toggle("fav-active", isFav);
    }
  });

  card.append(avatar, info, favBtn);
  return card;
}

function makeInitials(name: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "provider-avatar-initials";
  el.textContent = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return el;
}
