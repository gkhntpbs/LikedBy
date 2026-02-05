window.LB = window.LB || {};
LB.UI = LB.UI || {};

LB.getYouTubeTheme = () => {
  const html = document.documentElement;
  const sys = html.getAttribute("data-system-color-scheme");
  if (sys) return sys === "dark";
  if (
    html.hasAttribute("dark") ||
    html.hasAttribute("darker-dark-theme") ||
    html.hasAttribute("darker-dark-theme-deprecate")
  )
    return true;
  const app = document.querySelector("ytd-app");
  if (
    app &&
    (app.hasAttribute("dark") ||
      app.hasAttribute("darker-dark-theme") ||
      app.hasAttribute("darker-dark-theme-deprecate"))
  )
    return true;
  const st = getComputedStyle(html).getPropertyValue(
    "--yt-spec-base-background"
  );
  if (
    st &&
    (st.includes("15, 15, 15") ||
      st.includes("24, 24, 24") ||
      st.includes("32, 32, 32") ||
      st.includes("0, 0, 0"))
  )
    return true;
  if (st && (st.includes("255, 255, 255") || st.includes("249, 249, 249")))
    return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

LB.watchThemeChanges = (cb) => {
  const run = () => cb(LB.getYouTubeTheme());
  const mo = new MutationObserver(run);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      "data-system-color-scheme",
      "dark",
      "darker-dark-theme",
      "darker-dark-theme-deprecate",
      "class",
    ],
  });
  const app = document.querySelector("ytd-app");
  if (app) {
    mo.observe(app, {
      attributes: true,
      attributeFilter: [
        "dark",
        "darker-dark-theme",
        "darker-dark-theme-deprecate",
        "class",
      ],
    });
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", run);
  return mo;
};

const themeColors = (dark) =>
  dark
    ? {
        text: "#f1f1f1",
        text2: "rgba(241,241,241,0.65)",
        border: "rgba(255,255,255,0.16)",
        secondary: "rgba(255,255,255,0.6)",
      }
    : {
        text: "#0f0f0f",
        text2: "rgba(15,15,15,0.6)",
        border: "rgba(0,0,0,0.12)",
        secondary: "rgba(15,15,15,0.6)",
      };

const ensureBaseStyles = () => {
  if (document.querySelector("#lb-ui-base")) return;
  const s = document.createElement("style");
  s.id = "lb-ui-base";
  s.textContent = `
    @keyframes lb-fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes lb-slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
    .lb-hidden { display:none !important; }
    .lb-overlay-root { position:fixed; bottom:24px; left:24px; z-index:2147483646; pointer-events:none; font-family:"Roboto","YouTube Sans","Arial",sans-serif; }
    .lb-overlay-btn { display:flex; align-items:center; gap:8px; border-radius:999px; padding:8px 12px; backdrop-filter:blur(20px); border:1px solid var(--lb-overlay-border, rgba(0,0,0,0.08)); background:var(--lb-overlay-bg, rgba(255,255,255,0.94)); color:var(--lb-overlay-text,#0f0f0f); box-shadow:var(--lb-overlay-shadow, 0 16px 28px rgba(0,0,0,0.18)); pointer-events:auto; cursor:pointer; }
    .lb-avatars { display:flex; align-items:center; }
    .lb-avatar { width:22px; height:22px; border-radius:50%; border:1px solid var(--lb-overlay-border, rgba(0,0,0,0.12)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; box-shadow:0 4px 12px rgba(0,0,0,0.18); background:linear-gradient(135deg,#667eea,#764ba2); }
    .lb-avatar + .lb-avatar { margin-left:-6px; }
    .lb-overlay-text { font-size:13px; line-height:1; white-space:nowrap; }
    .lb-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:2147483647; animation:lb-fadeIn .2s ease; }
    .lb-modal { min-width:320px; max-width:420px; max-height:70vh; overflow:auto; border-radius:16px; padding:16px; border:1px solid var(--lb-overlay-border, rgba(0,0,0,0.12)); background:var(--lb-overlay-bg, rgba(255,255,255,0.96)); color:var(--lb-overlay-text,#0f0f0f); box-shadow:0 26px 60px rgba(0,0,0,0.35); animation:lb-slideUp .22s ease; }
    .lb-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .lb-modal-title { font-size:16px; font-weight:700; margin:0; }
    .lb-modal-close { border:none; background:transparent; width:32px; height:32px; border-radius:50%; cursor:pointer; color:inherit; }
    .lb-modal-close:hover { background:rgba(0,0,0,0.08); }
    .lb-modal-list { display:flex; flex-direction:column; gap:10px; }
    .lb-modal-item { display:flex; align-items:center; gap:10px; padding:8px 4px; border-radius:10px; }
    .lb-modal-item:hover { background:rgba(0,0,0,0.05); }
    .lb-modal-avatar { width:32px; height:32px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
    .lb-modal-info { display:flex; flex-direction:column; }
    .lb-modal-name { font-weight:700; font-size:14px; }
    .lb-modal-meta { font-size:12px; opacity:.7; }
    .lb-toast-root { position:fixed; top:24px; right:24px; display:flex; flex-direction:column; gap:10px; z-index:2147483647; pointer-events:none; }
    .lb-toast { min-width:220px; max-width:320px; border-radius:14px; padding:12px 16px; background:var(--lb-toast-bg, rgba(24,24,24,0.94)); color:var(--lb-toast-text,#f1f1f1); border:1px solid var(--lb-toast-border, rgba(255,255,255,0.12)); box-shadow:var(--lb-toast-shadow, 0 16px 32px rgba(0,0,0,0.35)); display:flex; align-items:center; gap:10px; font-size:14px; font-weight:500; opacity:0; transform:translateY(-8px); transition:opacity .2s ease, transform .2s ease; pointer-events:auto; animation:lb-fadeIn .18s ease; }
    .lb-toast-visible { opacity:1; transform:translateY(0); }
    .lb-toast::before { content:""; width:4px; align-self:stretch; border-radius:8px; background:var(--lb-toast-accent,#4facfe); }
    .lb-toast-success { --lb-toast-accent: var(--lb-toast-success, #43e97b); }
    .lb-toast-info { --lb-toast-accent: var(--lb-toast-info, #4facfe); }
    .lb-toast-error { --lb-toast-accent: var(--lb-toast-error, #f5576c); }
  `;
  document.head.appendChild(s);
};
ensureBaseStyles();

