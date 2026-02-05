(() => {
  const state = {
    lastVideoId: null,
    lastLikeState: "unknown",
    indicatorReady: false,
    friendsLikes: [],
    likeButton: null,
    likeObserver: null,
    buttonHeartbeat: null,
    pendingButtonCheck: null,
    friendsRefreshTimer: null,
  };

  const notifyLikeTransition = ({ prev, next, action, success }) => {
    if (!window.LB.UI || !LB.UI.showToast) return;
    if (!success) {
      if (action === "trackLike") {
        LB.UI.showToast("Video beğenilenlere kaydedilemedi", {
          variant: "error",
        });
      } else if (action === "trackUnlike") {
        LB.UI.showToast("Beğeniyi kaldırma başarısız", {
          variant: "error",
        });
      }
      return;
    }

    if (next === "liked") {
      LB.UI.showToast("Video beğenilenler listesine eklendi", {
        variant: "success",
      });
      return;
    }
    if (prev === "liked" && next === "unliked") {
      LB.UI.showToast("Video beğenilenlerden çıkarıldı", {
        variant: "info",
      });
    }
  };

  const likeChanged = LB.debounce(() => {
    const type = LB.getVideoType();
    const videoId = LB.getCurrentVideoId();
    if (!videoId) {
      LB.warn("likeChanged: videoId yok");
      return;
    }

    const btn = state.likeButton || LB.getLikeButton();

    if (type === "shorts" && !btn) {
      LB.log("likeChanged: Shorts like butonu bekleniyor…");
      setTimeout(likeChanged, 500);
      return;
    }

    if (!btn) {
      LB.warn("likeChanged: Like butonu bulunamadı");
      return;
    }

    const nextState = LB.readLikeState(btn);
    LB.log("likeChanged:", { type, videoId, state: nextState });

    if (nextState === "unknown") {
      LB.log("likeChanged: state unknown, no-op");
      return;
    }

    if (!chrome?.storage?.local) {
      LB.warn("likeChanged: chrome.storage yok");
      return;
    }
    chrome.storage.local.get("username", (res) => {
      if (!res.username) {
        LB.log("likeChanged: extension login yok → no-op");
        return;
      }

      const prevState = state.lastLikeState || "unknown";
      if (prevState === nextState) {
        LB.log("likeChanged: durum değişmedi");
        return;
      }
      state.lastLikeState = nextState;

      let action = null;
      if (nextState === "liked") action = "trackLike";
      else if (prevState === "liked" && nextState === "unliked")
        action = "trackUnlike";

      if (!action) {
        LB.log("likeChanged: geçişte işlem yok", { prevState, nextState });
        return;
      }

      let { title, thumbnail } = LB.getTitleAndThumb(videoId);
      const videoUrl = location.href;

      const payload = { videoId, url: videoUrl, title, thumbnail, type };

      if (action === "trackLike") {
        LB.safeSendMessage({ action: "trackLike", ...payload }, (res) => {
          notifyLikeTransition({
            prev: prevState,
            next: nextState,
            action,
            success: !!res?.success,
          });
        });
      } else {
        LB.safeSendMessage({ action: "trackUnlike", videoId }, (res) => {
          notifyLikeTransition({
            prev: prevState,
            next: nextState,
            action,
            success: !!res?.success,
          });
        });
      }
    });
  }, 150);

  const fetchFriendsLikes = (force = false) => {
    const videoId = LB.getCurrentVideoId();
    if (!videoId) {
      LB.warn("fetchFriendsLikes: videoId yok");
      return;
    }

    if (
      !force &&
      videoId === state.lastVideoId &&
      state.friendsLikes.length &&
      state.indicatorReady
    ) {
      LB.log("fetchFriendsLikes: aynı video için tekrar yüklenmeyecek");
      return;
    }

    LB.safeSendMessage({ action: "getFriendsLikes", videoId }, (res) => {
      LB.log("getFriendsLikes cevap:", res);
      if (res && res.success && Array.isArray(res.likes)) {
        state.friendsLikes = res.likes;
        state.indicatorReady = !!res.likes.length;
        if (window.LB.UI && LB.UI.updateFriendsOverlay)
          LB.UI.updateFriendsOverlay(res.likes);
      } else {
        state.friendsLikes = [];
        state.indicatorReady = false;
        if (window.LB.UI && LB.UI.updateFriendsOverlay)
          LB.UI.updateFriendsOverlay([]);
      }
    });
  };

  const scheduleFriendsRefresh = (delay = 600, { force = false } = {}) => {
    clearTimeout(state.friendsRefreshTimer);
    state.friendsRefreshTimer = setTimeout(() => {
      fetchFriendsLikes(force);
    }, delay);
  };

  const handleLikeButtonInteraction = () => {
    likeChanged();
    setTimeout(likeChanged, 250);
    scheduleFriendsRefresh(350, { force: true });
  };

  const detachLikeButtonWatcher = () => {
    if (state.likeObserver) {
      state.likeObserver.disconnect();
      state.likeObserver = null;
    }
    if (state.likeButton) {
      state.likeButton.removeEventListener("click", handleLikeButtonInteraction);
      state.likeButton.removeEventListener(
        "keyup",
        handleLikeButtonInteraction
      );
      state.likeButton = null;
    }
    if (state.buttonHeartbeat) {
      clearInterval(state.buttonHeartbeat);
      state.buttonHeartbeat = null;
    }
    if (state.pendingButtonCheck) {
      clearTimeout(state.pendingButtonCheck);
      state.pendingButtonCheck = null;
    }
    if (state.friendsRefreshTimer) {
      clearTimeout(state.friendsRefreshTimer);
      state.friendsRefreshTimer = null;
    }
  };

  const attachLikeButton = (btn) => {
    if (!btn) return;
    if (state.likeButton === btn) return;

    detachLikeButtonWatcher();
    state.likeButton = btn;
    state.lastLikeState = "unknown";

    btn.addEventListener("click", handleLikeButtonInteraction, {
      passive: true,
    });
    btn.addEventListener("keyup", handleLikeButtonInteraction, {
      passive: true,
    });

    state.likeObserver = new MutationObserver(handleLikeButtonInteraction);
    state.likeObserver.observe(btn, {
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });

    state.buttonHeartbeat = setInterval(() => {
      if (!state.likeButton || !document.contains(state.likeButton)) {
        LB.log("[likeWatcher] buton yeniden aranacak");
        detachLikeButtonWatcher();
        ensureLikeButton();
      }
    }, 2000);

    LB.log("[likeWatcher] buton izlendi");
    likeChanged();
    scheduleFriendsRefresh(500, { force: true });
  };

  const ensureLikeButton = (attempt = 0) => {
    const hasVideoId = !!LB.getCurrentVideoId();
    const path = location.pathname || "";
    const isWatchPage = path.startsWith("/watch");
    const isShorts = path.startsWith("/shorts/");

    if (!hasVideoId && !isWatchPage && !isShorts) {
      LB.log("[likeWatcher] video context yok → arama yapılmayacak");
      return;
    }

    const btn = LB.getLikeButton();
    if (btn) {
      attachLikeButton(btn);
      return;
    }

    if (attempt > 20) {
      LB.log("[likeWatcher] like butonu bulunamadı, durduruluyor");
      return;
    }

    if (state.pendingButtonCheck) {
      clearTimeout(state.pendingButtonCheck);
    }
    state.pendingButtonCheck = setTimeout(() => ensureLikeButton(attempt + 1), 250);
  };

  const onVideoChange = () => {
    const vid = LB.getCurrentVideoId();
    const typ = LB.getVideoType();
    LB.log("onVideoChange →", { href: location.href, vid, typ });

    if (!vid) {
      if (window.LB.UI && LB.UI.updateFriendsOverlay)
        LB.UI.updateFriendsOverlay([]);
      return;
    }
    if (vid === state.lastVideoId) {
      return;
    }

    state.lastVideoId = vid;
    state.lastLikeState = "unknown";
    state.friendsLikes = [];
    state.indicatorReady = false;

    if (window.LB.UI && LB.UI.updateFriendsOverlay)
      LB.UI.updateFriendsOverlay([]);
    detachLikeButtonWatcher();
    ensureLikeButton();
    scheduleFriendsRefresh(800, { force: true });
  };

  const triggerVideoChange = LB.debounce(onVideoChange, 120);

  const init = () => {
    LB.log("init start");
    const initial = LB.getCurrentVideoId();
    LB.log("init videoId:", initial, "type:", LB.getVideoType());

    if (window.LB.UI && LB.UI.updateFriendsOverlay)
      LB.UI.updateFriendsOverlay([]);

    if (initial) {
      state.lastVideoId = initial;
      scheduleFriendsRefresh(900, { force: true });
    } else {
      LB.log("init: videoId yok, URL watcher bekleniyor");
    }

    ensureLikeButton();
    LB.watchURLChanges(triggerVideoChange);
  };

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.action) return;
    if (msg.action === "likeAdded" || msg.action === "likeRemoved") {
      LB.log("runtime mesaj:", msg.action);
      scheduleFriendsRefresh(400, { force: true });
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
