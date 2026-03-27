# Claims Confirm Dialog Refresh

**Date:** 2026-03-27
**Approach:** Extract a shared confirm dialog and replace native browser confirms in Claims flows
**Target users:** Operations staff and managers working with Claims / problem orders
**Performance constraint:** Zero new API calls, zero new dependencies, zero Supabase/Vercel changes. Client-side UI/state only.

---

## 1. Goal

Replace the browser-native `window.confirm` popups in the Claims area with a shared modal that matches the application's current visual style and interaction patterns.

This applies to:
- Duplicate claim confirmation when an order already exists in "Đơn có vấn đề"
- Unsaved changes confirmation when closing the claim detail drawer

## 2. UX Direction

The new dialog should visually align with existing app dialogs:
- Blurred dark backdrop
- White card with large radius, soft shadow, subtle colored border
- Circular icon container at the top
- Strong title, short readable body text, clear primary and secondary actions
- Smooth pop-in animation
- Mobile-safe sizing with max-width and stacked buttons when needed

The dialog should feel like part of the existing Claims UI rather than a browser/system popup.

## 3. Shared Component

### File
`src/components/shared/ConfirmDialog.tsx`

### Responsibilities
- Render a reusable confirmation modal via `createPortal`
- Support tone variants for contextual styling
- Provide consistent backdrop, layout, animation, and button styling
- Handle `Esc`, backdrop click, close button, and disabled/loading states

### Proposed props
- `open`
- `title`
- `description`
- `confirmLabel`
- `cancelLabel`
- `tone`
- `icon`
- `loading`
- `onConfirm`
- `onClose`

### Tone variants
- `warning`: amber/orange tone for unsaved changes
- `info`: blue/amber tone for duplicate claim edit prompt
- Keep the current red/green confirm styling in Claims available for reuse later if needed

## 4. Duplicate Claim Flow

### File
`src/components/shared/AddClaimFromPageDialog.tsx`

### Current issue
- Uses `window.confirm`
- Breaks visual consistency
- Feels abrupt and system-level instead of app-level

### New behavior
- On `409`, show `ConfirmDialog`
- Title: `Đơn đã có trong Đơn có vấn đề`
- Description: mention the request code and explain user can open the existing claim to edit it
- Confirm CTA: `Mở chi tiết để sửa`
- Cancel CTA: `Để sau`
- On confirm: close the confirm modal and open `ClaimDetailDrawer`

## 5. Unsaved Changes Flow

### File
`src/components/claims/ClaimDetailDrawer.tsx`

### Current issue
- Uses `window.confirm` when drawer has unsaved changes
- Visual and interaction mismatch with the drawer and Claims dialogs

### New behavior
- When user tries to close with dirty state, show `ConfirmDialog`
- Title: `Bạn có thay đổi chưa lưu`
- Description: explain closing now will discard unsaved edits
- Confirm CTA: `Thoát không lưu`
- Cancel CTA: `Tiếp tục chỉnh sửa`
- Tone: warning
- On confirm: close the confirm modal, then close the drawer

## 6. Interaction Details

### Accessibility / keyboard
- `Esc` closes the modal
- Backdrop click closes the modal unless `loading`
- Focus should stay inside the modal entry points as much as practical for current code style

### Mobile behavior
- Width: `min(440px, calc(100vw - 24px))`
- Content should wrap cleanly
- Footer buttons can switch to vertical stack below a small breakpoint if needed

## 7. Visual Rules

- Use existing Claims visual language: blue accents, slate text, soft borders
- Avoid generic browser/system dialog appearance
- Keep copy concise and action-oriented
- Maintain consistency between Claims dialog, drawer, and shared confirm modal

## 8. Testing

Add focused UI behavior coverage where practical:
- duplicate claim state opens custom confirm instead of browser confirm
- confirm action opens existing claim detail
- dirty drawer close opens custom confirm
- confirm discard closes drawer

## 9. Scope Guardrails

Included:
- Shared confirm dialog
- Replace the 2 targeted `window.confirm` usages
- Small supporting state changes in the 2 affected components

Not included:
- Refactor every existing confirm/delete modal in the app
- Broader dialog system redesign
- API or database changes
