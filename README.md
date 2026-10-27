# CardScope

Private installable card scanner and collection for Pokémon, Magic: The Gathering, One Piece, My Little Pony CCG and Riftbound. Open the existing private Site in Safari and use Share → Add to Home Screen. Access and collection data remain tied to the authenticated Site visitor.

## Features and data

The scanner captures a sharp frame and uses OCR candidates with manual confirmation when identification is uncertain. Results show catalog artwork, printing and variant, optional reverse face, and available prices. Cardmarket EUR is preferred. Other prices are kept in their own currencies and link to the specific product. Market estimates and publication dates are shown when provided; unavailable prices are not invented.

Pokémon uses TCGdex; MTG uses Scryfall; One Piece uses OPTCG API with a bundled snapshot; Riftbound uses Riftcodex. The bundled PonyHead catalog is attributed in the app under CC BY-SA 2.0. TCGCSV supplies additional TCGplayer prices where a product and variant match. Provider availability and catalog coverage vary. `scripts/import-data.mjs` imports the documented snapshot input files using a TypeScript AST parser, without executing upstream JavaScript.

## Persistence

`public/storage.js` migrates the earlier local collection to IndexedDB, queues offline changes and synchronizes with authenticated `/api/collection` endpoints. D1 stores owner-scoped cards and deletion tombstones; R2 stores private photos and shared external-catalog caches. Private photo responses and API responses are excluded from the service worker cache. JSON import and export provide an additional backup. Wait for “Zapisano na koncie” before switching browser profiles or reinstalling.

Server code is under `server/`, the PWA UI is in `public/`, and the Sites Vinext worker is `build/sites-worker.ts`. Schema changes are generated into `drizzle/` with `pnpm db:generate`. No runtime schema writes are used.

## Validation

Use the Sites dependency and build helpers for this managed environment. Functional checks: `node --test tests/core.test.mjs tests/storage.test.mjs` and `node tests/ui-flow.cjs`. A physical iPhone is still needed to verify camera focus, Safari installation, and OS-specific offline behavior.


## Scanner regression checks

The optional legacy Tesseract reader uses game-specific title and collector-number regions, original color and grayscale/inverted contrast, sparse-text and line/block segmentation, and optional Tesseract deskew. Non-Pokémon scans accept OCR typos through provider canonical-name lookup or bounded local fuzzy matching. Approximate matches require the user to compare artwork and edition. The processing screen exposes the actual capture and read text, rotation, and image upload. Camera focus and glare still affect the input; there is no claim of universal recognition.

`node --test tests/scanner.test.mjs` checks code cleanup, noisy names, edition ambiguity and the catalog fallback. `node tests/ui-flow.cjs` also covers a One Piece capture through catalog selection. `node tests/ocr-images.mjs /absolute/fixture-directory` runs the shipped preprocessing with real Tesseract 5.1.1 and its English language data, on original and smaller tilted images. Supply `eng.traineddata.gz` (the Tesseract best_int distribution) and `onepiece.jpg`, `mtg.jpg`, `mlp.jpg`, `riftbound.jpg`, `pokemon.jpg`. The reference examples are Perona OP01-077, Lightning Bolt, Rainbow Dash pr1, Vayne Hunter and Charizard ex 223/197. This is an image regression check, not a physical iPhone camera test. OCR development dependencies run without the Tesseract donation postinstall script.

The scanner now completes title and footer OCR before looking up any result. A bundled canonical-name dictionary (Scryfall card-name catalog, OPTCG API, PonyHead and Riftcodex) recovers names from noisy lines. Live catalogs still supply matching cards; the bundled Riftcodex snapshot also preserves 1,451 cards when that API is unavailable. Dictionary provenance and retrieval times are stored with the snapshots. Unrecognized newer names fall back to provider search.

Every non-Pokémon candidate is ranked against **both** independent observations. The UI distinguishes exact/similar names, matching/missing/conflicting numbers, and contradictory OCR passes. A known code alone never skips the name read or selects a printing. Number conflicts remain visible; artwork variants sharing a number still need confirmation. Scanned images remain on the device during recognition.

