# page-generator — Page Code Generation

Generates code based on the spec documents.
To keep context clean and produce accurate code, **only one feature is processed per run**.
Use when the user asks to "implement v1 visit-planning".

## Instructions

Perform the following steps in order.

### 1. Argument Check

- First argument: version (e.g., v1, v2)
- Second argument: feature name (e.g., visit-planning)
- If the feature name is missing, print "Please specify a feature name. Example: `/4-build v1 visit-planning`" and exit

### 2. Load CLAUDE.md

- Read `CLAUDE.md` to identify the tech stack, coding rules, and reference-document links

### 3. Load Project Guides

- Load the `docs/` guides specified in `spec.md`'s `depends_on` and use them as references

### 4. Reference the Specs and Generate Code

Generate code with reference to all four spec documents:

- `.specs/v{N}/features/{feature-name}/spec.md` — page overview, major features
- `.specs/v{N}/features/{feature-name}/detail/ui.md` — screen composition, component mapping
- `.specs/v{N}/features/{feature-name}/detail/flow.md` — user flow, state transitions
- `.specs/v{N}/features/{feature-name}/detail/api.md` — API integration, queries / mutations

Full context the AI reads:

```
CLAUDE.md (tech stack + rules + reference doc links)
  + docs/{related guide}.md
  + .specs/v{N}/features/{feature-name}/spec.md
  + .specs/v{N}/features/{feature-name}/detail/ui.md
  + .specs/v{N}/features/{feature-name}/detail/flow.md
  + .specs/v{N}/features/{feature-name}/detail/api.md
```

### 5. Comply with the Tech Stack

- Generate code in a structure that matches the tech stack defined in `CLAUDE.md`
- Comply with the project's existing code patterns and conventions

### 6. Completion Notice

- After generating code, always print the following message:

```
To build the next feature, run `/new` and then `/4-build`.
(This clears context and produces more accurate code in a fresh session)
```

### 7. Quality Bar (Mandatory)

All generated code must meet the three criteria below. If a piece of code does not meet them, do not generate it.

#### Fast

- Apply the Optimistic UI pattern (reflect mutations in the UI immediately, roll back on failure)
- Apply skeleton loading / spinners to all asynchronous sections
- Use SWR / caching strategies, prefetch, lazy loading (`dynamic import`)
- Apply virtual scrolling or infinite scrolling to large lists

#### Toss-grade Completeness

- Implement all four states (loading / empty / error / success) for every async UI
- Real-time form validation, toast / notification feedback
- Accessibility: keyboard navigation, focus management, appropriate ARIA attributes
- Never commit code that is at the level of "it just barely works"

#### Forbes TOP 10 Caliber

- Implement every feature stated in the spec, leaving nothing out, at a depth ready for real-world use
- Aim not for "it kind of works" but for "this single feature is enough" completeness
- Provide context information related to the feature on the same screen so the user can complete the task without extra navigation
