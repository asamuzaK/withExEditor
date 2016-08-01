"use strict";
{
  const elm = document.documentElement;
  const key = window.self.options.key;
  elm && elm.addEventListener("keypress", evt => {
    if (evt.key.toLowerCase() === key) {
      console.log(evt.target.nodeName);
      console.log(evt.key);
      console.log(evt.altKey);
      console.log(evt.ctrlKey);
      console.log(evt.shiftKey);
      console.log(evt.metaKey);
    }
  }, false);
}
