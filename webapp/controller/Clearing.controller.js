/* eslint-disable no-console */
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "./util/util",
    "./util/ActionHelper",
    "sap/m/p13n/Engine",
    "sap/m/p13n/SelectionController",
    "sap/m/p13n/SortController",
    "sap/m/p13n/GroupController",
    "sap/m/p13n/MetadataHelper",
    "sap/ui/model/Sorter",
    "sap/ui/core/library",
    "sap/m/table/ColumnWidthController",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../model/mockdata",
    "sap/ui/core/routing/History",
    "sap/ui/core/Element"

],

/**
 * MainView Controller
 * 
 * This controller extends the BaseController and is responsible for handling
 * the view logic for the MainView of the Clearing Application. It includes
 * functionality for model manipulation, message display, sorting, grouping,
 * and selection within the table, as well as handling various UI actions.
 * 
 * @extends BaseController
 * @param {*} BaseController - BaseController
 * @param {sap.ui.model.json.JSONModel} JSONModel - JSON Model used for data binding
 * @param {sap.m.MessageToast} MessageToast - MessageToast for showing brief messages
 * @param {any} formatter - Utility object with formatter functions
 * @param {any} util - Utility object with general utility functions
 * @param {any} ActionHelper - Utility object for handling actions
 * @param {sap.m.p13n.Engine} Engine - Personalization engine for table configuration
 * @param {sap.m.p13n.SelectionController} SelectionController - Controller for selection personalization
 * @param {sap.m.p13n.SortController} SortController - Controller for sorting personalization
 * @param {sap.m.p13n.GroupController} GroupController - Controller for grouping personalization
 * @param {sap.m.p13n.MetadataHelper} MetadataHelper - Helper for metadata operations
 * @param {sap.ui.model.Sorter} Sorter - Utility for sorting model data
 * @param {sap.ui.core.library} CoreLibrary - Core library for UI5 framework
 * @param {sap.m.table.ColumnWidthController} ColumnWidthController - Controller for managing table column widths
 * @param {sap.m.MessageBox} MessageBox - Utility for showing alert dialogs
 * @param {sap.ui.core.Fragment} Fragment - Utility for handling UI fragments
 * @param {Object} MockData - Mock data for testing and development
 * @param {sap.ui.core.routing.History} History - Utility for handling routing history
 * @param {sap.ui.core.Element} Element - Utility for handling routing history
 * @returns {sap.ui.core.mvc.Controller} A new MainView controller instance
 */
    // eslint-disable-next-line max-params
    function (BaseController,
        JSONModel,
        MessageToast,
        formatter,
        util,
        ActionHelper,
        Engine,
        SelectionController,
        SortController,
        GroupController,
        MetadataHelper,
        Sorter,
        CoreLibrary,
        ColumnWidthController,
        MessageBox,
        Fragment, MockData, History, Element) {
        "use strict";

        return BaseController.extend("atom.ui.clearing.clearingapplication.controller.Clearing", {
            formatter: formatter,
            util: util,
            
            
            onInit: function () {
                this._initDisplayData();
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.getRoute("RouteClearingView").attachPatternMatched(this._onRouteMatched, this);
            },

            _initDisplayData: function () {
                this.getView().setBusy(true);
                // todo: Add the clearing data to the model
                let oClearingData = this.getOwnerComponent().getModel("clearingDataModel").getData();
                // this.getOwnerComponent().setModel(new JSONModel(oClearingData),"clearingDataModel");
                oClearingData.SelectionResult.forEach((line) => {
                    line.isSelected = false;
                    line.isRoeRecCurrEditable = false;
                    line.isAllocAmnEditable = false;
                    line.isClearable = false;
                }); // Todo Uncomment on prod version
                let oData = {
                    "SelectionResult": //MockData.SelectionResult
                        oClearingData.SelectionResult
                };

                let aProcessingStatus = oData.SelectionResult.reduce(function (accumulator, item) {
                    // Create a unique key for each combination of Gpart, BpName, and OrigCurr
                    let uniqueKey = item.Gpart + "|" + item.BpName + "|" + item.OrigCurr;

                    // If this unique key hasn't been processed yet, add the item to the accumulator
                    if (!accumulator.tempKeys[uniqueKey]) {
                        accumulator.tempKeys[uniqueKey] = true; // Mark this key as processed
                        accumulator.uniqueItems.push({
                            Gpart: item.Gpart,
                            BpName: item.BpName,
                            CurrencyCode: item.ExpPayCurr,
                            DifferenceAmn: "0.000"
                        });
                    }

                    return accumulator;
                }, { tempKeys: {}, uniqueItems: [] }).uniqueItems; // Extract the unique items array

                oData.ProcessingStatus = aProcessingStatus;
                
                this.getView().setModel(new JSONModel(oData));

                this._registerForP13n();
                this.getView().setBusy(false);
            },

            /**
             * Event handler for navigating back.
             * Navigate back in the browser history
             * @public
             */
            onPageNavButtonPress: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteMainView", {}, true);
                }
            },

            /**
             * Event handler for when an object is matched in the router.
             * This function is typically called when the route pattern matches the current hash.
             *
             * @private
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the route matched
             */
            _onRouteMatched: function (oEvent) {
                this._initDisplayData();
            },
            
            /**
             * Event handler for the selection of a checkbox within a transaction item row.
             * This function handles the selection state change of a checkbox and performs
             * actions based on whether the checkbox is selected or deselected. It sets the
             * table to busy state while processing the selection change, and invokes helper
             * functions to perform the necessary actions.
             *
             * @async
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the checkbox selection
             */
            onCheckBoxTransactionItemSelect: async function (oEvent) {
                let oTable = oEvent.getSource(),
                    oContext = oEvent.getSource().getBindingContext(),
                    sPath = oContext.getPath(),
                    oModel = oContext.getModel();

                const that = this;

                oTable.setBusy(true);

                let oItem = oModel.getProperty(sPath);

                if (oEvent.getParameter("selected")) {
                    await ActionHelper.clearingItemSelected(oContext, that, oItem);

                } else {
                    await ActionHelper.clearingItemUnSelected(oContext);
                }

                ActionHelper.calculateClearingAmnDifference(that);
                oTable.setBusy(false);
            },

            /**
             * Event handler for setting a filter on the clearing table.
             * This function is called when a filter is applied to the clearing table.
             * It resets the selection of all transaction items by invoking the
             * `onUnSelectAllButtonPress` method.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the filter event
             */
            onClearingTableFilterSet: function (oEvent) {
                // Reset all Transactions Selected
                this.onUnSelectAllButtonPress(oEvent);
            },

            /**
             * Event handler for the "Unselect All" button press.
             * This function asynchronously unselects all items in the "clearingTable" by iterating
             * over each context and invoking the `clearingItemUnSelected` method from the ActionHelper.
             * After all items are deselected, it calls `calculateClearingAmnDifference` to update
             * any relevant calculations or UI elements.
             *
             * @async
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onUnSelectAllButtonPress: async function (oEvent) {
                const that = this;
                let oContexts = this.byId("clearingTable").getBinding().getContexts();
                oContexts.forEach((oContext) => {
                    ActionHelper.clearingItemUnSelected(oContext);
                });

                ActionHelper.calculateClearingAmnDifference(that);

            },

            /**
             * Event handler for the "Select All" button press.
             * This function asynchronously Selects all items in the "clearingTable" by iterating
             * over each context and invoking the `clearingItemUnSelected` method from the ActionHelper.
             * After all items are deselected, it calls `calculateClearingAmnDifference` to update
             * any relevant calculations or UI elements.
             *
             * @async
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onSelectAllButtonPress: async function (oEvent) {
                let oContexts = this.byId("clearingTable").getBinding().getContexts();
                const that = this;
                oContexts.forEach((oContext) => {
                    ActionHelper.clearingItemSelected(oContext, that, oContext.getObject());
                });
            },

            /**
             * Event handler for changes in the allocation amount.
             * This function is called asynchronously when the allocation amount is changed by the user.
             * It updates the context with the new allocation amount and recalculates the clearing amount difference
             * using helper functions from the ActionHelper module.
             *
             * @async
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the change event
             */
            onAllocAmnChange: async function (oEvent) {
                let oContext = oEvent.getSource().getBindingContext();

                const that = this;

                await ActionHelper.onAllocAmnChange(oContext, that);
                await ActionHelper.calculateClearingAmnDifference(that);


                // let oContext = oEvent.getSource().get
            },


            /**
             * This function registers the P13n Personalisation.
             * @private
             */
            _registerForP13n: function () {
                var oTable = this.byId("clearingTable");

                this._oMetadataHelper = new MetadataHelper([
                    { key: "isSelectedID", label: "Is Selected", path: "isSelected" },
                    { key: "soaID", label: "SOA Unique ID", path: "SoaId" },
                    { key: "soaReferenceID", label: "SOA Reference ID", path: "SoaReference" },
                    { key: "soaLineID", label: "SOA Line ID", path: "SoaLineId" },
                    { key: "clearableCheckboxId", label: "Clearable", path: "isClearable" },
                    { key: "clearableAmountID", label: "Clearable Amount", path: "ClearableAmount" },
                    { key: "soaCommentsID", label: "SOA Comments", path: "SoaComments" },
                    { key: "financeCleared", label: "Finance Cleared", path: "FinanceCleared" },
                    { key: "amountToBeCleared", label: "Amount To Be Cleared", path: "Amn" },
                    { key: "originalCurrency", label: "Original Currency", path: "OrigCurr" },
                    { key: "allocAmnSettCurr", label: "Alloc Amn Sett Curr", path: "AllocAmnSettCurr" },
                    { key: "installment", label: "Instalment", path: "Instalment" },
                    { key: "dueDate", label: "Due Date", path: "DueDate" },
                    { key: "extRef", label: "Ext Ref", path: "ExtRef" },
                    { key: "insuredName", label: "Insured Name", path: "InsuredName" },
                    { key: "internalReference", label: "Internal Reference", path: "IntRef" },
                    { key: "sectionName", label: "Section Name", path: "SectionName" },
                    { key: "transactionType", label: "Transaction Type", path: "TrType" },
                    { key: "endorsementRef", label: "Endorsement Ref", path: "EndorsementRef" },
                    { key: "umr", label: "UMR", path: "Umr" },
                    { key: "bpName", label: "BP Name", path: "BpName" },
                    { key: "postingComments", label: "Posting Comments", path: "Comments" },
                    { key: "postingType", label: "Posting Type", path: "PostingType" },
                    { key: "paymentRef", label: "Payment Ref", path: "Xblnr" },
                    { key: "tax", label: "Tax", path: "Tax" },
                    { key: "taxCode", label: "Tax Code", path: "TaxCode" },
                    { key: "taxJurisdiction", label: "Tax Jurisdiction", path: "TaxJurisdiction" },
                    { key: "allocatedAmn", label: "Allocated Amount", path: "AllocAmn" },
                    { key: "roeOfRecCurr", label: "Roe of Rec Curr", path: "RoeRecCurr" },
                    { key: "inceptionDate", label: "Inception Date", path: "InceptionDate" },
                    { key: "expiryDate", label: "Expiry Date", path: "ExpiryDate" },
                    { key: "elsecoLineSize", label: "Elseco Line Size", path: "LineSize" },
                    { key: "expPayCurr", label: "Expected Pay Currency", path: "ExpPayCurr" },
                    { key: "claimRef", label: "Claim Reference", path: "ClaimRef" },
                    { key: "claimTransRef", label: "Claim Transaction Ref", path: "ClaimTrRef" },
                    { key: "expPayAmn", label: "Expected Pay Amount", path: "ExpPayAmn" },
                    { key: "actCurrRec", label: "Actual Curr Rec", path: "ActCurrRec" },
                    { key: "deltaDueROE", label: "Delta Due ROE", path: "DeltaDueRoe" },
                    { key: "processID", label: "Process ID", path: "ProcessId" },
                    { key: "premiumID", label: "Premium ID", path: "PremiumId" },
                    { key: "businessPartnerID", label: "Business Partner", path: "Gpart" }
                ]);



                this._mIntialWidth = {
                    "isSelectedID": "4rem",
                    "soaID": "13rem",
                    "soaReferenceID": "7rem",
                    "soaLineID": "7rem",
                    "clearableCheckboxId": "7rem",
                    "clearableAmountID": "7rem",
                    "soaCommentsID": "7rem",
                    "financeCleared": "7rem",
                    "amountToBeCleared": "7rem",
                    "originalCurrency": "7rem",
                    "allocAmnSettCurr": "7rem",
                    "installment": "7rem",
                    "dueDate": "7rem",
                    "extRef": "7rem",
                    "insuredName": "7rem",
                    "internalReference": "7rem",
                    "sectionName": "7rem",
                    "transactionType": "7rem",
                    "endorsementRef": "7rem",
                    "umr": "7rem",
                    "bpName": "7rem",
                    "postingComments": "7rem",
                    "postingType": "7rem",
                    "paymentRef": "7rem",
                    "tax": "7rem",
                    "taxCode": "7rem",
                    "taxJurisdiction": "7rem",
                    "allocatedAmn": "13rem",
                    "roeOfRecCurr": "7rem",
                    "inceptionDate": "7rem",
                    "expiryDate": "7rem",
                    "elsecoLineSize": "7rem",
                    "expPayCurr": "7rem",
                    "claimRef": "7rem",
                    "claimTransRef": "7rem",
                    "expPayAmn": "7rem",
                    "actCurrRec": "7rem",
                    "deltaDueROE": "7rem",
                    "processID": "7rem",
                    "premiumID": "7rem",
                    "businessPartnerID": "7rem"
                };


                Engine.getInstance().register(oTable, {
                    helper: this._oMetadataHelper,
                    controller: {
                        Columns: new SelectionController({
                            targetAggregation: "columns",
                            control: oTable
                        }),
                        Sorter: new SortController({
                            control: oTable
                        }),
                        Groups: new GroupController({
                            control: oTable
                        }),
                        ColumnWidth: new ColumnWidthController({
                            control: oTable
                        })
                    }
                });

                Engine.getInstance().attachStateChange(this._handleStateChange.bind(this));
            },

            /**
             * Event handler for Personalisation Dialog Button Press.
             * This function is called when the Personalisation Dialog Button Pressed.
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onButtonOpenPersoDialogPress: function (oEvent) {
                var oTable = this.byId("clearingTable");

                Engine.getInstance().show(oTable, ["Columns", "Sorter"], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: oEvent.getSource()
                });
            },

            /**
             * Event handler for Column Header Item Press.
             * @async
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the change event
             */
            onColumnHeaderItemPress: function (oEvent) {
                var oTable = this.byId("clearingTable");
                var sPanel = oEvent.getSource().getIcon().indexOf("sort") >= 0 ? "Sorter" : "Columns";

                Engine.getInstance().show(oTable, [sPanel], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: oTable
                });
            },


            /**
             * Event handler for Sorting set on Personalisation Dialog.
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the change event
             */
            onSort: function (oEvent) {
                var oTable = this.byId("clearingTable");
                var sAffectedProperty = this._getKey(oEvent.getParameter("column"));
                var sSortOrder = oEvent.getParameter("sortOrder");

                //Apply the state programatically on sorting through the column menu
                //1) Retrieve the current personalization state
                Engine.getInstance().retrieveState(oTable).then(function (oState) {

                    //2) Modify the existing personalization state --> clear all sorters before
                    oState.Sorter.forEach(function (oSorter) {
                        oSorter.sorted = false;
                    });
                    oState.Sorter.push({
                        key: sAffectedProperty,
                        descending: sSortOrder === CoreLibrary.SortOrder.Descending
                    });

                    //3) Apply the modified personalization state to persist it in the VariantManagement
                    Engine.getInstance().applyState(oTable, oState);
                });
            },

            /**
             * Event handler for Column Postion Change
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the change event
             */
            onColumnMove: function (oEvent) {
                var oTable = this.byId("clearingTable");
                var oAffectedColumn = oEvent.getParameter("column");
                var iNewPos = oEvent.getParameter("newPos");
                var sKey = this._getKey(oAffectedColumn);
                oEvent.preventDefault();

                Engine.getInstance().retrieveState(oTable).then(function (oState) {

                    var oCol = oState.Columns.find(function (oColumn) {
                        return oColumn.key === sKey;
                    }) || { key: sKey };
                    oCol.position = iNewPos;

                    Engine.getInstance().applyState(oTable, { Columns: [oCol] });
                });
            },

            /**
             * Event handler
             * @private
             * @param {sap.ui.base.Event} oControl - 
             * @returns {String} - The key of the column
             */
            _getKey: function (oControl) {
                return this.getView().getLocalId(oControl.getId());
            },

            /**
             * Event handler
             * @private
             * @param {sap.ui.base.Event} oEvent - 
             */
            _handleStateChange: function (oEvent) {
                var oTable = this.byId("clearingTable");
                var oState = oEvent.getParameter("state");
                if (oTable.getSelectedIndices().length > 0) {
                    MessageBox.error(this.getResourceBundle().getText("Deselect all rows before applying the personalization."));
                    return;
                }

                // Include isSelected Checkbox in the personalization state
                oState.Columns.unshift({ key: "isSelectedID" });


                oTable.getColumns().forEach(function (oColumn) {

                    var sKey = this._getKey(oColumn);
                    var sColumnWidth = oState.ColumnWidth[sKey];

                    oColumn.setWidth(sColumnWidth || this._mIntialWidth[sKey]);

                    oColumn.setVisible(false);
                    oColumn.setSortOrder(CoreLibrary.SortOrder.None);
                }.bind(this));

                oState.Columns.forEach(function (oProp, iIndex) {
                    var oCol = this.byId(oProp.key);
                    oCol.setVisible(true);

                    oTable.removeColumn(oCol);
                    oTable.insertColumn(oCol, iIndex);
                }.bind(this));

                var aSorter = [];
                oState.Sorter.forEach(function (oSorter) {
                    var oColumn = this.byId(oSorter.key);
                    /** @deprecated As of version 1.120 */
                    oColumn.setSorted(true);
                    oColumn.setSortOrder(oSorter.descending ? CoreLibrary.SortOrder.Descending : CoreLibrary.SortOrder.Ascending);
                    aSorter.push(new Sorter(this._oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
                }.bind(this));
                oTable.getBinding("rows").sort(aSorter);
            },

            /**
             * Event handler
             * @param {sap.ui.base.Event} oEvent - 
             */
            onColumnResize: function (oEvent) {
                var oColumn = oEvent.getParameter("column");
                var sWidth = oEvent.getParameter("width");
                var oTable = this.byId("clearingTable");

                var oColumnState = {};
                oColumnState[this._getKey(oColumn)] = sWidth;

                Engine.getInstance().applyState(oTable, {
                    ColumnWidth: oColumnState
                });
            },

            /**
             * Event handler for live changes to a currency input field.
             * This function validates the input against a currency format, allowing up to 15 digits before the decimal
             * point and up to 2 digits after the decimal point. If the input is not in a valid currency format,
             * a message toast is displayed to the user, and the input field is reset to "0".
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the live change event
             */
            onLiveChangeCurrency: function (oEvent) {
                var oInput = oEvent.getSource();
                var sValue = oInput.getValue();
                // var regex = /^\d{1,12}(\.\d{0,3})?$/; // Regex to allow up to 12 digits before the decimal and up to 2 digits after the decimal

                if (!(((sValue.match(/\./g) || []).length <= 1) && (/^-?\d{1,15}(\.\d{0,2})?$/.test(sValue.replace(/,/g, ""))))) {
                    // If the value is a invalid currency format, show error
                    MessageToast.show("Please enter a valid currency format.");
                    oInput.setValue("0");
                    return;
                }
            },

            /**
             * Event handler for checkbox selection within a list item.
             * This function updates the "ClearableAmount" property of the current item in the model
             * based on the checkbox selection state. If the checkbox is selected, the "ClearableAmount"
             * is set to the item's "Amn" value. If the checkbox is deselected, the "ClearableAmount"
             * is set to "0.000".
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the checkbox selection
             */
            onClearableChecked: function (oEvent) {

                let oContext = oEvent.getSource().getBindingContext(),
                    sPath = oContext.getPath(),
                    oModel = oContext.getModel();
                let currentItem = oModel.getProperty(sPath);

                if (oEvent.getParameter("selected")) {
                    oModel.setProperty(sPath + "/ClearableAmount", currentItem.Amn, oContext);
                } else {
                    oModel.setProperty(sPath + "/ClearableAmount", "0.000", oContext);
                }
            },

            /**
             * Event handler for the "Clear All" button press.
             * This function iterates over all contexts bound to the "clearingTable" and sets the "ClearableAmount"
             * to the item's "Amn" value and marks the item as clearable by setting "isClearable" to true for each
             * item that is not already marked as clearable.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onClearAllButtonPress: function (oEvent) {
                let oContexts = this.byId("clearingTable").getBinding().getContexts();
                oContexts.forEach((oContext) => {
                    let oModel = oContext.getModel(),
                        sPath = oContext.getPath(),
                        oObject = oContext.getObject();
                    if (oObject.isClearable === true) {
                        return;
                    }
                    oModel.setProperty(sPath + "/ClearableAmount", oObject.Amn, oContext);
                    oModel.setProperty(sPath + "/isClearable", true, oContext);
                });
            },

            /**
             * Event handler for the "UnClear All" button press.
             * This function iterates over all contexts bound to the "clearingTable" and sets the "ClearableAmount"
             * to the item's "Amn" value and marks the item as unclearable by setting "isClearable" to false for each
             * item that is already marked as clearable.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */

            onUnClearAllButtonPress: function (oEvent) {
                let oContexts = this.byId("clearingTable").getBinding().getContexts();
                oContexts.forEach((oContext) => {
                    let oModel = oContext.getModel(),
                        sPath = oContext.getPath();
                    oModel.setProperty(sPath + "/ClearableAmount", "0.000", oContext);
                    oModel.setProperty(sPath + "/isClearable", false, oContext);
                });
            },
            /**
             * Event handler for the "Payment" button press.
             * This function loads and opens the "AddPayment" fragment if it has not been created yet.
             * If the fragment already exists, it simply opens it. When creating the fragment for the first time,
             * it initializes the fragment's model with payment data and business partner information from the
             * main view's model.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onPaymentButtonPress: function (oEvent) {


                const oView = this.getView();
                const oData = {
                    Payment: 0.00,
                    BusinessPartners: oView.getModel().getProperty("/ProcessingStatus").map(oBP => ({ BpName: oBP.BpName, Gpart: oBP.Gpart }))
                };
                if (!this._oPaymentFragment) {
                    Fragment.load({
                        name: "atom.ui.clearing.clearingapplication.view.fragments.AddPayment",
                        controller: this
                    }).then(function (oFragment) {
                        this._oPaymentFragment = oFragment;
                        this._oPaymentFragment.setModel(new JSONModel(oData));
                        oView.addDependent(this._oPaymentFragment);
                        this._oPaymentFragment.open();
                    }.bind(this));
                } else {
                    this._oPaymentFragment.setModel(new JSONModel(oData));
                    this._oPaymentFragment.open();

                }

            },

            /**
             * Event handler for the "Cancel" button press.
             * This function closes the parent control (typically a dialog or popover) of the button that triggered the event.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onCancelButtonPress: function (oEvent) {
                oEvent.getSource().getParent().close();
            },

            /**
             * Event handler for the "Add Payment" button press.
             * This function collects payment information from the input fields in the payment fragment,
             * creates a new payment object with default values, and populates it with the payment data.
             * It then adds this payment object to the selection result array in the model and recalculates
             * the clearing amount difference. Finally, it closes the payment fragment.
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the button press
             */
            onAddPaymentButtonPress: function (oEvent) {
                let oModel = this.getView().getModel(),
                    oClearingData = this.getOwnerComponent().getModel("clearingDataModel").getData(),
                    // oClearingData = MockData.SelectionParameters, //Todo remove this and use the clearing data model
                    iPayment = Element.getElementById("idPaymentFragInput").getValue(),
                    aSelectionResult = oModel.getData().SelectionResult,
                    oSelectedBP = Element.getElementById("idBusinessPartnersFragComboBox").getSelectedItem().getBindingContext().getObject();

                const that = this;

                const createDefaultObject = (obj) => {
                    return Object.keys(obj).reduce((newObj, key) => {
                        if (typeof obj[key] === "boolean") {
                            newObj[key] = false;
                        } else if (typeof obj[key] === "string") {
                            newObj[key] = "";
                        } else if (typeof obj[key] === "number") {
                            newObj[key] = 0;
                        } else {
                            newObj[key] = null;
                        }
                        return newObj;
                    }, {});
                };


                let oData = oModel.getData();
                let oPaymentToBeAdded = createDefaultObject(oData.SelectionResult[0]);
                // @ts-ignore
                oPaymentToBeAdded.BpName = oSelectedBP.BpName;
                // @ts-ignore
                oPaymentToBeAdded.Gpart = oSelectedBP.Gpart;
                // @ts-ignore
                oPaymentToBeAdded.Amn = (parseFloat(iPayment.replace(/,/g, "")) * -1) + "";// @ts-ignore
                oPaymentToBeAdded.OrigCurr = oClearingData.SelectionParameters.Currency;// @ts-ignore
                oPaymentToBeAdded.ExpPayAmn = oPaymentToBeAdded.Amn;// @ts-ignore
                oPaymentToBeAdded.ExpPayCurr = oClearingData.SelectionParameters.Currency;// @ts-ignore
                oPaymentToBeAdded.AllocAmnSettCurr = oPaymentToBeAdded.Amn;// @ts-ignore
                oPaymentToBeAdded.AllocAmn = oPaymentToBeAdded.Amn;// @ts-ignore
                oPaymentToBeAdded.RoeRecCurr = 1;// @ts-ignore
                oPaymentToBeAdded.isAllocAmnEditable = true;// @ts-ignore
                oPaymentToBeAdded.isSelected = true;// @ts-ignore
                oPaymentToBeAdded.TrType = "Payment";// @ts-ignore

                aSelectionResult.push(oPaymentToBeAdded);
                oModel.setProperty("/SelectionResult", aSelectionResult);
                ActionHelper.calculateClearingAmnDifference(that);

                oEvent.getSource().getParent().close();


            }
        });
    });
