/* =========================================================
   PLEASE NOTE Sir: app shell + client-side router
   ---------------------------------------------------------
   - The header, footer, cursor and progress bar stay on screen.
   - Clicking an internal link fetches that page once, swaps only
     <main>, updates the URL and title, and re-runs that page's
     behaviour. Visited pages come from a memory cache, and links
     are prefetched on hover so even the first visit feels instant.
   - Every page is still the real HTML file, so direct links, refresh,
     search engines and "open in new tab" all keep working.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- Settings ---------- */
  const CONFIG = {
    contactEndpoint: "",     // Formspree / API for the home contact form
    bootcampEndpoint: "",    // Formspree / API for the bootcamp form
    email: "contact@eduprime.ng",
    commission: 0.10,        // 10% per child per term (affiliate calculator)
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* Site root, out from where this script lives (…/js/app.js) */
  const SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;
  const ROOT_PATH = new URL("../", SCRIPT_SRC).pathname;
  const normPath = (p) => p.replace(/index\.html?$/i, "");

  /* =========================================================
     Page lifecycle helper: everything a page starts is registered
     here, so leaving the page cleans it up completely.
     ========================================================= */
  function makeCtx() {
    const ac = new AbortController();
    const cleanups = [];
    return {
      signal: ac.signal,
      listen(target, type, fn, opts = {}) { target.addEventListener(type, fn, { ...opts, signal: ac.signal }); },
      observe(observer) { cleanups.push(() => observer.disconnect()); return observer; },
      timeout(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); },
      onDestroy(fn) { cleanups.push(fn); },
      destroy() { ac.abort(); cleanups.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } }); },
    };
  }

  /* Make relative URLs absolute, so they survive the address bar changing */
  const URL_ATTRS = ["href", "src", "data-src", "data-captions", "data-full"];
  function absolutize(root, base) {
    $$("[href],[src],[data-src],[data-captions],[data-full]", root).forEach((el) => {
      if (el.matches(".skip-link") || el.tagName.toLowerCase() === "use") return;
      URL_ATTRS.forEach((attr) => {
        const v = el.getAttribute(attr);
        if (!v || v === "#" || /^(mailto:|tel:|data:|javascript:)/i.test(v)) return;
        try { el.setAttribute(attr, new URL(v, base).href); } catch { /* ignore */ }
      });
    });
  }

  /* =========================================================
     SHELL (lives for the whole visit)
     ========================================================= */
  const toastEl = document.createElement("div");
  toastEl.className = "toast"; toastEl.id = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
  const announcer = document.createElement("div");
  announcer.className = "sr-only"; announcer.id = "route-announcer"; announcer.setAttribute("aria-live", "polite");
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3600);
  }

  const header = $(".site-header");
  const navToggle = $(".nav-toggle");
  const nav = $("#primary-nav");
  const dd = $(".dropdown");
  const ddBtn = $(".dropdown-toggle", dd);
  const ddMenu = $(".dropdown-menu", dd);
  const setMenu = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  };
  const setDropdown = (open) => { ddBtn.setAttribute("aria-expanded", String(open)); ddMenu.hidden = !open; };
  const closeMenus = () => { setMenu(false); setDropdown(false); };

  function initShell() {
    document.body.append(toastEl, announcer);
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    // Header menu + dropdown
    navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
    $$(".nav-links a, .nav-actions .btn", header).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    ddBtn.addEventListener("click", () => setDropdown(ddMenu.hidden));
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) setDropdown(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

    // Scroll progress bar + header glass / hide on scroll down
    const bar = $("#scroll-bar");
    let lastY = window.scrollY, ticking = false;
    const frame = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      header.classList.toggle("is-scrolled", y > 8);
      const menuOpen = nav.classList.contains("is-open") || !ddMenu.hidden;
      if (y > 240 && y > lastY + 4 && !menuOpen) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y <= 240 || menuOpen) header.classList.remove("is-hidden");
      lastY = y;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); }
    }, { passive: true });
    window.addEventListener("resize", frame);
    frame();

    // Footer newsletter (all pages)
    const newsletter = $("#newsletter");
    if (newsletter) {
      newsletter.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("input", newsletter);
        if (!emailOk(input.value)) { toast("Enter a valid email address."); input.focus(); return; }
        // TODO: send input.value to our newsletter provider (Mailchimp, Brevo, etc.)
        newsletter.reset();
        toast("Thanks for subscribing.");
      });
    }

    // Any subscribe form inside a page (pages are swapped in and out, so listen on the document)
