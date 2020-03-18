/**
 * live-edit.js
 */

export default {
  aceEditor: {
    className: "ace_editor",
    getContent: ".ace_line",
    setContent: ".ace_text-input",
  },
  codeMirror: {
    className: "CodeMirror",
    getContent: ".CodeMirror-line",
    setContent: ".CodeMirror > div > textarea",
  },
};