`node --test tests/joint-recognition.test.mjs` covers canonical title recovery, name/number disagreement, signature suffixes, footer-only MTG numbers, offline Riftcodex and private dictionary access. `node tests/photo-recognition.mjs /absolute/attachment.jpeg /absolute/language-data /absolute/report.json` reproduces the three-card regression using the shipped preprocessing and real OCR. The attachment is deliberately not included in the repository. The supplied overview photo recovers all three names; its collector numbers are not asserted as identified. This does not substitute for testing the user's original individual captures on their phone.


## Local PaddleOCR scanner

English scans now default to PaddleOCR PP-OCRv4 through Guten OCR and ONNX Runtime Web. A dedicated module worker detects text boxes, then reads their contents. The client normalizes images to a 1280–1920 pixel long edge, keeps title and footer observations separate, and matches both against the catalog. Other Pokémon languages retain the existing language-specific reader. The former English reader is available as an explicit fallback, not a silent substitute.

`node scripts/build-ocr.mjs` builds the same-origin worker, model weights and WASM assets from the pinned lockfile. The normal build runs this automatically. About 39 MB is fetched lazily on first use and cached when browser storage permits. Inference does not upload photos. The worker uses one WASM thread, is terminated after each scan or cancellation, and has a timeout. Local recognition does not make catalog/price lookup available offline.

The supplied full Mega Heracross photograph was tested with the production worker bundle and the browser canvas/WASM backend. It reads the printed `108/094` and finds `me02-108` (Mega Heracross ex). The browser output omits the `e` in `ex`; the app therefore displays one matching candidate and requires confirmation. It does not claim that fuzzy text is exact. Three separately cropped cards from the earlier overview photo recover Vayne – Hunter, The Soul Stone and Buggy candidates; their exact collector numbers are not asserted. This is not a mobile Safari camera test or a general accuracy percentage.

Reproduce with private fixture paths (fixtures and reports remain outside Git):

```sh
node tests/neural-photo.mjs /path/card.jpeg /path/cards.json /path/sets.json /path/report.json
node tests/neural-multigame.mjs /path/three-card-photo.jpeg /path/report.json
node tests/neural-worker-smoke.mjs /path/card.jpeg
```

The first regression uses the full TCGdex English card and set catalogs. The second isolates the three pictured cards as documented in the test; fixture coordinates and expected names are never part of production recognition. Unit/UI checks cover joined title suffixes, set/language prefixes next to collector numbers, title/footer separation, uncertainty, the new default reader, catalog artwork, prices, and collection persistence.

The UI retains the original palette, moves results before the manual search panel, adds a recent-card shortcut and a compact collection header, and places artwork next to pricing on wide screens. Navigation and card reveal effects are interruptible; reduced-motion preferences disable them.


## Scanner 14: suffix recovery and optional vision

The scanner now limits suggestions to six and constrains candidates by an independently read collector fraction. A missing or partial stylized `ex` suffix can be restored **only** when the complete base title is read, the fraction is reliable and non-conflicting, and exactly one compatible catalog edition remains. Arbitrary title misspellings, explicit GX/V conflicts, missing Mega, low-confidence numbers, and duplicate editions cannot use this automatic recovery. Full manual catalog search remains available.

The previous browser/WASM reading of the actual photograph (`Mega Heracrossx`, `PFLEN108/094`) now yields one automatic result, `me02-108`, against the full catalog. The production engine was not retrained; this change reconciles imperfect text with catalog evidence. The app displays its scanner version and offers a non-destructive update prompt when a newer service worker takes control.

An optional OpenAI image-analysis route is prepared at `/api/vision` (Responses API, default model `gpt-4.1`, configurable via `OPENAI_VISION_MODEL`). It remains disabled until the server-side `OPENAI_API_KEY` is configured through the OpenAI Developers approved provisioning workflow. Never put keys in client code or source. Selecting AI explicitly discloses image transmission to OpenAI and separate API billing; local mode remains the default. The model reads title badges, collector number, total and set code independently; catalog data still determines artwork, identity and prices. Ambiguous observations do not bypass catalog validation. Responses are not cached, stored by this route, or logged; provider requests set `store:false`.

Vision integration tests use mocked provider responses. No live model accuracy claim is made until credentials are provisioned and the actual photograph is tested with the user's authorization. Run `node --test tests/vision.test.mjs tests/scanner.test.mjs` and `node tests/ui-flow.cjs`.


## Manual centering ruler

