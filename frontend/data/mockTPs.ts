import { TP } from "@/types";
import { tpIds, userIds } from "./mockIds";

export const mockTPs: TP[] = [
  {
    id: tpIds.tp1,
    title: "My First HTML Page",
    description:
      "Build a complete HTML page with a title, a paragraph of text, and an interactive button.",
    difficulty: "beginner",
    estimatedMinutes: 20,
    createdBy: userIds.teacher1,
    createdAt: "2024-01-10T09:00:00Z",
    starterHTML: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
</head>
<body>
  <!-- Write your code below -->

</body>
</html>`,
    steps: [
      {
        id: "step-1",
        title: "Add a Heading",
        instructions:
          "Add an <h1> element inside the <body> with the text 'Hello World'. A heading is the main title of your page.",
        requiredTags: ["h1"],
        quiz: [
          {
            id: "q1",
            question: "Which HTML tag is used for the main heading of a page?",
            options: [
              { id: "a", text: "<header>" },
              { id: "b", text: "<h1>" },
              { id: "c", text: "<title>" },
              { id: "d", text: "<main>" },
            ],
            correctId: "b",
            explanation:
              "<h1> defines the most important heading. There should be only one per page.",
          },
          {
            id: "q2",
            question: "Where should you place the <h1> tag?",
            options: [
              { id: "a", text: "Inside <head>" },
              { id: "b", text: "Inside <title>" },
              { id: "c", text: "Inside <body>" },
              { id: "d", text: "Outside <html>" },
            ],
            correctId: "c",
            explanation:
              "All visible content, including headings, goes inside the <body> tag.",
          },
        ],
      },
      {
        id: "step-2",
        title: "Add a Paragraph",
        instructions:
          "Below your heading, add a <p> element with a sentence describing yourself or your page.",
        requiredTags: ["h1", "p"],
        quiz: [
          {
            id: "q3",
            question: "What does the <p> tag stand for?",
            options: [
              { id: "a", text: "Page" },
              { id: "b", text: "Print" },
              { id: "c", text: "Paragraph" },
              { id: "d", text: "Position" },
            ],
            correctId: "c",
            explanation:
              "<p> stands for paragraph. It creates a block of text with spacing above and below.",
          },
        ],
      },
      {
        id: "step-3",
        title: "Add a Button",
        instructions:
          "Finally, add a <button> element below your paragraph. Give it the text 'Click Me!'.",
        requiredTags: ["h1", "p", "button"],
        quiz: [
          {
            id: "q4",
            question: "What does the <button> tag create?",
            options: [
              { id: "a", text: "A text input field" },
              { id: "b", text: "A clickable button" },
              { id: "c", text: "A link to another page" },
              { id: "d", text: "An image" },
            ],
            correctId: "b",
            explanation:
              "The <button> tag creates a clickable button. It can trigger JavaScript events or submit forms.",
          },
          {
            id: "q5",
            question: "Which attribute adds a tooltip to a button?",
            options: [
              { id: "a", text: "alt" },
              { id: "b", text: "label" },
              { id: "c", text: "title" },
              { id: "d", text: "hint" },
            ],
            correctId: "c",
            explanation:
              'The title attribute shows a tooltip when hovering. Example: <button title="Click to submit">',
          },
        ],
      },
    ],
  },
  {
    id: tpIds.tp2,
    title: "HTML Forms Basics",
    description:
      "Create an HTML form with inputs, labels, and a submit button.",
    difficulty: "intermediate",
    estimatedMinutes: 35,
    createdBy: userIds.teacher1,
    createdAt: "2024-01-15T10:00:00Z",
    starterHTML: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact Form</title>
</head>
<body>
  <h1>Contact Us</h1>
  <!-- Build your form here -->

</body>
</html>`,
    steps: [
      {
        id: "step-1",
        title: "Create the Form Skeleton",
        instructions:
          "Add a <form> element with action='#' and method='post'. This is the container for all your inputs.",
        requiredTags: ["form"],
        quiz: [
          {
            id: "q1",
            question: "What attribute specifies where form data is sent?",
            options: [
              { id: "a", text: "method" },
              { id: "b", text: "action" },
              { id: "c", text: "target" },
              { id: "d", text: "href" },
            ],
            correctId: "b",
            explanation:
              "The action attribute specifies the URL where the form data is submitted.",
          },
        ],
      },
      {
        id: "step-2",
        title: "Add Name & Email Inputs",
        instructions:
          "Inside the form, add two <input> elements: one for name (type='text') and one for email (type='email'). Each should have a <label>.",
        requiredTags: ["form", "input", "label"],
        quiz: [
          {
            id: "q2",
            question:
              "Which input type automatically validates email format in the browser?",
            options: [
              { id: "a", text: 'type="text"' },
              { id: "b", text: 'type="string"' },
              { id: "c", text: 'type="email"' },
              { id: "d", text: 'type="mail"' },
            ],
            correctId: "c",
            explanation:
              'type="email" triggers built-in browser validation to check for proper email format.',
          },
        ],
      },
      {
        id: "step-3",
        title: "Add a Submit Button",
        instructions:
          "Add a <button type='submit'> at the end of the form. Style it with an inline style if you like.",
        requiredTags: ["form", "input", "label", "button"],
        quiz: [
          {
            id: "q3",
            question: "What type of button submits a form?",
            options: [
              { id: "a", text: 'type="button"' },
              { id: "b", text: 'type="reset"' },
              { id: "c", text: 'type="submit"' },
              { id: "d", text: 'type="send"' },
            ],
            correctId: "c",
            explanation:
              'type="submit" sends the form data. type="reset" clears all fields. type="button" does nothing by default.',
          },
        ],
      },
    ],
  },
  {
    id: tpIds.tp3,
    title: "CSS Styling Fundamentals",
    description:
      "Style an HTML page using both inline styles and a <style> block.",
    difficulty: "beginner",
    estimatedMinutes: 25,
    createdBy: userIds.teacher2,
    createdAt: "2024-01-20T11:00:00Z",
    starterHTML: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Styled Page</title>
  <!-- Add your styles here -->
</head>
<body>
  <h1>My Styled Page</h1>
  <p>This page needs styling!</p>
  <div class="card">
    <p>This is a card component.</p>
  </div>
</body>
</html>`,
    steps: [
      {
        id: "step-1",
        title: "Add a Style Block",
        instructions:
          "Inside <head>, add a <style> tag and set body { font-family: sans-serif; background: #f0f0f0; }",
        requiredTags: ["style"],
        quiz: [
          {
            id: "q1",
            question: "Where should the <style> tag be placed?",
            options: [
              { id: "a", text: "In <body>" },
              { id: "b", text: "In <head>" },
              { id: "c", text: "After </html>" },
              { id: "d", text: "In <footer>" },
            ],
            correctId: "b",
            explanation:
              "CSS <style> blocks go in the <head> section so styles load before the page content renders.",
          },
        ],
      },
      {
        id: "step-2",
        title: "Style the Heading",
        instructions:
          "In your style block, style h1 with color: #2c3e50 and text-align: center.",
        requiredTags: ["style", "h1"],
        quiz: [
          {
            id: "q2",
            question:
              "Which CSS property centers text horizontally in its container?",
            options: [
              { id: "a", text: "align: center" },
              { id: "b", text: "text-align: center" },
              { id: "c", text: "justify: center" },
              { id: "d", text: "horizontal: center" },
            ],
            correctId: "b",
            explanation:
              "text-align: center is the correct CSS property for horizontal text alignment.",
          },
        ],
      },
    ],
  },
];
