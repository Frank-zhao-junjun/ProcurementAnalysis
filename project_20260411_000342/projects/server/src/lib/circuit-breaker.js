export function createCircuitBreaker({ failureThreshold = 5, recoveryWindowMs = 30_000 } = {}) {
  let failureCount = 0;
  let openedAt = null;

  function canRequest() {
    if (openedAt === null) {
      return true;
    }

    if (Date.now() - openedAt >= recoveryWindowMs) {
      failureCount = 0;
      openedAt = null;
      return true;
    }

    return false;
  }

  function recordSuccess() {
    failureCount = 0;
    openedAt = null;
  }

  function recordFailure() {
    failureCount += 1;
    if (failureCount >= failureThreshold && openedAt === null) {
      openedAt = Date.now();
    }
  }

  function getState() {
    return {
      failureCount,
      isOpen: openedAt !== null && !canRequest(),
      openedAt
    };
  }

  return {
    canRequest,
    recordSuccess,
    recordFailure,
    getState
  };
}