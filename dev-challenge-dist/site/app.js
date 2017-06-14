(function() {

  /**
   * Stores all the currency data received form server.
   */
  var currencyPairs = [];

  /**
   * End point to receive currency data.
   */
  var serverUrl = 'ws://localhost:8011/stomp';

  /**
   * Create a STOMP client.
   * STOMP JavaScript clients will communicate to a STOMP server
   */
  var client = Stomp.client(serverUrl);

  /**
   * Object to store currency wise Mid Price data.
   */
  var midPrices = {};

  /**
   * Sort array according to lastChangeBid.
   */
  function compareLastChangeBid(a, b) {
    if (a.lastChangeBid < b.lastChangeBid)
      return -1;
    if (a.lastChangeBid > b.lastChangeBid)
      return 1;
    return 0;
  };

  /**
   * Calculate mid price for particular currency.
   */
  function calculateMidPrice(currency) {
    return (currency.bestBid + currency.bestAsk) / 2;
  };

  /**
   * Store mid price value currency wise in object.
   */
  function storeCurrencyPrice(currencyPair) {
    var midPrice = calculateMidPrice(currencyPair);
    //Checks if array of currency is present in midPrices object.
    if (!midPrices[currencyPair.name]) {
      midPrices[currencyPair.name] = [];
    }
    /**
     * Checks if received currency data has exceeded 30 sec.
     * if yes, latest 30 sec data is pushed in array.
     * if no, 30 sec data is collected in array.
     */
    if (midPrices[currencyPair.name].length === 30) {
      midPrices[currencyPair.name].shift();
    }
    midPrices[currencyPair.name].push(midPrice);
  };

  /**
   * Fetch latest currency data form end point.
   */
  function connectCallBack(response) {
    client.subscribe("/fx/prices", function(response) {
      var currencyPair = JSON.parse(response.body);
      //Store first record in currency array.
      if (currencyPairs.length == 0) {
        currencyPairs.push(currencyPair);
      }
      else {
        // Validates if new currency received form end point.
        var isCurrency = false;
        for (var currencyItem = 0; currencyItem < currencyPairs.length; currencyItem++) {
          if (currencyPair.name == currencyPairs[currencyItem]['name']) {
            isCurrency = true;
            currencyPairs[currencyItem] = currencyPair;
            currencyPairs.sort(compareLastChangeBid);
            storeCurrencyPrice(currencyPair);
            createCurrencyTable(currencyPairs);
          }
        }
        // Stores when currency received for first time.
        if (!isCurrency) {
          currencyPairs.push(currencyPair);
          currencyPairs.sort(compareLastChangeBid);
          storeCurrencyPrice(currencyPair);
          createCurrencyTable(currencyPairs);
        }
      }
    });
  };

  /**
   * Connects and authenticates to the STOMP server.
   */
  try {
    client.connect('', '', connectCallBack);
  } catch (error) {
    console.log("ERROR : ".error);
  }

  /**
   * Plots Table and sparkline.
   */
  function createCurrencyTable(currencyPairs) {
    //Find the div to ploat the table.
    var currencyTable = document.getElementById("currencyTable");

    //Update table when values change.
    while (currencyTable.hasChildNodes()) {
      currencyTable.removeChild(currencyTable.lastChild);
    }
    var table = document.createElement('TABLE');
    var tableBody = document.createElement('TBODY');

    table.border = '1';

    //Append table tag to table div.
    table.appendChild(tableBody);

    // Holds headers for table.
    var heading = ["Name", "Best Bid",
      "Best Ask", "Open Bid", "Open Ask",
      "Last Change Ask", "Last Change Bid", "Mid Price"];

    //Holds keys received form data form stomp server.
    var currencyKeyNames = ["name", "bestBid",
      "bestAsk", "openBid", "openAsk",
      "lastChangeAsk", "lastChangeBid"];

    //Create Table columns
    var tr = document.createElement('TR');
    tableBody.appendChild(tr);

    //Add header text to table columns.
    for (i = 0; i < heading.length; i++) {
      var th = document.createElement('TH')
      th.width = '75';
      th.appendChild(document.createTextNode(heading[i]));
      tr.appendChild(th);
    }

    //Create table rows.
    for (i = 0; i < currencyPairs.length; i++) {
      var tr = document.createElement('TR');
      for (j = 0; j < currencyKeyNames.length; j++) {
        //Add values to rows to currency table.
        var td = document.createElement('TD');
        td.appendChild(document.createTextNode(currencyPairs[i][currencyKeyNames[j]]));
        tr.appendChild(td);
      }
      // Plots sparkline in last column.
      var td = document.createElement('TD');
      var sparklineContainer = document.createElement('div');
      sparklineContainer.setAttribute("id", currencyPairs[i].name);
      var sparkline1 = new Sparkline(sparklineContainer);
      sparkline1.draw(midPrices[currencyPairs[i].name]);
      td.appendChild(sparklineContainer);
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
    currencyTable.appendChild(table)
  }
})();