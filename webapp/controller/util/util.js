sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function ( MessageToast, JSONModel) {
    "use strict";
    return {
        getTokenValues: function (items) {
            let aResult = [];
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                aResult.push(item.getProperty("key"));
            }
            return aResult;
        },

        /**
         * Sends GET Request
         * @public
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model
         * @param {string} sUrl - The URL for the request
         * @param {Object} oURLParameters - The URL parameters for the request
         * @param {sap.ui.model.Filter} [oFilter={}] - The filter for the request (optional)
         * @returns {Promise} - A Promise that resolves with the response if the request is successful, or rejects with the error if the request fails
        */
        // @ts-ignore
        getData: function (oModel, sUrl, oURLParameters = {}, oFilter = undefined) {
            return new Promise((resolve, reject) => {

                var options = {
                    urlParameters: oURLParameters,
                    success: function (response) {
                        resolve(response.results);
                    },
                    error: function (error) {
                        reject(error);
                    }
                };

                if (oFilter) {
                    options.filters = [oFilter];
                }

                oModel.read(sUrl, options);
            });

        },

        /**
         * Call Function Request
         * @public
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model
         * @param {String} sUrl - The URL for the request
         * @param {Object} oPayload - The URL parameters for the request
         * @param {String} sMethod - method for the request
         * @returns {Promise} - A Promise that resolves with the response if the request is successful, or rejects with the error if the request fails
        */
        // @ts-ignore
        callFunction: function (oModel, sUrl, oPayload = {}, sMethod) {
            return new Promise((resolve, reject) => {

                oModel.callFunction(sUrl, {
                    method: sMethod,
                    urlParameters: oPayload,
                    success: (oData) => resolve(oData),
                    error: (error) => {
                        try {
                            if (error?.responseText && JSON.parse(error?.responseText) && !!error?.responseText) {
                                reject(JSON.parse(error.responseText).error.message.value);
                            }
                        } catch (e) {
                            reject(error);
                        }
                    }
                });

            });

        },

        /**
         * Converts Foreign Currency to Local Currency
         * @public
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model
         * @param {String} sUrl - The URL for the request
         * @param {Object} oPayload - The URL parameters for the request
         * @param {String} sMethod - method for the request
         * @returns {Promise} - A Promise that resolves with the response if the request is successful, or rejects with the error if the request fails
        */
        // @ts-ignore
        convForeignCurrency: async function (that, foreignAmount, foreignCurrency, localCurrency, rate) {
            let oClearingModel = that.getView().getModel("clearingModel"),
                localAmount = 0,
                oPayload = {
                    "ForeignAmount": foreignAmount,
                    "ForeignCurrency": foreignCurrency,
                    "LocalCurrency": localCurrency,
                    "Rate": rate
                };

            let pConvForeignCurrency =  await this.callFunction(oClearingModel, "/convForeignCurrency", oPayload, "GET");

            await Promise.all([pConvForeignCurrency]).then((result) => {
                localAmount = result[0].LocalAmount;
            }).catch((error) => {
                MessageToast.error(that.getResourceBundle().getText("CommError"));
            });

            return localAmount;
        }

    };
});