/* eslint-disable no-console */
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/Token",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "../model/formatter",
    "./util/util",
    "../model/constants",
    "sap/m/MessageBox"
],
    /**
     * @namespace atom.ui.clearing.clearingapplication.controller
     * @extends atom.ui.clearing.clearingapplication.controller.BaseController
     * @alias atom.ui.clearing.clearingapplication.controller.MainView
     *
     * @param {atom.ui.clearing.clearingapplication.controller.BaseController} BaseController Base controller for all controllers.
     * @param {sap.ui.model.json.JSONModel} JSONModel JSON model for data binding.
     * @param {sap.m.Token} Token Token control for representing items within a Tokenizer.
     * @param {sap.ui.core.Fragment} Fragment UI5 core fragment.
     * @param {sap.ui.model.Filter} Filter Filter for arrays.
     * @param {sap.ui.model.FilterOperator} FilterOperator Operators for filtering.
     * @param {sap.m.MessageToast} MessageToast Toast message popup.
     * @param {Object} formatter Formatter for model data.
     * @param {Object} util Utility functions.
     * @param {Object} Constants Constants.
     * @param {sap.m.MessageBox} MessageBox MessageBox control
     * @ui5view {atom.ui.clearing.clearingapplication.view.MainView}
     * @returns {sap.ui.core.mvc.Controller} A new MainView controller instance
     */
    function (BaseController,
        JSONModel,
        Token,
        Fragment,
        Filter,
        FilterOperator,
        MessageToast,
        formatter,
        util, Constants, MessageBox) {
        "use strict";

        return BaseController.extend("atom.ui.clearing.clearingapplication.controller.MainView", {
            formatter: formatter,
            util: util,
            onInit: function () {
                this.getView().setBusy(true);
                this.getView().setModel(new JSONModel(
                    {
                        "CompanyCode": "",
                        "EnterInsuredName": "",
                        "Payment": 0.00,
                        "BankCharge": 0.00,
                        "Currency": "",
                        "PostingDate": null,
                        "PostingDateMinDate": new Date("2001-01-01"),
                        "Division": "",
                        "ElescoBankAccountNumber": ""
                    }
                ), "selectionModel");
                let oLocalData = {};
                this.getView().setModel(new JSONModel(oLocalData), "localModel");
                let oLocalModel = this.getView().getModel("localModel");

                // Get Business Partner List
                let oCRMModel = this.getOwnerComponent().getModel("crmModel");
                let pGetBusinessPartnerList =
                    util.getData(oCRMModel, "/BusinessPartners", { "$select": "ID,FULL_NAME" }, undefined);

                // Get Company Code
                let oProductModel = this.getOwnerComponent().getModel("productModel");
                let oActiveFilter = new Filter("ACTIVE", FilterOperator.EQ, true);
                let pGetCompanyCodes = util.getData(oProductModel, "/Coverholder", { "$select": "COVERHOLDER_CODE,COVERHOLDER_NAME" }, oActiveFilter);

                // Get Bank Account Number
                let oBankAccountModel = this.getOwnerComponent().getModel("bankAccountModel");
                let pGetBankAccountNumbers = util.getData(oBankAccountModel, "/ZC_YEL_TB_BANK_CLEA", {}, undefined);

                Promise.all([pGetBusinessPartnerList, pGetCompanyCodes, pGetBankAccountNumbers]).then((result) => {
                    oLocalData.BPList = result[0].map((line) => { return { "BP_ID": line.ID, "BP_NAME": line.FULL_NAME }; });
                    oLocalData.CompanyCodes = result[1].map((line) => { return { "CompanyCode": line.COVERHOLDER_CODE, "CompanyName": line.COVERHOLDER_NAME }; });
                    oLocalData.BankAccountNumbers = result[2].map((line) => {
                        return {
                            "CompanyCode": line.company_code, "Division": line.division,
                            "Currency": line.currency, "ElescoBankAccountNumber": line.ElescoBankAccountNumber,
                            "Description": line.description
                        };
                    });
                    // Initially set the Applicable Bank Account Numbers as Empty
                    oLocalData.ApplicableBankAccountNumbers = {};
                    oLocalModel.refresh();
                    this.getView().setBusy(false);
                }).catch((error) => {
                    this.getView().setBusy(false);
                    console.log(error);
                    MessageToast.show(this.getResourceBundle().getText("VHLoadError"));
                });

                let fnValidator = function (args) {
                    var text = args.text;
                    return new Token({ key: text, text: text });
                };

                this.getView().byId("externalReferenceNumberID").addValidator(fnValidator);
                this.getView().byId("soaReferenceNumberID").addValidator(fnValidator);
                this.getView().byId("UMRID").addValidator(fnValidator);

                this._oClearingModel = this.getOwnerComponent().getModel("clearingModel");

            },
            /**
             * Handles the execution of the Execute button press event.
             * 
             * This method retrieves various tokens from input fields, validates mandatory fields, constructs a payload object,
             * and sends a GET request to the on-prem. If the request is successful, it navigates to the "RouteClearingView" route.
             * In case of an error, it displays a message toast with a communication error message.
             * 
             * @memberof atom.ui.clearing.clearingapplication.controller.MainView
             */
            onExecuteButtonPress: function () {

                let oSelectionModel = this.getView().getModel("selectionModel");

                // Perform input validation
                if (!this._validateBeforeExecute()) {
                    return;
                }

                // Convert the payload to Binary64 
                let oData = {
                    "CompanyCode": oSelectionModel.getProperty("/CompanyCode"),
                    "BusinessPartners": oSelectionModel.getProperty("/BusinessPartners"),
                    "ExternalReferenceNumbers": oSelectionModel.getProperty("/ExternalReferenceNumbers"),
                    "SoaReferenceNumbers": oSelectionModel.getProperty("/SoaReferenceNumbers"),
                    "UMRNumbers": oSelectionModel.getProperty("/UMRNumbers"),
                    "ElescoBankAccountNumber": oSelectionModel.getProperty("/ElescoBankAccountNumber"),
                    "InsuredName": oSelectionModel.getProperty("/InsuredName"),
                    "Payment": oSelectionModel.getProperty("/Payment"),
                    "BankCharge": oSelectionModel.getProperty("/BankCharge"),
                    "Currency": oSelectionModel.getProperty("/Currency"),
                    "PostingDate": oSelectionModel.getProperty("/PostingDate") !== null && oSelectionModel.getProperty("/PostingDate") !== undefined
                        ? oSelectionModel.getProperty("/PostingDate").split("T")[0].replace(/-/g, "") : null,
                    "Division": oSelectionModel.getProperty("/Division")
                };

                let oPayload = {
                    "SelectionFilters": JSON.stringify(oData)
                };
                this.getView().setBusy(true);
                util.callFunction(this._oClearingModel, "/getPremium", oPayload, "GET").then((result) => {
                    // return;
                    let oClearingData = {
                        SelectionParameters: oData,
                        SelectionResult: result.results
                    };
                    this.getOwnerComponent().setModel(new JSONModel(oClearingData), "clearingDataModel");
                    this.getOwnerComponent().getRouter().navTo("RouteClearingView", {}, {},true);
                    this.getView().setBusy(false);
                }).catch((error) => {
                    MessageBox.error(this.getResourceBundle().getText("CommError"));
                    return;
                });

                console.log(this.getView().getModel("selectionModel").getData());
            },

            /**
            * Validates the selection criteria before execution.
            * 
            * This function checks if all mandatory fields are filled and if valid values are entered in the amount input fields.
            * It validates the selection of Business Partners, External Reference Numbers, SOA Reference Numbers, UMR Numbers,
            * and Elesco Bank Account Number. It also checks the format and validity of payment and bank charge amounts.
            * If any mandatory field is missing or invalid values are provided, it displays an error message and halts execution.
            * 
            * @returns {boolean} Returns true if all validations pass, otherwise false.
            */
            // eslint-disable-next-line max-statements
            _validateBeforeExecute: function () {

                let oSelectionModel = this.getView().getModel("selectionModel");
                let aSelectedBPs = [], aSelectedExterenalReferenceNumbers = [], aSelectedSoaReferenceNumbers = [], aSelectedUMRNumbers = [];
                let bpInputItems = this.getView().byId("bpInputID").getTokens(),
                    externalReferenceNumberItems = this.getView().byId("externalReferenceNumberID").getTokens(),
                    soaReferenceNumberItems = this.getView().byId("soaReferenceNumberID").getTokens(),
                    umrNumberItems = this.getView().byId("UMRID").getTokens();


                const getInputValues = (items, aResult) => {
                    for (let i = 0; i < items.length; i++) {
                        let item = items[i];
                        aResult.push(item.getProperty("key"));
                    }
                };

                // Check if Mandatory Fields are filled
                if (!oSelectionModel.getProperty("/CompanyCode")) {
                    this.getView().byId("CompanyCodeInputID").setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("CompanyCodeInputID").setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    MessageBox.error(this.getResourceBundle().getText("chooseCompanyCode"));
                    return false;
                }

                getInputValues(bpInputItems, aSelectedBPs);
                if (aSelectedBPs.length === 0) {
                    this.getView().byId("bpInputID").setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("bpInputID").setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    MessageBox.error(this.getResourceBundle().getText("enterAtleastOneValue"));
                    return false;
                }
                oSelectionModel.setProperty("/BusinessPartners", aSelectedBPs);

                getInputValues(externalReferenceNumberItems, aSelectedExterenalReferenceNumbers);
                if (aSelectedExterenalReferenceNumbers.length === 0) {
                    this.getView().byId("externalReferenceNumberID").setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("externalReferenceNumberID").setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    MessageBox.error(this.getResourceBundle().getText("enterAtleastOneValue"));
                    return false;
                }
                oSelectionModel.setProperty("/ExternalReferenceNumbers", aSelectedExterenalReferenceNumbers);

                getInputValues(soaReferenceNumberItems, aSelectedSoaReferenceNumbers);
                oSelectionModel.setProperty("/SoaReferenceNumbers", aSelectedSoaReferenceNumbers);

                getInputValues(umrNumberItems, aSelectedUMRNumbers);
                oSelectionModel.setProperty("/UMRNumbers", aSelectedUMRNumbers);


                if (oSelectionModel.getProperty("/Division") === "") {
                    this.getView().byId("idDivisionComboBox").setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("idDivisionComboBox").setValueStateText(this.getResourceBundle().getText("chooseDivision"));
                    MessageBox.error(this.getResourceBundle().getText("chooseDivision"));
                    return false;
                }


                if (oSelectionModel.getProperty("/ElescoBankAccountNumber") === "") {
                    this.getView().byId("idApplicableBankAccountNumbersComboBox").setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("idApplicableBankAccountNumbersComboBox").setValueStateText(this.getResourceBundle().getText("selectBankAcc"));
                    MessageBox.error(this.getResourceBundle().getText("selectBankAcc"));
                    return false;
                }

                // Regular expression to check for the 'YYYY-MM-DDTHH:MM:SS' format
                var DateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
                if (!DateRegex.test(oSelectionModel.getProperty("/PostingDate"))) {
                    if (!(oSelectionModel.getProperty("/PostingDate") === null) && !(oSelectionModel.getProperty("/PostingDate") === undefined)
                    ) {
                        this.getView().byId("idPostingDateInput").setValueState(sap.ui.core.ValueState.Error);
                        this.getView().byId("idPostingDateInput").setValueStateText(this.getResourceBundle().getText("enterPostingDate"));
                        MessageBox.error(this.getResourceBundle().getText("enterPostingDate"));
                        return false;
                    }
                }

                // Check if Valid Values are entered in the Amount Input Fields
                let sPaymentInput = this.getView().byId("idpaymentAmountInput").getValue();
                let sBankChargeInput = this.getView().byId("idbankChargeAmountInput").getValue();

                var regex = /^\d{1,10}(\.\d{0,2})?$/; // Regex to allow up to 10 digits before the decimal and up to 2 digits after the decimal

                if ((!(((sPaymentInput.match(/\./g) || []).length <= 1) && (regex.test(sPaymentInput.replace(/,/g, "")))))
                    || (!(((sBankChargeInput.match(/\./g) || []).length <= 1) && (regex.test(sBankChargeInput.replace(/,/g, "")))))) {
                    MessageBox.error(this.getResourceBundle().getText("enterValidAmount"));
                    return false;
                }
                return true;
            },

            /**
             * Opens the Business Partner (BP) value help dialog.
             * 
             * This method checks if the value help dialog for selecting a Business Partner (BP) is already instantiated.
             * If not, it loads the dialog fragment asynchronously, sets it as a dependent of the view, and then opens it.
             * If the dialog is already instantiated, it simply opens the dialog.
             * @param {sap.ui.base.Event} oEvent The event object.
             */
            onMultiInputHandleBPValueHelpRequest: function (oEvent) {
                const oView = this.getView();
                if (!this._oValueHelpDialog) {
                    Fragment.load({
                        name: "atom.ui.clearing.clearingapplication.view.fragments.BPSearchDialog",
                        controller: this
                    }).then(function (oDialog) {
                        this._oValueHelpDialog = oDialog;
                        oView.addDependent(this._oValueHelpDialog);
                        this._oValueHelpDialog.open();
                    }.bind(this));
                } else {
                    this._oValueHelpDialog.open();
                }
            },

            /**
             * Handles the search event in the Business Partner (BP) value help dialog.
             * 
             * This method retrieves the search string from the event, constructs a new filter with two conditions
             * to match the search string against the BP_ID and BP_NAME fields, and applies this filter to the
             * items binding of the event source (typically a list or table).
             * @param {sap.ui.base.Event} oEvent The event object containing the search string.
             */
            handleBPSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter({
                    filters: [
                        new Filter("BP_ID", FilterOperator.Contains, sValue),
                        new Filter("BP_NAME", FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                oEvent.getSource().getBinding("items").filter(oFilter);
            },

            /**
             * Handles the confirmation event of the Business Partner (BP) value help dialog.
             * 
             * This method processes the selected items from the value help dialog. It ensures that only new, unique
             * Business Partner IDs are added to the tokens of the input control. It also resets the value state of the
             * input control to `None` and sets an appropriate value state text.
             * @param {sap.ui.base.Event} oEvent The event object containing the selected contexts.
             */
            handleBPConfirm: function (oEvent) {
                var aContexts = oEvent.getParameter("selectedContexts");
                if (aContexts && aContexts.length > 0) {
                    let aExistingTokens = this.byId("bpInputID").getTokens();
                    let aExistingKeys = util.getTokenValues(aExistingTokens);
                    let aTokens = aExistingTokens;
                    aContexts.forEach(oContext => {
                        if (!aExistingKeys.includes(oContext.getObject().BP_ID)) {
                            aTokens.push(new Token({
                                key: oContext.getObject().BP_ID,
                                text: oContext.getObject().BP_NAME
                            }));
                        }
                    });
                    this.byId("bpInputID").setTokens(aTokens);
                    this.getView().byId("bpInputID").setValueState(ValueState.None);
                    this.getView().byId("bpInputID").setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                }
                oEvent.getSource().getBinding("items").filter([]);
            },
            /**
             * @param {sap.ui.base.Event} oEvent .
             */
            handleBPValueHelpClose: function (oEvent) {
                oEvent.getSource().getBinding("items").filter([]);
            },

            /**
             * Event handler for live changes to a currency input field.
             * This function validates the input against a currency format, allowing up to 15 digits before the decimal
             * point and up to 2 digits after the decimal point. If the input is not in a valid currency format,
             * a message toast is displayed to the user, and the input field is reset to "0".
             *
             * @param {sap.ui.base.Event} oEvent - The event object containing details about the live change event
             */
            onInputCurrencyLiveChange: function (oEvent) {
                var oInput = oEvent.getSource();
                var sValue = oInput.getValue();
                var regex = /^\d{1,10}(\.\d{0,2})?$/; // Regex to allow up to 10 digits before the decimal and up to 2 digits after the decimal

                if (((sValue.match(/\./g) || []).length <= 1) && (regex.test(sValue.replace(/,/g, "")))) {
                    // If the value is a valid currency format, remove error state
                    oInput.setValueState("None");
                } else {
                    // If the value is not a valid currency format, set the input to error state
                    oInput.setValueState("Error");
                    oInput.setValueStateText(this.getResourceBundle().getText("invalidCurrency"));
                }
            },

            /**
             * Handles the selection change event of the bank account numbers ComboBox.
             * 
             * This method updates the currency input field based on the selected bank account number. If no bank account number
             * is selected, it sets the currency input to "0.00", displays an error message, and sets the value state of the bank
             * account number input to "Error". If a bank account number is selected, it retrieves the corresponding currency from
             * the local model and updates the currency input field accordingly. It also resets the value state of the bank account
             * number input to "None".
             * @param {sap.ui.base.Event} oEvent The event object containing the selection change information.
             */
            onApplicableBankAccountNumbersComboBoxSelectionChange: function (oEvent) {
                var selectedBankAccountNumber = oEvent.getParameter("selectedItem")?.getKey();
                let oBankAccountNumberInput = this.getView().byId("idApplicableBankAccountNumbersComboBox");
                if (!selectedBankAccountNumber) {
                    this.getView().byId("CurrencyInputID").setValue("0.00");
                    oBankAccountNumberInput.setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    oBankAccountNumberInput.setValueState("Error");
                    return;
                }
                oBankAccountNumberInput.setValueState("None");
                let aBankAccountNumbers = this.getView().getModel("localModel").getProperty("/BankAccountNumbers");

                let aSelectedBankAccount = aBankAccountNumbers.filter((bankAccount) => {
                    return bankAccount.ElescoBankAccountNumber === selectedBankAccountNumber;
                });
                this.getView().byId("CurrencyInputID").setValue(aSelectedBankAccount[0].Currency);
            },

            /**
             * Handles the change event of the company code ComboBox.
             * 
             * This method updates the state and value of related input fields based on the selected company code.
             * If no company code is selected, it disables the division input, sets an error message, and sets the value state
             * of the company code input to "Error". If a company code is selected, it resets the value state of the company code
             * input to "None", clears the values of the bank account number and currency inputs, disables the bank account number
             * input, and enables the division input.
             * @param {sap.ui.base.Event} oEvent The event object containing the change information.
             */
            onCompanyCodeChange: function (oEvent) {
                let selectedCompanyCode = oEvent.getParameter("selectedItem")?.getKey();
                let oDivision = this.getView().byId("idDivisionComboBox");
                let oBankAccountNumberInput = this.getView().byId("idApplicableBankAccountNumbersComboBox");
                let oCurrencyInput = this.getView().byId("CurrencyInputID");
                let oCompanyCodeInput = this.getView().byId("CompanyCodeInputID");

                if (!selectedCompanyCode) {
                    oDivision.setValue("");
                    oDivision.setEnabled(false);
                    oCompanyCodeInput.setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    oCompanyCodeInput.setValueState(sap.ui.core.ValueState.Error);
                    return;
                }
                oCompanyCodeInput.setValueState(sap.ui.core.ValueState.None);
                oBankAccountNumberInput.setValue("");
                oCurrencyInput.setValue("");
                oBankAccountNumberInput.setEnabled(false);
                oDivision.setValue("");
                oDivision.setEnabled(true);
            },
            /**
             * Handles the selection change event of the division ComboBox.
             * 
             * This method updates the bank account number and currency input fields based on the selected division.
             * If no division is selected, it sets an error message, sets the value state of the division input to "Error",
             * and clears the applicable bank account numbers in the local model. If a division is selected, it resets the
             * value state of the division input to "None" and filters the bank account numbers based on the selected division
             * and company code, updating the local model with the applicable bank account numbers.
             * @param {sap.ui.base.Event} oEvent The event object containing the selection change information.
             */
            onComboBoxDivisionSelectionChange: function (oEvent) {
                let selectedDivision = oEvent.getParameter("selectedItem")?.getKey();
                let oBankAccountNumberInput = this.getView().byId("idApplicableBankAccountNumbersComboBox");
                let oCurrencyInput = this.getView().byId("CurrencyInputID");
                let oDivisionInput = this.getView().byId("idDivisionComboBox");

                oBankAccountNumberInput.setSelectedKey();
                oCurrencyInput.setValue("");
                if (!selectedDivision) {
                    oDivisionInput.setValueStateText(this.getResourceBundle().getText("enterAtleastOneValue"));
                    oDivisionInput.setValueState(sap.ui.core.ValueState.Error);
                    this.getView().getModel("localModel").setProperty("/ApplicableBankAccountNumbers", {});
                    return;
                }
                oDivisionInput.setValueState(sap.ui.core.ValueState.None);
                let sSelectedCompanyCode = this.getView().getModel("selectionModel").getProperty("/CompanyCode");
                let aBankAccountNumbers = this.getView().getModel("localModel").getProperty("/BankAccountNumbers");
                let aApplicableBankAccountNumbers = aBankAccountNumbers.filter((bankAccount) => {
                    return bankAccount.Division === selectedDivision && bankAccount.CompanyCode === sSelectedCompanyCode;
                });
                this.getView().getModel("localModel").setProperty("/ApplicableBankAccountNumbers", aApplicableBankAccountNumbers);

            },

            /**
             * Handles updates to the tokens within a MultiInput control.
             * 
             * This method is triggered when tokens are added or removed from a MultiInput control. It filters out any removed
             * tokens from the current set of tokens based on their keys. If, after removal, no tokens remain, it sets the
             * MultiInput control to an error state with a message prompting the user to enter at least one value. If there is
             * at least one token remaining, it removes the error state from the MultiInput control.
             * @param {sap.ui.base.Event} oEvent The event object containing information about the updated tokens.
             */
            onMultiInputTokenUpdate: function (oEvent) {
                var oMultiInput = oEvent.getSource();
                var aTokens = oMultiInput.getTokens();
                var aRemovedKeys = util.getTokenValues(oEvent.getParameter("removedTokens"));
                if (aRemovedKeys.length > 0) {
                    aTokens = aTokens.filter((token) => {
                        return !aRemovedKeys.includes(token.getKey());
                    });
                }

                // Check if at least one token is present
                if (aTokens.length === 0) {
                    // Set the MultiInput control to error state
                    oMultiInput.setValueState(sap.ui.core.ValueState.Error);
                    oMultiInput.setValueStateText("Please enter at least one value.");
                } else {
                    // If there is at least one token, remove the error state
                    oMultiInput.setValueState(sap.ui.core.ValueState.None);
                    oMultiInput.setValueStateText("");
                }
            }



        });
    });
