var myApp = myApp || {};
function makeEventRelayer() {
  'use strict';
  var publicAPI = {__super: Object.create(Backbone.Events)};

  var proxyListeners = [];

  function _getProxyListeners() {
    return proxyListeners;
  }

  function _listenTo(domObj, sEvtName, fnHandler, doOnceOnly) {
    var me = this;
    // @TODO If the below function could be curried to have the view handler and view ref passed in ('fnHandler' and 'me' respectively) then it could
    // be refactored out of this scope into the parent scope and you wouldn't need a reference to it stored in 'proxyListeners' array)
    var fnProxyToDOMEvent = function() {
      fnHandler.apply(me, Array.prototype.slice.call(arguments, 0));
    };
    if (_.isUndefined(domObj) || _.isUndefined(sEvtName) || _.isUndefined(fnHandler)) {
      return;
    }
    doOnceOnly = _(doOnceOnly).isUndefined() ? false : doOnceOnly;
    $(domObj)['on' + (doOnceOnly ? 'e' : '')](sEvtName, fnProxyToDOMEvent);
    // domObj.addEventListener(sEvtName, fnProxyToDOMEvent, false);
    var proxySignature = {};
    proxySignature[_.uniqueId('_lp')] = {_domObj: domObj, _sEvtName: sEvtName, _fnHandler: fnHandler, domHandler: fnProxyToDOMEvent};
    _getProxyListeners().push(proxySignature);
    me.stopListening = _stopListening; // This is crucial OVERRIDE the usual BackboneJS native 'stopListening()' by setting it on the
    // instance of the view. The clever thing is that doing it this way you know that this special 'stopListening()' doesn't effect
    // any other parts of your Backbone app. When the view is removed and GC'ed the custom _stopListening() goes with it.
    // So we have the DOMproxied event we just made happen stored in proxyListeners so the custom '_stopListening' method can pick it up later.
  } //end publicAPI.listenTo

  function _listenToOnce(domObj, sEvtName, fnHandler) {
    return _listenTo.call(this, domObj, sEvtName, fnHandler, true);
  }  //end publicAPI.listenToOnce

  function removeDOMEventListener(domObj, sEventName, fnHandlerCallback) {
    $(domObj).off(sEventName, fnHandlerCallback);
  }

  function _stopListening(objListenedTo, sEvtName, fnCallback) {
    // INSCOPE VIA CLOSURE
    // publicAPI            {object}    The super class for the proxied version of _listenTo and which owns the native Backbone 'listenTo()' / 'stopListening()
    objListenedTo = _.isUndefined(objListenedTo) ? null : objListenedTo;
    sEvtName = _.isUndefined(sEvtName) ? null : sEvtName;
    fnCallback = _.isUndefined(fnCallback) ? null : fnCallback;
    var bFoundMemoizedProxiedEvent = false;
    var me = this;
    _(_getProxyListeners()).each(function(item) {
      var uniqueId = _(item).keys()[0];
      var objListenedToMemoized = item[uniqueId]._domObj;
      var sEvtNameMemoized = item[uniqueId]._sEvtName;
      var fnHandlerMemoized = item[uniqueId]._fnHandler;
      if (objListenedTo === null) {
        removeDOMEventListener(objListenedToMemoized, sEvtNameMemoized, item[uniqueId].domHandler);
      }
      else if (objListenedTo === objListenedToMemoized && (sEvtName === sEvtNameMemoized || sEvtName === null) && (fnCallback === fnHandlerMemoized || fnCallback === null)) {
        bFoundMemoizedProxiedEvent = true;
        removeDOMEventListener(objListenedToMemoized, sEvtNameMemoized, item[uniqueId].domHandler);
      }

    });
    // TODO everytime a match is found with the memoized domproxy events where in proxyListeners it must be deleted out of the proxyListeners array
    // Otherwise it is only Garbage Collected whent he view is destroyed. No biggie but worth baring in mind

    if (!bFoundMemoizedProxiedEvent) {
      // No args were supplied to 'stopListening()' or args were supplied but it wasn't for a proxied event (i.e. just normal BackboneJs 'listenTo' API
      // event so pass the args thru to the native 'stopListening()' method.
      return publicAPI.__super.stopListening.call(me, objListenedTo, sEvtName, fnCallback);
    }
  } //end publicAPI.stopListeningTo

  publicAPI.listenTo = _listenTo;
  publicAPI.listenToOnce = _listenToOnce;
  publicAPI.stopListening = _stopListening;
  return {
    eventRelayer: publicAPI
  };

}  // End fn 'makeEventRelayer()'

myApp.makeEventRelayer = makeEventRelayer;