const overlayState = {
  root: null,
  button: null,
  avatarWrap: null,
  textEl: null,
  currentLikes: [],
};

const avatarGradients = [
  "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
  "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
  "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
  "linear-gradient(135deg,#fa709a 0%,#fee140 100%)",
];

const ensureOverlayRoot = () => {
  if (!overlayState.root || !overlayState.root.isConnected) {
    overlayState.root = document.createElement("div");
    overlayState.root.id = "lb-friends-overlay";
    overlayState.root.className = "lb-overlay-root lb-hidden";
    document.body.appendChild(overlayState.root);
  }

  if (!overlayState.button || !overlayState.button.isConnected) {
    overlayState.root.innerHTML = "";
    overlayState.button = document.createElement("div");
    overlayState.button.className = "lb-overlay-btn";
    overlayState.avatarWrap = document.createElement("div");
    overlayState.avatarWrap.className = "lb-avatars";
    overlayState.textEl = document.createElement("div");
    overlayState.textEl.className = "lb-overlay-text";
    overlayState.button.appendChild(overlayState.avatarWrap);
    overlayState.button.appendChild(overlayState.textEl);
    overlayState.root.appendChild(overlayState.button);
    overlayState.button.addEventListener("click", () => {
      if (overlayState.currentLikes?.length) LB.UI.showLikesPopup(overlayState.currentLikes);
    });
  }

  return overlayState.root;
};

const applyOverlayTheme = (darkOverride) => {
  if (!overlayState.root) return;
  const dark =
    typeof darkOverride === "boolean" ? darkOverride : LB.getYouTubeTheme();
  const c = themeColors(dark);
  overlayState.root.style.setProperty(
    "--lb-overlay-bg",
    dark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.95)"
  );
  overlayState.root.style.setProperty("--lb-overlay-text", c.text);
  overlayState.root.style.setProperty("--lb-overlay-meta", c.secondary);
  overlayState.root.style.setProperty("--lb-overlay-border", c.border);
  overlayState.root.style.setProperty(
    "--lb-overlay-shadow",
    dark ? "0 18px 36px rgba(0,0,0,0.55)" : "0 18px 36px rgba(0,0,0,0.18)"
  );
  overlayState.root.style.setProperty("--lb-overlay-avatar-text", "#fff");

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty(
    "--lb-overlay-bg",
    dark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.95)"
  );
  rootStyle.setProperty("--lb-overlay-text", c.text);
  rootStyle.setProperty("--lb-overlay-meta", c.secondary);
  rootStyle.setProperty("--lb-overlay-border", c.border);
};

LB.UI.hideFriendsOverlay = () => {
  if (overlayState.root) overlayState.root.classList.add("lb-hidden");
};

