/**
 * live-edit.js
 */

const SELF = "_self";

export default {
  aceEditor: {
    className: "ace_editor",
    getContent: ".ace_line",
    setContent: ".ace_text-input",
  },
  codeMirror: {
    className: "CodeMirror",
    getContent: ".CodeMirror-line",
    setContent: ".CodeMirror > div:nth-child(1) > textarea:nth-child(1)",
  },
  gmail: {
    className: "editable",
    attributes: {
      "aria-multiline": "true",
      role: "textbox",
    },
    getContent: SELF,
    setContent: SELF,
  },
  tiddlyWiki: {
    isIframe: true,
    className: "tc-edit-texteditor-body",
    getContent: "body > textarea:nth-child(1)",
    setContent: "body > textarea:nth-child(1)",
  },
  tinyMCE: {
    isIframe: true,
    className: null,
    getContent: "#tinymce",
    setContent: "#tinymce",
  },
};
