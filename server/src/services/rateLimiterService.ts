interface BucketConfig {
  capacity: number;       // Maximum burst tokens
  refillRate: number;     // Tokens replenished per second
}

interface BucketState {
  tokens: number;
  lastRefill: number;     // Timestamp in ms
}

const LIMITS: Record<string, BucketConfig> = {
  draw: { capacity: 500, refillRate: 350 },       // Smooth continuous strokes up to 350-500 events/sec
  guess: { capacity: 5, refillRate: 3 },          // ~3-5 guesses/sec
  clearCanvas: { capacity: 5, refillRate: 2 },    // ~2 clears/sec
};

// socketId -> eventName -> BucketState
const socketBuckets = new Map<string, Map<string, BucketState>>();

/**
 * Checks and consumes a token for the socket's event bucket.
 * Returns true if allowed, false if rate-limited.
 */
export function checkRateLimit(
  socketId: string,
  event: "draw" | "guess" | "clearCanvas"
): boolean {
  const config = LIMITS[event];
  if (!config) return true;

  let eventBuckets = socketBuckets.get(socketId);
  if (!eventBuckets) {
    eventBuckets = new Map();
    socketBuckets.set(socketId, eventBuckets);
  }

  const now = Date.now();
  let bucket = eventBuckets.get(event);

  if (!bucket) {
    bucket = { tokens: config.capacity - 1, lastRefill: now };
    eventBuckets.set(event, bucket);
    return true;
  }

  // Refill tokens based on elapsed time
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    config.capacity,
    bucket.tokens + elapsedSec * config.refillRate
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

/**
 * Cleans up rate-limiting memory when a socket disconnects
 */
export function cleanupSocketRateLimits(socketId: string): void {
  socketBuckets.delete(socketId);
}
