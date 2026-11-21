# Frontend browser support

The frontend supports the following minimum browser versions. These are the
minimums used by the Next.js 16 production browser baseline; older browser
versions are not part of the compatibility promise.

| Browser | Minimum supported version | Automated engine |
|---|---:|---|
| Google Chrome | 111 | Playwright Chromium |
| Microsoft Edge | 111 | Playwright Chromium |
| Mozilla Firefox | 111 | Playwright Firefox |
| Apple Safari | 16.4 | Playwright WebKit |
| iOS Safari | 16.4 | Playwright WebKit |

Playwright installs the engine builds pinned by the version in
`xconfess-frontend/package-lock.json`. The critical Chromium, Firefox, and
WebKit projects cover public routes, login/posting/settings journeys, RTL
layout, and the isolated component catalog. These are engine regressions checks;
they do not replace manual verification on the minimum-version browsers.

To run one engine locally from `xconfess-frontend/`:

```bash
npx playwright install chromium
npx playwright test --project=critical-chromium
```

Replace `chromium` with `firefox` or `webkit` and select the corresponding
`critical-firefox` or `critical-webkit` project. A failure includes the
Playwright test name, route/step context, and retained trace/screenshot artifacts
when run in CI.
