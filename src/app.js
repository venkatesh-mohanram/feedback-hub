const storageKey = "feedback-hub-items-v1";
const sessionKey = "feedback-hub-user-v1";
const googleClientId = "";
const statuses = ["Under review", "Planned", "In progress", "Shipped"];

const sampleIdeas = [
  {
    id: crypto.randomUUID(),
    title: "Let teams export roadmap views",
    details: "Customer success needs a simple way to share status snapshots before quarterly business reviews.",
    category: "Analytics",
    status: "Planned",
    requester: "Taylor Morgan",
    votes: 42,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    id: crypto.randomUUID(),
    title: "Add Slack digest for newly shipped features",
    details: "Admins want a weekly digest that highlights shipped ideas and links back to the release notes.",
    category: "Integrations",
    status: "In progress",
    requester: "Jordan Lee",
    votes: 35,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
  {
    id: crypto.randomUUID(),
    title: "Group feedback by account segment",
    details: "Product managers need to see which requests are coming from enterprise, mid-market, and startup customers.",
    category: "Workflow",
    status: "Under review",
    requester: "Priya Shah",
    votes: 28,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: crypto.randomUUID(),
    title: "Mobile voting experience",
    details: "Field teams often review ideas from phones and need faster tap targets for voting and status checks.",
    category: "Mobile",
    status: "Shipped",
    requester: "Alex Kim",
    votes: 64,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  },
];

let feedbackItems = loadItems();
let currentUser = loadCurrentUser();
let activeStatus = "All";
let query = "";
let sortMode = "votes";

const elements = {
  form: document.querySelector("#feedbackForm"),
  authNotice: document.querySelector("#authNotice"),
  userMenu: document.querySelector("#userMenu"),
  authModal: document.querySelector("#authModal"),
  googleButtonMount: document.querySelector("#googleButtonMount"),
  demoEmail: document.querySelector("#demoEmail"),
  demoSignInButton: document.querySelector("#demoSignInButton"),
  closeAuthButton: document.querySelector("#closeAuthButton"),
  noticeSignInButton: document.querySelector("#noticeSignInButton"),
  list: document.querySelector("#feedbackList"),
  emptyState: document.querySelector("#emptyState"),
  template: document.querySelector("#feedbackCardTemplate"),
  title: document.querySelector("#ideaTitle"),
  details: document.querySelector("#ideaDetails"),
  category: document.querySelector("#ideaCategory"),
  status: document.querySelector("#ideaStatus"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  segments: document.querySelectorAll(".segment"),
  openFormButton: document.querySelector("#openFormButton"),
  seedButton: document.querySelector("#seedButton"),
  totalIdeas: document.querySelector("#totalIdeas"),
  totalVotes: document.querySelector("#totalVotes"),
  activeIdeas: document.querySelector("#activeIdeas"),
  shippedIdeas: document.querySelector("#shippedIdeas"),
  reviewCount: document.querySelector("#reviewCount"),
  plannedCount: document.querySelector("#plannedCount"),
  progressCount: document.querySelector("#progressCount"),
  shippedCount: document.querySelector("#shippedCount"),
};

function loadCurrentUser() {
  const savedUser = localStorage.getItem(sessionKey);
  if (!savedUser) return null;

  try {
    const parsedUser = JSON.parse(savedUser);
    return parsedUser && parsedUser.email ? parsedUser : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem(sessionKey, JSON.stringify(user));
  } else {
    localStorage.removeItem(sessionKey);
  }
}

function loadItems() {
  const savedItems = localStorage.getItem(storageKey);
  if (!savedItems) return sampleIdeas;

  try {
    const parsedItems = JSON.parse(savedItems);
    return Array.isArray(parsedItems) && parsedItems.length ? parsedItems : sampleIdeas;
  } catch {
    return sampleIdeas;
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(feedbackItems));
}

function displayNameFromEmail(email) {
  const localPart = email.split("@")[0] || "Google user";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(normalized)
      .split("")
      .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );
  return JSON.parse(json);
}

function openAuthModal() {
  elements.authModal.hidden = false;
  elements.demoEmail.focus();
}

function closeAuthModal() {
  elements.authModal.hidden = true;
}

function handleSignedInUser(user) {
  saveCurrentUser(user);
  closeAuthModal();
  renderAuth();
}

function handleGoogleCredential(response) {
  const profile = decodeJwtPayload(response.credential);
  handleSignedInUser({
    name: profile.name || displayNameFromEmail(profile.email),
    email: profile.email,
    picture: profile.picture || "",
    provider: "google",
  });
}

function loadGoogleIdentityScript() {
  if (!googleClientId || window.google?.accounts?.id) return;

  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.addEventListener("load", initializeGoogleSignIn);
  document.head.append(script);
}

function initializeGoogleSignIn() {
  if (!googleClientId || !window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
  });

  elements.googleButtonMount.innerHTML = "";
  window.google.accounts.id.renderButton(elements.googleButtonMount, {
    theme: "outline",
    size: "large",
    width: 280,
    text: "continue_with",
  });
}

