//ELEMENTS

const fileSelect = document.getElementById("select-file-btn");
const fileStatus = document.getElementById("file-status");

const searchInput = document.getElementById("search-input");
const ctrlCheckbox = document.getElementById("ctrl-checkbox");
const shiftCheckbox = document.getElementById("shift-checkbox");
const altCheckbox = document.getElementById("alt-checkbox");
const tab1Btn = document.getElementById("tab1");
const tab2Btn = document.getElementById("tab2");
const tab3Btn = document.getElementById("tab3");
const sortSelect = document.getElementById("sort-select");
const listContainer = document.getElementById("list-container");
const listHeaderWrap = document.getElementById("list-header-wrap");
const listBody = document.getElementById("list-body");
const listHeaders = document.getElementsByClassName("list-header");

const footerWrap = document.getElementById("footer");
const availableKeysCountSpan = document.getElementById("available-count-span");
const usedKeysCountSpan = document.getElementById("used-count-span");

const macroButtonsWrap = document.getElementById("macro-buttons");
const selectAllMacrosBtn = document.getElementById("macro-selectall-btn");
const exportMacrosBtn = document.getElementById("export-macros-btn");
//STATE

const state = {
  activeTab: 0,
  activeSort: sortSelect.value,
  availableKeys: [], // Full list of available keys
  usedKeys: [], // Full list of used keys
  macros: [],
  selectedMacros: [],
  filters: { ctrl: false, shift: false, alt: false },
  searchQuery: "",
  availKeysFiltered: [],
  usedKeysFiltered: [],
};
function setState(updates) {
  Object.assign(state, updates);
  applyFiltersAndSearch();
  render();
  localStorage.setItem("storedState", JSON.stringify(state));
}

function generatePossibleKeybinds() {
  const result = [];
  const baseKeys = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "[", "]", ";", "'", ",", ".", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Insert", "Home", "End", "Del", "Return", "Enter", "Space", "Pad0", "Pad1", "Pad2", "Pad3", "Pad4", "Pad5", "Pad6", "Pad7", "Pad8", "Pad9", "Pad *", "Pad -", "Pad +", "Pad /", "Left Arrow", "Right Arrow", "Up Arrow", "Down Arrow", "Backspace"];
  const modifiers = ["Ctrl", "Alt", "Shift", "Ctrl+Shift", "Ctrl+Alt", "Alt+Shift", "Ctrl+Alt+Shift"];

  for (const key of baseKeys) {
    result.push({
      key: key,
      family: key,
      ctrl: false,
      shift: false,
      alt: false,
      score: 0,
    });
    for (const mod of modifiers) {
      result.push({
        key: mod + "+" + key,
        family: key,
        ctrl: mod.includes("Ctrl"),
        shift: mod.includes("Shift"),
        alt: mod.includes("Alt"),
        score: 0,
      });
    }
  }
  return result;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === "text/xml") {
    const reader = new FileReader();
    reader.onload = function (e) {
      const xmlContent = e.target.result;
      let result = parseXML(xmlContent);
      if (result) {
        fileStatus.innerText = "File succesfully loaded";
      } else {
        console.error("Invalid Key Commands File");
        fileStatus.innerText = "Please upload a valid XML file.";
      }
    };
    reader.readAsText(file);
  } else {
    console.error("Invalid Key Commands File");
    fileStatus.innerText = "Please upload a valid XML file.";
  }
}

