sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("atom.ui.clearing.clearingapplication.controller.App", {
        onInit: function() {
          // apply content density mode to root view
          this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        }
      });
    }
  );
  