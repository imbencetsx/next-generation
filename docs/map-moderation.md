# Map moderation

Publishing runs through the authenticated `maps.publish` action. The existing name and map validation stays authoritative on the server. Only `maps.commitPublication`, an internal mutation, writes new published maps; it rechecks the active session before inserting the exact approved title and map. No public write bypass is provided.

The name is normalized consistently for storage and preview, then checked against a small HU/EN profanity/slur list. Comparison removes accents, Unicode compatibility variants and invisible characters, and handles common leetspeak, repeated letters, and separated letters. Whole words and explicit phrases are matched; innocent substrings such as “Scunthorpe”, “homok” and “passage” are allowed. This is a first-pass filter, not an exhaustive dictionary or a guarantee against every evasion.

The action sends only the display title and its normalized comparison form (deduplicated if identical) to OpenAI's `omni-moderation-latest` endpoint. Any flagged result blocks publication and asks for another name. API failure, a missing key, a missing result, malformed response, or an eight-second timeout also prevents insertion and shows a retryable translated error. Inputs are not logged with provider responses, and API credentials are server-only. The moderation endpoint is free: https://developers.openai.com/api/docs/guides/moderation

Map layouts and preview images are not sent to moderation. User decision (2026-11-08): remove ASCII layout moderation and retain name moderation only. Normal map-file validation still runs on the server.

The Convex rate-limiter component allows a burst of three attempts per account and replenishes six attempts per minute. Rejected and failed checks consume attempts too, since the reservation is committed in a separate internal mutation. Ordinary editing, local filenames and exports are not moderated. Existing published maps are not retroactively rechecked.

Set `OPENAI_API_KEY` on each intended Convex deployment using a private key file, then deploy the backend with the new rate-limiter component. Never put the key in a `NEXT_PUBLIC_*` variable or commit it. The key is optional in the deployment schema so setup can finish safely; without it, publishing stays unavailable rather than bypassing AI moderation.

Tests mock the provider and cover safe names, blocked/evasive names, false-positive examples, authentication, session revocation during a check, concurrent per-user limits, name-only submission, response failures, timeout, and popup retry behavior. Test fixtures for result scoring are seeded directly so unrelated tests never call the provider.
