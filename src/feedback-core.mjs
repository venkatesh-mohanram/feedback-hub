export const STATUSES = Object.freeze([
  "New",
  "Under Review",
  "Planned",
  "In Progress",
  "Shipped",
  "Closed",
]);

export const DEFAULT_STATUS = "New";

export const REQUIRED_FIELDS = Object.freeze([
  "title",
  "description",
  "requesterName",
  "category",
]);

export const SEED_IDEAS = Object.freeze([
  Object.freeze({
    id: "seed-saved-searches",
    title: "Saved searches for recurring themes",
    description:
      "Let requesters save common searches so they can quickly revisit feedback around a launch or customer segment.",
    requesterName: "Nina Patel",
    category: "Discovery",
    status: "New",
    voteCount: 7,
    createdDate: "2026-05-01T15:30:00.000Z",
  }),
  Object.freeze({
    id: "seed-csv-export",
    title: "CSV export for quarterly planning",
    description:
      "Add an export option that includes title, category, status, requester, vote count, and created date.",
    requesterName: "Marco Ruiz",
    category: "Reporting",
    status: "Under Review",
    voteCount: 18,
    createdDate: "2026-04-19T18:10:00.000Z",
  }),
  Object.freeze({
    id: "seed-category-filter",
    title: "Filter ideas by category",
    description:
      "Support category filtering alongside search so product teams can scan related feedback faster.",
    requesterName: "Ari Chen",
    category: "Navigation",
    status: "Planned",
    voteCount: 13,
    createdDate: "2026-04-05T11:45:00.000Z",
  }),
  Object.freeze({
    id: "seed-roadmap-links",
    title: "Link feedback to public roadmap items",
    description:
      "Connect shipped feedback to roadmap entries so requesters can understand where their input landed.",
    requesterName: "Priya Shah",
    category: "Roadmap",
    status: "In Progress",
    voteCount: 24,
    createdDate: "2026-03-21T14:05:00.000Z",
  }),
  Object.freeze({
    id: "seed-email-confirmation",
    title: "Confirmation after idea submission",
    description:
      "Show a clear confirmation after a requester submits feedback so they know the idea was captured.",
    requesterName: "Leo Grant",
    category: "Submission",
    status: "Shipped",
    voteCount: 31,
    createdDate: "2026-02-28T19:20:00.000Z",
  }),
  Object.freeze({
    id: "seed-anonymous-voting",
    title: "Anonymous voting across devices",
    description:
      "Track votes across devices without accounts. This is outside the local prototype scope for now.",
    requesterName: "Samira Okafor",
    category: "Voting",
    status: "Closed",
    voteCount: 9,
    createdDate: "2026-01-15T16:00:00.000Z",
  }),
]);

export function validateFeedbackInput(input) {
  const values = normalizeInput(input);
  const fieldErrors = {};

  for (const field of REQUIRED_FIELDS) {
    if (!values[field]) {
      fieldErrors[field] = "Required";
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    values,
  };
}

export function createFeedbackIdea(input, options = {}) {
  const validation = validateFeedbackInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      fieldErrors: validation.fieldErrors,
    };
  }

  const idFactory = options.idFactory ?? createLocalId;
  const now = options.now ?? (() => new Date());

  return {
    ok: true,
    idea: {
      id: String(idFactory()),
      title: validation.values.title,
      description: validation.values.description,
      requesterName: validation.values.requesterName,
      category: validation.values.category,
      status: DEFAULT_STATUS,
      voteCount: 0,
      createdDate: now().toISOString(),
    },
  };
}

export function filterIdeas(ideas, query) {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [...ideas];
  }

  return ideas.filter((idea) => {
    const title = idea.title.toLocaleLowerCase();
    const description = idea.description.toLocaleLowerCase();

    return (
      title.includes(normalizedQuery) ||
      description.includes(normalizedQuery)
    );
  });
}

export function upvoteIdea(ideas, votedIdeaIds, ideaId) {
  const normalizedId = String(ideaId);
  const voteLedger = normalizeVoteLedger(votedIdeaIds);

  if (voteLedger.includes(normalizedId)) {
    return {
      applied: false,
      ideas: [...ideas],
      votedIdeaIds: voteLedger,
    };
  }

  let applied = false;
  const nextIdeas = ideas.map((idea) => {
    if (idea.id !== normalizedId) {
      return idea;
    }

    applied = true;
    return {
      ...idea,
      voteCount: idea.voteCount + 1,
    };
  });

  return {
    applied,
    ideas: nextIdeas,
    votedIdeaIds: applied ? [...voteLedger, normalizedId] : voteLedger,
  };
}

export function normalizeIdeas(rawIdeas) {
  if (!Array.isArray(rawIdeas)) {
    return [];
  }

  return rawIdeas.map(normalizeIdea).filter(Boolean);
}

export function normalizeIdea(rawIdea) {
  if (!rawIdea || typeof rawIdea !== "object") {
    return null;
  }

  const title = trimValue(rawIdea.title);
  const description = trimValue(rawIdea.description);
  const requesterName = trimValue(rawIdea.requesterName);
  const category = trimValue(rawIdea.category);

  if (!title || !description || !requesterName || !category) {
    return null;
  }

  const status = STATUSES.includes(rawIdea.status)
    ? rawIdea.status
    : DEFAULT_STATUS;
  const voteCount = Number.isInteger(rawIdea.voteCount)
    ? Math.max(0, rawIdea.voteCount)
    : 0;
  const createdDate = isValidDate(rawIdea.createdDate)
    ? new Date(rawIdea.createdDate).toISOString()
    : new Date(0).toISOString();

  return {
    id: trimValue(rawIdea.id) || createLocalId(),
    title,
    description,
    requesterName,
    category,
    status,
    voteCount,
    createdDate,
  };
}

export function normalizeVoteLedger(rawVoteLedger) {
  if (!Array.isArray(rawVoteLedger)) {
    return [];
  }

  return [...new Set(rawVoteLedger.map(String).filter(Boolean))];
}

export function cloneIdeas(ideas) {
  return normalizeIdeas(ideas);
}

function normalizeInput(input = {}) {
  return {
    title: trimValue(input.title),
    description: trimValue(input.description),
    requesterName: trimValue(input.requesterName),
    category: trimValue(input.category),
  };
}

function trimValue(value) {
  return String(value ?? "").trim();
}

function createLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `idea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}
