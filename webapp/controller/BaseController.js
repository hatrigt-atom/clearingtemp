sap.ui.define(
    ["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/ui/model/Filter"],
    /**
 * @param {typeof sap.ui.core.mvc.Controller} Controller 
 * @param {typeof sap.ui.core.UIComponent} UIComponent
 * @param {typeof sap.ui.model.Filter} Filter 
 */
    // @ts-ignore
    function (Controller, UIComponent, Filter) {
        "use strict";

        return Controller.extend("atom.ui.clearing.clearingapplication.controller.BaseController", {

            /**
             * Getter for the resource bundle.
             * @public
             * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
             */
            getResourceBundle: function () {
                // @ts-ignore
                return this.getOwnerComponent().getModel("i18n").getResourceBundle();
            }


        });
    }
);
