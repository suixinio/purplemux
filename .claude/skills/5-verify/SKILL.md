# spec-verify — Verify Implementation Against the Spec

For a given feature, compares the spec documents with the actual code and finds gaps and mismatches.
If items are missing, the code is patched immediately.
Use when the user asks to "verify v1 visit-planning".

## Instructions

Perform the following steps in order.

### 1. Argument Check

- First argument: version (e.g., v1, v2)
- Second argument: feature name (e.g., visit-planning)
- If the feature name is missing, print "Please specify a feature name. Example: `/5-verify v1 visit-planning`" and exit

### 2. Load CLAUDE.md

- Read `CLAUDE.md` to identify the tech stack, coding rules, and reference-document links

### 3. Load All Spec Documents

Read all four spec documents:

- `.specs/v{N}/features/{feature-name}/spec.md` — page overview, major features
- `.specs/v{N}/features/{feature-name}/detail/ui.md` — screen composition, component mapping
- `.specs/v{N}/features/{feature-name}/detail/flow.md` — user flow, state transitions
- `.specs/v{N}/features/{feature-name}/detail/api.md` — API integration, queries / mutations

### 4. Load Previous Build / Verify Results

- Glob the `.specs/v{N}/features/{feature-name}/result/` directory with `*.md` and read every result file present:
  - `build.md` — list of files created / modified / deleted at build time
  - `verify-*.md` — results of previous verification rounds (`verify-1.md`, `verify-2.md`, …)

- From the prior results, identify the following:
  - **Items already patched** → on re-verification, just confirm the pass without making duplicate edits
  - **Unpatched items and the reason** (e.g., requires a separate feature, infrastructure-level work) → keep items with the same reason as unpatched in this round as well
  - **Numerical change before / after the fix** → understand the improvement trend

- If the `result/` directory does not exist or there are no files (first verification), skip this step.

### 5. Survey the Implementation Code

- Within the project root, find every file related to the feature
- Identify the full picture: routes, page components, sub-components, hooks, API integrations, type definitions, etc.

### 6. Spec vs. Implementation Cross-Check

Use the checklist below to cross-check the spec documents against the actual code **item by item**:

#### spec.md Cross-Check

- [ ] Is each item in the major-features list implemented in the code?
- [ ] Is the route path as defined in the spec?

#### ui.md Cross-Check

- [ ] Does the layout structure match the spec?
- [ ] Are the table columns / card composition as specified?
- [ ] Do the form fields (field name, component type, required flag, validation rules) match?
- [ ] Is the loading state (skeleton / spinner) implemented?
- [ ] Is the empty state (guidance message + action) implemented?
- [ ] Is the error state (retry option) implemented?
- [ ] Is interaction feedback (button click, form submit, delete, etc.) implemented?

#### flow.md Cross-Check

- [ ] Is each step of the default flow reflected in the code?
- [ ] Are the state transitions (states / triggers defined in the mermaid diagram) implemented?
- [ ] Is edge-case handling implemented?
- [ ] Is Optimistic UI applied where it was specified?

#### api.md Cross-Check

- [ ] Are the specified read APIs (endpoint, parameters) wired up in the code?
- [ ] Are the specified mutation APIs (endpoint, side effects) wired up in the code?
- [ ] Is the filter / sort mapping implemented as specified?
- [ ] Is the caching strategy applied as specified?
- [ ] Is pagination implemented as specified?

### 7. Output the Verification Report

Print the verification result in the following format:

```
## Verification Result: {feature-name}

### Implemented Items
- [x] (Items confirmed implemented)

### Missing / Mismatching Items
- [ ] (Missing items — spec source, expected behavior, current state)

### Quality Gaps
- [ ] (Items that are implemented but fall short of the spec level)

### Summary
- Total items: N
- Implemented: N
- Missing / mismatching: N
- Quality gaps: N
```

### 8. Patch Missing Items Immediately

- **If there are missing / mismatching items** → patch the code immediately, using the spec documents as the reference
- **If there are quality-gap items** → improve the code to meet the 4-build quality bar (Fast, Toss-grade completeness, Forbes TOP 10 caliber)
- After patching, print a summary of the changed files and the contents of the modifications

### 9. Completion Notice

- **If all items pass** → print a verification-complete message

- **If patching was performed** → always print the following message:

```
Patching is complete.
To re-verify, run `/new` and then `/5-verify` again.
(This clears context and produces a more accurate verification in a fresh session)
```

### 10. Quality Bar (Same as 4-build)

During verification, code that does not meet the criteria below is classified as a **quality gap**:

#### Fast

- Whether the Optimistic UI pattern is applied
- Whether skeleton loading / spinners are applied to all asynchronous sections
- Whether SWR / caching strategy, prefetch, and lazy loading are used
- Whether virtual scrolling or infinite scrolling is applied to large lists

#### Toss-grade Completeness

- Whether all four states (loading / empty / error / success) are implemented for every async UI
- Whether real-time form validation and toast / notification feedback are present
- Accessibility: whether keyboard navigation, focus management, and ARIA attributes are applied

#### Forbes TOP 10 Caliber

- Whether every feature in the spec is implemented at a depth ready for real-world use, leaving nothing out
- Whether feature-related context information is provided on the same screen
