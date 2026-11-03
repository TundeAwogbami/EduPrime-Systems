# EduPrime Systems: Landing Page Redesign

A modern, motion-driven redesign of the [EduPrime Systems](https://eduprime.ng) onboarding website, built with **semantic HTML5, modern CSS and vanilla JavaScript**. No frameworks, no build step, no dependencies.

> **Status: work in progress.** The UI and interactions are in place. Several links and form integrations are still being connected to the live product (see [Integration checklist](#integration-checklist)).

EduPrime Systems is a school management platform for schools from creche to senior secondary. This project redesigns its public-facing page to be clearer, faster to scan and more interactive.

---

## Table of contents

1. [Highlights](#highlights)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [How it works](#how-it-works)
6. [Customisation](#customisation)
7. [Accessibility](#accessibility)
8. [Performance](#performance)
9. [Browser support](#browser-support)
10. [Integration checklist](#integration-checklist)
11. [Deployment](#deployment)
12. [Roadmap](#roadmap)
13. [Credits and notes](#credits-and-notes)

---

## Highlights

**Motion and interaction**

- **Custom cursor** (mouse devices only): a precise dot plus a trailing ring that grows over links, shows contextual labels ("Explore", "Scroll", "Ask") and becomes a text bar over form fields. It switches colour on dark sections.
- **Page-load sequence:** a branded curtain with a live percentage counter, followed by a word-by-word headline reveal.
- **Magnetic buttons:** primary buttons drift slightly towards the pointer.
- **Hero device mockups:** a laptop and phone built entirely in CSS, with pointer-driven 3D tilt, scroll parallax, animated charts and count-up numbers.
- **Pinned scroll story:** the setup section stays fixed while scrolling advances through four steps (Setup, Classes, Fees, Results). The copy and the mock UI change per step, and clicking a step label scrolls to it.
- **Stacked role cards:** three sticky cards (proprietor, teacher, bursar) stack as you scroll.
- **Scroll-lit principles:** each statement brightens as it crosses the centre of the viewport.
- **Feature index:** an editorial list (SYS-01 to SYS-08) with hover fill effects and an expandable "Show 4 more" row group.
- **Scroll chrome:** top progress bar, section rail with tooltips, header that hides on scroll down and returns on scroll up.

**Product sections**

- Affiliate earnings calculator with animated totals and a per-term / per-year toggle.
- FAQ accordion (one panel open at a time, animated height).
- Contact form with inline validation and toast feedback.
- Newsletter sign-up with validation.

---

## Tech stack

| Layer | Details |
| --- | --- |
| Markup | Semantic HTML5, landmark regions, inline SVG sprite (`<symbol>` / `<use>`) |
| Styling | CSS custom properties (design tokens), Grid, Flexbox, `position: sticky`, `clamp()` fluid type and spacing, `backdrop-filter`, CSS animations and transitions, `prefers-reduced-motion` |
| Behaviour | Vanilla ES6+ JavaScript in a single IIFE, no libraries |
| Browser APIs | `IntersectionObserver`, `requestAnimationFrame`, `MutationObserver`, `matchMedia`, `Intl.NumberFormat` (`en-NG`, NGN), `FormData`, `fetch` |
| Fonts | [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) (headings) and [Figtree](https://fonts.google.com/specimen/Figtree) (body) via Google Fonts |
| Tooling | VS Code with the Live Server extension |

---

## Project structure

```
eduprime-redesign/
├── index.html          # Page markup and content
├── css/
│   └── styles.css      # Design tokens, layout, components, motion
├── js/
│   └── main.js         # All interactions and scroll-linked effects
├── assets/
│   └── img/            # Logos, favicon, social share image (add your own)
├── .gitignore
└── README.md
```

---

## Getting started

No installation is needed.

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   ```

2. Open the folder in VS Code.
3. Install the **Live Server** extension (Ritwick Dey).
4. Right-click `index.html` and choose **Open with Live Server**, or click **Go Live** in the status bar.

The site opens at `http://127.0.0.1:5500` and reloads on save.

> Open the **folder**, not a single file, so the relative CSS and JS paths resolve.

---

## How it works

### Design tokens

All colours, radii and easing curves live as CSS custom properties at the top of `css/styles.css`:

```css
:root {
  --ink: #0f2a2e;
  --teal: #0e5a5f;
  --pencil: #f5b921;
  --paper: #fbfcfb;
  --mist: #eef4f3;
  --ease: cubic-bezier(.2, .7, .2, 1);
}
```

Change a token once and it updates across the whole page.

### One scroll loop

Scroll-linked effects share a single `requestAnimationFrame`-throttled loop in `main.js`. It handles the progress bar, header show/hide, hero parallax, rail colour, the scroll-lit principles list, the footer's drifting letter and the pinned story. Batching reads and writes in one frame avoids layout thrashing.

### Pinned story

The setup section uses a tall track (`.story-track`) with a `position: sticky` child. The script converts the track's scroll offset into a 0 to 1 progress value, maps it to one of four steps, and toggles `is-active` classes. On screens narrower than 900px the pin is disabled and all steps stack normally.

### Reveal and scroll spy

`IntersectionObserver` drives both the staggered `[data-reveal]` fade-ups and the active state for header links and the section rail. Observers are used instead of scroll listeners for these.

### Custom cursor

The cursor is created in JavaScript only when `(hover: hover) and (pointer: fine)` matches and reduced motion is not requested. The dot follows the pointer exactly. The ring follows with linear interpolation (lerp) in its own animation loop. State (link, label, text, dark section) is set from `mouseover` using `closest()` and `data-cursor` attributes.

### Calculator

`Intl.NumberFormat("en-NG", { currency: "NGN" })` formats values. Totals animate with an eased `requestAnimationFrame` tween. The formula is:

```
schools × pupils per school × fee per term × commission rate
```

The commission rate is the `COMMISSION` constant in `main.js` (currently `0.10`).

---

## Customisation

| What | Where |
| --- | --- |
| Brand colours, radii, easing | `:root` in `css/styles.css` |
| Fonts | `<link>` tags in `<head>` and `--font-display` / `--font-body` |
| Hero headline and copy | `#home` section in `index.html` |
| Commission rate | `COMMISSION` in `js/main.js` |
| Contact form destination | `FORM_ENDPOINT` and `CONTACT_EMAIL` at the top of `js/main.js` |
| Hero sample numbers | `data-count` attributes in the hero mockup |
| Number of story steps | Matching `.story-tabs`, `.story-text` and `.story-panel` items in `index.html` (keep the counts equal) |

To disable the loader, cursor or other effects for debugging, comment out the matching block in `main.js`. The sections are labelled with clear headers.

---

## Accessibility

- Skip link and visible keyboard focus styles on all interactive elements.
- Native `<button>`, `<a>`, `<nav>`, `<main>` and `<footer>` landmarks.
- FAQ buttons use `aria-expanded` and `aria-controls`, with panels as labelled regions.
- Form fields have associated labels, inline errors with `aria-live`, and `aria-invalid` states.
- The hero title keeps a full `aria-label` while words are split for animation.
- All motion is disabled or reduced when the visitor has `prefers-reduced-motion: reduce`.
- The custom cursor never replaces the system cursor on touch devices or for form fields.

---

## Performance

- No JavaScript libraries and no CSS framework.
- Animations use `transform` and `opacity` wherever possible.
- Reveal and scroll spy use `IntersectionObserver` rather than scroll handlers.
- Device mockups are CSS, not images.
- Fonts load with `preconnect` and `display=swap`.

---

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Features that rely on newer CSS (`translate` property, `backdrop-filter`, `grid-template-rows` transitions) degrade to simpler behaviour in older browsers.

---

## Integration checklist

The UI is complete. These items connect it to the live product:

| Item | Current state | Action |
| --- | --- | --- |
| Register / Create account | Links to `https://eduprime.ng/school-register` | Confirm the final URL |
| Take me to my school | Temporarily points to `https://eduprime.ng/login` (set in `main.js`) | Point to the real school sign-in page |
| Request demo | Not yet on this page | Add the button and link to the booking page or form |
| Staff and Student sign-in | `#` placeholders in the header dropdown | Add real login URLs |
| Affiliate login | Links to `https://eduprime.ng/login` | Confirm the URL |
| Contact form | Opens the visitor's email app when no endpoint is set | Set `FORM_ENDPOINT` (Formspree or your own API) |
| Newsletter | Validates and shows a toast, but sends nothing | Connect to your email provider |
| Social links | `#` placeholders in the footer | Add profile URLs |
| Privacy policy | `#` placeholder | Add the page URL |
| Logos | Loaded from `eduprime.ng` | Save into `assets/img/` and update the paths |
| Favicon and share image | Inline SVG favicon, no `og:image` | Add `favicon.png` and a 1200×630 `og-image.png` |

Connecting these only changes `href` values and one or two config constants. It does not change the project structure or stack.

---

## Deployment

Because the project is static, any static host works:

- **GitHub Pages:** push to GitHub, then Settings, Pages, deploy from the `main` branch root.
- **Vercel / Netlify:** import the repository. No build command is needed, and the output directory is the project root.

After deploying, update the Open Graph tags in `index.html` with the live URL and test link previews in the LinkedIn Post Inspector.

---

## Roadmap

- [ ] Connect all live links and the form endpoint
- [ ] Add a "Request demo" call to action
- [ ] Replace CSS mockups with real product screenshots
- [ ] Add Open Graph and Twitter card metadata
- [ ] Add a privacy policy page
- [ ] Optimise and self-host fonts
- [ ] Lighthouse pass (performance, accessibility, SEO)
- [ ] Optional: dark mode

---

## Credits and notes

- Layout and motion patterns follow common modern SaaS landing-page conventions. All copy, product descriptions and the visual identity (colours, mockups) are EduPrime's own.
- Icons are inline SVG. Fonts are provided by Google Fonts under the SIL Open Font License.
- Sample data in the hero mockup and calculator is illustrative only.

## Licence

Add a licence here (for example MIT) or state that the code is proprietary to EduPrime Systems.
