/**
 * controlPanel.js
 */
(() => {
  "use strict";
  const html = document.querySelector("html");
  const controlPanelForm = document.getElementById("controlPanelForm");
  const buttonIcon = document.getElementById("buttonIcon");
  const buttonIconGray = document.getElementById("buttonIconGray");
  const buttonIconWhite = document.getElementById("buttonIconWhite");
  const selectIcon = document.getElementById("selectIcon");
  const currentName = document.getElementById("currentEditorName");
  const editorName = document.getElementById("editorName");
  const editorLabel = document.getElementById("editorLabel");
  const storeLabel = document.getElementById("storeLabel");
  const openAddonManager = document.getElementById("openAddonManager");
  const inputRadios = document.querySelectorAll("input[type=radio]");

  /**
   * remove child nodes
   * @param {Object} node
   */
  const removeChildNodes = node => {
    if(node && node.hasChildNodes()) {
      while(node.firstChild) {
        node.removeChild(node.firstChild);
      }
    }
  };

  /**
   * toggle form inputs
   */
  const toggleInputs = () => {
    editorLabel && storeLabel && (
      editorName && editorName.value && currentName &&
      currentName.hasChildNodes() ? (
        removeChildNodes(currentName),
        currentName.appendChild(document.createTextNode(editorName.value)),
        editorLabel.removeAttributeNS(null, "disabled"),
        storeLabel.removeAttributeNS(null, "disabled")
      ) : (
        editorLabel.setAttributeNS(null, "disabled", "disabled"),
        storeLabel.setAttributeNS(null, "disabled", "disabled")
      )
    );
  };

  /**
   * get radio button value
   * @param {string} name - radio button name
   * @return {?string} - checked radio button value
   */
  const getRadioButtonValue = name => {
    let value = null;
    for(let node of inputRadios) {
      if(node.name && node.name === name && node.checked && node.value) {
        value = node.value;
        break;
      }
    }
    return value;
  };

  /**
   * self port emit
   * @param {Object} evt - event
   */
  const selfPortEmit = evt => {
    if(evt) {
      const type = evt.type;
      const target = evt.target;
      switch(type) {
        case "load":
          window.self.port.emit(type);
          break;
        case "change":
        case "submit":
          window.self.port.emit(type, {
            editorName: editorLabel && editorLabel.value ||
                        editorName && editorName.value || "",
            buttonIcon: type === "checked" && target.checked && target.name ||
                        buttonIcon && getRadioButtonValue(buttonIcon.name) ||
                        null
          });
          evt.preventDefault();
          break;
        case "click":
          target && target.hasAttributeNS(null, "data-href") &&
            window.self.port.emit(
              type,
              target.getAttributeNS(null, "data-href")
            );
          evt.preventDefault();
          break;
        default:
      }
    }
  };

  /**
   * check if radio button is checked
   * @param {Object} evt - event
   */
  const isRadioChecked = evt => {
    evt && evt.target && evt.target.checked && selfPortEmit(evt);
  };

  /**
   * update control panel
   * @param {Object} res - editor data
   */
  window.self.port.on("editorValue", res => {
    res && (
      editorName && (
        editorName.value = res.editorName,
        currentName && (
          currentName.hasChildNodes() && removeChildNodes(currentName),
          currentName.appendChild(
            document.createTextNode(editorName.value || res.currentEditorName)
          )
        ),
        editorLabel.value = editorName.value
      ),
      toggleInputs()
    );
  });

  /**
   * localize control panel
   * @param {Object} res - localize data
   */
  window.self.port.on("htmlValue", res => {
    res && (
      html && (html.lang = res.lang),
      selectIcon && (selectIcon.value = res.submit),
      currentName && (
        currentName.hasChildNodes() && removeChildNodes(currentName),
        currentName.appendChild(document.createTextNode(res.currentEditorName))
      ),
      editorLabel && (editorLabel.placeholder = res.editorLabel),
      storeLabel && (storeLabel.value = res.submit)
    );
  });

  /* on initial run */
  (() => {
    window.addEventListener("load", selfPortEmit, false);
    controlPanelForm &&
      controlPanelForm.addEventListener("submit", selfPortEmit, false);
    buttonIcon &&
      buttonIcon.addEventListener("change", isRadioChecked, false);
    buttonIconGray &&
      buttonIconGray.addEventListener("change", isRadioChecked, false);
    buttonIconWhite &&
      buttonIconWhite.addEventListener("change", isRadioChecked, false);
    openAddonManager &&
      openAddonManager.addEventListener("click", selfPortEmit, false);
    toggleInputs();
  })();
})();