document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-newsletter]");
  if (!form) return;
  e.preventDefault();
  const input = $("input[type=email]", form);
  if (!emailOk(input.value)) { toast("Enter a valid email address."); input.focus(); return; }
  // TODO: send input.value to our newsletter provider
  form.reset();
  toast("Thanks for subscribing.");
});

    // Magnetic buttons (delegated, so swapped pages work automatically)
    if (finePointer && !reduceMotion) {
      let mag = null;
      const release = (el) => {
        el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1), background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      };
      document.addEventListener("mousemove", (e) => {
        const el = e.target.closest ? e.target.closest("[data-magnetic]") : null;
        if (el !== mag) { if (mag) release(mag); mag = el; }
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.28}px, ${(e.clientY - (r.top + r.height / 2)) * 0.28}px)`;
      });
      html.addEventListener("mouseleave", () => { if (mag) { release(mag); mag = null; } });
    }

    // Custom cursor (mouse only)
    if (finePointer && !reduceMotion) {
      const dot = document.createElement("div");
      const ring = document.createElement("div");
      const ringLabel = document.createElement("span");
      dot.className = "cursor-dot";
      ring.className = "cursor-ring";
      ring.appendChild(ringLabel);
      document.body.append(ring, dot);

      let mx = -100, my = -100, rx = -100, ry = -100, started = false;
      document.addEventListener("mousemove", (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
        if (!started) { started = true; rx = mx; ry = my; html.classList.add("cursor-on"); }
      });
      html.addEventListener("mouseleave", () => html.classList.remove("cursor-on"));
      html.addEventListener("mouseenter", () => started && html.classList.add("cursor-on"));
      (function loop() {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(loop);
      })();

      document.addEventListener("mouseover", (e) => {
        const t = e.target;
        if (!t.closest) return;
        const isText = t.closest("input, textarea, select");
        const labelEl = t.closest("[data-cursor]");
        const isLink = t.closest("a, button, summary, label, [role='button']");
        ring.classList.toggle("is-text", Boolean(isText));
        ring.classList.toggle("is-label", !isText && Boolean(labelEl));
        ring.classList.toggle("is-link", !isText && !labelEl && Boolean(isLink));
        ringLabel.textContent = labelEl && !isText ? labelEl.dataset.cursor : "";
        const onDark = Boolean(t.closest(".section-dark, .story, .finale, .site-footer, .cta-band"));
        ring.classList.toggle("on-dark", onDark && !labelEl);
        dot.style.background = onDark ? "#fff" : "";
      });
      document.addEventListener("mousedown", () => ring.classList.add("is-down"));
      document.addEventListener("mouseup", () => ring.classList.remove("is-down"));
    }

    // Header and footer links must keep working after the address changes
    absolutize(header, location.href);
    const footer = $(".site-footer");
    if (footer) absolutize(footer, location.href);
  }

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  function validateField(input) {
    const field = input.closest(".field");
    const msg = $(".error", field);
    let error = "";
    if (!input.value.trim()) error = "This field is required.";
    else if (input.type === "email" && !emailOk(input.value)) error = "Enter a valid email address, like name@example.com.";
    field.classList.toggle("has-error", Boolean(error));
    input.setAttribute("aria-invalid", String(Boolean(error)));
    msg.textContent = error;
    return !error;
  }

  /* =========================================================
     COMMON PAGE BEHAVIOUR (runs on every page)
     ========================================================= */
  function initCommon(root, ctx) {
    // Broken images: hide the icon, keep the gradient behind
    $$("img", root).forEach((img) => {
      const hide = () => img.classList.add("is-missing");
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) hide();
      ctx.listen(img, "error", hide);
    });

    // Reveal on scroll
    const reveal = ctx.observe(new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--d", n++ * 90 + "ms");
        entry.target.classList.add("is-in");
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }));
    $$("[data-reveal]", root).forEach((el) => reveal.observe(el));

    // Accordion (one open at a time)
    const items = $$(".acc-item", root);
    items.forEach((item) => {
      const btn = $(".acc-btn", item);
      ctx.listen(btn, "click", () => {
        const willOpen = !item.classList.contains("is-open");
        items.forEach((o) => { o.classList.remove("is-open"); $(".acc-btn", o).setAttribute("aria-expanded", "false"); });
        if (willOpen) { item.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });

    // Video: thumbnail first, player loads on click
    $$(".video-facade", root).forEach((btn) => {
      ctx.listen(btn, "click", () => {
        const yt = (btn.dataset.youtube || "").trim();
        const src = (btn.dataset.src || "").trim();
        const title = btn.dataset.title || "Video";
        let el;
        if (yt) {
          el = document.createElement("iframe");
          el.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0`;
          el.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
          el.allowFullscreen = true;
          el.title = title;
        } else if (src) {
          el = document.createElement("video");
          el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true;
          el.setAttribute("aria-label", title);
          if (btn.dataset.captions) {
            const track = document.createElement("track");
            track.kind = "captions"; track.src = btn.dataset.captions; track.label = "English"; track.srclang = "en"; track.default = true;
            el.appendChild(track);
          }
        } else { return; }   // no video set yet
        el.className = "video-frame";
        btn.replaceWith(el);
        if (el.focus) el.focus();
      });
    });

    // Photo strip arrows
    $$("[data-gallery]", root).forEach((wrap) => {
      const strip = $(".strip", wrap);
      const step = () => strip.clientWidth * 0.8;
      const prev = $(".prev", wrap), next = $(".next", wrap);
      if (prev) ctx.listen(prev, "click", () => strip.scrollBy({ left: -step(), behavior: "smooth" }));
      if (next) ctx.listen(next, "click", () => strip.scrollBy({ left: step(), behavior: "smooth" }));
    });

    // Lightbox
    const photos = $$("[data-gallery] .strip-item", root);
    if (photos.length && typeof HTMLDialogElement !== "undefined") {
      const dlg = document.createElement("dialog");
      dlg.className = "lightbox";
      dlg.setAttribute("aria-label", "Photo viewer");
      dlg.innerHTML = `
        <figure><img alt="" /><figcaption></figcaption></figure>
        <button class="lb-btn lb-close" type="button" aria-label="Close">&times;</button>
        <button class="lb-btn lb-prev" type="button" aria-label="Previous photo">&lsaquo;</button>
        <button class="lb-btn lb-next" type="button" aria-label="Next photo">&rsaquo;</button>`;
      document.body.appendChild(dlg);
      ctx.onDestroy(() => { if (dlg.open) dlg.close(); dlg.remove(); });

      const img = $("img", dlg), cap = $("figcaption", dlg);
      let index = 0;
      const show = (i) => {
        index = (i + photos.length) % photos.length;
        const thumb = $("img", photos[index]);
        img.src = photos[index].dataset.full || thumb.currentSrc || thumb.src;
        img.alt = thumb.alt; cap.textContent = thumb.alt;
      };
      photos.forEach((btn, i) => ctx.listen(btn, "click", () => { show(i); dlg.showModal(); }));
      $(".lb-close", dlg).addEventListener("click", () => dlg.close());
      $(".lb-prev", dlg).addEventListener("click", () => show(index - 1));
      $(".lb-next", dlg).addEventListener("click", () => show(index + 1));
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") show(index - 1);
        if (e.key === "ArrowRight") show(index + 1);
      });
    }

    // Blog filter buttons
    const chips = $$(".filter-chip[data-filter]", root);
    if (chips.length) {
      const cards = $$(".post-grid .post-card", root);
      const empty = $(".empty-note", root);
      chips.forEach((chip) => ctx.listen(chip, "click", () => {
        const f = chip.dataset.filter;
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        let shown = 0;
        cards.forEach((card) => {
          const match = f === "all" || card.dataset.category === f;
          card.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      }));
    }

    // Bootcamp waitlist form
    const bform = $("#bootcamp-form", root);
    if (bform) {
      const fields = $$("input, select, textarea", bform);
      fields.forEach((el) => ctx.listen(el, "blur", () => validateField(el)));
      ctx.listen(bform, "submit", async (e) => {
        e.preventDefault();
        const valid = fields.map(validateField).every(Boolean);
        if (!valid) { fields.find((f) => f.getAttribute("aria-invalid") === "true").focus(); return; }
        const data = Object.fromEntries(new FormData(bform));
        if (CONFIG.bootcampEndpoint) {
          try {
            const res = await fetch(CONFIG.bootcampEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
            if (!res.ok) throw new Error();
            bform.reset();
            toast("Thank you. We will be in touch.");
          } catch { toast("Could not send. Please email " + CONFIG.email + "."); }
        } else {
          const subject = encodeURIComponent("Summer Bootcamp enquiry from " + data.name);
          const body = encodeURIComponent(`Parent/guardian: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nPupil age: ${data.age}\nPreferred format: ${data.format}`);
          window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
          toast("Opening your email app to send your details.");
        }
      });
    }
  }

  /* =========================================================
     HOME PAGE
     ========================================================= */
  const RAIL = [
    ["home", "Intro"], ["roles", "Your team"], ["setup", "Setup"], ["features", "Features"],
    ["bootcamp", "Bootcamp"], ["affiliates", "Affiliates"], ["blog", "Blog"], ["faq", "FAQ"], ["contact-us", "Contact"],
  ];

  function initHome(root, ctx, { first }) {
    const stage = $("#stage", root);
    const title = $("#hero-title", root);

    // Split headline into words
    if (title) {
      const words = title.textContent.trim().split(/\s+/);
      title.setAttribute("aria-label", title.textContent.trim());
      title.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(" ");
    }

    // Entrance: first visit shows the loader; later visits just animate in
    if (first && $("#loader") && !reduceMotion) {
      const counter = $("#loader-count");
      const t0 = performance.now(), MIN = 1100;
      let loaded = document.readyState === "complete";
      window.addEventListener("load", () => (loaded = true), { once: true });
      const done = () => {
        html.classList.add("is-ready");
        ctx.timeout(() => stage && stage.classList.add("is-live"), 900);
        setTimeout(() => { const l = $("#loader"); if (l) l.remove(); }, 1600);
      };
      (function tick(now) {
        const t = clamp((now - t0) / MIN, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        if (counter) counter.textContent = Math.round(loaded ? eased * 100 : Math.min(eased * 100, 92));
        if (t >= 1 && loaded) { if (counter) counter.textContent = "100"; return done(); }
        if (now - t0 > 4000) return done();
        requestAnimationFrame(tick);
      })(t0);
    } else {
      if (first) html.classList.add("is-ready");
      const l = $("#loader"); if (l) l.remove();
      ctx.timeout(() => stage && stage.classList.add("is-live"), first ? 200 : 700);
    }

    // Section rail (built here, removed when out of the home page)
    const rail = document.createElement("nav");
    rail.className = "rail";
    rail.setAttribute("aria-label", "Page sections");
    rail.innerHTML = "<ul>" + RAIL.filter(([id]) => $("#" + id, root))
      .map(([id, label]) => `<li><a href="#${id}" data-label="${label}"><span class="sr-only">${label}</span></a></li>`).join("") + "</ul>";
    document.body.appendChild(rail);
    ctx.onDestroy(() => rail.remove());
    const railLinks = $$("a", rail);

    // Which section is active: rail dots + header links that point at home sections
    const headerLinks = $$(".nav-links a", header);
    const spy = ctx.observe(new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = "#" + entry.target.id;
        railLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === hash));
        headerLinks.forEach((l) => { if (l.hash) l.classList.toggle("is-active", l.hash === hash); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" }));
    $$("section[id]", root).forEach((s) => spy.observe(s));
    ctx.onDestroy(() => headerLinks.forEach((l) => l.classList.remove("is-active")));

    // Scroll-linked effects
    const darkEls = $$(".section-dark, .story, .finale, .site-footer");
    const principles = $$("#principles li", root);
    const principlesWrap = $("#principles", root);
    const ctaMark = $(".cta-mark", root);
    const story = $("[data-story]", root);
    const storyTrack = story && $(".story-track", story);
    const storyTabs = story ? $$(".story-tabs button", story) : [];
    const storyTexts = story ? $$(".story-text", story) : [];
    const storyPanels = story ? $$(".story-panel", story) : [];
    const desktopStory = window.matchMedia("(min-width: 901px)");
    let storyStep = -1;

    const setStep = (i) => {
      if (i === storyStep) return;
      storyStep = i;
      storyTabs.forEach((b, n) => b.setAttribute("aria-current", String(n === i)));
      storyTexts.forEach((el, n) => el.classList.toggle("is-active", n === i));
      storyPanels.forEach((el, n) => el.classList.toggle("is-active", n === i));
    };

    const frame = () => {
      const y = window.scrollY, vh = window.innerHeight, mid = vh / 2;
      if (stage && !reduceMotion) stage.style.setProperty("--py", String(clamp(y, 0, 900)));
      rail.classList.toggle("on-dark", darkEls.some((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));

      if (principlesWrap) {
        const r = principlesWrap.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          principles.forEach((li) => {
            const b = li.getBoundingClientRect();
            const d = Math.abs(b.top + b.height / 2 - mid);
            li.style.setProperty("--lit", reduceMotion ? 1 : clamp(1 - d / (vh * 0.34), 0, 1).toFixed(3));
          });
        }
      }
      if (ctaMark && !reduceMotion) {
        const r = ctaMark.parentElement.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) ctaMark.style.setProperty("--mark", String(((vh - r.top) * -0.08).toFixed(1)));
      }
      if (storyTrack) {
        if (desktopStory.matches) {
          const r = storyTrack.getBoundingClientRect();
          const travel = storyTrack.offsetHeight - vh;
          const p = clamp(-r.top / travel, 0, 0.9999);
          const idx = Math.floor(p * storyTabs.length);
          setStep(idx);
          storyTabs[idx].style.setProperty("--p", (p * storyTabs.length - idx).toFixed(3));
        } else {
          storyTabs.forEach((b) => b.style.removeProperty("--p"));
        }
      }
    };
    let ticking = false;
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
    ctx.listen(window, "scroll", req, { passive: true });
    ctx.listen(window, "resize", req);
    if (storyTrack) setStep(0);
    frame();

    storyTabs.forEach((btn) => ctx.listen(btn, "click", () => {
      const i = Number(btn.dataset.step);
      if (!desktopStory.matches) return;
      const top = storyTrack.getBoundingClientRect().top + window.scrollY;
      const travel = storyTrack.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + ((i + 0.5) / storyTabs.length) * travel, behavior: reduceMotion ? "auto" : "smooth" });
    }));

    // Hero: counters + tilt
    if (stage) {
      const countUp = (el) => {
        const end = parseFloat(el.dataset.count), dec = Number(el.dataset.dec || 0);
        const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
        const t0 = performance.now();
        (function step(now) {
          const t = clamp((now - t0) / 1400, 0, 1);
          el.textContent = pre + (end * (1 - Math.pow(1 - t, 3))).toFixed(dec) + suf;
          if (t < 1) requestAnimationFrame(step);
        })(t0);
      };
      ctx.observe(new MutationObserver((_, obs) => {
        if (stage.classList.contains("is-live")) {
          if (!reduceMotion) $$("[data-count]", stage).forEach(countUp);
          obs.disconnect();
        }
      })).observe(stage, { attributes: true, attributeFilter: ["class"] });

      if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
        ctx.listen(stage, "mousemove", (e) => {
          const r = stage.getBoundingClientRect();
          stage.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2) + "deg");
          stage.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * 5).toFixed(2) + "deg");
        });
        ctx.listen(stage, "mouseleave", () => { stage.style.setProperty("--ry", "0deg"); stage.style.setProperty("--rx", "0deg"); });
      }
    }

    // Feature index: show more
    const moreBtn = $("#index-toggle", root), more = $("#index-more", root);
    if (moreBtn && more) {
      ctx.listen(moreBtn, "click", () => {
        const open = !more.classList.contains("is-open");
        more.classList.toggle("is-open", open);
        more.setAttribute("aria-hidden", String(!open));
        $$("a", more).forEach((a) => (a.tabIndex = open ? 0 : -1));
        moreBtn.setAttribute("aria-expanded", String(open));
        moreBtn.textContent = open ? "Show less" : "Show more";
      });
    }

    // Affiliate calculator
    const schools = $("#c-schools", root), pupils = $("#c-pupils", root), fee = $("#c-fee", root);
    if (schools && pupils && fee) {
      const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
      const num = new Intl.NumberFormat("en-NG");
      const main = $("#r-main", root), label = $("#r-label", root);
      let period = "term", shown = 0, tween = 0;
      ctx.onDestroy(() => cancelAnimationFrame(tween));
      const paint = (input) => input.style.setProperty("--p", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
      const animateTo = (target) => {
        cancelAnimationFrame(tween);
        if (reduceMotion) { shown = target; main.textContent = naira.format(target); return; }
        const from = shown, t0 = performance.now();
        (function step(now) {
          const t = clamp((now - t0) / 450, 0, 1);
          shown = from + (target - from) * (1 - Math.pow(1 - t, 3));
          main.textContent = naira.format(Math.round(shown));
          if (t < 1) tween = requestAnimationFrame(step);
        })(t0);
      };
      const calc = () => {
        const term = schools.value * pupils.value * fee.value * CONFIG.commission;
        $("#o-schools", root).textContent = num.format(schools.value);
        $("#o-pupils", root).textContent = num.format(pupils.value);
        $("#o-fee", root).textContent = naira.format(fee.value);
        label.textContent = period === "term" ? "estimated per term" : "estimated per year (3 terms)";
        animateTo(period === "term" ? term : term * 3);
        [schools, pupils, fee].forEach(paint);
      };
      [schools, pupils, fee].forEach((el) => ctx.listen(el, "input", calc));
      $$(".seg button", root).forEach((b) => ctx.listen(b, "click", () => {
        period = b.dataset.period;
        $$(".seg button", root).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        calc();
      }));
      calc();
    }

    // Contact form
    const contact = $("#contact-form", root);
    if (contact) {
      const fields = $$("input, textarea", contact);
      fields.forEach((el) => ctx.listen(el, "blur", () => validateField(el)));
      ctx.listen(contact, "submit", async (e) => {
        e.preventDefault();
        const valid = fields.map(validateField).every(Boolean);
        if (!valid) { fields.find((f) => f.getAttribute("aria-invalid") === "true").focus(); return; }
        const data = Object.fromEntries(new FormData(contact));
        if (CONFIG.contactEndpoint) {
          try {
            const res = await fetch(CONFIG.contactEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
            if (!res.ok) throw new Error();
            contact.reset();
            toast("Message sent. We will reply by email.");
          } catch { toast("Could not send your message. Please email " + CONFIG.email + "."); }
        } else {
          const subject = encodeURIComponent("Enquiry from " + data.name);
          const body = encodeURIComponent(data.message + "\n\n" + data.name + "\n" + data.email);
          window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
          toast("Opening your email app to send the message.");
        }
      });
    }

    // "Take me to my school"
    // TODO: I wil point this at the real school sign-in page. Until then it goes to the affiliate login.
    const go = $("#go-to-school", root);
    if (go) go.setAttribute("href", "https://eduprime.ng/login");
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  const cache = new Map();                 // url -> Promise<html text>
  let current = null;                      // active page context
  let currentKey = "";
  let navToken = 0;

  const keyOf = (href) => {
    const u = new URL(href, location.href);
    u.hash = ""; u.pathname = normPath(u.pathname);
    return u.href;
  };

  function isPageLink(url) {
    if (url.origin !== location.origin) return false;
    if (!normPath(url.pathname).startsWith(ROOT_PATH)) return false;
    const ext = url.pathname.match(/\.([a-z0-9]+)$/i);
    return !ext || /^html?$/i.test(ext[1]);
  }

  function load(href) {
    const k = keyOf(href);
    if (!cache.has(k)) {
      cache.set(k, fetch(k, { credentials: "same-origin" }).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }));
    }
    return cache.get(k).catch((err) => { cache.delete(k); throw err; });
  }
  const parse = (text) => new DOMParser().parseFromString(text, "text/html");

  const saveData = () => navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
  function prefetch(href) {
    if (saveData()) return;
    const url = new URL(href, location.href);
    if (!isPageLink(url) || keyOf(url.href) === currentKey) return;
    load(url.href).catch(() => {});
  }

  function jump(y) {
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    html.style.scrollBehavior = "";
  }

  function updateNav() {
    const here = normPath(location.pathname);
    $$(".nav-links a", header).forEach((a) => {
      if (a.hash || a.origin !== location.origin) { a.removeAttribute("aria-current"); return; }
      const p = normPath(a.pathname);
      const active = p !== ROOT_PATH && here.startsWith(p);
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function syncHead(doc) {
    document.title = doc.title;
    const d = $('meta[name="description"]');
    const nd = $('meta[name="description"]', doc);
    if (d && nd) d.setAttribute("content", nd.getAttribute("content"));
    const status = doc.documentElement.getAttribute("data-bootcamp");
    if (status) html.setAttribute("data-bootcamp", status);
  }

  function mount(main, { first }) {
    const ctx = makeCtx();
    const page = main.dataset.page || "common";
    initCommon(main, ctx);
    if (page === "home") initHome(main, ctx, { first });
    else if (first) html.classList.add("is-ready");
    current = ctx;
  }

  async function navigate(href, { push = true, y = 0 } = {}) {
    const target = new URL(href, location.href);
    const token = ++navToken;
    let doc;
    try { doc = parse(await load(target.href)); }
    catch { location.assign(target.href); return; }          // fall back to a normal page load
    if (token !== navToken) return;
    const newMain = $("main", doc);
    if (!newMain) { location.assign(target.href); return; }

    const oldMain = $("main");
    if (!reduceMotion) { oldMain.classList.add("is-leaving"); await sleep(180); if (token !== navToken) return; }

    history.replaceState({ ...(history.state || {}), y: window.scrollY }, "");
    if (current) current.destroy();

    absolutize(newMain, target.href);
    const fresh = document.importNode(newMain, true);
    const goingHome = fresh.dataset.page === "home";
    if (goingHome) { html.classList.add("soft-nav"); html.classList.remove("is-ready"); }
    else if (!reduceMotion) fresh.classList.add("page-enter");
    oldMain.replaceWith(fresh);
    syncHead(doc);

    if (push) history.pushState({ y: 0 }, "", target.href);
    currentKey = keyOf(location.href);
    updateNav();
    closeMenus();
    header.classList.remove("is-hidden");

    mount(fresh, { first: false });

    if (target.hash) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.getElementById(decodeURIComponent(target.hash.slice(1)));
        html.style.scrollBehavior = "auto";
        if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
        html.style.scrollBehavior = "";
      }));
    } else {
      jump(y);
    }
    if (goingHome) {
      void fresh.offsetHeight;                               // let the starting styles apply, then animate in
      requestAnimationFrame(() => { html.classList.add("is-ready"); setTimeout(() => html.classList.remove("soft-nav"), 60); });
    }

    announcer.textContent = document.title;
    fresh.setAttribute("tabindex", "-1");
    fresh.focus({ preventScroll: true });
  }

  function initRouter() {
    if (!("history" in window) || !window.fetch || !window.DOMParser) return;
    history.scrollRestoration = "manual";
    history.replaceState({ y: window.scrollY }, "");
    currentKey = keyOf(location.href);

    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-no-spa")) return;
      const url = new URL(a.href, location.href);
      if (!isPageLink(url)) return;
      if (keyOf(url.href) === currentKey) {
        if (url.hash) return;                                  // in-page anchor: let the browser scroll
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      e.preventDefault();
      navigate(url.href);
    });

    // Prefetch on hover / focus / touch so the first click is already warm
    const warm = (e) => { const a = e.target.closest ? e.target.closest("a[href]") : null; if (a) prefetch(a.href); };
    document.addEventListener("mouseover", warm, { passive: true });
    document.addEventListener("focusin", warm);
    document.addEventListener("touchstart", warm, { passive: true });

    // Quietly warm the main pages once the browser is idle
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2500));
    idle(() => $$(".nav-links a", header).forEach((a) => { if (!a.hash) prefetch(a.href); }));

    window.addEventListener("popstate", (e) => {
      const y = (e.state && e.state.y) || 0;
      if (keyOf(location.href) === currentKey) { if (!location.hash) jump(y); return; }
      navigate(location.href, { push: false, y });
    });
  }

  /* =========================================================
     BOOT
     ========================================================= */
  initShell();
  initRouter();
  updateNav();
  const firstMain = $("main");
  mount(firstMain, { first: true });
})();
