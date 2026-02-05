window.LB = window.LB || {};

LB.DEBUG = true;
LB.log = (...a) => {
  if (LB.DEBUG) console.log("[LB]", ...a);
};
LB.warn = (...a) => console.warn("[LB]", ...a);
LB.err = (...a) => console.error("[LB]", ...a);

LB.safeSendMessage = (data, cb) => {
  try {
    if (!chrome?.runtime?.id || !chrome?.runtime?.sendMessage) {
      LB.warn("sendMessage skipped: no runtime context");
      return;
    }
    LB.log("sendMessage →", data.action, data);
    chrome.runtime.sendMessage(data, (res) => {
      LB.log("sendMessage ←", data.action, res);
      cb && cb(res);
    });
  } catch (e) {
    LB.err("sendMessage error", e);
  }
};

LB.debounce = (fn, wait = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

LB.getVideoType = () => {
  const isShorts = location.pathname.startsWith("/shorts/");
  const type = isShorts ? "shorts" : "normal";
  return type;
};

LB.getCurrentVideoId = () => {
  const q = new URLSearchParams(location.search).get("v");
  if (q) return q;
  if (location.pathname.startsWith("/shorts/")) {
    return location.pathname.split("/shorts/")[1]?.split(/[?#]/)[0] || null;
  }
  return null;
};

const isDislikeButton = (el) => {
  if (!el) return false;
  if (el.closest("#dislike-button")) return true;
  const label =
    (el.getAttribute("aria-label") || el.getAttribute("title") || "").toLowerCase();
  if (label.includes("dislike")) return true;
  return false;
};

const isLikeButtonCandidate = (el) => {
  if (!el) return false;
  if (isDislikeButton(el)) return false;
  if (el.closest("#like-button")) return true;
  const label =
    (el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("data-title-no-tooltip") ||
      "").toLowerCase();
  if (!label) return false;
  if (label.includes("dislike")) return false;
  return label.includes("like") || label.includes("liked") || label.includes("unlike");
};

LB.getLikeButton = () => {
  const selectors = [
    "ytd-segmented-like-dislike-button-renderer #like-button button[aria-pressed]",
    "#like-button button[aria-pressed]",
    "ytd-reel-player #like-button button[aria-pressed]",
    "ytd-reel-video-renderer #like-button button[aria-pressed]",
    "ytd-reel-player-overlay-renderer #like-button button[aria-pressed]",
    "ytd-reel-player button[aria-pressed]",
    "ytd-reel-video-renderer button[aria-pressed]",
    "ytd-reel-player-overlay-renderer button[aria-pressed]",
    "ytd-shorts button[aria-pressed]",
    "toggle-button-view-model button[aria-pressed]",
    "like-button-view-model button[aria-pressed]",
    "ytd-toggle-button-renderer.force-icon-button button[aria-pressed]",
  ];

  for (const sel of selectors) {
    const candidate = document.querySelector(sel);
    if (candidate && isLikeButtonCandidate(candidate)) return candidate;
  }

  const candidates = Array.from(
    document.querySelectorAll("button[aria-pressed]")
  );
  const generic = candidates.find((el) => isLikeButtonCandidate(el));
  return generic || null;
};

LB.readLikeState = (btn) => {
  if (!btn) return "unknown";

  const pressed = btn.getAttribute("aria-pressed");
  if (pressed === "true") return "liked";
  if (pressed === "false") return "unliked";

  const label = (btn.getAttribute("aria-label") || "").toLowerCase();
  if (label) {
    if (label.includes("unlike") || label.includes("liked")) return "liked";
    if (label.includes("like")) return "unknown";
  }

  const selected = btn.getAttribute("aria-selected");
  if (selected === "true") return "liked";
  if (selected === "false") return "unliked";

  const activeClass =
    btn.classList.contains("style-default-active") ||
    btn.classList.contains("yt-spec-button-shape-next--toggled") ||
    btn.classList.contains("yt-spec-button-shape-next--pressed");
  if (activeClass) return "liked";

  return "unknown";
};

LB.getTitleAndThumb = (videoId) => {
  const type = LB.getVideoType();
  let title = (document.title || "").replace(/ - YouTube$/, "") || "YouTube";

  if (type === "shorts") {
    const tEl =
      document.querySelector("h1.title") ||
      document.querySelector(
        "yt-formatted-string.ytd-reel-player-header-renderer"
      ) ||
      document.querySelector(
        "ytd-reel-player-header-renderer yt-formatted-string"
      );
    if (tEl && tEl.textContent.trim()) title = tEl.textContent.trim();
  }

  const thumbnail = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : "";
  return { title, thumbnail };
};

LB.getTimeAgo = (ts) => {
  if (!ts) return "Az önce";
  const now = Date.now();
  const then = ts?.seconds ? ts.seconds * 1000 : ts;
  const d = now - then;
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const g = Math.floor(d / 86400000);
  if (g > 0) return `${g} gün önce`;
  if (h > 0) return `${h} saat önce`;
  if (m > 0) return `${m} dakika önce`;
  return "Az önce";
};

LB.watchURLChanges = (onChange) => {
  let last = location.href;
  LB.log("watchURLChanges start", last);

  const obs = new MutationObserver(() => {
    if (location.href !== last) {
      LB.log("URL mutation →", location.href);
      last = location.href;
      onChange();
    }
  });
  obs.observe(document, { childList: true, subtree: true });

  window.addEventListener("popstate", () => {
    LB.log("popstate");
    onChange();
  });
  window.addEventListener("yt-navigate-finish", () => {
    LB.log("yt-navigate-finish");
    setTimeout(onChange, 200);
  });

  setInterval(() => {
    if (location.href !== last) {
      LB.log("URL polling →", location.href);
      last = location.href;
      onChange();
    }
  }, 1500);
};
