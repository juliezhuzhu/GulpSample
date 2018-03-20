/*global document, navigator, window, Blob, angular, URL, shareModeEnum, pageMode, PageMode, persistLastView, singleChartLoadedFavorite, selectedExplorer, dashboardState, DashboardStates, dashboardKeywords*/
/*jshint -W020 */
/* jshint -W016 */
// ------------------------------------------------------------------------------------------------------------
// <copyright company="Schneider Electric Software, LLC" file="UtilityService.js">
//   © 2015 Schneider Electric Software, LLC. All rights reserved.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY
// KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
// </copyright>
// <summary>
//
// </summary>
// ------------------------------------------------------------------------------------------------------------
function testClick() {
    alert('test');
}

(function () {
    "use strict";

  
    //This service contains the business logic for all the time related calculations
    var infoClientApp = angular.module("InfoClientApp");
    
    infoClientApp.factory("UtilityService", ['$rootScope', '$q', '$mdToast', '$timeout', '$mdDialog', 'NotificationService', 'InfoClientAppService', 'Fullscreen',
        function ($rootScope, $q, $mdToast, $timeout, $mdDialog, NotificationService, InfoClientAppService, Fullscreen) {
            //Global variables
            var utilityService = {};
            utilityService.actionBarZindex = 0;
            utilityService.favoriteName = (window.pageMode === PageMode.TILEVIEW) ? "Dashboard" : "Untitled Content";
            utilityService.uniqueID = "";
            utilityService.shareIconEvent = "";
            utilityService.specialcharWhiteList = /[+']/;
            utilityService.favorites = [];
            utilityService.recentFavorites = [];
            utilityService.pageStates = [];
            utilityService.applicableScopes = [];
            utilityService.isReportDateRelative = true;
            utilityService.dashboardTiles = []; //to hold tiles loaded in dashboard (always hold the current list of dashboard tiles)
            utilityService.dashboardFavorites = [];
            utilityService.tagMetaDataFailed = false;
            utilityService.isOwnContent = true;
            utilityService.isZoomChangedTime = false;
            utilityService.isPin = false;
            utilityService.fullScreen = Fullscreen;
            utilityService.maLoaded = false;
            utilityService.renamedSymbol = false;

            var conversions = [1, 1000, 60, 60, 24, 30, 12];
            var axisLabels = ["milliseconds", "seconds", "minutes", "hours", "days", "months", "years"];

            // code copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
            utilityService.fixedEncodeURIComponent = function (str) {
                return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
                    return '%' + c.charCodeAt(0).toString(16);
                });
            }

            utilityService.isChartDisplayedInTile = function () {
                return window.pageMode === PageMode.TILEVIEW || window.pageMode === PageMode.PUBLICDASHBOARD || window.pageMode === PageMode.LANDINGPAGE
            };

            // set group type for selected group
            utilityService.SetGroupTypeForSelectedGroup = function (groupInfo) {
                for (var tagIndex = 0; tagIndex < groupInfo.tags.length; tagIndex++) {
                    groupInfo.tags[tagIndex].GroupType = groupInfo.groupType;
                }
            };

            //Returns the CSV delimiter based on the locale settings
            utilityService.GetCSVDelimiter = function () {
                var number = 1.1;
                var numberString = number.toLocaleString();
                var delimiter;
                for (var i = 0; i < numberString.length; i++) {
                    var char = numberString.charAt(i);
                    if (char !== "1") {
                        if (char === ",") {
                            delimiter = ";";
                        } else {
                            delimiter = ",";
                        }
                        break;
                    }
                }
                return delimiter;
            };

            //Download data in CSV format
            utilityService.DownloadCSV = function (csvData, fileName) {
                //Save/Prompt the CSV download
                csvData[0] = "\ufeff" + csvData[0];
                var buffer = csvData.join("\r\n");
                var link = document.getElementById('link');
                var blob = "";

                //feature detection
                if (link.download !== undefined) {
                    blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
                    var url = URL.createObjectURL(blob);
                    //Browsers that support HTML5 download attribute
                    link.setAttribute("href", url);
                    link.setAttribute("download", fileName);
                    link.click();
                } else {
                    //IE 10+
                    blob = new Blob([buffer], {
                        "type": "text/csv;charset=utf-8;"
                    });
                    navigator.msSaveBlob(blob, fileName);
                }
            };

            utilityService.enableDisableElement = function (elementId, enabled) {
                if (enabled) {
                    document.getElementById(elementId).style.pointerEvents = 'auto';
                } else {
                    document.getElementById(elementId).style.pointerEvents = 'none';
                }
            };

            /**
         * detect IE
         * returns version of IE or false, if browser is not Internet Explorer
         */
            utilityService.detectIE = function () {
                var ua = window.navigator.userAgent;

                var msie = ua.indexOf('MSIE '); // IE 10 or older
                var trident = ua.indexOf('Trident/'); // IE 11

                if (msie > 0 || trident > 0) {
                    //IE 10 or older => return version number
                    return true;
                }

                //other browser
                return false;
            };

            utilityService.detectIEAndEdge = function () {
                var ua = window.navigator.userAgent;

                var msie = ua.indexOf('MSIE '); // IE 10 or older
                var trident = ua.indexOf('Trident/'); // IE 11
                var edge = ua.indexOf('Edge/'); // IE 12

                if (msie > 0 || trident > 0 || edge > 0) {
                    //IE 10 or older => return version number
                    return true;
                }

                //other browser
                return false;
            };

            utilityService.enableDisableFavorite = function (enableFavorite) {
                $rootScope.$broadcast("UtilityService.enableDisableFavorite", enableFavorite);
            };

            /*window on resize get the height of view port*/
            utilityService.resizeLayout = function ()
            {
                if (!utilityService.isPC())
                {
                    try
                    {
                        window.dispatchEvent(new Event('resize'));
                    } catch (e)
                    {
                        var resizeEvent = window.document.createEvent('UIEvents');
                        resizeEvent.initUIEvent('resize', true, false, window, 0);
                        window.dispatchEvent(resizeEvent);
                    }
                }
            }

            /*Get and return the height to respective controllers based on browser view port height*/
            utilityService.getControlHeight = function (offset) {
                var height = "";
                var availableClientHeight = document.documentElement.clientHeight;
                var availableScreenHeight = getDeviceDimension().height; //window.screen.availHeight;
                var availableHeight = 0;                                                              
                if (!utilityService.isPC()) {
                    availableHeight = (availableClientHeight);
                    if (!$("#titleBar").hasClass("autoHide")) {
                        availableHeight = availableHeight - $(".mdl-layout__header-row").outerHeight();
                    }
                } else {
                    if (utilityService.IsFullScreen()) {
                        availableHeight = (availableClientHeight);
                        if (utilityService.isPin) {
                            availableHeight = availableHeight - $(".mdl-layout__header-row").outerHeight();
                        }
                    } else {
                        availableHeight = availableClientHeight - $(".mdl-layout__header-row").outerHeight();
                    }
                }
                height = (availableHeight) + "px";
                return height;
            };

            /*Get and return whether the device is PC*/
            utilityService.isPC = function() {
                var userAgentInfo = navigator.userAgent;
                var Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
                var result = true;
                for (var v = 0; v < Agents.length; v++) {
                    if (userAgentInfo.indexOf(Agents[v]) > 0) {
                        result = false;
                        break;
                    }
                }
                return result;
            };

            /*Get and return the height to respective controls which are on pane and need to shrink based on the view size*/
            utilityService.getPaneListControlHeight = function (offset, minHeight) {
                var height = "";
                var availableClientHeight = document.documentElement.clientHeight;
                var availableScreenHeight = getDeviceDimension().height; //window.screen.availHeight;

                var availableHeight = (availableClientHeight - $(".mdl-layout__header-row").outerHeight());

                height = ((minHeight > (availableHeight - offset)) ? minHeight : (availableHeight - offset)) + "px";
                return height;
            };

            // Returns Json object with Name, Value pairs of given object
            utilityService.GetNameValuePairCollection = function (ObjectArray, propertyNameArray) {
                var keyCollection = Object.keys(ObjectArray);
                var metaDataCollection = "";
                var metaDataJson = "";
                var propertyName = "";
                var propertyValue = "";
                if (propertyNameArray.length !== 0) {
                    for (var keyIndex = 0; keyIndex < keyCollection.length; keyIndex++) {
                        if (propertyNameArray.indexOf(keyCollection[keyIndex]) > -1) {
                            var metaDataLength = metaDataJson.length;

                            metaDataCollection = '{' + '"Name":"' + encodeURIComponent(encodeURIComponent("_" + keyCollection[keyIndex]))
                                                         + '"' + "," + '"Value":"' + encodeURIComponent(encodeURIComponent("_" + ObjectArray[keyCollection[keyIndex]])) + '"' + '}';
                            if (metaDataLength === 0) {
                                metaDataJson = metaDataCollection;
                            } else {
                                metaDataJson = metaDataJson + "," + metaDataCollection;
                            }
                        }
                    }
                } else {
                    for (var keyIndex = 0; keyIndex < keyCollection.length; keyIndex++) {
                        var metaDataLength = metaDataJson.length;

                        if (typeof ObjectArray[keyCollection[keyIndex]] === 'object') {
                            var nestedKeyCollection = Object.keys(ObjectArray[keyCollection[keyIndex]]);

                            for (var keyPropertyIndex = 0; keyPropertyIndex < nestedKeyCollection.length; keyPropertyIndex++) {
                                metaDataLength = metaDataJson.length;
                                var nestedPropertyName = nestedKeyCollection[keyPropertyIndex];
                                metaDataCollection = '{' + '"Name":"' + encodeURIComponent(encodeURIComponent("_" + keyCollection[keyIndex] + nestedPropertyName)) +
                                                             '"' + "," + '"Value":"' + encodeURIComponent(encodeURIComponent("_" + ObjectArray[keyCollection[keyIndex]][nestedPropertyName])) + '"' + '}';
                                if (metaDataLength === 0) {
                                    metaDataJson = metaDataCollection;
                                } else {
                                    metaDataJson = metaDataJson + "," + metaDataCollection;
                                }
                            }
                        } else {
                            metaDataLength = metaDataJson.length;
                            metaDataCollection = '{' + '"Name":"' + encodeURIComponent(encodeURIComponent("_" + keyCollection[keyIndex])) + '"' + "," + '"Value":"' +
                                                   encodeURIComponent(encodeURIComponent("_" + ObjectArray[keyCollection[keyIndex]])) + '"' + '}';
                            if (metaDataLength === 0) {
                                metaDataJson = metaDataCollection;
                            } else {
                                metaDataJson = metaDataJson + "," + metaDataCollection;
                            }
                        }
                    }
                }
                return metaDataJson;
            };

            /*get the fab Share Icon Position*/
            utilityService.setfabShareIconPosition = function () {
                if (window.pageMode !== PageMode.LANDINGPAGE) {
                    //to get the offset on top for floating div
                    var floatingTop = $("#fabButtonDiv").offset().top - $("#fabActionHolder").height();
                    //to get the offset in left for floating div
                    var floatingLeft = $("#fabButtonDiv").offset().left;
                    $("#fabActionHolder").offset({ "top": floatingTop });
                    $("#fabActionHolder").css("margin-right", 0);
                }
            };

            utilityService.setfabButtonPosition = function () {
                if ($("#fabButtonDiv").length > 0) {
                    $("#fabButtonDiv").show();
                    var floatingTopTimeControl = $("#chartDataSettingsHolder").offset().top;
                    var chartDataSettingsHolderWidth = $("#chartDataSettingsHolder").width();
                    var fabButtonWidth = $("#shareFabIcon").width();
                    // 38 - position that in the mid of chart and chart data settings
                    $("#fabButtonDiv").offset({ "top": floatingTopTimeControl - 38 });
                    /*Giving margin left for fab action div by adding 224 width
                     of left nav to chart data setting div and removing width of fab button and 48 padding*/
                    $("#fabButtonDiv").css("margin-left", (chartDataSettingsHolderWidth + 224) - (fabButtonWidth + 48));
                    utilityService.setfabShareIconPosition();
                }
            };

            /*get the fab Share Icon Position*/
            utilityService.setfabShareIconPositionForTileView = function () {
                //to get the offset on top for floating div
                var floatingTop = $("#fabButtonDivforTileView").offset().top - $("#fabActionHolder").height();
                //to get the offset in left for floating div
                var floatingLeft = $("#fabButtonDivforTileView").offset().left;
                $("#fabActionHolder").offset({ "top": floatingTop });
                $("#fabActionHolder").css("margin-right", 0);
            };

            utilityService.setfabButtonPositionForTileView = function () {
                $("#fabButtonDivforTileView").show();
                var floatingTopTimeControl = $("#tileViewFooter").offset().top;
                var chartDataSettingsHolderWidth = $("#tileViewFooter").width();
                var fabButtonWidth = $("#tileViewShareFabIcon").width();
                // 38 - position that in the mid of chart and chart data settings
                $("#fabButtonDivforTileView").offset({ "top": floatingTopTimeControl - 38 });
                /*Giving margin left for fab action div by adding 224 width
                 of left nav to chart data setting div and removing width of fab button and 48 padding*/
                $("#fabButtonDivforTileView").css("margin-left", (chartDataSettingsHolderWidth) - (fabButtonWidth + 48));
                utilityService.setfabShareIconPositionForTileView();
            };

            utilityService.hidefabButtonPosition = function () {
                $("#fabButtonDiv").hide();
            };

            utilityService.hidefabButtonForTileViewPosition = function () {
                $("#fabButtonDivforTileView").hide();
            };

            /*To show and hide flaoting menu*/
            utilityService.showOrHideFloatingDiv = function (showFloatingDiv) {
                if (utilityService.showFloatingDiv === showFloatingDiv) {
                    return;
                }
                utilityService.showFloatingDiv = showFloatingDiv;
                if (showFloatingDiv) {
                    /*getting the z-index of action and set it zero when floating div is shown*/
                    utilityService.fabButtonDivZindex = $("#fabButtonDiv").css("z-index");
                    utilityService.explorerSelectionDivZindex = $("#explorerSelection").css("z-index");
                    utilityService.headerZindex = $(".mdl-layout__header").css("z-index");
                    utilityService.leftPanelDivZindex = $("#leftPanel").css("z-index");
                    $(".mdl-layout__header").css("z-index", 0);
                    $("#leftPanel").css("z-index", 0);
                    $("#fabButtonDiv").css("z-index", 0);
                    $("#explorerSelection").css("z-index", 0);
                    $("#navMenu").css("pointer-events", "none");
                    $(".mdl-layout__header-row").css("pointer-events", "none");
                    $(".mdl-layout__header").css("opacity", "0.84");

                    $("#floatingDiv").show();
                    $("#fabActionsDiv").show();

                    $("#fabActionHolder").css("z-index", 1100);
                    $("#fabActionHolder").show();
                } else {
                    $("#navMenu").css("pointer-events", "auto");
                    $(".mdl-layout__header-row").css("pointer-events", "auto");
                    $(".mdl-layout__header").css("opacity", "1");
                    $("#fabButtonDiv").css("z-index", utilityService.fabButtonDivZindex);
                    $("#explorerSelection").css("z-index", utilityService.explorerSelectionDivZindex);
                    $("#leftPanel").css("z-index", utilityService.leftPanelDivZindex);
                    $(".mdl-layout__header").css("z-index", utilityService.headerZindex);
                    $("#floatingDiv").hide();
                    $("#fabActionsDiv").hide();
                    $("#fabActionHolder").hide();
                }
            };

            utilityService.showOrHideFloatingDivForTileView = function (showFloatingDiv) {
                if (utilityService.showFloatingDivTileView === showFloatingDiv) {
                    return;
                }
                utilityService.showFloatingDivTileView = showFloatingDiv;
                if (showFloatingDiv) {
                    /*getting the z-index of action and set it zero when floating div is shown*/
                    utilityService.fabButtonDivZindexForTileView = $("#fabButtonDivforTileView").css("z-index");
                    utilityService.tileViewFooterDivZindexForTileView = $("#tileViewFooter").css("z-index");
                    utilityService.headerZindexForTileView = $(".mdl-layout__header").css("z-index");
                    $(".mdl-layout__header").css("z-index", 0);
                    $("#tileViewFooter").css("z-index", 0);
                    $("#fabButtonDivforTileView").css("z-index", 0);
                    $("#navMenu").css("pointer-events", "none");
                    $(".mdl-layout__header-row").css("pointer-events", "none");
                    $(".mdl-layout__header").css("opacity", "0.84");


                    $("#floatingDiv").show();
                    $("#fabActionsDiv").show();
                    $("#fabActionHolder").css("z-index", 1100);
                    $("#fabActionHolder").show();
                } else {
                    $("#navMenu").css("pointer-events", "auto");
                    $(".mdl-layout__header-row").css("pointer-events", "auto");
                    $(".mdl-layout__header").css("opacity", "1");
                    $("#tileViewFooter").css("z-index", utilityService.tileViewFooterDivZindexForTileView);
                    $("#fabButtonDivforTileView").css("z-index", utilityService.fabButtonDivZindexForTileView);
                    $(".mdl-layout__header").css("z-index", utilityService.headerZindexForTileView);
                    $("#floatingDiv").hide();
                    $("#fabActionsDiv").hide();
                    $("#fabActionHolder").hide();
                }
            };

            //show a Toast Message
            utilityService.showToastMessage = function (message, actionText, delay) {
                delay = delay === undefined ? 3000 : delay;
                utilityService.showOrHideFloatingDiv(false);
                $mdToast.show({
                    template: '<md-toast style="position:fixed;max-width:568px;min-width: 288px;margin-left:40vw;margin-right:auto;align-items:center"><span>' + message +
                        '</span><md-button style="color:#80D8FF;opacity:0.87;vertical-align:middle;display:inline-block;" ng-click="closeToast()" ng-show="' +
                         (actionText.length > 0) + '">' + actionText + '</md-button></md-toast>',
                    controller: ToastMessageController,
                    hideDelay: delay
                });
            };

            //Hides Toast Message
            utilityService.hideToastMessage = function () {
                $mdToast.hide();
            };

            /*toast message controller*/
            function ToastMessageController($scope) {
                /*close toast message when clicked*/
                $scope.closeToast = function () {
                    $mdToast.hide();
                };
            }
            ToastMessageController.$inject = ['$scope'];

            // this Polyfill provided by Firefox, is log10 function is not available on all browser.
            Math.log10 = Math.log10 || function (x) {
                return Math.log(x) / Math.LN10;
            };

            /*
             * this function is used to get the no of decimal no to be displayed for an array of data.
             * this is the custom logic based on the suggestion given by Elliot.
             * @min (float) : minimum no in data array.
             * @max (float) : maximum no in data array.
             */
            utilityService.getNoOfDigitAfterDecimalPoint = function (min, max) {
                var bias = 4;
                var decimalDigits = 0;

                if (min !== max) {
                    decimalDigits = Math.max(0, bias - Math.round(Math.log10(Math.abs(max - min))));
                } else {
                    decimalDigits = bias - 1;
                }
                return decimalDigits;
            };

            /*
             * This function is used to round a floating no to a specified decimal digit no.
             */
            utilityService.roundToSignificantFigures = function (val, noOfdecimalPoint) {
                var noString = String(val);
                var splitNo = noString.split(".");
                if (splitNo.length > 1) {
                    if ((parseInt(splitNo[0]) !== 0) && (!isNaN(parseInt(splitNo[0])))) {
                        // If the numbers before the decimal point is greater than  significant digits,
                        // then round the numbers
                        if (splitNo[0].length >= noOfdecimalPoint) {
                            return Math.round(val);
                        } else if ((splitNo[0].length < noOfdecimalPoint) && (noString.length - 1 > noOfdecimalPoint)) {
                            // If the number before the decimal point is less than significant digits and
                            // total number of digits (excluding the decimal point)
                            var remainingReqdSigniDigits = noOfdecimalPoint - splitNo[0].length;
                            var afterDecimalNumbers = parseInt(splitNo[1]).toString().substr(1, remainingReqdSigniDigits);
                            return parseFloat(val.toFixed(remainingReqdSigniDigits));
                        } else {
                            return val;
                        }
                    } else {
                        var decimalNumbersWithOutZeroes = parseInt(splitNo[1]).toString().substr(0, noOfdecimalPoint);

                        if (decimalNumbersWithOutZeroes.length === noOfdecimalPoint) {
                            var result = parseFloat(val.toFixed(splitNo[1].indexOf(decimalNumbersWithOutZeroes.toString()) + decimalNumbersWithOutZeroes.toString().length));
                            return result;
                        } else {
                            return val;
                        }
                    }
                }
                return val;
            };

            utilityService.BuildUIPropertiesObject = function (tagsToAdd) {
                var propertyValue = "";
                var uiPropertiesObject = [];
                for (var index = 0; index < tagsToAdd[0].UIProperties.length; index++) {
                    if (tagsToAdd[0].UIProperties[index].Value === "false") {
                        propertyValue = (tagsToAdd[0].UIProperties[index].Value !== 'false');
                    } else if (tagsToAdd[0].UIProperties[index].Value === "true") {
                        propertyValue = (tagsToAdd[0].UIProperties[index].Value === 'true');
                    } else {
                        propertyValue = tagsToAdd[0].UIProperties[index].Value;
                    }

                    uiPropertiesObject[tagsToAdd[0].UIProperties[index].Name] = propertyValue;
                    propertyValue = "";
                }
                return uiPropertiesObject;
            };

            /*Generate Short  GUID*/
            utilityService.generateShortID = function () {
                var alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var idLength = 16;
                var shortID = '';
                for (var i = 0; i < idLength; i++) {
                    shortID += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                }
                return "a" + shortID;
            };

            /*Copy to ClipBoard funtion*/
            utilityService.copyToClipBoard = function (input) {
                var textToClipboard = input;
                var success = true;
                if (window.clipboardData) { // Internet Explorer
                    window.clipboardData.setData("Text", textToClipboard);
                } else {
                    // create a temporary element for the execCommand method
                    var forExecElement = CreateElementForExecCommand(textToClipboard);
                    /* Select the contents of the element
                        (the execCommand for 'copy' method works on the selection) */
                    SelectContent(forExecElement);
                    // UniversalXPConnect privilege is required for clipboard access in Firefox
                    try {

                        // Copy the selected content to the clipboard
                        // Works in Firefox and in Safari before version 5
                        success = document.execCommand("copy", false, null);
                    }
                    catch (e) {
                        success = false;
                    }
                    // remove the temporary element
                    document.body.removeChild(forExecElement);
                }
            };

            /*To perform or operation on analysis & embed & mobile share mode and return combined share mode*/
            utilityService.getShareMode = function (explorationShareModes) {
                return explorationShareModes.AnalysisShareMode | explorationShareModes.EmbedShareMode | explorationShareModes.MobileShareMode;
            };

            /*To return analysis and embed share modes based on saved share mode*/
            utilityService.returnShareModes = function (shareMode) {
                var explorationShareModes = [];

                var enums = Object.keys(shareModeEnum);

                for (var i = 0; i < enums.length; i++) {
                    if ((shareModeEnum[enums[i]] | shareMode) === shareMode) {
                        explorationShareModes.push(shareModeEnum[enums[i]]);
                    }
                }
                return explorationShareModes;
            };

            /*create the element for runnung the exec command for chrome, firefox and safari*/
            var CreateElementForExecCommand = function (textToClipboard) {
                var forExecElement = document.createElement("div");
                // place outside the visible area
                forExecElement.style.position = "absolute";
                forExecElement.style.left = "-10000px";
                forExecElement.style.top = "-10000px";
                // write the necessary text into the element and append to the document
                forExecElement.textContent = textToClipboard;
                document.body.appendChild(forExecElement);
                // the contentEditable mode is necessary for the  execCommand method in Firefox
                forExecElement.contentEditable = true;

                return forExecElement;
            };

            /*select the content from the created element*/
            var SelectContent = function (element) {
                // first create a range
                var rangeToSelect = document.createRange();
                rangeToSelect.selectNodeContents(element);

                // select the contents
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(rangeToSelect);
            };

            /*Convert First letter to capitalize*/
            utilityService.captilizeFirstLetter = function (input) {
                return input.charAt(0).toUpperCase() + input.slice(1);
            };

            // this function is used to format the numeric data for csv download.
            utilityService.formatData = function (value) {
                if (value === null || isNaN(value)) {
                    value = "N/A";
                } else {
                    if (utilityService.GetCSVDelimiter() === ";") {
                        value = value.toString().replace(".", ",");
                    }
                }
                return value;
            };

            //This function is used check whether function is in full screen mode
            utilityService.IsFullScreen = function () {
                var isInFullScreen = false;

                if (utilityService.detectIE()) {
                    isInFullScreen = (window.screenTop === 0 ? true : false);
                } else {
                    isInFullScreen = ((document.fullScreenElement && document.fullScreenElement !== null) || (document.mozFullScreen || document.webkitIsFullScreen) || (window.innerWidth === screen.width && window.innerHeight === screen.height)) ? true : false;
                }

                return isInFullScreen;
            };

            //This function is used toggle between normal screen and fullscreen 
            utilityService.toggleFullScreen = function () {
                if (!utilityService.fullScreen.isEnabled()) {
                    utilityService.fullScreen.all();
                    setTimeout(function () {
                        $("#titleBar").attr("class", "mdl-layout__header top autoHide");
                    }, 1000);
                }
                else {
                    utilityService.fullScreen.cancel();
                    utilityService.isPin = false;
                    $("#titleBar").attr("class", "mdl-layout__header top");
                }
            };

            //This function is used to exit fullscreen
            utilityService.exitFullScreen = function () {
                //Chrome , Mozilla , IE
                var requestMethod = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.exitFullscreen || document.msExitFullscreen;

                if (requestMethod) { // cancel full screen.
                    requestMethod.call(document);
                }
            };

            utilityService.showTitle = function (sec) {
                if (utilityService.IsFullScreen() && !utilityService.isPin && utilityService.isPC()) {
                    $("#titleBar").removeClass("autoHide");
                    setTimeout(function () {
                        $("#titleBar").addClass("autoHide");
                    }, sec * 1000);
                }
            }

            utilityService.pinTitle = function () { 
                if (!utilityService.isPin) {
                    $("#titleBar").attr("class", "mdl-layout__header top autoHide-alwaysShow");
                } else {
                    $("#titleBar").attr("class", "mdl-layout__header top autoHide");
                }
                utilityService.isPin = !utilityService.isPin;
            }

            /*Show or hide the title bar on mobile device*/
            utilityService.showOrHideTitleOnMobile = function () {
                if (!utilityService.isPC()) {                     
                    if ($("#titleBar").hasClass("autoHide")) {
                        $("#titleBar").attr("class", "mdl-layout__header top autoHide-alwaysShow");
                    } else {
                        $("#titleBar").attr("class", "mdl-layout__header top autoHide");
                    }
                }
            };

            //This function is used to get no of columns based on resolution change in dashboard
            utilityService.getColumnsForTiles = function () {
                var totalColumns = 2;

                if (window.innerWidth >= 1920) {
                    totalColumns = 4;
                } else if (window.innerWidth < 1920 && window.innerWidth > 1024) {
                    totalColumns = 3;
                } else if (window.innerWidth <= 1024) {
                    totalColumns = 2;
                }
                return totalColumns;
            };

            //This function is used to get no of columns based on resolution change in landing page
            utilityService.getColumnsForTilesInLandingPage = function () {
                var totalColumns = 2;

                if (window.innerWidth >= 1920) {
                    totalColumns = 5;
                } else if (window.innerWidth < 1920 && window.innerWidth > 1024) {
                    totalColumns = 4;
                } else if (window.innerWidth <= 1024) {
                    totalColumns = 3;
                }
                return totalColumns;
            };

            //This function is used to enter fullscreen
            utilityService.enterFullScreen = function () {
                var element = document.body;
                //Chrome , Mozilla , IE
                var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;

                if (requestMethod) {
                    requestMethod.call(element);
                }
            };

            utilityService.addToHistory = function (selectedExplorer, favoriteObj, nextPageMode) {
                if (!favoriteObj) {
                    favoriteObj = {};
                }
                if (utilityService.pageStates.length > 0) {
                    var lastState = utilityService.pageStates.slice(-1)[0];

                    if (lastState.nextPageMode !== nextPageMode) {
                        var index = arrayObjectIndexOf(utilityService.pageStates, window.pageMode, "pageMode");
                        if (index > 0) {
                            var state = utilityService.pageStates[index];
                            state.exploreSelection = window.selectedExplorer;
                            state.favoriteObj = favoriteObj;
                            state.dashboardState = window.dashboardState;
                            state.keywords = dashboardKeywords;
                            state.nextPageMode = nextPageMode;

                            utilityService.pageStates.splice(index, 1);
                            utilityService.pageStates.push(state);

                            history.pushState(state, "Page " + state.pageMode, "/" + state.pageMode);
                        }
                        else {

                            var stateObj = {
                                pageMode: window.pageMode,
                                exploreSelection: window.selectedExplorer,
                                favoriteObj: favoriteObj,
                                dashboardState: window.dashboardState,
                                keywords: dashboardKeywords,
                                nextPageMode: nextPageMode
                            };
                            utilityService.pageStates.push(stateObj);
                            history.pushState(stateObj, "Page " + window.pageMode, "/" + window.pageMode);
                        }
                    }
                }
                else {
                    var stateObj = {
                        pageMode: window.pageMode,
                        exploreSelection: window.selectedExplorer,
                        favoriteObj: favoriteObj,
                        dashboardState: window.dashboardState,
                        keywords: dashboardKeywords,
                        nextPageMode: nextPageMode
                    };
                    utilityService.pageStates.push(stateObj);
                    history.pushState(stateObj, "Page " + window.pageMode, "/" + window.pageMode);
                }

                // shows tidio chat for Homepage and hides for other pages
                $('#tidio-chat').remove();
                $('#tidio-chat-button-mobile').remove();

                // removes "Show me how" widget
                $('#_widget_wfx_').remove();
            };

            //Gives appropriate time unit e.g. miliseconds, secs, hours , days, months , yrs for & max divisor to divide range of values  & convert to appropriate unit.
            utilityService.getTickTimeFormat = function (maxTimeValue) {
                var timeFormat = {};

                if (maxTimeValue !== undefined) {
                    var index = 0,
                      remainder = maxTimeValue,
                      divisor = 1,
                      totalConversions = conversions.length;

                    while (index < totalConversions) {
                        remainder = remainder / conversions[index];
                        divisor = divisor * conversions[index];

                        if (remainder >= conversions[index + 1]) {
                            index++;
                        } else {
                            if (remainder <= 1) {
                                divisor = divisor / conversions[index];
                                index--;
                            }
                            break;
                        }
                    }

                    timeFormat.label = axisLabels[index];
                    timeFormat.divisor = divisor;
                } else {
                    timeFormat.label = axisLabels[0];
                    timeFormat.divisor = 1;
                }

                return timeFormat;
            };

            utilityService.buildTagObject = function (tagObj) {
                if (window.thisApp.type !== "desktop") {
                    // TagName is stored as FQN in azure. so reset it back to only tag name
                    var sourceTagnameSeperatorIndex = tagObj.TagName.indexOf(".");
                    if (sourceTagnameSeperatorIndex > -1 && tagObj.TagName.length >= (sourceTagnameSeperatorIndex + 1)) {
                        if ('isSourceSeperatedFromTagName' in tagObj) {
                            // do nothing
                        } else {
                            tagObj.Source = tagObj.Source ? tagObj.Source : tagObj.TagName.substring(0, tagObj.TagName.indexOf("."));
                            tagObj.TagName = tagObj.TagName.substring(tagObj.TagName.indexOf(".") + 1);
                            tagObj.isSourceSeperatedFromTagName = true;
                        }
                    }
                }

                tagObj.isSelected = tagObj.IsSelected.toUpperCase() === "TRUE";
                tagObj.FQN = window.thisApp.type === "desktop" ? tagObj.TagName : (tagObj.Source + "." + tagObj.TagName);
                tagObj.DisplayName = tagObj.TagName;
            };

            $(window).on('popstate', function (event) {
                var stateObj = event.originalEvent.state;

                if (stateObj) {
                    window.persistLastView = stateObj.pageMode;
                    window.singleChartLoadedFavorite = stateObj.favoriteObj;
                    window.selectedExplorer = stateObj.exploreSelection;
                    if (stateObj.pageMode === PageMode.TILEVIEW) {
                        if (stateObj.dashboardState === DashboardStates.ManageContent) {
                            NotificationService.showDashBoardView(stateObj.favoriteObj);
                        }
                        else if (stateObj.dashboardState === DashboardStates.KeywordSearch) {
                            NotificationService.loadDashBoardFromSearch(stateObj.keywords);

                        } else if (stateObj.dashboardState === DashboardStates.FavoriteSearch) {
                            window.isDashBoardLoaded = false;
                            NotificationService.loadDashBoardFavoriteFromSearch(stateObj.favoriteObj.URL);
                        }
                    }
                    else {
                        NotificationService.showOtherPage(true);
                    }
                }
                utilityService.pageStates.pop();
                if (utilityService.pageStates.length > 0) {
                    var oldState = utilityService.pageStates.slice(-1)[0];
                    history.pushState(oldState, "Page " + oldState.pageMode, "/" + oldState.pageMode);
                }
            });

            utilityService.initialize = function () {
                if (window.pageMode === PageMode.SINGLECHARTLAYOUT) {
                    // shows tidio chat for Homepage and hides for other pages
                    $timeout(function () { $('#tidio-chat').remove() }, 1000);
                }
            };

            // If scope is defined replace leading / with tenant name
            utilityService.getScopeDisplayName = function (scope) {
                if (scope) {
                    if (scope === "/") {
                        scope = tenantName;
                    }
                    else {
                        scope = tenantName + scope.substring(0, scope.length - (utilityService.endsWith(scope, "/") ? 1 : 0));
                    }
                }
                else { // if scope is not assigned then show tenant name
                    scope = tenantName;
                }

                return scope;
            };

            utilityService.endsWith = function (str, suffix) {
                return (str && suffix && str.indexOf(suffix, str.length - suffix.length) !== -1);
            }

            // get applicable scopes for content
            utilityService.getApplicableScopesForContent = function (scopeObject) {
                utilityService.applicableScopes = [];

                if (window.thisApp.type === "desktop") {
                    return;
                }

                var queryUrl = $("#infoClientFavoritesUrl").val() + "/D.GetApplicableScopesForContent()";
                //var queryUrl = $("#infoClientFavoritesUrlV2").val() + "/D.GetContentScopes()";
                var defer = $q.defer();
                var promise = InfoClientAppService.postDataToServer(queryUrl, defer, scopeObject)
                   .then(function (promise) {
                       utilityService.applicableScopes = promise.data.value;
                       return promise;
                   },
                    function (error) {
                        console.log(error.status);
                        return error;

                    })
                    .finally(function () {
                    });
                return promise;
            };

            utilityService.addAllNumericGroup = function (layoutsObj) {
                var allAnalogTags = [];
                var allNumericGroup = undefined;
                var index = 0;

                layoutsObj.forEach(function (layout, i) {
                    if (layout.Name === "All Numeric") {
                        allNumericGroup = layout;
                        index = i;
                    }
                    layout.Tags.forEach(function (tag) {
                        if (tag.TagType === "Analog" || tag.TagType === "AnalogSummary" || tag.TagType === "Discrete") {
                            allAnalogTags.push(angular.copy(tag));
                        }
                    });
                });

                if (allNumericGroup !== undefined) {
                    if (allAnalogTags.length === 0) {
                        layoutsObj.splice(index);
                    } else {
                        allNumericGroup.Tags = allAnalogTags;
                    }
                }

            };

            // Log messages based on Config value
            utilityService.logMessageForSpeedTest = function (chartType, favId, isCompleted) {
                if (sessionStorage.getItem("PerformSpeedTests") === "true") {
                    favId = favId ? favId : "SCL";
                    if (!isCompleted) {
                        window[favId] = {};
                        window[favId].startTime = new Date();
                    }
                    else {
                        if (window[favId] !== undefined) {
                            console.log("PerformSpeedTest: Total time taken by " + chartType + " of " +
                                (favId !== "SCL" ? "Dashborad Favorite: " + favId : "Single Chart layout") + " to complete load is " + ((new Date()).getTime() - window[favId].startTime) + "ms");
                            delete window[favId];
                        }
                    }
                }
            }

            utilityService.isDesktopApp = function () {
                return window.thisApp.type === "desktop";
            };

            utilityService.showmdAlert = function (title, bodyMessage, buttonText) {
                var alert = $mdDialog.alert({
                    clickOutsideToClose: false,
                    escapeToClose: false,
                    title: title,
                    content: bodyMessage,
                    ok: buttonText
                });

                $mdDialog.show(alert);
            };

            utilityService.initialize();

            return utilityService;
        }]);

    infoClientApp.filter('formatNumber',
    ['$filter', function (filter) {
        return function (inputNo, decimalDigits) {
            var formatedValue = inputNo;
            if (isNaN(parseFloat(inputNo)) === false &&
                isNaN(parseFloat(decimalDigits)) === false) {
                var denom = Math.pow(10, decimalDigits);
                formatedValue = Math.round(inputNo * denom) / denom;  //show decimal digits up-to 3 no-its same formula in scooter.
            }
            return formatedValue;
        };
    }]);
}());