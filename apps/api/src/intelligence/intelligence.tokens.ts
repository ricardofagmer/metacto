// String tokens, not the interface: TypeScript interfaces do not exist at runtime.

// The active IntelligenceService, Anthropic or heuristic, chosen once at boot.
export const INTELLIGENCE_SERVICE = 'INTELLIGENCE_SERVICE';

// Always the heuristic provider: the submit-time dedupe fallback when Anthropic is unavailable
// (spec "Submit -> dedupe -> analyze" step 2), whichever provider is active.
export const HEURISTIC_INTELLIGENCE_SERVICE = 'HEURISTIC_INTELLIGENCE_SERVICE';
