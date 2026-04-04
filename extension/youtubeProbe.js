/**
 * Runs in the tab (not the service worker) so timers survive while YouTube loads the player.
 * Reports HTML5 duration to the background for research queue estimates.
 */
(function () {
  if (globalThis.__breakpointYtProbe) return;
  globalThis.__breakpointYtProbe = true;

  let lastSentSec = -1;
  let lastSentAt = 0;

  function pickVideo() {
    const inPlayer = document.querySelector("#movie_player video");
    const dur = (v) =>
      v && Number.isFinite(v.duration) && v.duration > 1 ? v.duration : 0;
    let best = null;
    let bestD = dur(inPlayer);
    if (bestD > 0) best = inPlayer;
    for (const v of document.querySelectorAll("video")) {
      const d = dur(v);
      if (d > bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  function emit() {
    const v = pickVideo();
    if (!v) return;
    const sec = Math.round(v.duration);
    if (sec < 2) return;
    const now = Date.now();
    if (sec === lastSentSec && now - lastSentAt < 4000) return;
    lastSentSec = sec;
    lastSentAt = now;
    try {
      chrome.runtime.sendMessage({ type: "YOUTUBE_VIDEO_DURATION", durationSec: sec });
    } catch {
      /* extension context invalidated */
    }
  }

  document.addEventListener("loadedmetadata", emit, true);
  document.addEventListener("durationchange", emit, true);

  window.addEventListener("yt-navigate-finish", () => {
    lastSentSec = -1;
    window.setTimeout(emit, 400);
  });

  const iv = window.setInterval(emit, 750);
  window.setTimeout(() => window.clearInterval(iv), 50_000);
  window.setTimeout(emit, 0);
})();
