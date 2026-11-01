// Runs inside the offscreen document. Only chrome.runtime is available here
// (no chrome.storage), so audiograms arrive inside messages from background.js.

let audioCtx = null;
const sessions = new Map(); // tabId -> { stream, engine }

function getContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

async function startTab({ tabId, streamId, leftEar, rightEar, strength }) {
  if (sessions.has(tabId)) return { ok: true };

  const ctx = getContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  const engine = new window.HearingConstellationEngine(ctx);
  engine.connectStream(stream);
  engine.setAudiogram(leftEar, rightEar, strength); // undefined audiogram = flat, no correction

  sessions.set(tabId, { stream, engine });
  stream.getAudioTracks().forEach((track) =>
    track.addEventListener('ended', () => stopTab(tabId))
  );
  return { ok: true };
}

// Stopping the tracks hands the tab's audio back to Chrome, so the tab sounds
// normal again (suspending the context instead would silence the tab).
function stopTab(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  sessions.delete(tabId);
  session.stream.getTracks().forEach((t) => t.stop());
  session.engine.dispose();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  (async () => {
    switch (message.type) {
      case 'START_AUDIO':
        return await startTab(message);
      case 'STOP_AUDIO':
        if (message.tabId == null) [...sessions.keys()].forEach(stopTab);
        else stopTab(message.tabId);
        return { ok: true };
      case 'AUDIOGRAM_UPDATED':
        sessions.forEach((s) => s.engine.setAudiogram(message.leftEar, message.rightEar, message.strength));
        return { ok: true };
      case 'GET_STATUS':
        return { active: sessions.has(message.tabId) };
    }
  })()
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));

  return true;
});
