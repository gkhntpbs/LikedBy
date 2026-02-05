console.log("[BG] Service-worker booting…");

if (typeof XMLHttpRequest === "undefined") {
  self.XMLHttpRequest = class {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.statusText = "";
      this.responseText = "";
      this.response = "";
      this.responseType = "";
      this.timeout = 0;
      this.withCredentials = false;
      this.upload = {};
      this.onreadystatechange = null;
      this.onload = null;
      this.onerror = null;
      this.ontimeout = null;
      this.onabort = null;
      this._method = "";
      this._url = "";
      this._headers = {};
      this._aborted = false;
    }
    open(m, u) {
      this._method = m;
      this._url = u;
      this.readyState = 1;
      this.onreadystatechange && this.onreadystatechange();
    }
    setRequestHeader(n, v) {
      this._headers[n] = v;
    }
    send(body = null) {
      if (this._aborted) return;
      this.readyState = 2;
      this.onreadystatechange && this.onreadystatechange();
      const init = { method: this._method, headers: this._headers };
      if (body && /POST|PUT|PATCH/.test(this._method)) init.body = body;
      fetch(this._url, init)
        .then((r) => {
          if (this._aborted) return;
          this.status = r.status;
          this.statusText = r.statusText;
          this.readyState = 3;
          this.onreadystatechange && this.onreadystatechange();
          return r.text();
        })
        .then((t) => {
          if (this._aborted) return;
          this.responseText = t;
          this.response = this.responseType === "json" ? JSON.parse(t) : t;
          this.readyState = 4;
          this.onreadystatechange && this.onreadystatechange();
          this.onload && this.onload();
        })
        .catch((e) => {
          if (this._aborted) return;
          console.error("XMLHttpRequest error:", e);
          this.readyState = 4;
          this.status = 0;
          this.statusText = "";
          this.onerror && this.onerror();
          this.onreadystatechange && this.onreadystatechange();
        });
    }
    abort() {
      this._aborted = true;
      this.readyState = 4;
      this.status = 0;
      this.statusText = "";
      this.onabort && this.onabort();
    }
    getAllResponseHeaders() {
      return "";
    }
    getResponseHeader() {
      return null;
    }
  };
  self.XMLHttpRequest.UNSENT = 0;
  self.XMLHttpRequest.OPENED = 1;
  self.XMLHttpRequest.HEADERS_RECEIVED = 2;
  self.XMLHttpRequest.LOADING = 3;
  self.XMLHttpRequest.DONE = 4;
}

importScripts("lib/firebase-app-compat.js", "lib/firebase-firestore-compat.js");

let db = null;

async function loadEnvConfig() {
  try {
    const url = chrome.runtime.getURL(".env");
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const kv = {};
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((l) => {
        const i = l.indexOf("=");
        if (i > 0) {
          const k = l.slice(0, i).trim();
          const v = l
            .slice(i + 1)
            .trim()
            .replace(/^"|"$/g, "");
          kv[k] = v;
        }
      });
    const cfg = {
      apiKey: kv.FIREBASE_API_KEY,
      authDomain: kv.FIREBASE_AUTH_DOMAIN,
      projectId: kv.FIREBASE_PROJECT_ID,
      storageBucket: kv.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: kv.FIREBASE_MESSAGING_SENDER_ID,
      appId: kv.FIREBASE_APP_ID,
    };
    if (cfg.apiKey && cfg.projectId && cfg.appId) return cfg;
    return null;
  } catch (e) {
    console.debug("[BG] .env not found/invalid (optional)");
    return null;
  }
}

const initPromise = (async () => {
  try {
    const envCfg = await loadEnvConfig();
    if (!envCfg) {
      throw new Error(
        "Missing Firebase config. Add .env based on .env.example.",
      );
    }
    firebase.initializeApp(envCfg);
    db = firebase.firestore();
    console.log(
      "[BG] Firestore initialized without custom transport overrides",
    );
    console.log(
      `[BG] Firebase initialized with ${envCfg ? ".env" : "fallback"} config`,
    );
  } catch (e) {
    console.error("[BG] Firebase init failed", e);
    throw e;
  }
})();

const getLocal = (k) => new Promise((r) => chrome.storage.local.get(k, r));
const setLocal = (v) => new Promise((r) => chrome.storage.local.set(v, r));

const normalizeError = (err, fallback) => {
  if (!err) return fallback;
  const code = err.code || err.message;
  if (code === "unavailable" || code === "network-request-failed")
    return "NetworkUnavailable";
  if (code === "failed-precondition") return "PersistenceUnavailable";
  if (code === "offline" || /client is offline/i.test(err.message || ""))
    return "NetworkUnavailable";
  if (typeof code === "string" && code.trim()) return code;
  return fallback;
};

