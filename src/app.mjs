import {
  SEED_IDEAS,
  createFeedbackIdea,
  filterIdeas,
  upvoteIdea,
} from "./feedback-core.mjs";
import { createFeedbackRepository } from "./storage.mjs";

const repository = createFeedbackRepository({
  storage: getBrowserStorage(),
  seedIdeas: SEED_IDEAS,
});

const state = {
  ideas: [],
  votedIdeaIds: [],
  query: "",
  warning: "",
};

const elements = {
  form: document.querySelector("#feedback-form"),
  search: document.querySelector("#search"),
  list: document.querySelector("#idea-list"),
  emptyState: document.querySelector("#empty-state"),
  noResultsState: document.querySelector("#no-results-state"),
  storageWarning: document.querySelector("#storage-warning"),
  summary: document.querySelector("#summary"),
  totalMetric: document.querySelector("#total-metric"),
  votesMetric: document.querySelector("#votes-metric"),
  formMessage: document.querySelector("#form-message"),
};

initialize();

function initialize() {
  const initialState = repository.load();
  state.ideas = initialState.ideas;
  state.votedIdeaIds = initialState.votedIdeaIds;
  state.warning = initialState.warning;

  elements.form.addEventListener("submit", handleSubmit);
  elements.search.addEventListener("input", handleSearch);
  elements.list.addEventListener("click", handleVote);

  render();
}

function handleSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const formData = new FormData(elements.form);
  const result = createFeedbackIdea({
    title: formData.get("title"),
    description: formData.get("description"),
    requesterName: formData.get("requesterName"),
    category: formData.get("category"),
  });

  if (!result.ok) {
    showFieldErrors(result.fieldErrors);
    elements.formMessage.textContent = "Complete the required fields.";
    return;
  }

  state.ideas = [result.idea, ...state.ideas];
  state.query = "";
  elements.search.value = "";
  elements.form.reset();
  elements.formMessage.textContent = "Idea submitted.";
  persist();
  render();
}

function handleSearch(event) {
  state.query = event.target.value;
  render();
}

function handleVote(event) {
  const voteButton = event.target.closest("[data-action='vote']");

  if (!voteButton) {
    return;
  }

  const result = upvoteIdea(
    state.ideas,
    state.votedIdeaIds,
    voteButton.dataset.ideaId,
  );

  if (!result.applied) {
    return;
  }

  state.ideas = result.ideas;
  state.votedIdeaIds = result.votedIdeaIds;
  persist();
  render();
}

function persist() {
  const result = repository.save({
    ideas: state.ideas,
    votedIdeaIds: state.votedIdeaIds,
  });
  state.warning = result.warning;
}

function render() {
  const visibleIdeas = filterIdeas(state.ideas, state.query);

  elements.list.replaceChildren(...visibleIdeas.map(createIdeaCard));
  elements.emptyState.hidden = state.ideas.length !== 0 || Boolean(state.query);
  elements.noResultsState.hidden =
    !state.query || visibleIdeas.length !== 0;
  elements.list.hidden = visibleIdeas.length === 0;
  elements.storageWarning.hidden = !state.warning;
  elements.storageWarning.textContent = state.warning;

  elements.totalMetric.textContent = String(state.ideas.length);
  elements.votesMetric.textContent = String(totalVotes(state.ideas));
  elements.summary.textContent = `${visibleIdeas.length} of ${state.ideas.length} ideas`;
}

function createIdeaCard(idea) {
  const card = document.createElement("article");
  card.className = "idea-card";
  card.dataset.ideaId = idea.id;

  const header = document.createElement("div");
  header.className = "idea-card__header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "idea-card__title-group";

  const title = document.createElement("h3");
  title.textContent = idea.title;

  const meta = document.createElement("p");
  meta.className = "idea-card__meta";
  meta.textContent = `${idea.requesterName} • ${formatDate(idea.createdDate)}`;

  titleGroup.append(title, meta);

  const status = document.createElement("span");
  status.className = `status-badge status-badge--${toToken(idea.status)}`;
  status.textContent = idea.status;

  header.append(titleGroup, status);

  const description = document.createElement("p");
  description.className = "idea-card__description";
  description.textContent = idea.description;

  const footer = document.createElement("div");
  footer.className = "idea-card__footer";

  const category = document.createElement("span");
  category.className = "category-chip";
  category.textContent = idea.category;

  const voteButton = document.createElement("button");
  const voted = state.votedIdeaIds.includes(idea.id);
  voteButton.type = "button";
  voteButton.className = "vote-button";
  voteButton.dataset.action = "vote";
  voteButton.dataset.ideaId = idea.id;
  voteButton.disabled = voted;
  voteButton.setAttribute("aria-pressed", String(voted));
  voteButton.setAttribute("aria-label", `Upvote ${idea.title}`);
  voteButton.textContent = voted
    ? `Voted ${idea.voteCount}`
    : `↑ ${idea.voteCount}`;

  footer.append(category, voteButton);
  card.append(header, description, footer);

  return card;
}

function clearFieldErrors() {
  for (const field of elements.form.elements) {
    if (!field.name) {
      continue;
    }

    field.removeAttribute("aria-invalid");
    const message = document.querySelector(`[data-error-for='${field.name}']`);
    if (message) {
      message.textContent = "";
    }
  }
}

function showFieldErrors(fieldErrors) {
  for (const [fieldName, message] of Object.entries(fieldErrors)) {
    const field = elements.form.elements.namedItem(fieldName);
    const errorMessage = document.querySelector(
      `[data-error-for='${fieldName}']`,
    );

    if (field) {
      field.setAttribute("aria-invalid", "true");
    }

    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }
}

function totalVotes(ideas) {
  return ideas.reduce((sum, idea) => sum + idea.voteCount, 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toToken(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
