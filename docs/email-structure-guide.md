# MCE Editable Email Structure Guide

This guide explains the fundamental structure of an editable, template-based email. An email is constructed from two main parts:

1.  **A Base HTML Template:** This defines the overall layout and contains one or more "slots" where content can be placed.
2.  **Content Blocks:** These are the individual pieces of content (images, text, buttons) that are inserted into the slots.

---

### **Step 1: The Base HTML Template**

The template is a simple HTML structure. The most important element is `<div data-type="slot" data-key="..._">`, which defines an editable area.

```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "[http://www.w3.org/TR/html4/loose.dtd](http://www.w3.org/TR/html4/loose.dtd)">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body>
  <div style="font-size:0; line-height:0;"><custom name="opencounter" type="tracking" /></div>
  <table width="100%">
    <tr>
      <td>
        <div data-type="slot" data-key="main_content_slot"></div>
      </td>
    </tr>
  </table>
</body>
</html>