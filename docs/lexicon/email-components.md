# Email Component Lexicon

Maps user requests to technical implementations. Reference the JSON files in `docs/examples/blocks/` for complete structures.

---

### Hero Image

**User Says:** "hero image", "banner", "header image", "main picture"  
**Block Type:** imageblock  
**assetType:** `{id: 199, name: "imageblock"}`  
**Example:** `docs/examples/blocks/hero-image.json`

---

### Intro Text

**User Says:** "intro", "editorial", "welcome text", "opening paragraph", "body copy"  
**Block Type:** textblock  
**assetType:** `{id: 196, name: "textblock"}`  
**Example:** `docs/examples/blocks/text-block.json`

---

### Call-to-Action (CTA)

**User Says:** "button", "CTA", "call to action", "link button"  
**Block Type:** buttonblock  
**assetType:** `{id: 195, name: "buttonblock"}`  
**Example:** `docs/examples/blocks/button-block.json`

---

### Two-Column Layout

**User Says:** "two columns", "2 columns", "side-by-side", "product grid"  
**Implementation:** Create a freeformblock with table containing two `<td>` cells  
**assetType:** `{id: 198, name: "freeformblock"}`  
**Example:** Use free-form-block.json as base, add table structure

---

### Free Form Block

**User Says:** "html block", "custom code", "mixed content"  
**Block Type:** freeformblock  
**assetType:** `{id: 198, name: "freeformblock"}`  
**Example:** `docs/examples/blocks/free-form-block.json`

---

### Dynamic Content

**User Says:** "personalized content", "dynamic block", "conditional section"  
**Implementation:** freeformblock with AMPscript  
**assetType:** `{id: 198, name: "freeformblock"}`  
**Example:** `docs/examples/blocks/dynamic-content-block.json`  
**Note:** Referenced content blocks must already exist in Content Builder

---

## Usage

When user requests a component:
1. Find matching entry above
2. Read the referenced example JSON
3. Copy structure and customize content
4. Include in email's slots/blocks