function renderAuth() {
  const isSignedIn = Boolean(currentUser);
  elements.authNotice.hidden = isSignedIn;
  elements.userMenu.innerHTML = "";

  if (!isSignedIn) {
    const signInButton = document.createElement("button");
    signInButton.className = "secondary-button";
    signInButton.type = "button";
    signInButton.textContent = "Sign in";
    signInButton.addEventListener("click", openAuthModal);
    elements.userMenu.append(signInButton);
    return;
  }

  const avatar = document.createElement("span");
  avatar.className = "user-avatar";
  avatar.textContent = currentUser.name.charAt(0).toUpperCase();

  const identity = document.createElement("span");
  identity.className = "user-identity";
  identity.textContent = currentUser.name;

  const signOutButton = document.createElement("button");
  signOutButton.className = "text-button";
  signOutButton.type = "button";
  signOutButton.textContent = "Sign out";
  signOutButton.addEventListener("click", () => {
    saveCurrentUser(null);
    renderAuth();
  });

  elements.userMenu.append(avatar, identity, signOutButton);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(timestamp);
}

function statusClass(status) {
  return {
    "Under review": "review",
    Planned: "planned",
    "In progress": "progress",
    Shipped: "shipped",
  }[status];
}

function getVisibleItems() {
  const normalizedQuery = query.trim().toLowerCase();
  return feedbackItems
    .filter((item) => activeStatus === "All" || item.status === activeStatus)
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [item.title, item.details, item.category, item.status].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      if (sortMode === "newest") return b.createdAt - a.createdAt;
      if (sortMode === "status") return statuses.indexOf(a.status) - statuses.indexOf(b.status) || b.votes - a.votes;
      return b.votes - a.votes;
    });
}

function updateMetrics() {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  feedbackItems.forEach((item) => {
    counts[item.status] += 1;
  });

  elements.totalIdeas.textContent = feedbackItems.length;
  elements.totalVotes.textContent = feedbackItems.reduce((sum, item) => sum + item.votes, 0);
  elements.activeIdeas.textContent = counts["In progress"];
  elements.shippedIdeas.textContent = counts.Shipped;
  elements.reviewCount.textContent = counts["Under review"];
  elements.plannedCount.textContent = counts.Planned;
  elements.progressCount.textContent = counts["In progress"];
  elements.shippedCount.textContent = counts.Shipped;
}

function renderFeedback() {
  const visibleItems = getVisibleItems();
  elements.list.innerHTML = "";
  elements.emptyState.hidden = visibleItems.length > 0;

  visibleItems.forEach((item) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const voteButton = card.querySelector(".vote-button");
    const statusSelect = card.querySelector(".status-select");
    const statusPill = card.querySelector(".status-pill");

    card.querySelector(".vote-count").textContent = item.votes;
    card.querySelector("h3").textContent = item.title;
    card.querySelector(".card-details").textContent = item.details;
    card.querySelector(".card-meta").textContent = `${formatDate(item.createdAt)} · ${item.category}`;
    card.querySelector(".category-chip").textContent = item.category;
    card.querySelector(".requester-chip").textContent = `By ${item.requester || "Google user"}`;
    statusPill.textContent = item.status;
    statusPill.dataset.status = item.status;
    statusPill.classList.add(statusClass(item.status));
    statusSelect.value = item.status;

    voteButton.addEventListener("click", () => {
      item.votes += 1;
      saveItems();
      render();
    });

    statusSelect.addEventListener("change", (event) => {
      item.status = event.target.value;
      saveItems();
      render();
    });

    elements.list.append(card);
  });
}

function render() {
  renderAuth();
  updateMetrics();
  renderFeedback();
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    openAuthModal();
    return;
  }

  const newItem = {
    id: crypto.randomUUID(),
    title: elements.title.value.trim(),
    details: elements.details.value.trim(),
    category: elements.category.value,
    status: elements.status.value,
    requester: currentUser.name,
    requesterEmail: currentUser.email,
    votes: 1,
    createdAt: Date.now(),
  };

  if (!newItem.title || !newItem.details) return;

  feedbackItems = [newItem, ...feedbackItems];
  activeStatus = "All";
  query = "";
  elements.search.value = "";
  elements.segments.forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.status === "All");
  });
  saveItems();
  elements.form.reset();
  render();
});

elements.search.addEventListener("input", (event) => {
  query = event.target.value;
  renderFeedback();
});

elements.sort.addEventListener("change", (event) => {
  sortMode = event.target.value;
  renderFeedback();
});

elements.segments.forEach((segment) => {
  segment.addEventListener("click", () => {
    activeStatus = segment.dataset.status;
    elements.segments.forEach((button) => button.classList.toggle("is-active", button === segment));
    renderFeedback();
  });
});

elements.openFormButton.addEventListener("click", () => {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  elements.title.focus();
});

elements.seedButton.addEventListener("click", () => {
  feedbackItems = sampleIdeas.map((item) => ({ ...item, id: crypto.randomUUID() }));
  saveItems();
  render();
});

elements.noticeSignInButton.addEventListener("click", openAuthModal);
elements.closeAuthButton.addEventListener("click", closeAuthModal);
elements.authModal.addEventListener("click", (event) => {
  if (event.target === elements.authModal) closeAuthModal();
});
elements.demoSignInButton.addEventListener("click", () => {
  const email = elements.demoEmail.value.trim();
  if (!email || !email.includes("@")) {
    elements.demoEmail.focus();
    return;
  }

  handleSignedInUser({
    name: displayNameFromEmail(email),
    email,
    picture: "",
    provider: "google-demo",
  });
});

loadGoogleIdentityScript();
render();