const broadcastAction = (action) => {
  try {
    chrome.runtime.sendMessage({ action }, () => {
      const err = chrome.runtime.lastError;
      if (!err) return;
      if (err.message?.includes("Could not establish connection")) {
        console.debug(`[BG] broadcast ${action} skipped: no listeners`);
      } else {
        console.warn(`[BG] broadcast ${action} warning: ${err.message}`);
      }
    });
  } catch (e) {
    console.error(`[BG] broadcast ${action} failed`, e);
  }
};

const isUsernameTaken = async (username) => {
  try {
    const snap = await db.doc(`users/${username}`).get();
    return snap.exists;
  } catch (e) {
    console.error("[BG] isUsernameTaken error:", e);
    return false;
  }
};
const getUserVideos = async (username) => {
  try {
    const snap = await db.collection(`users/${username}/likedVideos`).get();
    return snap.docs.map((d) => ({ videoId: d.id, ...d.data() }));
  } catch (e) {
    console.error("[BG] getUserVideos error:", e);
    return [];
  }
};
const getFriendsLikes = async (friendUsernames, videoId) => {
  const out = [];
  for (const u of friendUsernames) {
    try {
      const s = await db.doc(`users/${u}/likedVideos/${videoId}`).get();
      if (s.exists) out.push({ username: u, ...s.data() });
    } catch (e) {
      console.error(`[BG] getFriendsLikes error for ${u}:`, e);
    }
  }
  return out;
};

const importLikedVideos = async (username, items = []) => {
  const batch = db.batch();
  items.forEach((item) => {
    const videoId = item.videoId;
    if (!videoId) return;
    const createdAt = item.likedAt ? new Date(item.likedAt) : new Date();
    const url = item.url || `https://www.youtube.com/watch?v=${videoId}`;
    const title = item.title || "YouTube";
    const thumbnail =
      item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const userLike = db.doc(`users/${username}/likedVideos/${videoId}`);
    const videoLike = db.doc(`videos/${videoId}/likedBy/${username}`);
    const videoMeta = db.doc(`videos/${videoId}`);

    batch.set(
      userLike,
      {
        url,
        title,
        thumbnail,
        type: item.type || "normal",
        createdAt,
      },
      { merge: true },
    );
    batch.set(videoLike, { liked: true, createdAt }, { merge: true });
    batch.set(
      videoMeta,
      {
        url,
        title,
        thumbnail,
        updatedAt: new Date(),
        likeCount: firebase.firestore.FieldValue.increment(1),
      },
      { merge: true },
    );
  });
  await batch.commit();
  return items.length;
};

const validPin = (pin) => /^\d{4}$/.test(pin);

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const hashPin = async (pin, saltBytes) => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
};

