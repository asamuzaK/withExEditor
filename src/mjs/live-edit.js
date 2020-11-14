/**
 * live-edit.js
 */

export default {
  aceEditor: {
    className: 'ace_editor',
    getContent: '.ace_line',
    setContent: '.ace_text-input'
  },
  codeMirror: {
    className: 'CodeMirror',
    getContent: '.CodeMirror-line',
    setContent: '.CodeMirror > div:nth-child(1) > textarea:nth-child(1)'
  },
  tiddlyWiki: {
    isIframe: true,
    className: 'tc-edit-texteditor-body',
    getContent: 'body > textarea:nth-child(1)',
    setContent: 'body > textarea:nth-child(1)'
  },
  tinyMCE: {
    isIframe: true,
    className: null,
    getContent: '#tinymce',
    setContent: '#tinymce'
  }
};
