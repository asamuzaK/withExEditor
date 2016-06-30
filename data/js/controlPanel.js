/**
 * controlPanel.js
 */
"use strict";
{
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
   * @param {Object} node - node
   * @return {void}
   */
  const removeChildNodes = node => {
    if (node && node.hasChildNodes()) {
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    }
  };

  /**
   * toggle form inputs
   * @return {void}
   */
  const toggleInputs = () => {
    editorLabel && storeLabel && (
      editorName && editorName.value && currentName &&
      currentName.hasChildNodes() ? (
        removeChildNodes(currentName),
        currentName.appendChild(document.createTextNode(editorName.value)),
        editorLabel.removeAttributeNS("", "disabled"),
        storeLabel.removeAttributeNS("", "disabled")
      ) : (
        editorLabel.setAttributeNS("", "disabled", "disabled"),
        storeLabel.setAttributeNS("", "disabled", "disabled")
      )
    );
  };

  /**
   * get radio button value
   * @param {string} name - radio button name
   * @return {?string} - checked radio button value
   */
  const getRadioValue = name => {
    let value = null;
    for (const node of inputRadios) {
      if (node.name && node.name === name && node.checked && node.value) {
        value = node.value;
        break;
      }
    }
    return value;
  };

  /**
   * self port emit
   * @param {Object} evt - event
   * @return {void}
   */
  const selfPortEmit = evt => {
    const type = evt && evt.type;
    const target = evt && evt.target;
    switch (type) {
      case "load":
        window.self.port.emit(type);
        break;
      case "change":
      case "submit":
        window.self.port.emit(type, {
          editorName: editorLabel && editorLabel.value ||
                      editorName && editorName.value || "",
          buttonIcon: target && target.checked && target.value ||
                      buttonIcon && getRadioValue(buttonIcon.name) || null
        });
        evt.preventDefault();
        break;
      case "click":
        target && target.hasAttributeNS("", "data-href") &&
          window.self.port.emit(
            type,
            target.getAttributeNS("", "data-href")
          );
        evt.preventDefault();
        break;
      default:
    }
  };

  /**
   * check if radio button is checked
   * @param {Object} evt - event
   * @return {void}
   */
  const isRadioChecked = evt => {
    evt && evt.target && evt.target.checked && selfPortEmit(evt);
  };

  /* update control panel */
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

  /* localize control panel */
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

  /* add event listeners */
  document.addEventListener("DOMContentLoaded", () => {
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
  }, false);
}
