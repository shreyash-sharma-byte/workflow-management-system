# Premium UI Design Skill for Enterprise Workflow Apps

## Design Philosophy
Clean, familiar, premium — inspired by Linear, Notion, Jira.
Users should feel at home immediately. Every screen should breathe.

---

## Color System
```css
Primary:    #4F46E5 (Indigo) — buttons, links, active states
Success:    #10B981 (Emerald) — completed, published, approved
Warning:    #F59E0B (Amber) — in-progress, drafts
Danger:     #EF4444 (Red) — rejected, cancelled, errors
Info:       #3B82F6 (Blue) — active, info badges
Neutral:    #6B7280 (Gray) — muted text, disabled

Background: #F9FAFB (Gray-50) — page bg
Surface:    #FFFFFF — cards, modals
Border:     #E5E7EB (Gray-200) — dividers, input borders
```

## Typography
- Font: Inter (or system sans-serif)
- Headings: 600 weight, #111827
- Body: 400 weight, #374151
- Muted: #6B7280, 0.875rem
- Use real typographic hierarchy: h2=1.5rem, h3=1.125rem

## Spacing
- Page padding: 2rem
- Card padding: 1.5rem
- Section gap: 1.5rem
- Element gap: 0.75rem
- Tight gap: 0.5rem

## Component Patterns

### Card
```css
background: white;
border: 1px solid #E5E7EB;
border-radius: 12px;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
padding: 1.5rem;
```

### Button
- Primary: indigo bg, white text, 8px radius
- Secondary: white bg, gray border
- Danger: red bg, white text
- Ghost: transparent, hover gray bg
- Sizes: sm=32px, md=40px, lg=48px
- Always use gap between icon and text

### Input
- Height: 40px
- Border: 1px #E5E7EB, focus ring indigo
- Radius: 8px
- Label above, 500 weight, 0.875rem

### Badge
- Rounded: 9999px
- Padding: 2px 10px
- Font: 0.75rem, 500 weight
- Colors match status

### Table
- Header: uppercase, 0.75rem, #6B7280, bg #F9FAFB
- Rows: hover #F3F4F6, cursor pointer if clickable
- Cell padding: 0.75rem 1rem
- No vertical borders, only horizontal separators

### Modal
- Centered, max-width 520px
- Backdrop: rgba(0,0,0,0.5) with backdrop-filter blur
- Card style inside
- Close button: top-right, ghost style

### Empty State
- Centered, padding 3rem
- Icon/illustration
- Title: "No items yet"
- Subtitle: what to do
- CTA button

### Loading
- Skeleton pulsing animation for cards/tables
- Spinner for buttons during API calls

### Toast/Notifications
- Top-right, slide in
- Success: green, Error: red
- Auto-dismiss 4s

### Stats Cards
- Grid: 4-5 columns
- Large number (2rem, 700)
- Small label below (0.8rem, muted)
- Subtle hover: shadow increase

## UX Rules
1. Every action must have immediate feedback (spinner, toast, or state change)
2. Empty states must guide the user (what to do next)
3. Errors must tell the user WHY and HOW to fix
4. Destructive actions need confirmation
5. Long lists need search/filter
6. Forms validate on blur, not just submit
7. Never show raw JSON to non-technical users
8. Use familiar terminology (e.g., "Publish" not "Deploy Template")
9. Progress indicators for multi-step flows
10. Breadcrumbs for deep navigation

## Screen Templates

### List Screen
```
┌──────────────────────────────────────────────┐
│ Page Title              [+ Create New]        │
│                                              │
│ [Search...]  [Filter ▾]  [Sort ▾]            │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Table with hover rows                    │ │
│ │ ...                                      │ │
│ └──────────────────────────────────────────┘ │
│                     < 1 2 3 ... >            │
└──────────────────────────────────────────────┘
```

### Detail Screen
```
┌──────────────────────────────────────────────┐
│ ← Back    Page Title         [Actions...]     │
│ ═══════════════════════════════════════════  │
│                                              │
│ [Tab 1]  [Tab 2]  [Tab 3]                   │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Tab Content                              │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Form Screen
```
┌──────────────────────────────────────────────┐
│ ← Back                                       │
│                                              │
│ Form Title                                   │
│ ═══════════════════════════════════════════  │
│                                              │
│ Label                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ Input field                              │ │
│ └──────────────────────────────────────────┘ │
│ Helper text                                  │
│                                              │
│ [Cancel]  [Save]                             │
└──────────────────────────────────────────────┘
```