The Centering tab measures front and back independently from user-supplied photos. Eight adjustable image-space guides define the outer card and inner printed border. Opposing border widths are normalized to percentages independently on each axis. Guides must be strictly ordered; results require explicit user confirmation and are invalidated after edits. Controls include drag, keyboard-compatible sliders, fine nudges, image zoom and 90-degree rotation. The photo must be aligned with the ruler and taken perpendicular to the card; this tool does not rectify perspective, measure physical millimeters, or assign a grading score. Borderless/asymmetric designs may not support this measurement.

A manual save keeps the latest front/back pair in a separate local IndexedDB database; it is not account-synced. JSON export includes photographs, guides and confirmed measurements for a portable record. No centering images are uploaded. Native phone interaction remains to be checked on a physical device. Math checks: `node --test tests/centering.test.mjs`.


## Guided centering camera

The centering tab now includes a dedicated live camera, in addition to gallery upload. A local contrast-gradient detector checks four straight edges near a 63:88 guide. It rejects missing/inconsistent edges, slope, opposing-edge divergence and offsets. Green requires two consecutive qualifying frames. Alignment is advisory: capture is available whenever the live camera has a decoded frame, even with a red guide or failed analysis. Small offsets and tilts are tolerated; review confirmation remains required. Red and textual prompts show uncertainty or misalignment. This heuristic does not identify a card semantically, calibrate lens distortion, certify sharpness, or guarantee absence of perspective. Use a flat, contrasting background and inspect the result. Camera and gallery images both require explicit photo confirmation before replacing a centering draft. Camera streams stop on modal close, navigation, backgrounding or capture. All processing remains local. Synthetic regression tests cover alignment, tolerated small offsets and tilts, larger rotation/translation, trapezoids and empty frames; physical phone camera testing remains outstanding.


## Learning tab (Jak grać)

The learning tab opens from a recognized result, saved collection card or navigation. It resolves exact catalog IDs, excluding flavor text and prices. TCGdex supplies Pokémon abilities/attacks/effects, Scryfall supplies Oracle text per face, OPTCG supplies card_text with bundled fallback, PonyHead supplies normal and boosted text from its attributed CC BY-SA snapshot, and Riftcodex supplies text.plain when present. Missing text is explicitly unavailable; artwork accessibility captions are never treated as mechanical rules. No fuzzy identity substitution is used. Manually entered cards without a catalog ID must first be identified.

Some complete effects have curated Polish translations. Other effects keep the original and an explicit external Google Translate link until AI is connected. Generic reading tips are distinguished from AI explanations.

AI translation now supports Google Gemini (default `gemini-3.8-flash`, configurable through the server-only `GEMINI_LEARNING_MODEL`). Configure `GEMINI_API_KEY` as a Sites runtime secret for permanent activation, using the native Sites environment workflow and then deployment. No secret belongs in Git or the hosting manifest. Existing OpenAI server configuration remains supported.

For this owner-private app, the user may alternatively paste their own Gemini key into the password field under **Jak grać → Połącz tłumaczenie z Gemini**. The input is cleared immediately. This alternative keeps the key only in page memory until reload or explicit removal, passes it to the same-origin authenticated backend for the requested translation, and never persists it to localStorage, the collection, logs or a model prompt. CardScope does not provision a Google account, key or billing. The interface states this requirement and does not claim a connection works before a successful request.

The backend fetches the exact card text itself and calls the Gemini Interactions API with `store:false` and a structured schema. It rejects incomplete responses, wrong block counts and detectable changes to numerals, costs, optionality, conditions or negations. These checks are heuristics, not a proof of semantic accuracy. Translations and explanations (not credentials) are cached on the device for up to 30 exact card/text/model combinations. A fresh translation is initiated only by the user. Cancel/navigation aborts the request and ignores stale results.

Two local engines were evaluated on actual card effects and rejected for poor Polish and changed game meaning: Xenova OPUS-MT en-mul q8 and Bergamot EN–PL 0.3.3. Their runtimes, model downloads and dependencies are not included in the app. Gemini integration is tested with mocked responses; live output quality cannot be verified until a valid key is supplied. Physical mobile and browser visual QA also remain outstanding.

Tests: `node --test tests/learning.test.mjs tests/gemini-learning.test.mjs tests/learning-ui.test.cjs` and `node tests/ui-flow.cjs`. Snapshot importer: `scripts/import-learning.mjs`.
