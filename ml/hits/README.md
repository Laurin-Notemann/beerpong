# Learning from reviewed hit suggestions

A possible hit highlights a cup and offers a replay from three seconds before it. Accept confirms the ball landed inside the suggested cup. Decline distinguishes a rim contact, bounce or miss (`no-hit`) from a real hit assigned to the wrong cup (`wrong-cup`). Feedback never enters a score. Wrong-cup decisions and older unexplained declines remain available for review but do not train the binary hit outcome classifier as misses. Human or AI outcome reviews can use `no-hit: explanation` for a confirmed miss. No answer leaves the case unlabelled. The group settings review queue includes archived matches and lets a reviewer mark a case uncertain or reset a mistaken label.

The API keeps revisions and reviewer provenance alongside the recording session. This pipeline downloads complete replay evidence, freezes its hashes, and fits an event classifier from `ball-to-rim-evidence-v1` features. It does not train cup segmentation or ball localization. AI reviews require a distinct reviewer model and a reason; `--include-ai-review` includes them only in TRAIN at one quarter weight. Held-out truth always requires a player or human review.

Set `VERSUS_VISION_TOKEN` privately to a group member's access token. `--group` takes the group's UUID, not its invitation code. Keep footage, exports and models outside the repository:

```sh
python3 ml/hits/pipeline.py cycle \
  --api https://beerpong.lb.staging.laurinnotemann.dev \
  --group GROUP_UUID --output /private/vision-hits \
  --state /private/vision-hit-evaluation-state
```

`cycle` is one bounded job for a scheduled runner. It retains historical TRAIN examples and warm-starts the previous retained candidate. Without reviewed positive and negative sessions it archives the evidence and waits. Repeated cycles with unchanged supervised evidence skip fitting; cycles do not deploy candidates.

Session splits stay fixed across exports. Use the same durable `--state` directory for every collection; it records FINAL and continuous qualification sessions consumed by any candidate. A later export excludes consumed sessions. `evaluate --split test` consumes sessions before evaluating, including when qualification fails. Continuous qualification consumes its separate fresh sessions before checking accuracy, too. Preserve that registry and frozen exports.

A classifier reaching 98% precision and recall on proposed cases still says nothing about hits that were never proposed. `export` also requires fresh, complete continuous-video hit counts and browser parity before producing `apps/web/src/tv/lib/hitModel.json`. Qualification and deployment use the normal reviewed workflow. Uncertain cases, missing/deleted footage, and unanswered suggestions never silently become negatives.
