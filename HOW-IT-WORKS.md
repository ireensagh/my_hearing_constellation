# My Hearing Constellation: what it does and how

## In one paragraph

My Hearing Constellation is a Chrome extension that makes the audio in a browser tab easier to hear for someone with hearing loss. You enter the results of your hearing test (your audiogram) once, one grid per ear. The extension turns those results into a personal boost for each ear, boosting the pitches you hear least well, then applies it live to whatever the tab is playing: video calls, YouTube, streaming, music. Everything runs on your own computer. Your hearing data is never uploaded, and the developer has no server to receive it.

## The problem it addresses

A hearing test measures the quietest sound you can hear at each pitch, in dB HL (decibels hearing level). 0 dB is typical hearing; the larger the number, the louder a sound must be before you notice it. Most hearing loss is not the same at every pitch. A very common pattern is good hearing for low sounds and weaker hearing for high sounds, and the high range carries much of what makes speech clear (consonants like s, t, f, k). Someone with that pattern hears that people are talking but can't make out the words.

Ordinary computer audio is not shaped for this. Turning the volume up helps the weak pitches, but it makes the strong ones uncomfortably loud. The better fix is to boost only the pitches that need it, by the amount that is needed, separately for each ear. Hearing aids do this. This extension does a software version of it for browser audio, for the times you listen through headphones without your hearing aids.

## What you give it

- **An audiogram per ear:** your threshold in dB HL at 125, 250, 500, 1000, 2000, 4000 and 8000 Hz. You drag a star on each frequency to your test result, in 5 dB steps, the same steps an audiologist uses. A switch at the top flips between left and right.
- **A strength setting:** a slider from 0% to 100% (default 75%) that controls how much of the calculated correction is applied.

## What is calculated

### 1. Filling in the gaps between measured pitches

The audio is adjusted at 250, 500, 1000, 2000, 4000, 6000 and 8000 Hz. Your test has no 6000 Hz value, so the extension estimates it by drawing a straight line between your 4000 Hz and 8000 Hz results, on a scale where each octave counts equally, which matches how hearing works.

### 2. How much boost each pitch needs (the NAL-R formula)

For each pitch the extension calculates a target boost with NAL-R, a published prescription formula from the 1980s that audiologists have used to fit hearing aids. It is simple and well studied. Its goal is to make speech sound equally loud across pitches, not to give back every decibel of loss.

For each ear:

1. Take the average of your thresholds at 500, 1000 and 2000 Hz, the core speech range, and multiply by 0.15. Call this **X**. It is a general boost that grows with the overall severity of your loss.
2. For each pitch, boost = **X + 0.31 × your threshold at that pitch + a correction constant**.

The 0.31 means the formula restores roughly one third of your loss at each pitch, which is deliberate: restoring the whole loss would be too loud and uncomfortable. The correction constants (−17 dB at 250 Hz, −8 at 500, +1 at 1000, −1 at 2000, −2 at 4000, 6000 and 8000) reduce low-pitch boosts, because low sounds, such as background hum, add noise more than clarity.

Boosts below 0 dB are set to 0, and no single boost goes above 30 dB as a safety limit.

**Worked example.** Take thresholds of 25 dB at 500 Hz, 35 at 1000, 45 at 2000 and 55 at 4000, a gentle slope typical of age-related loss.
- X = 0.15 × (25 + 35 + 45) / 3 = 5.25
- Boost at 2000 Hz = 5.25 + 0.31 × 45 − 1 = about **18 dB**
- Boost at 4000 Hz = 5.25 + 0.31 × 55 − 2 = about **20 dB**
- Boost at 250 Hz with a 15 dB threshold = 5.25 + 0.31 × 15 − 17 = below 0, so **0 dB**

The result: little or no change to low sounds, and a clear lift to the high speech sounds.

### 3. The strength slider

Every calculated boost is multiplied by the slider value. At 100% you get the full NAL-R prescription. At 50% every boost is halved. At 0% nothing changes. A lower setting is the sensible way to start: hearing aid users are often fitted gradually because the brain needs a few weeks to get used to hearing high sounds again. The slider changes the sound immediately while audio is playing, so you can tune it by ear.

## How the sound is adjusted

The extension captures the audio of the tab you opened it on, processes it with the browser's built-in audio engine, and plays it to your headphones. For each ear separately:

1. **Split into left and right.** A mono tab is first copied to both sides so neither ear is left silent.
2. **Lower the level a little.** Boosting makes the sound louder and can cause distortion, so the signal is first reduced by half of the largest boost for that ear. The sound doesn't end up much louder overall; the balance between pitches changes.
3. **Seven equalizer bands.** Each of the seven pitches listed above has a filter that raises the sound by its calculated boost, in a smooth bump about an octave wide, so neighbouring pitches are lifted gently rather than in steps.
4. **Gentle compression.** A compressor follows the equalizer. It makes very loud sounds relatively quieter, so a sudden loud noise isn't painful after the boost. The amount of compression also scales with the strength slider. If your hearing is typical (20 dB or better everywhere), compression is switched off.
5. **Rejoin and play.** Left and right are combined and sent to your headphones.

Because the left and right ears are processed independently, a person with different hearing in each ear gets a different correction in each.

When you switch the extension off, or close the tab, the tab's audio goes back to exactly how Chrome normally plays it.

## How this helps someone with hearing loss

- **Speech is easier to follow.** Lifting the pitches you hear least makes the consonants audible again, which is what most people mean by "I can hear it but I can't understand it." This is the reason the extension was started: someone who takes off their hearing aids for headphones, then struggles with a video call.
- **Comfort.** Because only the weak pitches are boosted, and loud peaks are compressed, you don't have to turn the whole volume up to the point where strong pitches hurt.
- **Each ear gets what it needs.** Uneven hearing between ears is handled directly.
- **Private and free.** The audiogram is stored only in your browser's local extension storage. The extension makes no network requests.

## What it does not do

- **It is not a medical device or a hearing aid,** and it does not replace an audiologist's assessment or fitting. If you haven't had a hearing test, get one first.
- **It cannot fix clarity lost inside the ear.** Amplification restores audibility, but some hearing loss also blurs sound in ways that louder doesn't fix, especially in noisy rooms.
- **Headphones matter.** A hearing test is measured with calibrated equipment. Your own headphones respond differently, so the correction is an approximation. Use the strength slider and your own ears to settle on a comfortable level.
- **It only affects browser tabs,** one tab at a time, and Chrome requires you to open the extension once on each tab you want corrected. It can't process Chrome's internal pages or protected (DRM) audio.
- **The compression is simple.** It is a single compressor per ear rather than the multi-band compression in a modern hearing aid.
- **Protect your ears.** Boosted sound can be loud. Start with a low volume and a moderate strength.
