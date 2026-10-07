# Request lifecycle: from submission to human decision

Every box with a double border is a human action. AI only drafts and recommends;
no AI endpoint changes a request status, a merge link, a brief decision or a draft status.

```mermaid
flowchart TD
    A[Submitter posts title + description] --> B[POST /feature-requests]
    B --> C{Gemini available and daily budget left?}
    C -- yes --> D[GeminiProvider: dedupe via forced function call, zod-validated]
    C -- no or unavailable --> E[HeuristicProvider: TF-IDF, calibrated threshold]
    D --> F[Duplicate candidates + provider label]
    E --> F
    F --> G{{Human: support the existing request or keep separate}}
    G -- support --> H[Vote on existing request]
    G -- keep separate --> I[New request stays open]
    H --> J[POST /intelligence/analyze/:id]
    I --> J
    J --> K[Underlying need + 5-criterion priority breakdown]
    K --> L[Score recomputed by the app from SCORING_WEIGHTS]
    L --> M[POST /intelligence/cluster]
    M --> N[Themes with members and votes]
    N --> O[POST /intelligence/briefs]
    O --> P[Decision brief: recommendation, evidence, risks, open questions]
    P --> Q{{Human PM: approve or reject with a note}}
    Q -- rejected --> R[Brief closed; can generate a new one]
    Q -- approved --> S[POST /briefs/:id/drafts per audience]
    S --> T{{Human PM: edit and approve the draft}}
    T --> U[Approved draft is immutable; send it through your own channel]
    G -. merge or status change .-> V{{Human PM: merge / set status with decidedBy}}
    V --> W[(feature_request_decisions append-only log)]

    classDef human stroke-width:3px,stroke:#b45309;
    class G,Q,T,V human;
```

## Reading the diagram

- Provider label: every AI artefact carries `provider` (`gemini` or `heuristic`) and the UI shows it.
- Fallback: the heuristic path is used when no API key is set, when the Gemini call fails after one corrective retry, or when the daily call budget is exhausted.
- Rate limits: submit and every AI endpoint are on the strict per-IP limit (see `docs/security-review.md`).
