//ELEMENTS

const fileSelect = document.getElementById("select-file-btn");
const fileStatus = document.getElementById("file-status");

const searchInput = document.getElementById("search-input");
const ctrlCheckbox = document.getElementById("ctrl-checkbox");
const shiftCheckbox = document.getElementById("shift-checkbox");
const altCheckbox = document.getElementById("alt-checkbox");
const tab1Btn = document.getElementById("tab1");
const tab2Btn = document.getElementById("tab2");
const listContainer = document.getElementById("list-container");
const listUl = document.getElementById("list-ul");

const availableKeysCountSpan = document.getElementById("available-count-span");
const usedKeysCountSpan = document.getElementById("used-count-span");
//STATE

const state = {
  activeTab: 1,
  availableKeys: [], // Full list of available keys
  usedKeys: [], // Full list of used keys
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

  // Apply search first to update scores
  const searchedAvailKeys = applySearch(availableKeys, searchQuery);
  const searchedUsedKeys = applySearch(usedKeys, searchQuery);

  // Filter the searched keys
  state.availKeysFiltered = filterKeys(searchedAvailKeys).sort((a, b) => a.score - b.score);
  state.usedKeysFiltered = filterKeys(searchedUsedKeys).sort((a, b) => a.score - b.score);
}

function render() {
  listUl.innerHTML = "";

  tab1Btn.classList.toggle("active", state.activeTab === 1);
  tab2Btn.classList.toggle("active", state.activeTab === 2);

  const activeList = state.activeTab === 1 ? state.availKeysFiltered : state.usedKeysFiltered;

  activeList.forEach((key) => {
    const listItem = document.createElement("li");
    listItem.innerText = key.key + (key.command ? ` | ${key.command}` : "");
    listUl.appendChild(listItem);
  });
}
window.onload = (event) => {
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
  setState({ activeTab: 1 });
});

tab2Btn.addEventListener("click", () => {
  setState({ activeTab: 2 });
});