chrome.runtime.onMessage.addListener((req, sender, sendResp) => {
  (async () => {
    if (!db) {
      try {
        await initPromise;
      } catch (e) {
        console.error("[BG] initPromise failed", e);
        return sendResp({ success: false, error: "ServiceNotReady" });
      }
    }

    const { action } = req;

    if (action === "register") {
      (async () => {
        const username = (req.username || "").toLowerCase();
        const { pin } = req;
        if (!username || !pin)
          return sendResp({ success: false, error: "MissingFields" });
        if (!validPin(pin))
          return sendResp({ success: false, error: "InvalidPIN" });

        try {
          const userRef = db.doc(`users/${username}`);
          const snap = await userRef.get();
          if (snap.exists)
            return sendResp({ success: false, error: "UsernameTaken" });

          const salt = crypto.getRandomValues(new Uint8Array(16));
          const pinHash = await hashPin(pin, salt);
          const now = new Date();
          await userRef.set({
            pinHash,
            pinSalt: bytesToBase64(salt),
            createdAt: now,
            updatedAt: now,
          });
          await setLocal({ username });
          console.log(`[BG] Registered: ${username}`);
          sendResp({ success: true });
        } catch (e) {
          console.error("[BG] register failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "RegisterFailed"),
          });
        }
      })();
      return;
    }

    if (action === "login") {
      (async () => {
        const username = (req.username || "").toLowerCase();
        const { pin } = req;
        if (!username || !pin)
          return sendResp({ success: false, error: "MissingFields" });
        try {
          const userRef = db.doc(`users/${username}`);
          const snap = await userRef.get();
          if (!snap.exists)
            return sendResp({ success: false, error: "UserNotFound" });
          const data = snap.data() || {};

          if (!validPin(pin)) {
            return sendResp({ success: false, error: "InvalidPIN" });
          }

          if (data.pinHash && data.pinSalt) {
            const salt = base64ToBytes(data.pinSalt);
            const computed = await hashPin(pin, salt);
            if (computed !== data.pinHash)
              return sendResp({ success: false, error: "WrongPIN" });
          } else if (data.pin) {
            if (data.pin !== pin)
              return sendResp({ success: false, error: "WrongPIN" });
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const pinHash = await hashPin(pin, salt);
            await userRef.set(
              {
                pinHash,
                pinSalt: bytesToBase64(salt),
                updatedAt: new Date(),
                pin: firebase.firestore.FieldValue.delete(),
                password: firebase.firestore.FieldValue.delete(),
              },
              { merge: true },
            );
          } else {
            return sendResp({ success: false, error: "AuthMigrationRequired" });
          }

          await setLocal({ username });
          console.log(`[BG] Login OK: ${username}`);
          sendResp({ success: true });
        } catch (e) {
          console.error("[BG] login failed", e);
          sendResp({ success: false, error: normalizeError(e, "LoginFailed") });
        }
      })();
      return;
    }

    if (action === "setUsername") {
      const username = (req.username || "").toLowerCase();
      if (!username)
        return sendResp({ success: false, error: "MissingUsername" });

      isUsernameTaken(username)
        .then((taken) => {
          if (taken)
            return sendResp({ success: false, error: "UsernameTaken" });
          setLocal({ username }).then(() => {
            db.doc(`users/${username}`)
              .set({ createdAt: new Date() })
              .then(() => sendResp({ success: true }))
              .catch((e) =>
                sendResp({
                  success: false,
                  error: normalizeError(e, "SetUsernameFailed"),
                }),
              );
          });
        })
        .catch((e) =>
          sendResp({
            success: false,
            error: normalizeError(e, "SetUsernameError"),
          }),
        );
      return;
    }

    if (action === "verifyUsername") {
      const username = (req.username || "").toLowerCase();
      if (!username)
        return sendResp({ success: false, error: "MissingUsername" });
      isUsernameTaken(username)
        .then((exists) => {
          if (exists) sendResp({ success: true });
          else sendResp({ success: false, error: "UserNotFound" });
        })
        .catch((e) =>
          sendResp({
            success: false,
            error: normalizeError(e, "VerifyUsernameFailed"),
          }),
        );
      return;
    }

    if (action === "trackLike") {
      const { videoId, url, title, thumbnail } = req;
      if (!videoId)
        return sendResp({ success: false, error: "MissingVideoId" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        const userLike = db.doc(`users/${username}/likedVideos/${videoId}`);
        const videoLike = db.doc(`videos/${videoId}/likedBy/${username}`);
        const videoMeta = db.doc(`videos/${videoId}`);
        try {
          await db.runTransaction(async (tx) => {
            const videoSnap = await tx.get(videoMeta);
            await tx.set(userLike, {
              url,
              title,
              thumbnail,
              type: req.type || "normal",
              createdAt: new Date(),
            });
            await tx.set(videoLike, { liked: true, createdAt: new Date() });
            if (!videoSnap.exists) {
              await tx.set(videoMeta, {
                url,
                title,
                thumbnail,
                createdAt: new Date(),
                likeCount: 1,
              });
            } else {
              await tx.update(videoMeta, {
                url,
                title,
                thumbnail,
                likeCount: firebase.firestore.FieldValue.increment(1),
              });
            }
          });
          sendResp({ success: true });
          broadcastAction("likeAdded");
        } catch (e) {
          console.error("[BG] trackLike txn failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "LikeTransactionFailed"),
          });
        }
      });
      return;
    }

    if (action === "trackUnlike") {
      const { videoId } = req;
      if (!videoId)
        return sendResp({ success: false, error: "MissingVideoId" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        const userLike = db.doc(`users/${username}/likedVideos/${videoId}`);
        const videoLike = db.doc(`videos/${videoId}/likedBy/${username}`);
        const videoMeta = db.doc(`videos/${videoId}`);
        try {
          await db.runTransaction(async (tx) => {
            const videoSnap = await tx.get(videoMeta);
            if (videoSnap.exists) {
              tx.update(videoMeta, {
                likeCount: firebase.firestore.FieldValue.increment(-1),
              });
            }
            tx.delete(userLike);
            tx.delete(videoLike);
          });
          sendResp({ success: true });
          broadcastAction("likeRemoved");
        } catch (e) {
          console.error("[BG] trackUnlike txn failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "UnlikeTransactionFailed"),
          });
        }
      });
      return;
    }

    if (action === "addFriend") {
      const friendUsername = (req.friendUsername || "").toLowerCase();
      if (!friendUsername)
        return sendResp({ success: false, error: "MissingFriendUsername" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const friendRef = db.doc(`users/${friendUsername}`);
          const friendSnap = await friendRef.get();
          if (!friendSnap.exists)
            return sendResp({ success: false, error: "FriendNotFound" });
          await db
            .doc(`users/${username}/friends/${friendUsername}`)
            .set({ addedAt: new Date() });
          sendResp({ success: true });
        } catch (e) {
          console.error("[BG] addFriend failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "AddFriendFailed"),
          });
        }
      });
      return;
    }

    if (action === "getFriendsLikes") {
      const { videoId } = req;
      if (!videoId)
        return sendResp({ success: false, error: "MissingVideoId" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const friendsSnap = await db
            .collection(`users/${username}/friends`)
            .get();
          const friendUsernames = friendsSnap.docs.map((d) => d.id);
          if (!friendUsernames.length)
            return sendResp({ success: true, likes: [] });
          const likes = await getFriendsLikes(friendUsernames, videoId);
          sendResp({ success: true, likes });
        } catch (e) {
          console.error("[BG] getFriendsLikes failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "GetFriendsLikesFailed"),
          });
        }
      });
      return;
    }

    if (action === "getUserLikes") {
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const videos = await getUserVideos(username);
          sendResp({ success: true, videos });
        } catch (e) {
          console.error("[BG] getUserLikes failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "GetUserLikesFailed"),
          });
        }
      });
      return;
    }

    if (action === "getFriends") {
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const snap = await db.collection(`users/${username}/friends`).get();
          const friends = snap.docs.map((d) => d.id);
          sendResp({ success: true, friends });
        } catch (e) {
          console.error("[BG] getFriends failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "GetFriendsFailed"),
          });
        }
      });
      return true;
    }

    if (action === "removeFriend") {
      const friendUsername = (req.friendUsername || "").toLowerCase();
      if (!friendUsername)
        return sendResp({ success: false, error: "MissingFriendUsername" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          await db.doc(`users/${username}/friends/${friendUsername}`).delete();
          sendResp({ success: true });
        } catch (e) {
          console.error("[BG] removeFriend failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "RemoveFriendFailed"),
          });
        }
      });
      return true;
    }

    if (action === "getLikedVideos") {
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const snap = await db
            .collection(`users/${username}/likedVideos`)
            .get();
          const likedVideos = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            likedVideos[d.id] = {
              videoId: d.id,
              url: data.url,
              title: data.title,
              thumbnail: data.thumbnail,
              timestamp: data.createdAt?.toMillis
                ? data.createdAt.toMillis()
                : Date.now(),
            };
          });
          sendResp({ success: true, likedVideos });
        } catch (e) {
          console.error("[BG] getLikedVideos failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "GetLikedVideosFailed"),
          });
        }
      });
      return true;
    }

    if (action === "importLikedVideos") {
      const { items } = req;
      if (!Array.isArray(items))
        return sendResp({ success: false, error: "InvalidPayload" });
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const added = await importLikedVideos(username, items);
          sendResp({ success: true, added });
        } catch (e) {
          console.error("[BG] importLikedVideos failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "ImportFailed"),
          });
        }
      });
      return true;
    }

    if (action === "deleteAccount") {
      getLocal(["username"]).then(async ({ username }) => {
        if (!username)
          return sendResp({ success: false, error: "UsernameNotSet" });
        try {
          const batch = db.batch();
          const likedSnap = await db
            .collection(`users/${username}/likedVideos`)
            .get();
          likedSnap.docs.forEach((doc) => {
            batch.delete(doc.ref);
            batch.delete(db.doc(`videos/${doc.id}/likedBy/${username}`));
          });
          const friendsSnap = await db
            .collection(`users/${username}/friends`)
            .get();
          friendsSnap.docs.forEach((doc) => batch.delete(doc.ref));
          batch.delete(db.doc(`users/${username}`));
          await batch.commit();
          sendResp({ success: true });
        } catch (e) {
          console.error("[BG] deleteAccount failed", e);
          sendResp({
            success: false,
            error: normalizeError(e, "DeleteAccountFailed"),
          });
        }
      });
      return;
    }

    console.log("[BG] Unknown action:", action);
    sendResp({ success: false, error: "UnknownAction" });
  })();
  return true;
});
