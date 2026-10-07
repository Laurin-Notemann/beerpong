# Cup segmentation

The camera browser runs RF-DETR Seg Nano in a single-flight worker. Two calibrated playing areas are resized into a 312×312 montage; predictions are mapped back to the source video. Only bounded contours cross an unreliable WebRTC data channel. The TV draws thin contours on its existing video canvas; inference never runs on Tizen. Results older than three seconds disappear, and failure/toggle-off clears the outlines without stopping video or recording.

Calibration identifies the formations, rather than trying to distinguish identical spare cups by appearance. Select tight areas with room for rearrangements and recalibrate after moving the camera. A drink placed inside a selected area can still be mistaken for a playing cup. The first seed model is preliminary: footage from one camera/table does not establish accuracy at other setups.

The initial seed has 12 AI-reviewed and visually corrected frames from 12 sessions of one setup; its held-out check is one frame. It is an experimental starting point, not a human-reviewed production benchmark.

To synchronize positions, select a running match on the camera page and assign area 1 to blue or red (area 2 is the other team). Stable cup bases are projected onto the app's existing integer grid, preserving the camera's apparent shape rather than measuring physical distances. Recognition must agree with the match's standing cup count and repeat the same grid for at least four observations and five seconds. Only positions are written, as the existing `SET_RERACK` operation; scores and original cup identities remain based on recorded hits. Manual changes invalidate pending observations; an optional `expectedSeq` is checked under the API's match lock to reject races. Updates are spaced at least 15 seconds apart. Disable synchronization with Off; phones can restore the pyramid or choose another formation normally. A camera move requires recalibration, and strongly tilted/ambiguous views may be withheld. Turning outlines off also stops synchronization. Reloading requires selecting the match again.

## Reproduce and improve

Use Python 3.12 and keep the dataset/checkpoints outside the repository. Install the appropriate CPU/CUDA PyTorch and torchvision wheels first, then `pip install -r ml/cups/requirements.txt` in a virtual environment. The pinned RF-DETR implementation and model are Apache-2.0; ONNX Runtime is MIT. No labeling or inference service receives footage.

```sh
python ml/cups/pipeline.py collect --output /tmp/cups --group SBRIL5OJ5
python ml/cups/pipeline.py extract --dataset /tmp/cups
python ml/cups/pipeline.py prepare --dataset /tmp/cups --areas /tmp/cup-areas.json
python ml/cups/pipeline.py prelabel --dataset /tmp/cups
python ml/cups/pipeline.py review --dataset /tmp/cups
python ml/cups/pipeline.py split --dataset /tmp/cups
python ml/cups/pipeline.py train --dataset /tmp/cups --output /tmp/cup-training --device cpu --freeze-encoder
python ml/cups/pipeline.py evaluate --dataset /tmp/cups --checkpoint /tmp/cup-training/checkpoint_best_total.pth --split valid --threshold .4 --output /tmp/cup-validation.json
python ml/cups/pipeline.py evaluate --dataset /tmp/cups --checkpoint /tmp/cup-training/checkpoint_best_total.pth --split test --threshold .4 --output /tmp/cup-evaluation.json
python ml/cups/pipeline.py export --checkpoint /tmp/cup-training/checkpoint_best_total.pth --report /tmp/cup-evaluation.json --threshold .4 --id cups-v2 --output /tmp/cup-model
python ml/cups/pipeline.py publish --model /tmp/cup-model --tag cup-model-v2 --output ml/cups/release.json
```

`collect` reads completed uploads over `ssh privaten` and downloads from existing storage. It changes neither database nor bucket. `cup-areas.json` maps source frame IDs or recording-session IDs to two normalized `{x,y,width,height}` rectangles; a `default` entry is supported for an unchanged camera position. Only frames with selected areas are prepared. Inspect the montage to ensure spare/drink cups were excluded. Prelabels are proposals: remove false detections/duplicates, add missed instances, and follow each visible silhouette. Save reviewer identity; empty scenes are valid negatives. Approved image hashes and session provenance are checked before training. Splits keep recording sessions disjoint, but different sessions from the same night are still closely related. Add different nights, lighting, angles, occlusions and negative scenes before claiming broad accuracy. Compare saved checkpoints and choose confidence on validation (the example threshold is for the seed model), then evaluate the held-out test split once; do not tune on test results.

Export requires the exact checkpoint's held-out report to pass precision ≥0.85 and recall ≥0.80 at mask IoU ≥0.50. These are instance precision/recall, not COCO mAP. Inspect masks as well as counts. These gates are minimum regression checks, not a substitute for a sufficiently large human-reviewed benchmark. Public releases include weights, aggregate metrics and license only; source footage, labels, checkpoint and per-image reports stay local. A release and model checksum are pinned in `release.json`; Docker downloads and verifies the bundle, and the browser verifies the model again. Change that pin to promote or roll back a model through the normal web deploy.

For local web development, run `node apps/web/scripts/cup-model.mjs` from the repository root to fetch the pinned model, then start the web app normally. The build context excludes all generated vision assets, so local private validation fixtures cannot reach deployment.

For a release tied to the implementation commit, use `publish --prepare-only` to create the pin and bundle before committing, push the implementation branch, then publish that prepared `cup-model.tar.gz` with `gh release create --target <implementation-commit>`. Publish the exact prepared archive: regenerating gzip changes its checksum. Deploy staging after the asset is available. Direct `publish --target` remains available for later model-only promotions.

Sentry project `web` receives `cup vision loaded`, `cup vision stats` and `cup vision received`, with model/camera/group or TV identifiers, load time, inference p50/p95, published-frame and stale-result counts. `cup vision failed` reports manifest, checksum, worker and inference failures. To validate a live session, compare sender/receiver model IDs and counts, confirm video frame progress and recording uploads during recognition and score clips, then test off/on, calibration changes and reconnect. No frames or contours are logged to Sentry.
