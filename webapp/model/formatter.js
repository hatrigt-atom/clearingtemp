sap.ui.define(["sap/ui/core/format/NumberFormat"], function (NumberFormat) {
  "use strict";
  return {
    formatCurrency: function (value) {
      // Parse the string to a float value
      var fValue = parseFloat(value);

      // Use the NumberFormat to format the value with two decimal places
      var oNumberFormat = NumberFormat.getCurrencyInstance({
        showMeasure: false,
        decimalSeparator: ".",
        groupingSeparator: ",",
        minFractionDigits: 2,
        maxFractionDigits: 2
      });

      // Return the formatted number as a string
      return oNumberFormat.format(fValue);
    },
    formatDate: function (sTimestamp) {
      if (sTimestamp) {
        return sTimestamp.toLocaleDateString("en-GB").split("/").join(".");
      }
      return "";
    }

  };
});