var $buyInput = document.querySelector("#buy");
var $sellInput = document.querySelector("#sell");
var $amountInput = document.querySelector("#amount");
var $coinSelect = document.querySelector("#coin-select");
var $methodSelect = document.querySelector("#method-select");
var $result = document.querySelector("#result");
var $coingeckoLastUpdated = document.querySelector("#coin-gecko-last-updated");

var coinGeckoCache = {};
var state = {};

function isBuy() {
  return document.querySelector('input[name="type"]:checked').value === "buy";
}

function amount() {
  return parseInt($amountInput.value);
}

function coin() {
  return $coinSelect.value;
}

function transferMethod() {
  return $methodSelect.value;
}

function calculateFee(exchangeInfo, method) {
  return (
    method.fee(amount()) +
    exchangeInfo.tradingFee(amount()) +
    exchangeInfo.realSpread(amount()) +
    (isBuy()
      ? exchangeInfo.withdrawFee[coin()] * coinGeckoCache[coin()] || 0
      : 0)
  );
}

function syncCoinOptionElements() {
  // TODO: keep focus on prev elem if exists
  var last;
  while ((last = $coinSelect.lastChild)) $coinSelect.removeChild(last);
  ["BTC", "ETH"].forEach((coin) => {
    var elem = document.createElement("option");
    elem.value = coin;
    elem.text = coin;
    $coinSelect.add(elem);
  });
}

function syncMethodOptionElements() {
  var last;
  while ((last = $methodSelect.lastChild)) $methodSelect.removeChild(last);
  var acceptableMethods = {};
  Object.keys(DATA).forEach((exchangeName) => {
    var exchangeInfo = DATA[exchangeName];
    if (isBuy()) {
      exchangeInfo.depositMethods
        .filter((method) => amount() >= method.min && amount() <= method.max)
        .forEach((method) => (acceptableMethods[method.type] = true));
    } else {
      exchangeInfo.withdrawMethods
        .filter((method) => amount() >= method.min && amount() <= method.max)
        .forEach((method) => (acceptableMethods[method.type] = true));
    }
  });
  Object.keys(acceptableMethods).forEach((acceptableMethod) => {
    var elem = document.createElement("option");
    if (acceptableMethod === state.methodType) {
      elem.selected = true;
    }
    elem.value = acceptableMethod;
    elem.text = acceptableMethod;
    $methodSelect.add(elem);
  });
}

function displayResults() {
  // TODO: keep focus on prev elem
  var last;
  while ((last = $result.lastChild)) $result.removeChild(last);
  var results = [];
  Object.keys(DATA).forEach((exchangeName) => {
    var exchangeInfo = DATA[exchangeName];
    methods = isBuy()
      ? exchangeInfo.depositMethods
      : exchangeInfo.withdrawMethods;
    methods
      .filter((method) => amount() >= method.min && amount() <= method.max)
      .filter((method) => transferMethod() === method.type)
      .forEach((method) => {
        return results.push([
          exchangeName,
          method.type,
          calculateFee(exchangeInfo, method),
        ]);
      });
  });
  results
    .sort((a, b) => a[2] - b[2])
    .forEach((result) => {
      var elem = document.createElement("li");
      var textNode = document.createTextNode(
        result[0] + " " + result[1] + " " + +result[2].toFixed(2)
      );
      elem.appendChild(textNode);
      $result.append(elem);
    });
}

function sync() {
  if (!amount) return;
  displayResults();
}

$buyInput.onclick = function (e) {
  state.buy = true;
  syncMethodOptionElements();
  sync();
};

$sellInput.onclick = function (e) {
  state.buy = false;
  syncMethodOptionElements();
  sync();
};

$amountInput.onchange = function (e) {
  state.amount = e.target.value;
  syncMethodOptionElements();
  sync();
};

$coinSelect.onchange = function (e) {
  state.coin = e.target.value;
  sync();
};

$methodSelect.onchange = function (e) {
  state.methodType = e.target.value;
  sync();
};

syncCoinOptionElements();
syncMethodOptionElements();

fetch("/coingecko-cache.json")
  .then((response) => response.json())
  .then((data) => {
    coinGeckoCache = data;
    $coingeckoLastUpdated.textContent = "Coin data last updated " + new Date();
    sync();
  });
