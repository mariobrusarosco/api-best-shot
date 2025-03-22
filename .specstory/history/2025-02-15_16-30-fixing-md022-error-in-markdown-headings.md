## SpecStory

## Fixing MD022 Error in Markdown Headings (2/15/2025, 4:30:02 PM)

_**User**_

For the code present, we get this error:
```
MD022/blanks-around-headings: Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below]
```
How can I resolve this? If you propose a fix, please make it concise.

---

_**Assistant**_

To resolve the MD022/blanks-around-headings error, you need to add blank lines before and after the heading in the SETUP.md file. Here's the concise fix:

````markdown:api-best-shot/docs/SETUP.md

### 4. Start Development

```bash
// ... existing code ...
```

// ... existing code ...
````

Add a blank line before the heading and another blank line after the code block. This will ensure proper spacing around the heading and resolve the MD022 error.

---



---

