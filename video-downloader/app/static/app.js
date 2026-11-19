(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("url-form");
  const input = $("url");
  const fetchBtn = $("fetch");
  const pasteBtn = $("paste");
  const errorBox = $("error");
  const result = $("result");
  const optionsBox = $("options");
  const downloadBtn = $("download");
  const progress = $("progress");
  const bar = progress.querySelector(".bar");
  const barFill = $("bar-fill");
  const progressStatus = $("progress-status");
  const progressDetail = $("progress-detail");
  const done = $("done");
  const saveLink = $("save-link");

  const PLATFORMS = {
    youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    facebook: ["facebook.com", "fb.watch", "fb.com"],
    instagram: ["instagram.com", "instagr.am"],
    tiktok: ["tiktok.com"],
  };

  let current = null; // info for the currently shown video
  let pollTimer = null;

  // ---------------------------------------------------------------- helpers

  function detectPlatform(value) {
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      const host = url.hostname.toLowerCase();
      for (const [key, domains] of Object.entries(PLATFORMS)) {
        if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return key;
      }
    } catch (_) { /* not a URL yet */ }
    return null;
  }

  function formatBytes(n) {
    if (!n && n !== 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function formatDuration(sec) {
    if (!sec) return "";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  function formatEta(sec) {
    if (sec == null) return "";
    if (sec < 60) return `${sec}s left`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s left`;
  }

  function setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) {
      const detail = data && data.detail;
      const msg = typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ")
        : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function highlightPlatform(key) {
    document.querySelectorAll(".platforms li").forEach((li) => {
      li.classList.toggle("active", li.dataset.platform === key);
    });
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function resetDownloadUi() {
    stopPolling();
    progress.hidden = true;
    done.hidden = true;
    bar.classList.remove("indeterminate");
    barFill.style.width = "0";
    setLoading(downloadBtn, false);
    downloadBtn.hidden = false;
  }

  // ---------------------------------------------------------------- render

  function renderInfo(info) {
    current = info;
    resetDownloadUi();

    const thumb = $("thumb");
    if (info.thumbnail) {
      thumb.hidden = false;
      thumb.src = info.thumbnail;
      thumb.onerror = () => { thumb.hidden = true; };
    } else {
      thumb.hidden = true;
      thumb.removeAttribute("src");
    }
    $("duration").textContent = formatDuration(info.duration);
    $("platform").textContent = info.platform_label;
    $("title").textContent = info.title;
    $("title").title = info.title;
    $("uploader").textContent = info.uploader || "";

    optionsBox.replaceChildren();
    info.options.forEach((opt, i) => {
      const label = document.createElement("label");
      label.className = "option";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "quality";
      radio.value = opt.id;
      radio.checked = i === 0;
      const title = document.createElement("span");
      title.className = "o-label";
      title.textContent = opt.label;
      const sub = document.createElement("span");
      sub.className = "o-sub";
      const size = opt.size ? `~${formatBytes(opt.size)}` : "";
      sub.textContent = [opt.ext.toUpperCase(), size].filter(Boolean).join(" · ");
      label.append(radio, title, sub);
      optionsBox.append(label);
    });

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderJob(job) {
    progress.hidden = false;
    const labels = {
      queued: "Waiting in queue…",
      downloading: "Downloading…",
      processing: "Converting / merging…",
      finished: "Done",
      error: "Failed",
    };
    progressStatus.textContent = labels[job.status] || job.status;

    const indeterminate = job.status === "queued" || job.status === "processing"
      || (job.status === "downloading" && !job.progress);
    bar.classList.toggle("indeterminate", indeterminate);
    if (!indeterminate) barFill.style.width = `${job.progress}%`;

    const parts = [];
    if (job.status === "downloading" && job.progress) parts.push(`${job.progress.toFixed(0)}%`);
    if (job.speed) parts.push(`${formatBytes(job.speed)}/s`);
    if (job.eta != null && job.status === "downloading") parts.push(formatEta(job.eta));
    progressDetail.textContent = parts.join(" · ");
  }

  function finishJob(job) {
    progress.hidden = true;
    downloadBtn.hidden = true;
    done.hidden = false;
    $("done-name").textContent = job.filename;
    $("done-size").textContent = job.filesize ? `(${formatBytes(job.filesize)})` : "";
    saveLink.href = `/api/jobs/${job.id}/file`;
    saveLink.setAttribute("download", job.filename || "");
    // Kick off the browser download automatically.
    saveLink.click();
  }

  // ---------------------------------------------------------------- actions

  async function getInfo(url) {
    showError("");
    result.hidden = true;
    setLoading(fetchBtn, true);
    try {
      const info = await api("/api/info", { method: "POST", body: JSON.stringify({ url }) });
      renderInfo(info);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(fetchBtn, false);
    }
  }

  async function poll(jobId) {
    try {
      const job = await api(`/api/jobs/${jobId}`);
      if (job.status === "finished") {
        finishJob(job);
        return;
      }
      if (job.status === "error") {
        resetDownloadUi();
        showError(job.error || "Download failed.");
        return;
      }
      renderJob(job);
      pollTimer = setTimeout(() => poll(jobId), 800);
    } catch (err) {
      resetDownloadUi();
      showError(err.message);
    }
  }

  async function startDownload() {
    if (!current) return;
    const selected = optionsBox.querySelector("input[name=quality]:checked");
    const quality = selected ? selected.value : "best";
    showError("");
    resetDownloadUi();
    setLoading(downloadBtn, true);
    try {
      const job = await api("/api/download", {
        method: "POST",
        body: JSON.stringify({ url: current.url, quality }),
      });
      renderJob(job);
      poll(job.id);
    } catch (err) {
      resetDownloadUi();
      showError(err.message);
    }
  }

  // ---------------------------------------------------------------- events

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!detectPlatform(url)) {
      showError("Unsupported link. Paste a YouTube, Facebook, Instagram or TikTok video/reel URL.");
      return;
    }
    getInfo(url);
  });

  input.addEventListener("input", () => highlightPlatform(detectPlatform(input.value.trim())));

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text.trim();
        highlightPlatform(detectPlatform(input.value));
        if (detectPlatform(input.value)) form.requestSubmit();
      }
    } catch (_) {
      input.focus();
      showError("Clipboard access was blocked — paste the link with Ctrl/⌘+V instead.");
    }
  });

  downloadBtn.addEventListener("click", startDownload);

  // Support ?url=... deep links (e.g. from a share target or bookmarklet).
  const shared = new URLSearchParams(location.search).get("url");
  if (shared) {
    input.value = shared;
    highlightPlatform(detectPlatform(shared));
    if (detectPlatform(shared)) getInfo(shared);
  }
})();
