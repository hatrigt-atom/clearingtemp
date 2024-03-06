/* eslint-disable consistent-this */
sap.ui.define([
    "sap/m/MessageBox",
    "./util"
], function (MessageBox, Util) {
    "use strict";
    return {
        clearingItemSelected: async function (oContext, that, currentSelectedItem) {
            let aSelectionResult = that.getView().getModel().getData().SelectionResult,
                oModel = oContext.getModel();
            let aOneSelectedItemIndex = that.byId("clearingTable").getSelectedIndices();
            let oOneSelectedItem = aOneSelectedItemIndex.length > 0 ? aSelectionResult[aOneSelectedItemIndex[0]] : undefined;
            if (oOneSelectedItem && oOneSelectedItem.ExpPayCurr !== currentSelectedItem.ExpPayCurr) {
                MessageBox.error(that.getResourceBundle().getText("expPayCurrDiffError"));

            }

            // Select the checkbox
            oModel.setProperty(oContext.getPath() + "/isSelected", true, oContext);

            if (currentSelectedItem.FixedRoe !== "" && currentSelectedItem.Hvorg !== "P190" && currentSelectedItem.OrigCurr !== currentSelectedItem.ExpPayCurr) {
                // Make RoeRecCurr editable 
                // aSelectionResult[itemIndex].isRoeRecCurrEditable = true;
                oModel.setProperty(oContext.sPath + "/isRoeRecCurrEditable", true, oContext);
            }

            // Make AllocAmn editable
            oModel.setProperty(oContext.sPath + "/isAllocAmnEditable", true, oContext);
            // aSelectionResult[itemIndex].isAllocAmnEditable = true;

            // Expected Pay Amn
            if (currentSelectedItem.RoeRecCurr === currentSelectedItem.RoeTr) {
                // currentSelectedItem.ExpPayAmn = currentSelectedItem.SettAmnRoeTr;
                oModel.setProperty(oContext.sPath + "/ExpPayAmn", currentSelectedItem.SettAmnRoeTr, oContext);
            } else {
                let localAmount = await Util.convForeignCurrency(that, currentSelectedItem.Amn, currentSelectedItem.OrigCurr, currentSelectedItem.ExpPayCurr, currentSelectedItem.RoeRecCurr);
                // currentSelectedItem.ExpPayAmn = localAmount;
                oModel.setProperty(oContext.sPath + "/ExpPayAmn", localAmount, oContext);
            }

            // Alloc Amn
            if (Number(currentSelectedItem.AllocAmn) === 0) {
                let iAllocAmn = currentSelectedItem.isClearable === true ?
                    currentSelectedItem.ClearableAmount : currentSelectedItem.Amn;
                oModel.setProperty(oContext.sPath + "/AllocAmn", iAllocAmn, oContext);
            }

            // 
            // currentSelectedItem.AllocAmnSettCurr = currentSelectedItem.ExpPayAmn;
            oModel.setProperty(oContext.sPath + "/AllocAmnSettCurr", currentSelectedItem.ExpPayAmn, oContext);


            // Delta Due Roe

            if (Number(currentSelectedItem.AllocAmn) !== 0 &&
                !(["PAYMENT", "OVER PAYMENT", "BANK CHARGE"].includes(currentSelectedItem.TrType))
                && ["CR", "PO", "EN"].includes(currentSelectedItem.Blart)) {

                if (currentSelectedItem.RoeRecCurr === currentSelectedItem.RoeTr
                    || currentSelectedItem.FixedRoe === "X" || currentSelectedItem.OrigCurr === currentSelectedItem.ExpPayCurr) {
                    oModel.setProperty(oContext.sPath + "/DeltaDueRoe", "0.000", oContext);
                    // currentSelectedItem.DeltaDueRoe = "0.000";
                } else {
                    let localAmount = Util.convForeignCurrency(that, currentSelectedItem.AllocAmn, currentSelectedItem.OrigCurr, currentSelectedItem.ExpPayCurr, currentSelectedItem.RoeTr);

                    // currentSelectedItem.DeltaDueRoe = currentSelectedItem.AllocAmnSettCurr - localAmount;
                    oModel.setProperty(oContext.sPath + "/DeltaDueRoe", currentSelectedItem.AllocAmnSettCurr - localAmount, oContext);
                }
            }
        },

        clearingItemUnSelected: async function (oContext) {
            let oModel = oContext.getModel();

            // UnSelect the Checkbox
            oModel.setProperty(oContext.getPath() + "/isSelected", false, oContext);

            // Clear the values
            oModel.setProperty(oContext.sPath + "/ExpPayAmn", "0.000", oContext);
            oModel.setProperty(oContext.sPath + "/AllocAmn", "0.000", oContext);
            oModel.setProperty(oContext.sPath + "/DeltaDueRoe", "0.000", oContext);
            oModel.setProperty(oContext.sPath + "/AllocAmnSettCurr", "0.000", oContext);

            // Make Fields Non-Editable
            oModel.setProperty(oContext.sPath + "/isRoeRecCurrEditable", false, oContext);
            oModel.setProperty(oContext.sPath + "/isAllocAmnEditable", false, oContext);
        },

        calculateClearingAmnDifference: function (that) {

            let oModel = that.getView().getModel(),
                oData = oModel.getData(),
                aProcessingStatus = oData.ProcessingStatus,
                // aSelectedSelectionResult = [],
                sumMap = new Map();
            // aSelectedIndices = that.byId("clearingTable").getSelectedIndices();

            // aSelectedIndices.forEach(function (itemIndex) {
            //     aSelectedSelectionResult.push(oData.SelectionResult[itemIndex]);
            // });

            // Sum the AllocAmnSettCurr values for each unique combination in aSelectedSelectionResult
            oData.SelectionResult.forEach((item) => {
                if (!item.isSelected) { return; }
                let key = `${item.Gpart}-${item.BpName}-${item.ExpPayCurr}`;
                if (!sumMap.has(key)) {
                    sumMap.set(key, 0);
                }
                sumMap.set(key, sumMap.get(key) + parseFloat(item.AllocAmnSettCurr));
            });

            // Update the AllocAmnSettCurr in aProcessingStatus with the summed values
            aProcessingStatus.forEach((item) => {
                let key = `${item.Gpart}-${item.BpName}-${item.CurrencyCode}`;
                if (sumMap.has(key)) {
                    item.DifferenceAmn = sumMap.get(key).toFixed(3); // Assuming 3 decimal places
                } else {
                    item.DifferenceAmn = "0.000";
                }
            });

            // aSelectedSelectionResult = [
            //     {
            //         "Gpart": "1",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "1.000"

            //     },
            //     {
            //         "Gpart": "2",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "1.000"

            //     },
            //     {
            //         "Gpart": "2",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "1.000"

            //     },
            //     {
            //         "Gpart": "1",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "1.000"
            //     }
            // ];

            // aProcessingStatus = [
            //     {
            //         "Gpart": "1",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "0.000"
            //     },
            //     {
            //         "Gpart": "2",
            //         "BpName": "Ajeeth",
            //         "CurrencyCode": "USD",
            //         "AllocAmnSettCurr": "0.000"
            //     }
            // ];

            oModel.setProperty("/ProcessingStatus", aProcessingStatus);
            oModel.refresh(true);

        },

        onAllocAmnChange: async function (oContext, that) {

            let currentSelectedItem = oContext.getModel().getProperty(oContext.sPath),
                iAllocAmn = currentSelectedItem.AllocAmn,
                oModel = oContext.getModel();

            if ((currentSelectedItem.ExpPayAmn < 0 && currentSelectedItem.AllocAmn > 0)
                || (currentSelectedItem.ExpPayAmn > 0 && currentSelectedItem.AllocAmn < 0)) {
                iAllocAmn = iAllocAmn * -1;
                oModel.setProperty(oContext.sPath + "/AllocAmn", iAllocAmn, oContext);
            }

            if (Math.abs(iAllocAmn) > Math.abs(currentSelectedItem.Amn)) {
                MessageBox.error(`Enter an Amount less than or equal to ${currentSelectedItem.Amn} `);
                oModel.setProperty(oContext.sPath + "/AllocAmn", 0, oContext);
                // If Alloc Amn is reset to Zero, then reset the values of Delta Due ROE and Alloc Amn SettCurr -- New Own
                oModel.setProperty(oContext.sPath + "/DeltaDueRoe", "0.000", oContext);
                oModel.setProperty(oContext.sPath + "/AllocAmnSettCurr", "0.000", oContext);
                return;
            }

            if (currentSelectedItem.AllocAmn === currentSelectedItem.Amn && currentSelectedItem.RoeRecCurr === currentSelectedItem.RoeTr) {
                oModel.setProperty(oContext.sPath + "/AllocAmnSettCurr", currentSelectedItem.SettAmnRoeTr, oContext);
            } else {
                let localAmount = await Util.convForeignCurrency(that, currentSelectedItem.AllocAmn, currentSelectedItem.OrigCurr, currentSelectedItem.ExpPayCurr, currentSelectedItem.RoeRecCurr);
                oModel.setProperty(oContext.sPath + "/AllocAmnSettCurr", localAmount, oContext);
            }

            // Update Delta Due ROE
            if (Number(currentSelectedItem.AllocAmn) !== 0 &&
                !(["PAYMENT", "OVER PAYMENT", "BANK CHARGE"].includes(currentSelectedItem.TrType))
                && ["CR", "PO", "EN"].includes(currentSelectedItem.Blart)) {

                if (currentSelectedItem.RoeRecCurr === currentSelectedItem.RoeTr
                    || currentSelectedItem.FixedRoe === "X" || currentSelectedItem.OrigCurr === currentSelectedItem.ExpPayCurr) {
                    oModel.setProperty(oContext.sPath + "/DeltaDueRoe", "0.000", oContext);
                    // currentSelectedItem.DeltaDueRoe = "0.000";
                } else {
                    let localAmount = await Util.convForeignCurrency(that, currentSelectedItem.AllocAmn, currentSelectedItem.OrigCurr, currentSelectedItem.ExpPayCurr, currentSelectedItem.RoeTr);

                    // currentSelectedItem.DeltaDueRoe = currentSelectedItem.AllocAmnSettCurr - localAmount;
                    oModel.setProperty(oContext.sPath + "/DeltaDueRoe", currentSelectedItem.AllocAmnSettCurr - localAmount, oContext);
                }
            }
        }


    };
}
);