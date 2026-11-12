import { operations } from "./operations.js";

const display = document.querySelector("#display");
const displayStatus = document.querySelector("#display-status");
const displayHint = document.querySelector("#display-hint");
const keypad = document.querySelector("#keypad");
const clearButton = document.querySelector("#clear");
const equalsButton = document.querySelector("#equals");
const operationGrid = document.querySelector("#operation-grid");
const emptyOperations = document.querySelector("#empty-operations");
const contributorList = document.querySelector("#contributor-list");
const operationCount = document.querySelector("#operation-count");

let currentValue = 0;
let currentInput = "0";
let pendingOperation = null;
let awaitingSecondOperand = false;
let replaceOnNextDigit = false;

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    throw new Error("The result must be a finite number.");
  }

  return String(Number(value.toPrecision(12)));
}

function setStatus(message, isError = false) {
  displayStatus.textContent = message;
  displayStatus.classList.toggle("is-error", isError);
}

function updateDisplay() {
  display.textContent = currentInput;
  displayHint.textContent = pendingOperation
    ? `${formatNumber(pendingOperation.firstOperand)} ${pendingOperation.operation.symbol} — enter another number`
    : "Choose a number to get started";
}

function enterDigit(digit) {
  if (awaitingSecondOperand || replaceOnNextDigit) {
    currentValue = 0;
    currentInput = "0";
    awaitingSecondOperand = false;
    replaceOnNextDigit = false;
  }

  if (digit === ".") {
    if (currentInput.includes(".")) {
      return;
    }
    currentInput += ".";
  } else {
    const nextValue = `${currentInput === "0" ? "" : currentInput}${digit}`;
    if (nextValue.replace(".", "").length > 15) {
      setStatus("Maximum of 15 digits", true);
      return;
    }
    currentInput = nextValue;
    currentValue = Number(nextValue);
  }

  currentValue = Number(currentInput);
  setStatus(pendingOperation ? "Enter the second number" : "Number entered");
  updateDisplay();
}

function calculate(operation, firstOperand, secondOperand) {
  try {
    const result = operation.arity === 1
      ? operation.execute(firstOperand)
      : operation.execute(firstOperand, secondOperand);
    const parsedResult = Number(result);
    currentValue = Number(formatNumber(parsedResult));
    currentInput = formatNumber(currentValue);
    pendingOperation = null;
    awaitingSecondOperand = false;
    replaceOnNextDigit = true;
    setStatus(`${operation.label} complete`);
    updateDisplay();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "The operation could not be completed.", true);
  }
}

function selectOperation(operation) {
  if (operation.arity === 1) {
    calculate(operation, currentValue);
    return;
  }

  const firstOperand = pendingOperation && awaitingSecondOperand
    ? pendingOperation.firstOperand
    : currentValue;
  pendingOperation = { operation, firstOperand };
  awaitingSecondOperand = true;
  replaceOnNextDigit = false;
  setStatus(`Selected ${operation.label}`);
  updateDisplay();
}

function renderOperations() {
  operationGrid.replaceChildren();
  contributorList.replaceChildren();
  operationCount.textContent = String(operations.length);
  emptyOperations.hidden = operations.length > 0;

  for (const operation of operations) {
    const button = document.createElement("button");
    button.className = "operation-button";
    button.type = "button";
    button.dataset.operationSymbol = operation.symbol;
    button.setAttribute("aria-label", `${operation.label}, ${operation.arity === 1 ? "one" : "two"} number${operation.arity === 1 ? "" : "s"}`);
    button.title = operation.label;

    const symbol = document.createElement("span");
    symbol.className = "operation-symbol";
    symbol.textContent = operation.symbol === "n!" ? "!" : operation.symbol;

    const label = document.createElement("span");
    label.className = "operation-label";
    label.textContent = operation.label;

    button.append(symbol, label);
    button.addEventListener("click", () => selectOperation(operation));
    operationGrid.append(button);

    const item = document.createElement("li");
    item.className = "contributor-item";
    const avatar = document.createElement("span");
    avatar.className = "contributor-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = operation.contributor?.trim().charAt(0).toUpperCase() || "✦";

    const details = document.createElement("div");
    details.className = "contributor-details";
    const name = document.createElement("div");
    name.className = "contributor-name";
    name.textContent = operation.contributor?.trim() || "Contributor not listed";
    const operationName = document.createElement("div");
    operationName.className = "contributor-operation";
    operationName.textContent = operation.label;
    details.append(name, operationName);
    item.append(avatar, details);
    contributorList.append(item);
  }

  if (operations.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-contributors";
    emptyItem.textContent = "Your class will show up here.";
    contributorList.append(emptyItem);
  }
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("[data-digit]");
  if (button) {
    enterDigit(button.dataset.digit);
  }
});

clearButton.addEventListener("click", () => {
  clearCalculator();
});

function clearCalculator() {
  currentValue = 0;
  currentInput = "0";
  pendingOperation = null;
  awaitingSecondOperand = false;
  replaceOnNextDigit = false;
  setStatus("Ready when you are");
  updateDisplay();
}

function calculatePendingOperation() {
  if (!pendingOperation) {
    setStatus("Select an operation first", true);
    return;
  }

  if (awaitingSecondOperand) {
    setStatus("Enter the second number first", true);
    return;
  }

  calculate(pendingOperation.operation, pendingOperation.firstOperand, currentValue);
}

equalsButton.addEventListener("click", calculatePendingOperation);

function deleteLastDigit() {
  if (currentInput === "0") {
    clearCalculator();
    return;
  }

  if (awaitingSecondOperand || replaceOnNextDigit) {
    currentInput = "0";
    currentValue = 0;
    awaitingSecondOperand = false;
    replaceOnNextDigit = false;
  } else {
    currentInput = currentInput.slice(0, -1) || "0";
    currentValue = Number(currentInput);
  }

  setStatus(pendingOperation ? "Enter the second number" : "Number entered");
  updateDisplay();
}

function flashButton(button) {
  if (!button) {
    return;
  }

  button.classList.add("pressed");
  window.setTimeout(() => button.classList.remove("pressed"), 140);
}

window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (/^[0-9.]$/.test(event.key)) {
    const button = keypad.querySelector(`[data-digit="${event.key}"]`);
    if (button) {
      event.preventDefault();
      flashButton(button);
      enterDigit(event.key);
    }
    return;
  }

  const operation = operations.find((item) => item.symbol === event.key
    || (event.key === "!" && item.symbol === "n!")
    || ((event.key === "x" || event.key === "X") && item.symbol === "*"));
  if (operation) {
    event.preventDefault();
    const button = Array.from(operationGrid.querySelectorAll(".operation-button"))
      .find((item) => item.dataset.operationSymbol === operation.symbol);
    flashButton(button);
    selectOperation(operation);
    return;
  }

  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    flashButton(equalsButton);
    calculatePendingOperation();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    flashButton(clearButton);
    deleteLastDigit();
    return;
  }

  if (event.key === "Escape" || event.key.toLowerCase() === "c") {
    event.preventDefault();
    flashButton(clearButton);
    clearCalculator();
  }
});

renderOperations();
updateDisplay();
