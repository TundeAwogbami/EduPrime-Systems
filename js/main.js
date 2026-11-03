
(() => {
  "use strict";

  // (To do) Set this to a Formspree / backend URL to send the contact form.
  const FORM_ENDPOINT = "";
  const CONTACT_EMAIL = "contact@eduprime.ng";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /*  Footer year  */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /*  Toast  */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3600);
  }

  /*  Split hero title into words  */
  const title = $("#hero-title");
  if (title) {
    const words = title.textContent.trim().split(/\s+/);
    title.setAttribute("aria-label", title.textContent.trim());
    title.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");
  }

  /*  Loader  */
  const counter = $("#loader-count");
  let ready = false;
  function finishLoading() {
    if (ready) return;
    ready = true;
    html.classList.add("is-ready");
    // let the hero charts and counters start once the curtain lifts
    setTimeout(() => $("#stage")?.classList.add("is-live"), 900);
  }
  if (reduceMotion) {
    if (counter) counter.textContent = "100";
    finishLoading();
  } else {
    const start = performance.now();
    const MIN = 1100;
    let pageLoaded = document.readyState === "complete";
    window.addEventListener("load", () => (pageLoaded = true));
    (function tick(now) {
      const t = clamp((now - start) / MIN, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      // holding at 92% until the page has really loaded
      const shown = pageLoaded ? eased * 100 : Math.min(eased * 100, 92);
      if (counter) counter.textContent = Math.round(shown);
      if (t >= 1 && pageLoaded) { if (counter) counter.textContent = "100"; return finishLoading(); }
      if (now - start > 4000) return finishLoading(); // safety net
      requestAnimationFrame(tick);
    })(start);
  }

  /*  Mobile menu  */
  const header = $(".site-header");
  const toggle = $(".nav-toggle");
  const nav = $("#primary-nav");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  $$(".nav-links a, .nav-actions .btn").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /*  Sign-in dropdown  */
  const dd = $(".dropdown");
  const ddBtn = $(".dropdown-toggle", dd);
  const ddMenu = $(".dropdown-menu", dd);
  const setDropdown = (open) => { ddBtn.setAttribute("aria-expanded", String(open)); ddMenu.hidden = !open; };
  ddBtn.addEventListener("click", () => setDropdown(ddMenu.hidden));
  document.addEventListener("click", (e) => { if (!dd.contains(e.target)) setDropdown(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setDropdown(false); setMenu(false); } });

  /*  Scroll-linked effects (one rAF loop)  */
  const bar = $("#scroll-bar");
  const stage = $("#stage");
  const rail = $(".rail");
  const darkEls = $$(".section-dark, .story, .site-footer");
  const principles = $$("#principles li");
  const principlesWrap = $("#principles");
  const ctaMark = $(".cta-mark");
  const story = $("[data-story]");
  const storyTrack = $(".story-track", story);
  const storyTabs = $$(".story-tabs button", story);
  const storyTexts = $$(".story-text", story);
  const storyPanels = $$(".story-panel", story);
  const desktopStory = window.matchMedia("(min-width: 901px)");

  let lastY = window.scrollY;
  let storyStep = -1;

  function setStep(i) {
    if (i === storyStep) return;
    storyStep = i;
    storyTabs.forEach((b, n) => b.setAttribute("aria-current", String(n === i)));
    storyTexts.forEach((el, n) => el.classList.toggle("is-active", n === i));
    storyPanels.forEach((el, n) => el.classList.toggle("is-active", n === i));
  }

  function frame() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    // progress bar
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // header: glass after the top, hide when scrolling down, show when scrolling up
    header.classList.toggle("is-scrolled", y > 8);
    const menuOpen = nav.classList.contains("is-open") || !ddMenu.hidden;
    if (y > 240 && y > lastY + 4 && !menuOpen) header.classList.add("is-hidden");
    else if (y < lastY - 4 || y <= 240 || menuOpen) header.classList.remove("is-hidden");
    lastY = y;

    // hero device parallax
    if (stage && !reduceMotion) stage.style.setProperty("--py", String(clamp(y, 0, 900)));

    // rail colour on dark sections
    const mid = vh / 2;
    rail.classList.toggle("on-dark", darkEls.some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    }));

    // principles light up as they cross the middle of the screen
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

    // final CTA big letter drifts
    if (ctaMark && !reduceMotion) {
      const r = ctaMark.parentElement.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) ctaMark.style.setProperty("--mark", String(((vh - r.top) * -0.08).toFixed(1)));
    }

    // pinned setup story
    if (desktopStory.matches) {
      const r = storyTrack.getBoundingClientRect();
      const travel = storyTrack.offsetHeight - vh;
      const p = clamp(-r.top / travel, 0, 0.9999);
      const steps = storyTabs.length;
      const idx = Math.floor(p * steps);
      setStep(idx);
      const local = p * steps - idx;
      storyTabs[idx].style.setProperty("--p", local.toFixed(3));
    } else {
      storyTabs.forEach((b) => b.style.removeProperty("--p"));
    }
  }

  let ticking = false;
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  setStep(0);
  frame();

  // clicking a story tab scrolls to that step
  storyTabs.forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.step);
    if (!desktopStory.matches) return;
    const top = storyTrack.getBoundingClientRect().top + window.scrollY;
    const travel = storyTrack.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / storyTabs.length) * travel, behavior: reduceMotion ? "auto" : "smooth" });
  }));

  /*  Active section: header links + rail  */
  const navLinks = $$(".nav-links a");
  const railLinks = $$(".rail a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const href = "#" + entry.target.id;
      navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === href));
      railLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === href));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));

  /*  Reveal on scroll (staggered)  */
  const reveal = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty("--d", n++ * 90 + "ms");
      entry.target.classList.add("is-in");
      reveal.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal]").forEach((el) => reveal.observe(el));

  /*  Hero: counters and mouse tilt  */
  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.dec || 0);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    const dur = 1400;
    const t0 = performance.now();
    (function step(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      const v = end * (1 - Math.pow(1 - t, 3));
      el.textContent = pre + v.toFixed(dec) + suf;
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (stage) {
    new MutationObserver((_, obs) => {
      if (stage.classList.contains("is-live")) {
        if (!reduceMotion) $$("[data-count]", stage).forEach(countUp);
        obs.disconnect();
      }
    }).observe(stage, { attributes: true, attributeFilter: ["class"] });

    if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
      stage.addEventListener("mousemove", (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        stage.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
        stage.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg");
      });
      stage.addEventListener("mouseleave", () => {
        stage.style.setProperty("--ry", "0deg");
        stage.style.setProperty("--rx", "0deg");
      });
    }
  }

  /*  Feature index: show more and less  */
  const moreBtn = $("#index-toggle");
  const more = $("#index-more");
  if (moreBtn && more) {
    moreBtn.addEventListener("click", () => {
      const open = !more.classList.contains("is-open");
      more.classList.toggle("is-open", open);
      more.setAttribute("aria-hidden", String(!open));
      $$("a", more).forEach((a) => (a.tabIndex = open ? 0 : -1));
      moreBtn.setAttribute("aria-expanded", String(open));
      moreBtn.textContent = open ? "Show fewer" : "Show more";
    });
  }

  /*  Accordion (one open at a time)  */
const accItems = $$(".acc-item");
accItems.forEach((item) => {
  const btn = $(".acc-btn", item);
  btn.addEventListener("click", () => {
    const willOpen = !item.classList.contains("is-open");
    accItems.forEach((other) => {
      other.classList.remove("is-open");
      $(".acc-btn", other).setAttribute("aria-expanded", "false");
    });
    if (willOpen) {
      item.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

  /*  Affiliate calculator  */
  const COMMISSION = 0.10; // 10% per child per term
  const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat("en-NG");
  const schools = $("#c-schools"), pupils = $("#c-pupils"), fee = $("#c-fee");
  const main = $("#r-main"), label = $("#r-label");
  let period = "term";
  let shownValue = 0;
  let tween = 0;

  function paint(input) {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--p", p + "%");
  }
  function animateTo(target) {
    cancelAnimationFrame(tween);
    if (reduceMotion) { shownValue = target; main.textContent = naira.format(target); return; }
    const from = shownValue;
    const t0 = performance.now();
    (function step(now) {
      const t = clamp((now - t0) / 450, 0, 1);
      shownValue = from + (target - from) * (1 - Math.pow(1 - t, 3));
      main.textContent = naira.format(Math.round(shownValue));
      if (t < 1) tween = requestAnimationFrame(step);
    })(t0);
  }
  function calc() {
    const term = schools.value * pupils.value * fee.value * COMMISSION;
    $("#o-schools").textContent = num.format(schools.value);
    $("#o-pupils").textContent = num.format(pupils.value);
    $("#o-fee").textContent = naira.format(fee.value);
    label.textContent = period === "term" ? "estimated per term" : "estimated per year (3 terms)";
    animateTo(period === "term" ? term : term * 3);
    [schools, pupils, fee].forEach(paint);
  }
  [schools, pupils, fee].forEach((el) => el.addEventListener("input", calc));
  $$(".seg button").forEach((b) => b.addEventListener("click", () => {
    period = b.dataset.period;
    $$(".seg button").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    calc();
  }));
  calc();

  /*  Forms  */
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  function validateField(input) {
    const field = input.closest(".field");
    const msg = $(".error", field);
    let error = "";
    if (!input.value.trim()) error = "This field is required.";
    else if (input.type === "email" && !emailOk(input.value)) error = "Enter a valid email address, like name@school.com.";
    field.classList.toggle("has-error", Boolean(error));
    input.setAttribute("aria-invalid", String(Boolean(error)));
    msg.textContent = error;
    return !error;
  }
  const contact = $("#contact-form");
  $$("input, textarea", contact).forEach((el) => el.addEventListener("blur", () => validateField(el)));
  contact.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = $$("input, textarea", contact);
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) { fields.find((f) => f.getAttribute("aria-invalid") === "true").focus(); return; }
    const data = Object.fromEntries(new FormData(contact));
    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
        contact.reset();
        toast("Message sent. We will reply by email.");
      } catch {
        toast("Could not send your message. Please email " + CONTACT_EMAIL + ".");
      }
    } else {
      const subject = encodeURIComponent("Enquiry from " + data.name);
      const body = encodeURIComponent(data.message + "\n\n" + data.name + "\n" + data.email);
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      toast("Opening your email app to send the message.");
    }
  });
  const newsletter = $("#newsletter");
  newsletter.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", newsletter);
    if (!emailOk(input.value)) { toast("Enter a valid email address."); input.focus(); return; }
    // TODO: send input.value to your newsletter provider (Mailchimp, Brevo, etc.)
    newsletter.reset();
    toast("Thanks for subscribing.");
  });

  /*  "Take me to my school"  */
  $("#go-to-school").setAttribute("href", "https://eduprime.ng/login");

  /*  Magnetic buttons  */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = 0.28;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1), background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /*  Custom cursor (mouse only)  */
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
      const isText = t.closest("input, textarea");
      const labelEl = t.closest("[data-cursor]");
      const isLink = t.closest("a, button, summary, label, [role='button']");
      ring.classList.toggle("is-text", Boolean(isText));
      ring.classList.toggle("is-label", !isText && Boolean(labelEl));
      ring.classList.toggle("is-link", !isText && !labelEl && Boolean(isLink));
      ringLabel.textContent = labelEl && !isText ? labelEl.dataset.cursor : "";
      const onDark = Boolean(t.closest(".section-dark, .story, .site-footer"));
      ring.classList.toggle("on-dark", onDark && !labelEl);
      dot.style.background = onDark ? "#fff" : "";
    });
    document.addEventListener("mousedown", () => ring.classList.add("is-down"));
    document.addEventListener("mouseup", () => ring.classList.remove("is-down"));
  }
})();