LB.UI.updateFriendsOverlay = (friendsLikes = []) => {
  overlayState.currentLikes = Array.isArray(friendsLikes)
    ? friendsLikes.filter(Boolean)
    : [];

  if (!overlayState.currentLikes.length || document.fullscreenElement) {
    LB.UI.hideFriendsOverlay();
    return;
  }

  ensureOverlayRoot();
  applyOverlayTheme();
  overlayState.root.classList.remove("lb-hidden");

  const likes = overlayState.currentLikes;
  const first = likes[0];
  const name = (first?.username || "Bir arkadaşın").toString();
  const others = Math.max(0, likes.length - 1);

  overlayState.avatarWrap.innerHTML = "";
  const maxAv = 3;
  likes.slice(0, maxAv).forEach((item, idx) => {
    const av = document.createElement("div");
    av.className = "lb-avatar";
    av.textContent = (item.username || "?").charAt(0).toUpperCase();
    av.style.background = avatarGradients[idx % avatarGradients.length];
    overlayState.avatarWrap.appendChild(av);
  });

  overlayState.textEl.textContent = others <= 0
    ? `${name} bunu beğendi`
    : `${name} ve ${others} arkadaşın bunu beğendi`;
};

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    LB.UI.hideFriendsOverlay();
  } else if (overlayState.currentLikes.length) {
    LB.UI.updateFriendsOverlay(overlayState.currentLikes);
  }
});

LB.UI.showLikesPopup = (likes = []) => {
  if (!Array.isArray(likes) || !likes.length) return;
  const dark = LB.getYouTubeTheme();
  const bd = document.createElement("div");
  bd.className = "lb-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "lb-modal";

  const header = document.createElement("div");
  header.className = "lb-modal-header";

  const title = document.createElement("h3");
  title.className = "lb-modal-title";
  title.textContent = `Bu videoyu beğenenler (${likes.length})`;

  const close = document.createElement("button");
  close.className = "lb-modal-close";
  close.textContent = "×";
  close.addEventListener("click", () => bd.remove());

  header.appendChild(title);
  header.appendChild(close);

  const list = document.createElement("div");
  list.className = "lb-modal-list";

  likes.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "lb-modal-item";

    const av = document.createElement("div");
    av.className = "lb-modal-avatar";
    av.textContent = (f.username || "?").charAt(0).toUpperCase();
    av.style.background = avatarGradients[i % avatarGradients.length];

    const info = document.createElement("div");
    info.className = "lb-modal-info";

    const name = document.createElement("div");
    name.className = "lb-modal-name";
    name.textContent = f.username || "Bilinmeyen";

    const meta = document.createElement("div");
    meta.className = "lb-modal-meta";
    meta.textContent = LB.getTimeAgo(f.createdAt);

    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(av);
    item.appendChild(info);
    list.appendChild(item);
  });

  modal.appendChild(header);
  modal.appendChild(list);
  bd.appendChild(modal);
  document.body.appendChild(bd);

  bd.addEventListener("click", (e) => {
    if (e.target === bd) bd.remove();
  });
};

const toastState = { root: null };

const ensureToastRoot = () => {
  if (!toastState.root || !toastState.root.isConnected) {
    toastState.root = document.createElement("div");
    toastState.root.id = "lb-toast-root";
    toastState.root.className = "lb-toast-root";
    document.body.appendChild(toastState.root);
    applyToastTheme();
  }
  return toastState.root;
};

const applyToastTheme = (darkOverride) => {
  if (!toastState.root) return;
  const dark =
    typeof darkOverride === "boolean" ? darkOverride : LB.getYouTubeTheme();
  const c = themeColors(dark);
  toastState.root.style.setProperty(
    "--lb-toast-bg",
    dark ? "rgba(24,24,24,0.94)" : "rgba(255,255,255,0.96)"
  );
  toastState.root.style.setProperty("--lb-toast-text", c.text);
  toastState.root.style.setProperty(
    "--lb-toast-border",
    dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
  );
  toastState.root.style.setProperty(
    "--lb-toast-shadow",
    dark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 20px 40px rgba(0,0,0,0.2)"
  );
  toastState.root.style.setProperty("--lb-toast-success", "#43e97b");
  toastState.root.style.setProperty("--lb-toast-info", "#4facfe");
  toastState.root.style.setProperty("--lb-toast-error", "#f5576c");
};

LB.UI.showToast = (message, { variant = "info", duration = 2800 } = {}) => {
  if (!message) return;
  const root = ensureToastRoot();
  applyToastTheme();

  while (root.children.length >= 4) {
    root.removeChild(root.firstElementChild);
  }

  const toast = document.createElement("div");
  toast.className = `lb-toast lb-toast-${variant}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;

  root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("lb-toast-visible");
  });

  const remove = () => {
    toast.classList.remove("lb-toast-visible");
    setTimeout(() => toast.remove(), 200);
  };

  setTimeout(remove, duration);
};

LB.UI.refreshOverlayTheme = applyOverlayTheme;
LB.UI.refreshToastTheme = applyToastTheme;

LB.watchThemeChanges((dark) => {
  applyOverlayTheme(dark);
  applyToastTheme(dark);
});
