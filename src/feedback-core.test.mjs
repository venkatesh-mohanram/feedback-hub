import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_STATUS,
  SEED_IDEAS,
  STATUSES,
  createFeedbackIdea,
  filterIdeas,
  normalizeIdeas,
  normalizeVoteLedger,
  upvoteIdea,
  validateFeedbackInput,
} from "./feedback-core.mjs";
import {
  STORAGE_KEYS,
  createFeedbackRepository,
  createMemoryStorage,
} from "./storage.mjs";

test("validation requires all submission fields", () => {
  const result = validateFeedbackInput({
    title: "  ",
    description: "Useful idea",
    requesterName: "",
    category: "Reporting",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors, {
    title: "Required",
    requesterName: "Required",
  });
});

test("new feedback ideas are trimmed and default to New with zero votes", () => {
  const result = createFeedbackIdea(
    {
      title: "  Add status filters  ",
      description: "  Filter the list by lifecycle state. ",
      requesterName: "  Mina ",
      category: " Navigation ",
    },
    {
      idFactory: () => "idea-1",
      now: () => new Date("2026-06-01T12:00:00.000Z"),
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.idea, {
    id: "idea-1",
    title: "Add status filters",
    description: "Filter the list by lifecycle state.",
    requesterName: "Mina",
    category: "Navigation",
    status: DEFAULT_STATUS,
    voteCount: 0,
    createdDate: "2026-06-01T12:00:00.000Z",
  });
});

test("search matches title and description only", () => {
  const ideas = [
    {
      id: "1",
      title: "Export feedback",
      description: "Create a CSV file",
      requesterName: "Alex",
      category: "Reporting",
      status: "New",
      voteCount: 0,
      createdDate: "2026-06-01T12:00:00.000Z",
    },
    {
      id: "2",
      title: "Saved views",
      description: "Remember common filters",
      requesterName: "Taylor",
      category: "csv-only-category",
      status: "Planned",
      voteCount: 0,
      createdDate: "2026-06-01T12:00:00.000Z",
    },
  ];

  assert.deepEqual(
    filterIdeas(ideas, "csv").map((idea) => idea.id),
    ["1"],
  );
  assert.deepEqual(
    filterIdeas(ideas, "taylor").map((idea) => idea.id),
    [],
  );
});

test("upvotes are applied once per idea id", () => {
  const ideas = [
    {
      id: "idea-1",
      title: "Saved views",
      description: "Remember common filters",
      requesterName: "Taylor",
      category: "Navigation",
      status: "New",
      voteCount: 2,
      createdDate: "2026-06-01T12:00:00.000Z",
    },
  ];

  const firstVote = upvoteIdea(ideas, [], "idea-1");
  const secondVote = upvoteIdea(
    firstVote.ideas,
    firstVote.votedIdeaIds,
    "idea-1",
  );

  assert.equal(firstVote.applied, true);
  assert.equal(firstVote.ideas[0].voteCount, 3);
  assert.deepEqual(firstVote.votedIdeaIds, ["idea-1"]);
  assert.equal(secondVote.applied, false);
  assert.equal(secondVote.ideas[0].voteCount, 3);
  assert.deepEqual(secondVote.votedIdeaIds, ["idea-1"]);
});

test("normalization preserves only supported statuses and unique vote ids", () => {
  const ideas = normalizeIdeas([
    {
      id: "idea-1",
      title: "Title",
      description: "Description",
      requesterName: "Requester",
      category: "Category",
      status: "Not Real",
      voteCount: -4,
      createdDate: "not-a-date",
    },
  ]);

  assert.equal(ideas[0].status, DEFAULT_STATUS);
  assert.equal(ideas[0].voteCount, 0);
  assert.equal(ideas[0].createdDate, "1970-01-01T00:00:00.000Z");
  assert.deepEqual(normalizeVoteLedger(["a", "a", "b", ""]), ["a", "b"]);
});

test("repository hydrates saved ideas and votes from storage", () => {
  const storage = createMemoryStorage({
    [STORAGE_KEYS.ideas]: JSON.stringify([
      {
        id: "idea-1",
        title: "Title",
        description: "Description",
        requesterName: "Requester",
        category: "Category",
        status: "Shipped",
        voteCount: 4,
        createdDate: "2026-06-01T12:00:00.000Z",
      },
    ]),
    [STORAGE_KEYS.votes]: JSON.stringify(["idea-1"]),
  });
  const repository = createFeedbackRepository({ storage, seedIdeas: SEED_IDEAS });

  const state = repository.load();

  assert.equal(state.ideas.length, 1);
  assert.equal(state.ideas[0].status, "Shipped");
  assert.deepEqual(state.votedIdeaIds, ["idea-1"]);
  assert.equal(state.storageAvailable, true);
});

test("repository falls back to seed data on first visit", () => {
  const repository = createFeedbackRepository({
    storage: createMemoryStorage(),
    seedIdeas: SEED_IDEAS,
  });
  const state = repository.load();

  assert.deepEqual(
    new Set(state.ideas.map((idea) => idea.status)),
    new Set(STATUSES),
  );
});

test("repository keeps working in memory when storage throws", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const repository = createFeedbackRepository({
    storage: throwingStorage,
    seedIdeas: [],
  });
  const state = repository.load();
  const saveResult = repository.save({
    ideas: [
      {
        id: "idea-1",
        title: "Title",
        description: "Description",
        requesterName: "Requester",
        category: "Category",
        status: "New",
        voteCount: 0,
        createdDate: "2026-06-01T12:00:00.000Z",
      },
    ],
    votedIdeaIds: ["idea-1"],
  });
  const reloaded = repository.load();

  assert.equal(state.storageAvailable, false);
  assert.equal(saveResult.storageAvailable, false);
  assert.equal(reloaded.ideas.length, 1);
  assert.deepEqual(reloaded.votedIdeaIds, ["idea-1"]);
});
