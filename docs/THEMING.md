# Theming Guide

This template now ships with CSS custom properties that drive surface, border, and brand colors. Override them to apply your company’s visual identity.

## Changing the Default Theme

Update the variables inside `app/app.css` under `@layer base`:

```css
:root {
  --surface-base: #ffffff;
  --surface-raised: #f8fafc;
  --border-subtle: #e2e8f0;
  --brand-primary: #4f46e5;
  --brand-primary-hover: #4338ca;
  --brand-text: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
}
```

Pick colors that meet contrast requirements (WCAG AA) for text and interaction elements.

## Supporting Multiple Themes

Use the `data-theme` attribute on `<html>` or `<body>` to swap palettes:

```tsx
// Example toggle snippet
function ThemeToggle() {
  function setTheme(theme: 'light' | 'midnight') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  return (
    <div className="inline-flex gap-2 text-sm">
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('midnight')}>Midnight</button>
    </div>
  );
}
```

`app/app.css` already defines a `data-theme="midnight"` palette to get you started.

## Utility Classes

The following utility classes map to the new tokens:

| Class                 | Purpose                               |
| --------------------- | ------------------------------------- |
| `.bg-surface`         | Base background                       |
| `.bg-surface-raised`  | Cards/navigation surfaces             |
| `.border-surface-subtle` | Light border color                 |
| `.text-secondary`     | Secondary body copy                  |
| `.btn-primary`        | Primary action button background      |
| `.hover-surface-muted`| Hover state that respects the theme   |

Use them wherever you previously reached for literal Tailwind colors (`bg-white`, `bg-gray-50`, etc.). For more granular control you can still reach for Tailwind’s utilities—just wrap them in CSS variables to keep themes consistent.

## Tailwind Tokens

Tailwind v4 `@theme` already defines the font stack. If you need brand fonts, update the `--font-sans` variable in `app/app.css` or extend with additional tokens.

## Testing Your Theme

- Run `npm run test:e2e` to ensure Playwright screenshots or traces look correct.
- Manually inspect `/settings` and the dropdown navigation in light/dark modes.
- Re-export marketing screenshots after you finalize colors.

Keep this guide alongside `docs/ENVIRONMENTS.md` so every new project built from the template can be themed quickly.
