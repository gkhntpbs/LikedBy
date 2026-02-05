document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("tab-login");
  const registerTab = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const loginUser = document.getElementById("login-username");
  const loginPin = document.getElementById("login-pin");
  const regUser = document.getElementById("reg-username");
  const regPin = document.getElementById("reg-pin");
  const exportBtn = document.getElementById("export-videos-btn");
  const importBtn = document.getElementById("import-videos-btn");
  const importInput = document.getElementById("import-videos-input");
  const loginErr = document.getElementById("login-error");
  const regErr = document.getElementById("register-error");
  const main = document.getElementById("main-content");
  const auth = document.getElementById("auth-container");
  const usernameText = document.querySelector(".username-text");
  const logoutBtn = document.getElementById("logout-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const deleteBtn = document.getElementById("delete-account-btn");
  const videoList = document.getElementById("video-list");
  const videoCount = document.getElementById("video-count");
  const friendCount = document.getElementById("friend-count");
  const videosHeader = document.getElementById("videos-header");
  const videosContent = document.getElementById("videos-content");
  const friendsHeader = document.getElementById("friends-header");
  const friendsContent = document.getElementById("friends-content");
  const friendUsernameInput = document.getElementById("friend-username");
  const addFriendBtn = document.getElementById("add-friend");
  const friendsList = document.getElementById("friends-list");
  const openProfileBtn = document.getElementById("open-profile-btn");
  const developerLinks = document.querySelectorAll(".developer-link, #developer-link");
  const languageSelect = document.getElementById("language-select");
  const languageLabel = document.getElementById("language-select-label");
  const THEME_KEY = "themePreference";
  const LEGACY_PIN_KEY = "lastUsedPin";
  const prefersDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  let themePreference = "system";
  let currentStrings = {};

  console.log("[Popup] DOM loaded");

  function switchTab(tab) {
    console.log(`[Popup] Switching tab to: ${tab}`);
    if (tab === "login") {
      loginTab.classList.add("active");
      registerTab.classList.remove("active");
      loginForm.classList.add("active");
      registerForm.classList.remove("active");
    } else {
      registerTab.classList.add("active");
      loginTab.classList.remove("active");
      registerForm.classList.add("active");
      loginForm.classList.remove("active");
    }
  }
  loginTab.addEventListener("click", () => switchTab("login"));
  registerTab.addEventListener("click", () => switchTab("register"));

  function notify(msg, type = "info") {
    let container = document.querySelector(".notify-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "notify-container";
      document.body.appendChild(container);
    }

    const n = document.createElement("div");
    n.className = `notify-item ${type}`;
    n.innerHTML = `
      <i class="ti ${
        type === "success"
          ? "ti-circle-check"
          : type === "error"
          ? "ti-alert-triangle"
          : type === "warning"
          ? "ti-alert-circle"
          : "ti-info-circle"
      }"></i>
      <span>${msg}</span>
    `;
    container.appendChild(n);

    setTimeout(() => {
      n.classList.add("hide");
      setTimeout(() => n.remove(), 300);
    }, 3000);
  }

  const ERROR_MESSAGES = {
    MissingFields: "Please fill all fields.",
    InvalidPIN: "PIN must be 4 digits.",
    UsernameTaken: "This username is already taken.",
    UserNotFound: "User not found.",
    WrongPIN: "Incorrect PIN. Please try again.",
    AuthMigrationRequired: "Legacy account detected. Please re-register to migrate.",
    LoginFailed: "Login failed, try again!",
    LoginFaild: "Login failed, try again!",
    RegisterFailed: "Registration failed, try again!",
    RegisterFaild: "Registration failed, try again!",
    GetLikedVideosFailed: "Could not load videos.",
    GetFriendsFailed: "Could not load friends.",
    AddFriendFailed: "Could not add friend.",
    RemoveFriendFailed: "Could not remove friend.",
    DeleteAccountFailed: "Could not delete account. Try again!",
    ServiceNotReady: "Initializing... please try again in a moment.",
    NetworkUnavailable: "Cannot reach LikedBy right now. Check your internet connection.",
    PersistenceUnavailable: "This device cannot cache data offline. Try disabling private browsing.",
    LikeTransactionFailed: "Failed to save like.",
    UnlikeTransactionFailed: "Failed to update like.",
    GetFriendsLikesFailed: "Could not load friends' likes.",
    GetUserLikesFailed: "Could not load your likes.",
    ImportFailed: "Import failed.",
    InvalidPayload: "Invalid import payload.",
  };

  function friendlyError(code, fallback) {
    if (!code) return fallback || "Something went wrong. Please try again.";
    if (typeof currentStrings === "object" && currentStrings?.errors?.[code]) {
      return currentStrings.errors[code];
    }
    return ERROR_MESSAGES[code] || fallback || "Something went wrong. Please try again.";
  }

  const LANG_KEY = "languagePreference";
  const i18nConfig = window.LB?.I18N || {};
  const availableLocales = { ...(i18nConfig.locales || {}) };
  const fallbackLocale = availableLocales.en || {
    languageCode: "en",
    languageName: "English",
    strings: {
      languageLabel: "Language",
      languageSelectorAria: "Select language",
      subtitle: "Sign in or create an account to continue.",
      tabs: { login: "Login", register: "Register" },
        placeholders: {
          username: "Username",
          newUsername: "Choose a username",
          pin: "4-digit PIN",
          friendUsername: "Friend's username",
        },
      buttons: {
        login: "Login",
        register: "Create Account",
        addFriend: "Add",
        deleteAccount: "Delete",
        deleteConfirm: "Delete",
        deleteCancel: "Cancel",
        showAllVideos: "Show all",
        showLessVideos: "Show less",
      },
      tooltips: {
        openProject: "Open project",
        logout: "Logout",
        deleteAccount: "Delete account",
        removeFriend: "Remove friend",
        themeSystemDark: "System (dark)",
        themeSystemLight: "System (light)",
        themeLight: "Light mode",
        themeDark: "Dark mode",
      },
      sections: {
        videosTitle: "Your liked videos",
        friendsTitle: "Friends",
        loading: "Loading...",
        videosEmpty: "No liked videos yet.",
        friendsEmpty: "No friends added yet",
        videosLoadError: "Failed to load",
        friendsLoadError: "Failed to load",
        videosLimitedInfo: "Showing latest {{count}} of {{total}} videos.",
        videosShowingAll: "Showing all {{total}} videos.",
      },
      notifications: {
        loginSuccess: "Logged in successfully",
        registerSuccess: "Account created",
        logoutSuccess: "Logged out",
        deleteSuccess: "Account deleted",
        friendAdded: "Friend added",
        friendRemoved: "Removed {{username}}",
      },
      warnings: {
        invalidCredentials: "Enter valid username and 4-digit PIN",
      },
      modals: {
        deleteTitle: "Delete account?",
        deleteMessage: "This will permanently delete {{account}} friends, likes, and account data. This action cannot be undone.",
        accountSelf: "your",
        accountUser: "{{username}}'s",
        confirm: "Delete",
        cancel: "Cancel",
        confirmTitle: "Confirm",
        confirmMessage: "Are you sure?",
      },
      developerCredit: "Developed by Gökhan Topbaş",
      errors: { ...ERROR_MESSAGES },
    },
  };
  if (!availableLocales.en) availableLocales.en = fallbackLocale;
  const defaultLocaleKey = availableLocales[i18nConfig.defaultLocale] ? i18nConfig.defaultLocale : "en";
  let languagePreference = defaultLocaleKey;
  let currentLocaleData = availableLocales[languagePreference] || fallbackLocale;
  currentStrings = currentLocaleData.strings || fallbackLocale.strings || {};
  const VIDEO_RENDER_LIMIT = 50;
  let allVideos = [];
  let showingAllVideos = false;

  function getString(path, fallback = "") {
    if (!path) return fallback;
    const segments = path.split(".");
    let node = currentStrings;
    for (const seg of segments) {
      if (node && Object.prototype.hasOwnProperty.call(node, seg)) {
        node = node[seg];
      } else {
        node = undefined;
        break;
      }
    }
    if (typeof node === "string") return node;
    return fallback;
  }

  function formatString(template, params = {}) {
    if (typeof template !== "string") return template || "";
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      return params[trimmed] !== undefined ? params[trimmed] : "";
    });
  }

  function normalizeLocale(locale) {
    if (!locale) return defaultLocaleKey;
    if (availableLocales[locale]) return locale;
    const lower = locale.toLowerCase();
    if (lower.startsWith("tr") && availableLocales.tr) return "tr";
    if (lower.startsWith("es") && availableLocales.es) return "es";
    if (lower.startsWith("de") && availableLocales.de) return "de";
    if (lower.startsWith("en") && availableLocales.en) return "en";
    return defaultLocaleKey;
  }

  function detectInitialLocale() {
    const nav = (navigator.language || navigator.userLanguage || defaultLocaleKey).toLowerCase();
    return normalizeLocale(nav);
  }

  function populateLanguageOptions() {
    if (!languageSelect) return;
    languageSelect.innerHTML = "";
    Object.entries(availableLocales).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = value.languageName || key.toUpperCase();
      languageSelect.appendChild(option);
    });
  }

  function applyLocale(locale, { persist = true } = {}) {
    const normalized = normalizeLocale(locale);
    languagePreference = normalized;
    currentLocaleData = availableLocales[normalized] || availableLocales[defaultLocaleKey] || fallbackLocale;
    currentStrings = currentLocaleData.strings || fallbackLocale.strings || {};

    if (languageSelect && languageSelect.value !== normalized) {
      languageSelect.value = normalized;
    }
    if (languageLabel) {
      languageLabel.textContent = getString("languageLabel", languageLabel.textContent);
    }
    const selectorAria = getString("languageSelectorAria", languageLabel?.textContent || "");
    if (languageSelect && selectorAria) {
      languageSelect.setAttribute("aria-label", selectorAria);
      languageSelect.setAttribute("title", selectorAria);
    }

    const subtitleEl = document.querySelector(".subtitle");
    if (subtitleEl) subtitleEl.textContent = getString("subtitle", subtitleEl.textContent);
    if (loginTab) loginTab.textContent = getString("tabs.login", loginTab.textContent);
    if (registerTab) registerTab.textContent = getString("tabs.register", registerTab.textContent);

    if (loginUser) loginUser.placeholder = getString("placeholders.username", loginUser.placeholder);
    if (regUser) regUser.placeholder = getString("placeholders.newUsername", getString("placeholders.username", regUser.placeholder));
    if (loginPin) loginPin.placeholder = getString("placeholders.pin", loginPin.placeholder);
    if (regPin) regPin.placeholder = getString("placeholders.pin", regPin.placeholder);
    if (friendUsernameInput) friendUsernameInput.placeholder = getString("placeholders.friendUsername", friendUsernameInput.placeholder);

    if (loginBtn) {
      const label = getString("buttons.login", "Login");
      loginBtn.innerHTML = `<i class="ti ti-login"></i> ${label}`;
    }
    if (registerBtn) {
      const label = getString("buttons.register", "Create Account");
      registerBtn.innerHTML = `<i class="ti ti-user-plus"></i> ${label}`;
    }
    if (addFriendBtn) {
      const label = getString("buttons.addFriend", "Add");
      const icon = addFriendBtn.querySelector("i");
      const span = document.getElementById("add-friend-label");
      if (span) span.textContent = label;
      else addFriendBtn.innerHTML = `<i class="ti ti-user-plus"></i> ${label}`;
      if (icon) icon.setAttribute("aria-hidden", "true");
    }
    if (deleteBtn) {
      const label = getString("buttons.deleteAccount", "Delete");
      deleteBtn.innerHTML = `<i class="ti ti-trash"></i>`;
      const deleteTitle = getString("tooltips.deleteAccount", deleteBtn.title || "Delete account");
      deleteBtn.title = deleteTitle;
      deleteBtn.setAttribute("aria-label", deleteTitle);
    }
    if (logoutBtn) {
      const logoutTitle = getString("tooltips.logout", logoutBtn.title || "Logout");
      logoutBtn.title = logoutTitle;
      logoutBtn.setAttribute("aria-label", logoutTitle);
    }
    if (openProfileBtn) {
      const projectTitle = getString("tooltips.openProject", openProfileBtn.title || "Open project");
      openProfileBtn.title = projectTitle;
      openProfileBtn.setAttribute("aria-label", projectTitle);
    }

    const videosTitleText = document.getElementById("videos-title-text");
    if (videosTitleText) videosTitleText.textContent = getString("sections.videosTitle", videosTitleText.textContent);
    const friendsTitleText = document.getElementById("friends-title-text");
    if (friendsTitleText) friendsTitleText.textContent = getString("sections.friendsTitle", friendsTitleText.textContent);

    if (developerLinks && developerLinks.length) {
      developerLinks.forEach((el) => {
        el.textContent = getString("developerCredit", el.textContent.trim());
      });
    }

    if (persist && chrome?.storage?.local) {
      chrome.storage.local.set({ [LANG_KEY]: normalized });
    }

    updateThemeButton(themePreference, resolveTheme(themePreference));

    if (main && main.style.display !== "none") {
      if (allVideos.length) renderVideoList();
      else loadVideos();
      updateFriendsList();
    }
  }

  populateLanguageOptions();
  applyLocale(detectInitialLocale(), { persist: false });

  if (languageSelect) {
    languageSelect.addEventListener("change", (event) => {
      applyLocale(event.target.value);
    });
  }

  function resolveTheme(pref) {
    if (pref === "light" || pref === "dark") return pref;
    return prefersDark && prefersDark.matches ? "dark" : "light";
  }

  function updateThemeButton(pref, resolvedTheme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector("i");
    if (!icon) return;
    let iconClass = "ti ti-device-desktop";
    const tooltips = currentStrings?.tooltips || {};
    let label = resolvedTheme === "dark"
      ? tooltips.themeSystemDark || "System (dark)"
      : tooltips.themeSystemLight || "System (light)";
    if (pref === "light") {
      iconClass = "ti ti-sun";
      label = tooltips.themeLight || "Light mode";
    } else if (pref === "dark") {
      iconClass = "ti ti-moon";
      label = tooltips.themeDark || "Dark mode";
    }
    icon.className = iconClass;
    themeToggleBtn.title = label;
    themeToggleBtn.setAttribute("aria-label", label);
  }

  function applyTheme(pref, { persist = true } = {}) {
    themePreference = pref;
    const resolvedTheme = resolveTheme(pref);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.setAttribute("data-theme-mode", pref);
    updateThemeButton(pref, resolvedTheme);
    if (persist && chrome?.storage?.local) {
      chrome.storage.local.set({ [THEME_KEY]: pref });
    }
  }

  function cycleTheme() {
    const next = themePreference === "system" ? "light" : themePreference === "light" ? "dark" : "system";
    applyTheme(next);
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener("click", cycleTheme);
  if (openProfileBtn) openProfileBtn.addEventListener("click", () => {
    const constants = window.LB?.CONSTANTS || {};
    const url = constants.GITHUB_PROJECT_URL || constants.GITHUB_PROFILE_URL || "https://github.com/gokhantopbas";
    chrome.tabs.create({ url });
  });

  if (developerLinks && developerLinks.length) {
    developerLinks.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const constants = window.LB?.CONSTANTS || {};
        const url = constants.GITHUB_PROFILE_URL || constants.GITHUB_PROJECT_URL || "https://github.com/gokhantopbas";
        chrome.tabs.create({ url });
      });
    });
  }

  const handleSystemThemeChange = () => {
    if (themePreference === "system") {
      applyTheme("system", { persist: false });
    }
  };

  if (prefersDark) {
    if (prefersDark.addEventListener) {
      prefersDark.addEventListener("change", handleSystemThemeChange);
    } else if (prefersDark.addListener) {
      prefersDark.addListener(handleSystemThemeChange);
    }
  }

  applyTheme("system", { persist: false });

  if (chrome?.storage?.local) {
    chrome.storage.local.get([THEME_KEY, LANG_KEY], (res) => {
      const storedTheme = res?.[THEME_KEY] || "system";
      applyTheme(storedTheme, { persist: false });
      const storedLang = res?.[LANG_KEY];
      if (storedLang) applyLocale(storedLang, { persist: false });
    });
  }

  function setSectionExpanded(headerEl, contentEl, expanded) {
    if (expanded) {
      headerEl.classList.add("active");
      contentEl.classList.add("show");
    } else {
      headerEl.classList.remove("active");
      contentEl.classList.remove("show");
    }
  }

  function updateFriendsList() {
    console.log("[Popup] Updating friends list");
    if (!friendsList) return;
    friendsList.innerHTML = `<li class='empty-state'>${getString("sections.loading", "Loading...")}</li>`;
    chrome.runtime.sendMessage({ action: "getFriends" }, (res) => {
      friendsList.innerHTML = "";
      if (!res?.success) {
        const message = friendlyError(res?.error, getString("sections.friendsLoadError", "Failed to load"));
        friendsList.innerHTML = `<li class='empty-state'>${message}</li>`;
        const fc = document.getElementById("friend-count");
        if (fc) fc.textContent = "0";
        notify(message, "error");
        return;
      }
      const fc = document.getElementById("friend-count");
      fc && (fc.textContent = String(res.friends.length || 0));
      if (!res.friends.length) {
        friendsList.innerHTML =
          `<li class='empty-state'>${getString("sections.friendsEmpty", "No friends added yet")}</li>`;
        return;
      }
      res.friends.forEach((f) => {
        const li = document.createElement("li");
        li.className = "friend-item";
        li.innerHTML = `<span>${f}</span>
        <button class="remove-btn"><i class="ti ti-trash"></i></button>`;
        const removeBtn = li.querySelector(".remove-btn");
        if (removeBtn) {
          const removeTitle = getString("tooltips.removeFriend", "Remove friend");
          removeBtn.title = removeTitle;
          removeBtn.setAttribute("aria-label", removeTitle);
          removeBtn.onclick = () => {
            chrome.runtime.sendMessage(
              { action: "removeFriend", friendUsername: f },
              updateFriendsList
            );
            const removedMsg = formatString(getString("notifications.friendRemoved", "Removed {{username}}"), { username: f });
            notify(removedMsg, "info");
          };
        }
        friendsList.appendChild(li);
      });
    });
  }

  function renderVideoList() {
    if (!videoList) return;
    const total = allVideos.length;
    videoList.innerHTML = "";

    if (!total) {
      videoList.innerHTML = `<div class="empty-state">${getString("sections.videosEmpty", "No liked videos yet.")}</div>`;
      return;
    }

    const subset = showingAllVideos ? allVideos : allVideos.slice(0, VIDEO_RENDER_LIMIT);
    subset.forEach((v) => {
      const el = document.createElement("div");
      el.className = "video";
      el.innerHTML = `<img src="${v.thumbnail}" alt="t"><div class="video-title">${v.title}</div>`;
      el.onclick = () => chrome.tabs.create({ url: v.url });
      videoList.appendChild(el);
    });

    if (total > VIDEO_RENDER_LIMIT) {
      const footer = document.createElement("div");
      footer.className = "video-limit-footer";

      const infoText = document.createElement("span");
      const infoTemplate = showingAllVideos
        ? getString("sections.videosShowingAll", "Showing all {{total}} videos.")
        : getString("sections.videosLimitedInfo", "Showing latest {{count}} of {{total}} videos.");
      infoText.textContent = formatString(infoTemplate, {
        count: subset.length,
        total,
      });

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "link-btn";
      toggleBtn.textContent = showingAllVideos
        ? getString("buttons.showLessVideos", "Show less")
        : getString("buttons.showAllVideos", "Show all");
      toggleBtn.onclick = () => {
        showingAllVideos = !showingAllVideos;
        renderVideoList();
      };

      footer.appendChild(infoText);
      footer.appendChild(toggleBtn);
      videoList.appendChild(footer);
    }
  }

  function loadVideos() {
    console.log("[Popup] Loading videos");
    if (!videoList) return;
    videoList.innerHTML = `<div class="empty-state">${getString("sections.loading", "Loading...")}</div>`;
    chrome.runtime.sendMessage({ action: "getLikedVideos" }, (res) => {
      if (!res?.success) {
        const message = friendlyError(res?.error, getString("sections.videosLoadError", "Failed to load"));
        videoList.innerHTML = `<div class="empty-state">${message}</div>`;
        videoCount.textContent = "0";
        notify(message, "error");
        return;
      }
      const vids = Object.values(res.likedVideos);
      videoCount.textContent = String(vids.length);
      allVideos = vids
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp);
      showingAllVideos = false;
      renderVideoList();
    });
    updateFriendsList();
  }

  function formatExportFilename(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `likedby-export-${y}${m}${d}-${h}${min}.json`;
  }

  function downloadJson(filename, jsonText) {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename, saveAs: true }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  }

  function parseIsoDate(value) {
    if (typeof value === "number") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? null : new Date(ts);
  }

  function confirmDialog({ title, message, confirmText, cancelText } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.innerHTML = `
        <h3>${title || getString("modals.confirmTitle", "Confirm")}</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin:4px 0 12px 0;">${message || getString("modals.confirmMessage", "Are you sure?")}</p>
        <div class="modal-buttons">
          <button class="confirm-delete">${confirmText || getString("modals.confirm", "Confirm")}</button>
          <button class="cancel-delete">${cancelText || getString("modals.cancel", "Cancel")}</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };
      modal.querySelector(".cancel-delete").onclick = () => cleanup(false);
      modal.querySelector(".confirm-delete").onclick = () => cleanup(true);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup(false);
      });
    });
  }

  loginBtn.addEventListener("click", () => {
    const u = loginUser.value.trim().toLowerCase();
    loginUser.value = u;
    const p = loginPin.value.trim();
    loginErr.textContent = "";
    if (!u || !/^\d{4}$/.test(p)) {
      notify(getString("warnings.invalidCredentials", "Enter valid username and 4-digit PIN"), "warning");
      return;
    }
    loginBtn.disabled = true;
    console.log("[Popup] Sending login...");
    chrome.runtime.sendMessage(
      { action: "login", username: u, pin: p },
      (res) => {
        loginBtn.disabled = false;
        if (res?.success) {
          chrome.storage.local.set({ lastUsedUsername: u, lastUsedPin: p });
          chrome.storage.local.set({ username: u }, () => {
            usernameText.textContent = u;
            auth.style.display = "none";
            main.style.display = "flex";
            loadVideos();
            notify(getString("notifications.loginSuccess", "Logged in successfully"), "success");
          });
        } else {
          notify(friendlyError(res?.error, getString("errors.LoginFailed", "Login failed, try again!")), "error");
        }
      }
    );
  });

  registerBtn.addEventListener("click", () => {
    const u = regUser.value.trim().toLowerCase();
    regUser.value = u;
    const p = regPin.value.trim();
    regErr.textContent = "";
    if (!u || !/^\d{4}$/.test(p)) {
      notify(getString("warnings.invalidCredentials", "Enter valid username and 4-digit PIN"), "warning");
      return;
    }
    registerBtn.disabled = true;
    console.log("[Popup] Sending register...");
    chrome.runtime.sendMessage(
      { action: "register", username: u, pin: p },
      (res) => {
        registerBtn.disabled = false;
        if (res?.success) {
          chrome.storage.local.set({ lastUsedUsername: u, lastUsedPin: p, username: u }, () => {
            usernameText.textContent = u;
            auth.style.display = "none";
            main.style.display = "flex";
            loadVideos();
            notify(getString("notifications.registerSuccess", "Account created"), "success");
          });
        } else {
          notify(friendlyError(res?.error, getString("errors.RegisterFailed", "Registration failed, try again!")), "error");
        }
      }
    );
  });

  chrome.storage.local.get(
    ["username", "lastUsedUsername", LEGACY_PIN_KEY],
    (res) => {
      if (res.username) {
        usernameText.textContent = res.username;
        auth.style.display = "none";
        main.style.display = "flex";
        loadVideos();
      } else if (res.lastUsedUsername && res[LEGACY_PIN_KEY]) {
        loginUser.value = res.lastUsedUsername;
        loginPin.value = res[LEGACY_PIN_KEY];
      } else {
        auth.style.display = "flex";
      }
    }
  );

  logoutBtn.addEventListener("click", () => {
    chrome.storage.local.remove("username", () => {
      main.style.display = "none";
      auth.style.display = "flex";
      notify(getString("notifications.logoutSuccess", "Logged out"), "success");
    });
  });

  deleteBtn.addEventListener("click", async () => {
    const currentUsername = usernameText.textContent || "";
    const deleteTitle = getString("modals.deleteTitle", "Delete account?");
    const accountLabel = currentUsername
      ? formatString(getString("modals.accountUser", "{{username}}'s"), { username: `@${currentUsername}` })
      : getString("modals.accountSelf", "your");
    const deleteMessageTemplate = getString("modals.deleteMessage", "This will permanently delete {{account}} friends, likes, and account data. This action cannot be undone.");
    const deleteMessage = formatString(deleteMessageTemplate, { account: accountLabel });
    const confirmText = getString("modals.confirm", "Delete");
    const cancelText = getString("modals.cancel", "Cancel");

    const ok = await confirmDialog({
      title: deleteTitle,
      message: deleteMessage,
      confirmText,
      cancelText,
    });
    if (!ok) return;

    deleteBtn.disabled = true;
    chrome.runtime.sendMessage({ action: "deleteAccount" }, (res) => {
      deleteBtn.disabled = false;
      if (res?.success) {
        chrome.storage.local.remove(["username", "lastUsedUsername", LEGACY_PIN_KEY], () => {
          main.style.display = "none";
          auth.style.display = "flex";
          notify(getString("notifications.deleteSuccess", "Account deleted"), "success");
        });
      } else {
        notify(friendlyError(res?.error, getString("errors.DeleteAccountFailed", "Could not delete account. Try again!")), "error");
      }
    });
  });

  addFriendBtn.addEventListener("click", () => {
    const friendUsername = friendUsernameInput.value.trim().toLowerCase();
    friendUsernameInput.value = friendUsername;
    if (!friendUsername) return;
    chrome.runtime.sendMessage({ action: "addFriend", friendUsername }, (res) => {
      if (res?.success) {
        friendUsernameInput.value = "";
        updateFriendsList();
        notify(getString("notifications.friendAdded", "Friend added"), "success");
      } else notify(friendlyError(res?.error, getString("errors.AddFriendFailed", "Could not add friend.")), "error");
    });
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportBtn.disabled = true;
      chrome.runtime.sendMessage({ action: "getLikedVideos" }, (res) => {
        exportBtn.disabled = false;
        if (!res?.success) {
          const message = friendlyError(res?.error, "Failed to export videos.");
          notify(message, "error");
          return;
        }
        const now = new Date();
        const items = Object.values(res.likedVideos || {}).map((v) => {
          const likedAt = v.timestamp ? new Date(v.timestamp).toISOString() : now.toISOString();
          return {
            videoId: v.videoId,
            title: v.title,
            url: v.url,
            likedAt,
          };
        });
        const payload = {
          version: 1,
          exportedAt: now.toISOString(),
          items,
        };
        const jsonText = JSON.stringify(payload, null, 2);
        downloadJson(formatExportFilename(now), jsonText);
        notify("Export ready.", "success");
      });
    });
  }

  if (importBtn && importInput) {
    importBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      importInput.value = "";
      if (!file) return;
      let payload;
      try {
        payload = JSON.parse(await file.text());
      } catch (e) {
        notify("Invalid JSON file.", "error");
        return;
      }

      if (!payload || payload.version !== 1 || !Array.isArray(payload.items)) {
        notify("Invalid import format.", "error");
        return;
      }

      chrome.runtime.sendMessage({ action: "getLikedVideos" }, (res) => {
        if (!res?.success) {
          const message = friendlyError(res?.error, "Failed to load existing videos.");
          notify(message, "error");
          return;
        }

        const existing = res.likedVideos || {};
        const existingIds = new Set(Object.keys(existing));
        const importTime = new Date();
        const importIso = importTime.toISOString();
        let added = 0;
        let already = 0;
        let invalid = 0;
        const toAdd = [];

        payload.items.forEach((item) => {
          const videoId = item?.videoId?.trim?.();
          if (!videoId) {
            invalid += 1;
            return;
          }
          if (existingIds.has(videoId)) {
            already += 1;
            return;
          }

          const likedAt = parseIsoDate(item.likedAt) || importTime;
          toAdd.push({
            videoId,
            title: item.title || "YouTube",
            url: item.url || `https://www.youtube.com/watch?v=${videoId}`,
            likedAt: likedAt.toISOString(),
          });
          existingIds.add(videoId);
          added += 1;
        });

        if (!toAdd.length) {
          notify(
            `Import complete: ${added} added, ${already} already existed, ${invalid} invalid entries skipped.`,
            "info"
          );
          return;
        }

        chrome.runtime.sendMessage(
          { action: "importLikedVideos", items: toAdd },
          (importRes) => {
            if (!importRes?.success) {
              const message = friendlyError(importRes?.error, "Import failed.");
              notify(message, "error");
              return;
            }
            loadVideos();
            notify(
              `Import complete: ${added} added, ${already} already existed, ${invalid} invalid entries skipped.`,
              "success"
            );
          }
        );
      });
    });
  }

  videosHeader.addEventListener("click", () => {
    const expanded = !videosHeader.classList.contains("active");
    setSectionExpanded(videosHeader, videosContent, expanded);
  });
  friendsHeader.addEventListener("click", () => {
    const expanded = !friendsHeader.classList.contains("active");
    setSectionExpanded(friendsHeader, friendsContent, expanded);
  });

  setSectionExpanded(videosHeader, videosContent, false);
  setSectionExpanded(friendsHeader, friendsContent, false);
});
