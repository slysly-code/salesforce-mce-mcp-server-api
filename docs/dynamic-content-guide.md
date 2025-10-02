# Guide: Building Dynamic Content Blocks

Dynamic content allows for personalizing emails by showing different content based on subscriber data. This is achieved by placing AMPscript logic inside a **Free Form Block**.

---

### **Core Concept**

The process involves translating a user's request (e.g., "If the user is male, show the 'mens_special' block, otherwise show the 'womens_special' block") into an `IF/ELSEIF/ELSE` structure in AMPscript.

The basic AMPscript structure is:

```ampscript
%%[
  IF [Attribute] == "Value1" THEN
]%%
  %%=ContentBlockById("ID_for_Value1")=%%
%%[
  ELSEIF [Attribute] == "Value2" THEN
]%%
  %%=ContentBlockById("ID_for_Value2")=%%
%%[
  ELSE
]%%
  %%=ContentBlockById("Default_Content_ID")=%%
%%[
  ENDIF
]%%