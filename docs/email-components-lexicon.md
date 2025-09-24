# Email Component Lexicon

This guide maps common user requests to their corresponding technical email components. The LLM should use this file to understand the user's intent and then retrieve the specific JSON structure from the `component-examples/` directory.

---

### **Component: Hero Image**

* **User Phrases:** "hero image," "banner," "header image," "main picture"
* **Description:** A large, full-width image placed at the top of the email to capture attention. It should have no side padding to span the entire content area.
* **Technical Implementation:** An `imageblock`.
* **Example File:** `component-examples/hero-image.json`

---

### **Component: Intro Text**

* **User Phrases:** "intro," "editorial," "welcome text," "opening paragraph"
* **Description:** A standard text block for the main body copy of the email.
* **Technical Implementation:** A `textblock`.
* **Example File:** `component-examples/intro-text.json`

---

### **Component: Call-to-Action (CTA)**

* **User Phrases:** "button," "CTA," "call to action," "link button"
* **Description:** A clickable button designed to drive a user action.
* **Technical Implementation:** A `buttonblock`.
* **Example File:** `component-examples/cta-button.json`

---

### **Component: Two-Column Layout**

* **User Phrases:** "two columns," "2 columns," "side-by-side," "product grid"
* **Description:** A layout that displays two items next to each other, often used for product showcases. This requires creating a slot with a two-column structure.
* **Technical Implementation:** A layout structure containing two slots.
* **Example File:** `component-examples/two-column-layout.json`