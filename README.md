# My Hearing Constellation

Chrome extension that applies an NAL-R based, per-ear EQ + gentle compression to a tab's audio from your own audiogram. Everything runs locally; no network requests, no server.

## Install (developer mode)
1. Open `chrome://extensions`, switch on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Open a tab that plays audio, click the extension icon, drag the stars to your audiogram results (5 dB steps), press **Save changes**.

## How it behaves
- Chrome only lets an extension capture a tab after you invoke it there, so **open the popup once on each tab** you want corrected. Switching the master switch off gives every tab its normal sound back.
- Chrome pages (`chrome://`), the Web Store and some protected/DRM audio can't be captured; the popup shows a warning dot.
- With all stars at 0 dB nothing is boosted (no profile = flat).
- Not a medical device. It does not replace an audiologist or a hearing aid fitting.
- The Strength slider (default 75%) scales the NAL-R correction live; see HOW-IT-WORKS.md for the full explanation.
