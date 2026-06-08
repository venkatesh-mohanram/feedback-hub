import {
  cloneIdeas,
  normalizeIdeas,
  normalizeVoteLedger,
} from "./feedback-core.mjs";

export const STORAGE_KEYS = Object.freeze({
  ideas: "feedback-hub:ideas",
  votes: "feedback-hub:voted-idea-ids",
});

export function createFeedbackRepository(options = {}) {
  const keys = options.keys ?? STORAGE_KEYS;
  const fallbackStorage = createMemoryStorage();
  let storage = options.storage ?? null;
  let persistent = isStorageUsable(storage);
  let warning = persistent ? "" : "Using session memory because browser storage is unavailable.";

  function load() {
    const storedIdeas = readJson(keys.ideas);
    const storedVotes = readJson(keys.votes);
    const hasStoredIdeas = Array.isArray(storedIdeas);

    return {
      ideas: hasStoredIdeas
        ? normalizeIdeas(storedIdeas)
        : cloneIdeas(options.seedIdeas ?? []),
      votedIdeaIds: normalizeVoteLedger(storedVotes),
      storageAvailable: persistent,
      warning,
    };
  }

  function save(nextState) {
    const ideasSaved = writeJson(keys.ideas, normalizeIdeas(nextState.ideas));
    const votesSaved = writeJson(
      keys.votes,
      normalizeVoteLedger(nextState.votedIdeaIds),
    );

    return {
      storageAvailable: persistent,
      warning: ideasSaved && votesSaved ? warning : warning || "Changes are saved for this session only.",
    };
  }

  function readJson(key) {
    const activeStorage = persistent ? storage : fallbackStorage;

    try {
      const rawValue = activeStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch {
      moveToFallback("Stored feedback could not be read. New changes are session-only.");
      return null;
    }
  }

  function writeJson(key, value) {
    const serialized = JSON.stringify(value);

    try {
      const activeStorage = persistent ? storage : fallbackStorage;
      activeStorage.setItem(key, serialized);
      return true;
    } catch {
      moveToFallback("Changes are saved for this session only.");
      fallbackStorage.setItem(key, serialized);
      return false;
    }
  }

  function moveToFallback(message) {
    persistent = false;
    warning = message;
    storage = fallbackStorage;
  }

  return {
    load,
    save,
  };
}

export function createMemoryStorage(initialValues = {}) {
  const data = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function isStorageUsable(storage) {
  if (!storage) {
    return false;
  }

  const probeKey = "feedback-hub:storage-probe";

  try {
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}