function parseXML(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  if (xmlDoc.documentElement.nodeName === "KeyCommands" || xmlDoc.documentElement.nodeName === "KeyCommandsPreset") {
    const usedKeys = [];
    const availableKeys = generatePossibleKeybinds();

    //helper function
    const removeKeyFromAvailable = (key) => {
      const index = availableKeys.findIndex((k) => k.key === key);
      if (index !== -1) {
        availableKeys.splice(index, 1);
      }
    };

    // Get nodes for each category
    const categoryNodes = xmlDoc.evaluate("//list[@name='Categories']/item", xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const macroNodes = xmlDoc.evaluate("//list[@name='Macros']/item", xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < macroNodes.snapshotLength; i++) {
      const macroNode = macroNodes.snapshotItem(i);
      const serializer = new XMLSerializer();
      const macroToString = serializer.serializeToString(macroNode);
      const macroName = xmlDoc.evaluate("string[@name='Name']", macroNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const macroCommands = xmlDoc.evaluate(".//list[@name='Commands']/item", macroNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

      const macro = { name: macroName?.getAttribute("value"), commands: [], selected: false, id: i, xml: macroToString };

      console.log(macroName);
      for (let j = 0; j < macroCommands.snapshotLength; j++) {
        const commandNode = macroCommands.snapshotItem(j);
        const commandName = xmlDoc.evaluate(".//string[@name='Name']", commandNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.getAttribute("value");
        const commandCategory = xmlDoc.evaluate(".//string[@name='Category']", commandNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.getAttribute("value");

        macro.commands.push({ name: commandName, category: commandCategory });
        console.log(commandName);
        console.log(commandCategory);
      }
      state.macros.push(macro);
    }

    // Parse key commands XML data
    for (let i = 0; i < categoryNodes.snapshotLength; i++) {
      const categoryNode = categoryNodes.snapshotItem(i);

      // Get nodes within the category that match the given conditions
      const nodes = xmlDoc.evaluate(".//item[string[@name='Name']]", categoryNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

      // Get the category name
      const categoryNameNode = xmlDoc.evaluate("string[@name='Name']", categoryNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

      const category = categoryNameNode ? categoryNameNode.getAttribute("value") : "";

      for (let j = 0; j < nodes.snapshotLength; j++) {
        const node = nodes.snapshotItem(j);
        // Get the name and key nodes
        const nameNode = xmlDoc.evaluate("string[@name='Name']", node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        const keyNode = xmlDoc.evaluate("string[@name='Key']", node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        const listNodeKeys = xmlDoc.evaluate("list[@name='Key']/item", node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        const nameValue = nameNode ? nameNode.getAttribute("value") : "";

        //if listnode (multiple keys assigned to command)
        if (listNodeKeys.snapshotLength > 0) {
          const keyValues = [];
          for (let k = 0; k < listNodeKeys.snapshotLength; k++) {
            const node = listNodeKeys.snapshotItem(k);
            const keyValue = node.getAttribute("value");
            keyValues.push(keyValue);
            removeKeyFromAvailable(keyValue); //remove from available keys
          }
          const index = keyValues[0].lastIndexOf("+");
          const keyFamily = index === -1 ? keyValues[0] : keyValues[0].slice(index + 1);
          usedKeys.push({
            key: keyValues.join(";"),
            command: `${category} > ${nameValue}`,
            family: keyFamily,
            ctrl: keyValues[0].includes("Ctrl"),
            shift: keyValues[0].includes("Shift"),
            alt: keyValues[0].includes("Alt"),
            score: 1,
          });
        } else if (keyNode) {
          //else just check the single keynode
          const keyValue = keyNode.getAttribute("value");
          const index = keyValue.lastIndexOf("+");
          const keyFamily = index === -1 ? keyValue : keyValue.slice(index + 1);
          usedKeys.push({
            key: keyValue,
            command: `${category} > ${nameValue}`,
            family: keyFamily,
            ctrl: keyValue.includes("Ctrl"),
            shift: keyValue.includes("Shift"),
            alt: keyValue.includes("Alt"),
            score: 1,
          });
          removeKeyFromAvailable(keyValue); //remove from available keys
        }
      }
    }
    setState({ usedKeys: [...usedKeys], availableKeys: [...availableKeys] });
    availableKeysCountSpan.innerText = availableKeys.length;
    usedKeysCountSpan.innerText = usedKeys.length;
    return true;
  } else {
    console.error("Invalid Key Commands File");
    return false;
  }
}

function createXMLFromSelectedMacros() {
  const result = state.macros.reduce((acc, macro) => {
    if (!macro.selected) {
      return acc;
    }
    return acc + macro.xml;
  }, "<Macros>\n  ");
  return result + "\n</Macros>";
}

// Function to trigger the download
function downloadXML() {
  // Create a Blob from the XML string
  if (!state.macros.some((macro) => macro.selected)) {
    return console.log("No Macros Selected");
  }
  const blob = new Blob([createXMLFromSelectedMacros()], { type: "application/xml" });

  // Create a temporary anchor element
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "cubase-macros-export.xml"; // File name for the download

  // Append the anchor to the body, trigger a click, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the object URL to free up memory
  URL.revokeObjectURL(link.href);
}

function applyFiltersAndSearch() {
  const { availableKeys, usedKeys, filters, searchQuery } = state;

  const applySearch = (keys, query) => {
    if (!query) return keys.map((key) => ({ ...key, score: 1 }));

    const fuse = new Fuse(keys, {
      distance: 50,
      includeScore: true,
      keys: ["key"],
    });
    const results = fuse.search(query);

    return keys.map((key, i) => {
      const result = results.find((res) => res.refIndex === i);
      return {
        ...key,
        score: result ? result.score : 1,
      };
    });
  };

  const filterKeys = (keys) => {
    const { ctrl, shift, alt } = filters;

    return keys.filter((key) => {
      return (
        ctrl + shift + alt === 0 || // No filters applied
        (key.ctrl === ctrl && key.shift === shift && key.alt === alt)
      );
    });
  };

  const sortMethod = (a, b) => {
    let isAsc = state.activeSort.split("-")[1] === "asc";
    if (state.activeSort.includes("amount")) {
      return isAsc ? a.score - b.score : b.score - a.score;
    }
    const propertyToSort = state.activeSort.split("-")[0]; //remove the asc or desc part
    return isAsc ? a[propertyToSort].localeCompare(b[propertyToSort]) : b[propertyToSort].localeCompare(a[propertyToSort]);
  };

  // Apply search first to update scores
  const searchedAvailKeys = applySearch(availableKeys, searchQuery);
  const searchedUsedKeys = applySearch(usedKeys, searchQuery);

  // Filter the searched keys
  if (state.activeTab === 0) {
    state.availKeysFiltered = filterKeys(searchedAvailKeys).sort(sortMethod);
  } else if (state.activeTab === 1) {
    state.usedKeysFiltered = filterKeys(searchedUsedKeys).sort(sortMethod);
  }
}

function render() {
  listBody.innerHTML = "";

  let i = state.activeTab; //use the activeTab as index

  tab1Btn.classList.toggle("active", i === 0);
  tab2Btn.classList.toggle("active", i === 1);
  tab3Btn.classList.toggle("active", i === 2);

  const label1 = ["Keybind", "Keybind", "Macro"];
  const label2 = ["Family", "Command", "Commands"];

  sortSelect.children[4].value = label2[i].toLowerCase() + "-asc";
  sortSelect.children[5].value = label2[i].toLowerCase() + "-desc";
  sortSelect.children[4].innerText = label2[i] + " (asc)";
  sortSelect.children[5].innerText = label2[i] + " (desc)";

  listHeaders[0].innerText = label1[i];
  listHeaders[0].setAttribute("data-header", label1[i].toLowerCase());

  listHeaders[1].innerText = label2[i];
  listHeaders[1].setAttribute("data-header", label2[i].toLowerCase());

  const lists = [state.availKeysFiltered, state.usedKeysFiltered, state.macros];

  if (i !== 2) {
    footerWrap.style.display = "flex";
    macroButtonsWrap.style.display = "none";
  } else {
    footerWrap.style.display = "none";
    macroButtonsWrap.style.display = "flex";
  }
  lists[i].forEach((item) => {
    if (i !== 2) {
      renderItem(item);
    } else {
      renderMacro(item);
    }
  });
}

function renderItem(item) {
  const listItem = document.createElement("div");
  listItem.className = "list-item";

  const listItemLeft = document.createElement("div");
  listItemLeft.classList.add("list-item-left");

  const listItemRight = document.createElement("div");
  listItemRight.classList.add("list-item-right");

  listItemLeft.innerText = state.activeTab !== 2 ? item.key : item.name;
  listItemRight.innerText = state.activeTab === 0 ? item.family : item.command;

  listItem.appendChild(listItemLeft);
  listItem.appendChild(listItemRight);
  listBody.appendChild(listItem);
}

function renderMacro(item) {
  const macroItem = document.createElement("div");
  macroItem.className = "macro-item";
  macroItem.setAttribute("data-id", item.id);
  macroItem.addEventListener("click", (e) => {
    macroItem.classList.toggle("selected");
    state.macros.find((macro) => macro.id === item.id).selected = !item.selected;
  });

  const macroItemToggle = document.createElement("div");
  macroItemToggle.className = "macro-item-toggle";
  macroItemToggle.innerText = item.name;

  macroItem.appendChild(macroItemToggle);

  item.commands.forEach((command) => {
    const commandItem = document.createElement("div");
    commandItem.className = "macro-item-command";

    commandItem.innerText = `${command.category} > ${command.name}`;
    macroItem.appendChild(commandItem);
  });

  listBody.appendChild(macroItem);
}

window.onload = () => {
  if (localStorage.getItem("storedState")) {
    const storedState = JSON.parse(localStorage.getItem("storedState"));
    storedState.searchQuery = "";
    setState({ ...storedState });
    availableKeysCountSpan.innerText = state.availableKeys.length;
    usedKeysCountSpan.innerText = state.usedKeys.length;
    ctrlCheckbox.checked = state.filters.ctrl;
    shiftCheckbox.checked = state.filters.shift;
    altCheckbox.checked = state.filters.alt;
  }
};

// EVENT LISTENERS
fileSelect.addEventListener("change", handleFileUpload);

ctrlCheckbox.addEventListener("click", (e) => {
  setState({ filters: { ...state.filters, ctrl: e.target.checked } });
});

shiftCheckbox.addEventListener("click", (e) => {
  setState({ filters: { ...state.filters, shift: e.target.checked } });
});

altCheckbox.addEventListener("click", (e) => {
  setState({ filters: { ...state.filters, alt: e.target.checked } });
});

searchInput.addEventListener("input", (e) => {
  setState({ searchQuery: e.target.value });
});

tab1Btn.addEventListener("click", () => {
  sortSelect.value = "amount-asc";
  setState({ activeTab: 0, activeSort: "amount-asc" });
});

tab2Btn.addEventListener("click", () => {
  sortSelect.value = "amount-asc";
  setState({ activeTab: 1, activeSort: "amount-asc" });
});

tab3Btn.addEventListener("click", () => {
  setState({ activeTab: 2, activeSort: "amount-asc" });
});

sortSelect.addEventListener("change", (e) => {
  setState({ activeSort: e.target.value });
});

selectAllMacrosBtn.addEventListener("click", () => {
  const macroElements = document.querySelectorAll("div.macro-item");
  if (Array.from(macroElements).every((element) => element.classList.contains("selected"))) {
    macroElements.forEach((element, i) => {
      element.classList.remove("selected");
      state.macros[i].selected = false;
    });
  } else {
    macroElements.forEach((element, i) => {
      element.classList.add("selected");
      state.macros[i].selected = true;
    });
  }
});

exportMacrosBtn.addEventListener("click", downloadXML);
