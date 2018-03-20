/*global angular, console, ga, window, navigator, document, $*/
/* jshint -W100 */ //ignores this character may get silently deleted by one or more browsers
//------------------------------------------------------------------------------------------------------------
//<copyright company="Schneider Electric Software, LLC" file="PanZoom.js">
//   � 2015 Schneider Electric Software, LLC. All rights reserved.
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
if (window.panAndZoomSupport == null) {
    if (window.webGraphicsApi == null) {
        console.log('WARNING: Please make sure webGraphicsApi.js will be included.');
    }
    //else {
    var panAndZoomSupport = (function () {
        function panAndZoomSupport() {
            this.isZooming = false;
            this.graphicContainer = window.document;
            this.currentSymbolName = "";
            this.onPanStart = null;
            this.onPanEnd = null;
            this.isPan = false;

            var self = this;

            document.addEventListener("keydown", function (e) { self.onKeyDown(e); }, false);
            document.addEventListener("keyup", function (e) { self.onKeyUp(e); }, false);

            if ((typeof document.onmousewheel) != "undefined") {
                document.addEventListener("mousewheel", function (e) { self.onMouseWheel(e); }, false);
            }
            else if ((typeof document.onwheel) != "undefined") {
                document.addEventListener("wheel", function (e) { self.onMouseWheel(e); }, false);
            }

            document.addEventListener("mousedown", function (e) { self.onMouseDown(e); }, false);
            document.addEventListener("mouseup", function (e) { self.onMouseUp(e); }, false);
            // MUST use addEventListener here and set "useCapture" as true otherwise after mouse down, mouse move callback will NOT responded.
            document.addEventListener("mousemove", function (e) { self.onMouseMove(e); }, true);

            document.addEventListener("dblclick", function (e) { self.onDoubleClick(e); }, false);

            // Touch related events MUST be registered with parameter "false" to make sure it will following other events handled. 
            // If is true, it will responded before inner elements events responded.
            if ((typeof document.ontouchstart) != "undefined" && (typeof document.ontouchend) != "undefined") {
                document.addEventListener("touchstart", function (e) { self.onTouchStart(e); }, false);
                document.addEventListener("touchend", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("touchcancel", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("touchmove", function (e) { self.onTouchMove(e); }, false);
            }
            else if ((typeof document.onpointerdown) != "undefined" && (typeof document.onpointerup) != "undefined") {
                document.addEventListener("pointerdown", function (e) { self.onTouchStart(e); }, false);
                document.addEventListener("pointerup", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("pointercancel", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("pointermove", function (e) { self.onTouchMove(e); }, false);
            }
            else if ((typeof document.onmspointerdown) != "undefined" && (typeof document.onmspointerup) != "undefined") {
                document.addEventListener("mspointerdown", function (e) { self.onTouchStart(e); }, false);
                document.addEventListener("mspointerup", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("mspointercancel", function (e) { self.onTouchEnd(e); }, false);
                document.addEventListener("mspointermove", function (e) { self.onTouchMove(e); }, false);
            }
            else {
                console.log("Browser does not support touch.");
            }
        };

        // MUST be called before do pan and zoom
        panAndZoomSupport.prototype.setSymbolName = function (symbolName) {
            this.currentSymbolName = symbolName;
        };

        // MUST be called otherwise using key will NOT accurate
        panAndZoomSupport.prototype.setContainer = function (dom) {
            this.graphicContainer = dom;
        };

        panAndZoomSupport.prototype.onKeyDown = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            // check whether ctrl key down. If ctrl down, set flag to support mouse wheel zooming
            if (evt.ctrlKey)
                this.isCtrlDown = true;
            else
                this.isCtrlDown = false;

            if (evt.ctrlKey && (evt.which == 187 || evt.which == 189 || evt.which == 107 || evt.which == 109)) { // 187: +  189: - 107: Numpad +  109: Numpad -
                var symbolChartRect = this.graphicContainer.getBoundingClientRect();
                this.doZooming((evt.which == 187 || evt.which == 107 ? 1 : -1) * 0.25, symbolChartRect.left + 0.5 * symbolChartRect.width, symbolChartRect.top + 0.5 * symbolChartRect.height);

                // prevent event to browser zooming
                this.stopPropagation(evt);
            }
        };

        panAndZoomSupport.prototype.onKeyUp = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (e && !e.ctrlKey && this.isCtrlDown) {
                this.isCtrlDown = false;
                if (this.isZooming) {
                    this.isZooming = false;
                    webGraphicsApi.endZooming(this.currentSymbolName);
                }
            }
        };

        panAndZoomSupport.prototype.onMouseWheel = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (evt) {
                if (evt.ctrlKey) {
                    var level = 1000;
                    if (e.type && e.type.toLowerCase() != "mousewheel")
                        level = 30;

                    var deltaLevel = (evt.deltaY || evt.wheelDelta * -1) / level * -1;
                    this.doZooming(deltaLevel, evt.clientX, evt.clientY);

                    // prevent event to browser zooming
                    this.stopPropagation(evt);
                }
            }
        };

        panAndZoomSupport.prototype.onMouseDown = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (evt && evt.buttons > 0 && evt.button == 1) {
                this.isMouseCenterDownTriggerred = true;
                this.mouseDownPoint = { x: evt.clientX, y: evt.clientY };
            }
        };

        panAndZoomSupport.prototype.onMouseUp = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (evt && (evt.buttons <= 0 || (evt.buttons > 0 && evt.button == 1))) {
                this.isMouseCenterDownTriggerred = false;
                webGraphicsApi.endPanning(this.currentSymbolName);
                if (this.onPanEnd) {
                    this.onPanEnd();
                    this.isPan = false;
                }
            }
        };

        panAndZoomSupport.prototype.onMouseMove = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (evt && evt.buttons > 0) {
                if (this.isMouseCenterDownTriggerred) {
                    var deltaX = evt.clientX - this.mouseDownPoint.x;
                    var deltaY = evt.clientY - this.mouseDownPoint.y;
                    webGraphicsApi.startPanning(this.currentSymbolName, deltaX, deltaY, this.mouseDownPoint.x, this.mouseDownPoint.y);
                    if (this.onPanStart && !this.isPan) {
                        this.onPanStart();
                        this.isPan = true;
                    }
                }
            }
        };

        panAndZoomSupport.prototype.onDoubleClick = function (e) {
            this.onDoubleTap(e);
        };

        // touch support
        panAndZoomSupport.prototype.onTouchStart = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            var touches = this.getTouchPoints(evt);
            if (evt && touches && !evt.isHandledByAnimation) {
                var curZoomLevel = webGraphicsApi.getZoomLevel(this.currentSymbolName);
                if ((curZoomLevel > 1 && touches.length == 1)// one finger start paning
                || touches.length > 1) { // multi-touch
                    var canDoubleTap = this.touchInfo == null;
                    this.touchInfo = this.touchInfo || {};
                    this.touchInfo.startZoomLevel = curZoomLevel;

                    if (touches.length > 1) { // multi-touch. Zooming
                        if (this.touchInfo.startPoints == null || this.touchInfo.startPoints.length < 2) {
                            this.touchInfo.startPoints = null;
                            this.touchInfo.startPoints = [this.getTouchPoint(touches[0]), this.getTouchPoint(touches[1])];
                            this.touchInfo.origin = this.touchGetOrigin(this.touchInfo.startPoints);
                            // prevent event to browser zooming
                            this.stopPropagation(evt);
                        }
                    }
                    else { // single touch. For paning
                        if (this.touchDownActive && canDoubleTap) { // double tap
                            this.isTouchDoubleTap = true;
                        }

                        this.touchInfo.startPoints = this.touchInfo.startPoints || [this.getTouchPoint(touches[0])];
                    }

                    // prevent event to browser zooming
                    //this.stopPropagation(evt);
                }
            }
        };

        panAndZoomSupport.prototype.onTouchEnd = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            var executed = false;
            var touches = this.getTouchPoints(evt);
            if (evt && this.touchInfo && !evt.isHandledByAnimation) {
                if (this.touchInfo.startPoints.length > 1 && (touches == null || touches.length < 2)) { // zooming
                    this.isZooming = false;
                    webGraphicsApi.endZooming(this.currentSymbolName);
                    if (this.isTouchPanning) {
                        this.isTouchPanning = null;
                        webGraphicsApi.endPanning(this.currentSymbolName);
                    }

                    this.touchInfo = null;
                    executed = true;
                }
                else if (this.touchInfo.startPoints.length == 1 && (touches == null || touches.length < 1)) {
                    if (this.isTouchPanning) {
                        webGraphicsApi.endPanning(this.currentSymbolName);
                        executed = true;
                        this.isTouchPanning = null;
                    }
                    else {
                        // start double-tap timeout
                        this.touchDownActive = true;
                        var self = this;
                        this.touchDownActiveTimeout = setTimeout(function () {
                            self.touchDownActive = null;
                        }, 350);
                    }
                }

                this.touchInfo = null;
            }
            if (evt && (touches == null || touches.length < 1) && this.isTouchDoubleTap) {
                if (this.touchDownActiveTimeout) {
                    clearTimeout(this.touchDownActiveTimeout);
                    this.touchDownActiveTimeout = null;
                }
                this.touchDownActive = null;
                this.isTouchDoubleTap = null;
                // double tap triggerred.
                this.onDoubleTap(e);
                executed = true;
            }

            if (executed) {
                this.touchInfo = null;

                // prevent event to browser zooming
                this.stopPropagation(evt);
            }
        };

        panAndZoomSupport.prototype.onTouchMove = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            var executed = false;
            var touches = this.getTouchPoints(evt);
            if (evt && touches && touches.length > 0 && this.touchInfo && !evt.isHandledByAnimation) {
                var curLevel = webGraphicsApi.getZoomLevel(this.currentSymbolName);

                if (this.touchInfo.startPoints && this.touchInfo.startPoints.length > 1 && touches.length > 1) { // Multi-Touch. Zooming
                    var curTouchPoints = [this.getTouchPoint(touches[0]), this.getTouchPoint(touches[1])];
                    var curOrigin = this.touchGetOrigin(curTouchPoints);

                    var targetLevel = this.getTouchScale(this.touchInfo.startPoints, curTouchPoints);
                    targetLevel *= this.touchInfo.startZoomLevel;
                    var deltaLevel = targetLevel - curLevel;
                    this.doZooming(deltaLevel, this.touchInfo.origin.x, this.touchInfo.origin.y, curOrigin.x - this.touchInfo.origin.x, curOrigin.y - this.touchInfo.origin.y);

                    executed = true;
                }
                else if (this.touchInfo.startPoints && this.touchInfo.startPoints.length == 1 && touches.length == 1 && curLevel > 1) { // Single-touch. Pan
                    this.doPanning(touches[0].clientX, touches[0].clientY, this.touchInfo.startPoints[0].x, this.touchInfo.startPoints[0].y);
                    executed = true;
                }

                /*
                if(executed){
                    // prevent event to browser zooming
                    this.stopPropagation(evt);
                }*/
            }
            // prevent event to browser zooming
            if (executed) {
                // Touch move will trigger browser collapse or other behavior. So always prevent touch move propergate to window/browser.
                this.stopPropagation(evt);
            }
        };

        // supporting methods
        panAndZoomSupport.prototype.doZooming = function (deltaZoomLevel, refPointX, refPointY, offsetX, offsetY) {
            var scaleLevel = webGraphicsApi.getZoomLevel(this.currentSymbolName);
            scaleLevel += deltaZoomLevel;

            if (scaleLevel > 5) {
                scaleLevel = 5;
            }
            else if (scaleLevel < 1) {
                scaleLevel = 1;
            }

            this.isZooming = true;

            // clientX/clientY are the mouse point related to browser viewer top-left point.
            webGraphicsApi.startZooming(this.currentSymbolName, scaleLevel, refPointX, refPointY, offsetX, offsetY);
        };

        panAndZoomSupport.prototype.doPanning = function (curPointX, curPointY, refPointX, refPointY) {
            var startX = refPointX;
            var startY = refPointY;
            var deltaX = curPointX - startX;
            var deltaY = curPointY - startY;
            if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
                webGraphicsApi.startPanning(this.currentSymbolName, deltaX, deltaY, startX, startY);
                this.isTouchPanning = true;
            }
        };

        panAndZoomSupport.prototype.onDoubleTap = function (e) {
            var evt = e && e.originalEvent ? e.originalEvent : e;
            if (evt) {
                // after trigger end zooming, and if current zoom level < 1, will set zoom level as 1
                var scaleLevel = 1;
                webGraphicsApi.startZooming(this.currentSymbolName, scaleLevel, evt.clientX, evt.clientY);
                webGraphicsApi.endZooming(this.currentSymbolName);
                // prevent event to browser zooming
                this.stopPropagation(evt);
            }
        };

        panAndZoomSupport.prototype.stopPropagation = function (evt) {
            // prevent event to browser zooming
            if (evt.preventDefault)
                evt.preventDefault();

            if (evt.stopPropagation)
                evt.stopPropagation();

            if (evt.stopImmediatePropagation)
                evt.stopImmediatePropagation();

            evt.returnValue = false;
        };

        // touch supporting
        panAndZoomSupport.prototype.getTouchPoints = function (evt) {
            var points = [];

            if (evt.touches) {
                return evt.touches;
            }
            else if (evt.pointerId != null && evt.pointerType != null && evt.pointerType.toLowerCase().indexOf("mouse") < 0) {
                this.pointerPoints = this.pointerPoints || [];
                var typeName = evt.type.toLowerCase();
                if (typeName.indexOf("down") >= 0 && this.pointerPoints.lastIndexOf(function (p) { return p.pointerId == evt.pointerId; }) < 0) {
                    this.pointerPoints.push({
                        pointerId: evt.pointerId,
                        clientX: evt.clientX,
                        clientY: evt.clientY,
                        screenX: evt.screenX,
                        screenY: evt.screenY
                    });
                }
                else if (typeName.indexOf("move") >= 0) {
                    for (var i = 0; i < this.pointerPoints.length; i++) {
                        if (this.pointerPoints[i].pointerId == evt.pointerId) {
                            this.pointerPoints[i].clientX = evt.clientX;
                            this.pointerPoints[i].clientY = evt.clientY;
                            this.pointerPoints[i].screenX = evt.screenX;
                            this.pointerPoints[i].screenY = evt.screenY;
                            break;
                        }
                    }
                }
                else if (typeName.indexOf("up") >= 0) {
                    this.pointerPoints = this.pointerPoints.filter(function (p) { return p.pointerId != evt.pointerId; });
                }
                else if (typeName.indexOf("cancel") >= 0) {
                    this.pointerPoints = [];
                }

                return this.pointerPoints;
            }

            return points;
        };

        panAndZoomSupport.prototype.getTouchPoint = function (eventPoint) {
            return {
                x: eventPoint.clientX,
                y: eventPoint.clientY
            };
        };

        panAndZoomSupport.prototype.touchGetOrigin = function (startPointsArr) {
            return {
                x: (startPointsArr[0].x + startPointsArr[1].x) / 2,
                y: (startPointsArr[0].y + startPointsArr[1].y) / 2
            };
        };

        panAndZoomSupport.prototype.getTouchScale = function (startPointsArr, endPointsArr) {
            var startDist = this.getTouchDistance(startPointsArr[0], startPointsArr[1]);
            var endDist = this.getTouchDistance(endPointsArr[0], endPointsArr[1]);
            if (startDist > 0 && endDist > 0)
                return endDist / startDist;

            return 1;
        };

        panAndZoomSupport.prototype.getTouchDistance = function (point1, point2) {
            return Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
        };

        return panAndZoomSupport;
    })();
    window.panAndZoomSupport = new panAndZoomSupport();
    //}
}