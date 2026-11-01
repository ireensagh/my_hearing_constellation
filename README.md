# My Hearing Constellation

A chrome extension that applies an NAL-R based, per-ear EQ + gentle compression to a tab's audio from your own audiogram. Everything runs locally; no network requests, no server.
The extension corrects the audio in a browser tab for your own hearing. Enter your audiogram once, one grid per ear, and it boosts the pitches you hear least, separately for each ear. Everything runs on your computer. Nothing is uploaded.

Built for people with hearing loss who listen through headphones without their hearing aids, such as on video calls. Read [how it works](HOW-IT-WORKS.md).

> **Early test version.** Not a medical device and not a replacement for an audiologist. Not yet tested on real Teams or Zoom web calls, so feedback is welcome.

## Try it

1. Download the latest zip from the [Releases page](../../releases) and unzip it.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the folder that contains `manifest.json`. GitHub's zip has an extra outer folder, so open it and pick the folder inside.
4. Click the extension icon, drag the stars to your audiogram results, and press **Save changes**.
5. Use the **Strength** slider to find a comfortable level. 75% is the default.


## How it behaves
- Chrome only lets an extension capture a tab after you invoke it there, so **open the popup once on each tab** you want corrected. Switching the master switch off gives every tab its normal sound back.
- Chrome pages (`chrome://`), the Web Store and some protected/DRM audio can't be captured; the popup shows a warning dot.
- With all stars at 0 dB nothing is boosted (no profile = flat).
- Not a medical device. It does not replace an audiologist or a hearing aid fitting.
- The Strength slider (default 75%) scales the NAL-R correction live; see HOW-IT-WORKS.md for the full explanation.


## Good to know

- **Chrome only** (Edge and Brave may work; Firefox doesn't).
- **Open the popup once on each tab** you want corrected. Chrome requires this.
- **Calls need to be in the browser.** It can't touch the Teams or Zoom desktop apps. Use Teams on the web, or Zoom's "join from your browser" option.
- It can't process Chrome's internal pages or protected (DRM) audio.
- Set your headphones as the system's default output device.
- To update, download the new zip and click the reload arrow on the extension's card.
- !!! Keep the volume low at first. Boosted sound can be loud.

## Feedback

Please [open an issue](../../issues). Useful things to tell me: your browser and headphones, which site or call you tried, and whether left and right sound correct. **Please don't post your audiogram in a public issue.**

## License

MIT
