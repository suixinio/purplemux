# spec-draft — Spec Draft

Writes a feature-spec draft (`spec.md`).
If a page name is given, only that page is generated; if not, all pages are generated in bulk.
Use when the user asks for "v1 spec draft" or "v1 full spec draft".

## Instructions

Perform the following steps in order.

### 1. Version Check

- If the user specified a version, use it (e.g., v1, v2)
- If unspecified, use the version currently in progress

### 2. Understand the Requirements

- Read `.specs/v{N}/PRD.md` to understand the requirements

### 3. Identify the Project Guides

- Read the "Reference Documents" section in `CLAUDE.md` to identify the `docs/` guide list

### 4. Determine the Target

- **Page name specified** → generate only that page
- **Unspecified** → generate all pages in bulk based on the page list in `PRD.md`

### 5. Create spec.md

Create `.specs/v{N}/features/{feature-name}/spec.md` with the following structure:

```markdown
---
page: { page-name }
title: { Page Title }
route: { Route Path }
status: DRAFT
complexity: Low | Medium | High
depends_on:
  - docs/{related guide}.md
created: { date }
updated: { date }
assignee: ''
---

# {Page Title}

## Overview

(Page purpose and scope)

## Major Features

- Feature items

## Sub-documents

- [Screen Composition](./detail/ui.md)
- [User Flow](./detail/flow.md)
- [API Integration](./detail/api.md)

## Change History

| Date   | Change   | Status |
| ------ | -------- | ------ |
| {date} | Drafted  | DRAFT  |
```

### 6. Wire Up depends_on

- Link the project guides (`docs/`) related to the page in `depends_on`

### 7. Maintain Consistency

- If page specs already exist, follow their style for consistency

### 8. Apply the Quality Bar

Validate each page's major features along the three axes below, and reflect any gaps in `spec.md`:

- **Fast** — Identify items among the major features that need a performance strategy and include them in the feature list (prefetch, caching, lazy loading, etc.)
- **Toss-grade completeness** — Include UX-completeness items in the features: loading / empty / error states, interaction feedback, transition animations, etc. Feature definitions that are merely "it works" are not allowed
- **Forbes TOP 10 caliber** — Verify that each feature has the depth to be used in real-world operations. The goal is not "it kind of works" but "this is impressive"

### 9. Next-Step Guidance

After completion, always print the following message:

```
After reviewing each feature's spec.md, change the frontmatter's status to CONFIRMED.
Only CONFIRMED features are processed by `/3-detail` and `/4-build`.
```
