
  !function() {
    // Could be called with Backbone.Events mixed in and it then iterates over 'on', off', 'listenTo' in a loop and generates a 'proxyOn', 'proxyOff' method etc
    function makeEventPipe() {
      var publicAPI = {__super: Object.create(Backbone.Events) };

      var proxyListeners = [];
      function _listenTo(domObj, sEvtName, fnHandler) {
        var me = this;
        var fnProxyToDOMEvent = function() {
          fnHandler.apply(me, Array.prototype.slice.call(arguments, 0));
        };
        domObj.addEventListener(sEvtName, fnProxyToDOMEvent, false);
        sEvtName = 'domproxy:' + sEvtName;
        var proxySignature = {};
        proxySignature[_.uniqueId('_lp')] = { _domObj: domObj, _sEvtName: sEvtName, _fnHandler: fnProxyToDOMEvent  }
        proxyListeners.push(proxySignature);
        me.stopListening = _stopListening; // This is crucial OVERRIDE the usual BackboneJS native 'stopListening()' by setting it on the instance of the view. The genius of it is that doing it this way you know that this special 'stopListening()' doesn't effect any other parts of your Backbone app. When the view is removed and GC'ed the custom _stopListening() goes with it.
        // So we have the DOMproxied event we just made happen stored in proxyListeners and also a 'faux' listenTo using BackboneJS native 'listenTo' which it also stores internally
        return publicAPI.__super.listenTo.call(me, publicAPI.__super, sEvtName, fnHandler)
      }; //end publicAPI.listenTo

      function removeDOMEventListener(domObj, sEventName, fnHandlerCallback) {
        if (!domObj || !sEventName || !fnHandlerCallback) {
          return;
        }
        sEventName = sEventName.replace(/domproxy:/, '');
        domObj.removeEventListener(sEventName, fnHandlerCallback);
      }

      function _stopListening(objListenedTo, sEvtName, fnCallback) {
        "use strict";
        // INSCOPE VIA CLOSURE
        // publicAPI            {object}    The super class for the proxied version of _listenTo and which owns the native Backbone 'listenTo()' / 'stopListening()
        // proxyListeners       {array}     Holds all the memorized events (each with unique ID) for all the proxied events
        console.log(proxyListeners);
        objListenedTo = _.isUndefined(objListenedTo) ? null : objListenedTo;
        sEvtName = _.isUndefined(sEvtName) ? null : sEvtName;
        fnCallback = _.isUndefined(fnCallback) ? null : fnCallback;
        var objToRemoveListeningForNativeCall = void 0;
        var sEvtNameToRemoveForNativeCall = void 0;
        var fnCallbackToRemoveForNativeCall = void 0;

        _(proxyListeners).each(function(item) {
          var uniqueId = _(item).keys()[0]
          var objListenedToMemoized = item[uniqueId]._domObj;
          var sEvtNameMemoized = item[uniqueId]._sEvtName;
          var fnHandlerMemoized = item[uniqueId]._fnHandler;
          if (objListenedTo === null || objListenedTo === objListenedToMemoized) {
            removeDOMEventListener(objListenedToMemoized, sEvtNameMemoized, fnHandlerMemoized);
            if (objListenedTo !== null) {
              objToRemoveListeningForNativeCall = objListenedTo;
            }
          }
          if (objListenedTo === objListenedToMemoized && (sEvtName === sEvtNameMemoized || sEvtName === null) ) {
            objToRemoveListeningForNativeCall = objListenedTo;
            sEvtNameToRemoveForNativeCall = sEvtName;
          }
          if (objListenedTo === objListenedToMemoized && sEvtName === sEvtNameMemoized && (fnCallback === fnHandlerMemoized || fnCallback === null)) {
            objToRemoveListeningForNativeCall = objListenedTo;
            sEvtNameToRemoveForNativeCall = sEvtName;
            fnCallbackToRemoveForNativeCall = fnCallback
          }
        });
        // TODO everytime a match is found with the memoized domproxy events where in proxyListeners the found was found must be recorded and stored ina temp
        // array then after forEach it must pick those indexes uo and delete from proxyListeners

        if (!_.isUndefined(objToRemoveListeningForNativeCall)) {
          // At least one argument (i.e. the object to do the listen on) was supplied to this proxied version of 'stopListening()' and it turns out that object
          // to do the listening on was memoized because it is a proxied DOM event so pass up those memorized details as the args to the native stopLiastening
          return publicAPI.__super.stopListening.call(this, objToRemoveListeningForNativeCall, sEvtNameToRemoveForNativeCall, fnCallbackToRemoveForNativeCall);
        } else {
          // No args were supplied to 'stopListening()' get BackboneJS's native stopListening to remove everything
          return publicAPI.__super.stopListening.call(this, objListenedTo, sEvtName, fnCallback);
        }
      } //end publicAPI.stopListeningTo


      var arrEMethodNames = [
        { 'listenTo': _listenTo },
        { 'stopListening': _stopListening },
      ];

      _(arrEMethodNames).each(function(objItem) {
        var methodName = (_(objItem).keys())[0];
        publicAPI[methodName] = objItem[methodName];
      }, publicAPI);

      console.dir(publicAPI);

      return {
        eventPipe: publicAPI
      };

    }

    var model = new Backbone.Model();
    model.set('title', 'goFishing');

    var MyViewClass = Backbone.View.extend({
      initialize: function() {
        var meView = this;
        meView.constructor.eventPipe.listenTo.call(meView, window, 'scroll', meView.handleScroll);
        // meView.constructor.eventPipe.listenTo(window, 'resize', meView.handleResize);

        meView.listenTo(this.model, 'change', this.titleChanged);
      }
      ,
      events: {
        'click #stopListening': 'stopListeningOutright',
        'click #stopListeningScroll': 'removeScrollListener',
        'click #chgTitle': 'chgTitle',
        'click #removeChgTitleEvent': 'removeChgTitleEvent'
      }
      ,
      render: function() {
        this.$el.html($('<span>Snap</span><button id=\"stopListening\">Stop Listening Outright</button>&nbsp;<button id=\"chgTitle\">Chg Title</button>&nbsp;<button id=\"removeChgTitleEvent\">Stop Listening \'chgTitle\' on Model</button><button id=\"stopListeningScroll\">Stop Listening Scroll</button><br /><br /><br /><br /><hr id=\"fixme\" style=\"margin: 0; border-top: 5px solid blue;\">'));
        document.body.appendChild(this.el);
        return this;
      }
      ,
      handleScroll: function(event) {
        console.log(window.scrollY);
        if (this.origPosY === void 0) {
          this.origPosY = $('#fixme').position().top;
        }
        if (window.scrollY >=  this.origPosY -1) {
          $('#fixme').css({position: 'fixed', 'top': 0, left: '8px', width: '100%'});
        } else {
          $('#fixme').css({position: 'static', width: '100%'});
        }
      }
      ,
      handleResize: function(event) {
        console.group();
        console.dir(event);
        console.groupEnd();
      }
      ,
      stopListeningOutright: function() {
        this.stopListening();
      }
      ,
      removeScrollListener: function() {
        this.stopListening(window); /* 'scroll', this.handleScroll */
      }
      ,
      chgTitle: function() {
        this.model.set('title', 'done ' + Math.random());
      }
      ,
      titleChanged: function() {
        alert('changed');
      }
      ,
      removeChgTitleEvent: function() {
        this.stopListening(this.model, 'change');
      }
    }, makeEventPipe());
    var view = new MyViewClass({model: model});
    view.render();
    window.myview = view;
    console.dir(view);

  }();
