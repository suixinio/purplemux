# req-organizer — Requirements Organization

Reads the source documents in the `requirements/` folder and generates a structured PRD.md.
Use when the user asks to "organize requirements" or "organize v1 requirements".

## Instructions

Perform the following steps in order.

### 1. Version Check

- If the user specified a version, use it (e.g., v1, v2)
- If unspecified, use the version currently in progress (check the latest version directory)

### 2. Read Source Documents

- Read all source documents under `.specs/v{N}/requirements/`
- Exclude `PRD.md` from the read list

### 3. Identify Duplicates / Conflicts and Merge

- Identify content that overlaps between documents
- Explicitly note any conflicting requirements
- Logically merge related content

### 4. Create / Update PRD.md

Create `.specs/v{N}/PRD.md` with the following structure:

```markdown
# v{N} Requirements

## Sources

- (List of source documents referenced)

## Page List (Derived)

| Page | Description | Priority |
| ---- | ----------- | -------- |
| ...  | ...         | ...      |

## Major Requirements

### {Page Name}

- Functional requirement items

## Constraints / Notes

- Technical / business constraints

## Open Questions

- [ ] Items needing further clarification
```

### 5. Handling an Existing PRD.md

- If a `PRD.md` already exists, update it to reflect the new source-document content
- Do not replace the existing content wholesale; only update the parts that changed

### 6. Apply the Quality Bar

- Don't just enumerate requirements — evaluate whether each feature is **at a level you could ship to a Forbes TOP 10 company without falling short**
- If a requirement stays at simple CRUD, propose extensions in `Open Questions` that raise it to a level usable in real-world operations
- If there are additional considerations from the perspectives of performance (fast response) and UX completeness (Toss-grade), specify them in `Constraints / Notes`
