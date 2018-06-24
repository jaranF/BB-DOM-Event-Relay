/*jshint evil: true */
/*global myApp */

describe('DOM Object Event Proxy ', function () {

  'use strict';

  function getPrivateFunctionNames(func) {
    var privateFunctionNames = [];
    if (typeof func !== 'string') {
      func = func.toString();
    }
    var arrFinds = func.match(/.(?:[{}]?([ ])*function\s+)[^\(]+(?=\()/g);
    var i = 0, sFnName;
    while (i < arrFinds.length) {
      sFnName = arrFinds[i].match(/\S*$/gi)[0];
      if (sFnName) {
        privateFunctionNames.push(sFnName);
      }
      i += 1;
    }
    return privateFunctionNames;
  } //end 'getPrivateFunctions()'

  function exposePrivateFunctions(func) {
    var sFn = func.toString();
    var arrPrivateFnNames = getPrivateFunctionNames(sFn);
    if (arrPrivateFnNames.length === 0) {
      return;
    }
    var sIntrospectionObj = '', iLen = arrPrivateFnNames.length, i = 0;
    while (i < iLen) { //creates a string based on function names
      sIntrospectionObj += i === 0 ? '\'' : ',\'';
      sIntrospectionObj += arrPrivateFnNames[i] + '\':' + arrPrivateFnNames[i];
      i += 1;        //so exits loop with a string something like '\'
    }
    var introspectionEvalHook = 'if (typeof ' + arrPrivateFnNames[0] + '.reflect === \'function\') { ' + arrPrivateFnNames[0] + '.reflect({' + sIntrospectionObj + '}); }';
    return eval('func = ' + sFn.replace(/\{/, '{eval(\"' + introspectionEvalHook + '\");'));
  } //end 'exposePrivateFunctions()'

  var fnOriginalUnreflectedFunction = null;
  var myView;
  var eventRelayer;
  // console.log(myApp.makeEventRelayer().eventRelayer);

  beforeEach(function () {
    myView = new Backbone.View();
    eventRelayer = myApp.makeEventRelayer().eventRelayer;
    if (fnOriginalUnreflectedFunction === null) {
      fnOriginalUnreflectedFunction = myApp.makeEventRelayer;
    }
    Function.prototype.reflect = function (reflectionDefinition) {
      Function.prototype.reflect = reflectionDefinition;
    }; //End 'reflect()'
  });

  afterEach(function () {
    myView.remove();
    myView = eventRelayer = void 0;
    delete Function.prototype.reflect;
    myApp.makeEventRelayer = fnOriginalUnreflectedFunction;
  });

  it('should be return it\'s API on a returned Object type', function () {
    var result = myApp.makeEventRelayer();
    expect(result).toEqual(jasmine.any(Object));
  });
  it('should define \'listenTo\' as part of it\'s API', function () {
    var result = myApp.makeEventRelayer();
    expect(result.eventRelayer.listenTo).toEqual(jasmine.any(Function));
  });
  it('should define \'stopListening\' as part of it\'s API', function () {
    var result = myApp.makeEventRelayer();
    expect(result.eventRelayer.stopListening).toEqual(jasmine.any(Function));
  });
  it('should define \'listenToOnce()\' as part of it\'s API', function () {
    var result = myApp.makeEventRelayer();
    expect(result.eventRelayer.listenToOnce).toEqual(jasmine.any(Function));
  });
  it('should inherit from Backbone.Events', function () {
    var result = myApp.makeEventRelayer();
    expect(Object.getPrototypeOf(result.eventRelayer.__super)).toEqual(Backbone.Events);
  });

  describe('Proxy version of  \'listenTo\' i.e. internal \'_listenTo()\' function', function () {
    it('should not change the native Backbone.Events \'listenTo()\' method in any way (rather set a temporary proxy-ing \'listenTo()\' directly on the View instance', function () {
      var nativeListenToOriginal = Backbone.Events.listenTo;
      eventRelayer.listenTo.call(myView, window, 'resize', myView.render);
      expect(Backbone.Events.listenTo).toEqual(nativeListenToOriginal);
      var myVanillaView = new Backbone.View();
      expect(myVanillaView.listenTo).toEqual(nativeListenToOriginal);
      expect(_(myView.listenTo).has()).toEqual(false);

    });
    it('should not change the native Backbone.Events \'stopListening()\' method in any way (rather set a temporary proxy-ing \'stopListening()\' directly on the View instance', function () {
      var nativeStopListeningOriginal = Backbone.Events.stopListening;
      myApp.makeEventRelayer = exposePrivateFunctions(myApp.makeEventRelayer);
      var eventRelayer = myApp.makeEventRelayer().eventRelayer; //Required to make the reflection of the inner...private scope function to occur.
      var inner_stopListening = myApp.makeEventRelayer.reflect._stopListening;
      eventRelayer.listenTo.call(myView, window, 'resize', myView.render);
      expect(Backbone.Events.stopListening).toEqual(nativeStopListeningOriginal);
      var myVanillaView = new Backbone.View();
      expect(myVanillaView.stopListening).toEqual(nativeStopListeningOriginal);
      expect(myView.stopListening).not.toEqual(nativeStopListeningOriginal);
      expect(myView.stopListening).toEqual(inner_stopListening);
      // stopListening
    });
    it('should call the jQuery\'s \'on()\' to add the event listener', function () {
      var spyOn = sinon.spy(jQuery.fn, 'on');
      expect(spyOn.called).toBeFalsy();
      eventRelayer.listenTo.call(myView, window, 'scroll', myView.render);
      expect(spyOn.called).toBeTruthy();
      spyOn.restore();
    });
    it('should - once the DOM event has been detected - pass the call through to the specified handler method owned by the Backbone view', function() {
      var stubRender = sinon.stub(myView, 'render');
      expect(stubRender.called).toBeFalsy();
      eventRelayer.listenTo.call(myView, window, 'resize', myView.render);
      $(window).resize();
      expect(stubRender.called).toBeTruthy();
      stubRender.restore();
    });
    it('should pass in the jQuery Event object when the DOM event has been detected and relayed to the Backbone view\'s handler method', function() {
      var argPassedToHandlerMethod = null;
      myView.handler = function(arg) {
        argPassedToHandlerMethod = arg;
      };
      eventRelayer.listenTo.call(myView, window, 'resize', myView.handler);
      $(window).resize();
      expect(argPassedToHandlerMethod).toEqual(jasmine.any(Object));
      expect(argPassedToHandlerMethod.type).toEqual('resize');
    });
  });

  describe('\'removeDOMEventListener\' (internal function)', function() {
    it('should call the native \'removeEventListener()\' method', function() {
      function mockHandler() {
        return void 0;
      }
      myApp.makeEventRelayer = exposePrivateFunctions(myApp.makeEventRelayer);
      void myApp.makeEventRelayer().eventRelayer; //Required to make the reflection of the inner...private scope function to occur.
      var inner_removeDOMEventListener = myApp.makeEventRelayer.reflect.removeDOMEventListener;
      var spyOff = sinon.spy(jQuery.fn, 'off');

      void inner_removeDOMEventListener(window, 'blur', mockHandler);
      expect(spyOff.calledWith('blur', mockHandler)).toBeTruthy();
      spyOff.restore();
    });
  });

  describe('\'_getProxyListeners\' (internal function)', function() {
    it('should return an array', function() {
      myApp.makeEventRelayer = exposePrivateFunctions(myApp.makeEventRelayer);
      void myApp.makeEventRelayer().eventRelayer; //Required to make the reflection of the inner...private scope function to occur.
      var inner_getProxyListeners = myApp.makeEventRelayer.reflect._getProxyListeners;
      expect(inner_getProxyListeners()).toEqual(jasmine.any(Array));
    });

  });

  describe('Proxy version of  \'listenToOnce\' i.e. internal \'_listenToOnce()\' function', function () {
    it('should not change the native Backbone.Events \'listenToOnce()\' method in any way (rather set a temporary proxy-ing \'listenToOnce()\' directly on the View instance', function () {
      var nativeListenToOnceOriginal = Backbone.Events.listenToOnce;
      eventRelayer.listenToOnce.call(myView, window, 'resize', myView.render);
      expect(Backbone.Events.listenToOnce).toEqual(nativeListenToOnceOriginal);
      var myVanillaView = new Backbone.View();
      expect(myVanillaView.listenToOnce).toEqual(nativeListenToOnceOriginal);
      expect(_(myView.listenToOnce).has()).toEqual(false);
    });
    it('should not change the native Backbone.Events \'stopListening()\' method (rather set a temporary proxy-ing \'stopListening()\' directly on the View instance', function () {
      var nativeStopListeningOriginal = Backbone.Events.stopListening;
      myApp.makeEventRelayer = exposePrivateFunctions(myApp.makeEventRelayer);
      var eventRelayer = myApp.makeEventRelayer().eventRelayer; //Required to make the reflection of the inner...private scope function to occur.
      var inner_stopListening = myApp.makeEventRelayer.reflect._stopListening;
      eventRelayer.listenToOnce.call(myView, window, 'resize', myView.render);
      expect(Backbone.Events.stopListening).toEqual(nativeStopListeningOriginal);
      var myVanillaView = new Backbone.View();
      expect(myVanillaView.stopListening).toEqual(nativeStopListeningOriginal);
      expect(myView.stopListening).not.toEqual(nativeStopListeningOriginal);
      expect(myView.stopListening).toEqual(inner_stopListening);
      // stopListening
    });
    it('should call the jQuery\'s \'one()\' to add the event listener', function () {
      var spyOn = sinon.spy(jQuery.fn, 'one');
      expect(spyOn.called).toBeFalsy();
      eventRelayer.listenToOnce.call(myView, window, 'scroll', myView.render);
      expect(spyOn.called).toBeTruthy();
      spyOn.restore();
    });
    it('should - once the DOM event has been detected - pass the call through to the specified handler method owned by the Backbone view', function() {
      var stubRender = sinon.stub(myView, 'render');
      expect(stubRender.called).toBeFalsy();
      eventRelayer.listenToOnce.call(myView, window, 'resize', myView.render);
      $(window).resize();
      expect(stubRender.called).toBeTruthy();
      stubRender.restore();
    });
    it('should - no matter how many times the DOM event has been detected - only pass the call through to the specified view handler method once', function() {
      var stubRender = sinon.stub(myView, 'render');
      expect(stubRender.called).toBeFalsy();
      eventRelayer.listenToOnce.call(myView, window, 'resize', myView.render);
      $(window).resize();
      $(window).resize();
      $(window).resize();
      expect(stubRender.calledOnce).toBeTruthy();
      stubRender.restore();
    });
    it('should pass in the jQuery Event object when the DOM event has been detected and relayed to the Backbone view\'s handler method', function() {
      var argPassedToHandlerMethod = null;
      myView.handler = function(arg) {
        argPassedToHandlerMethod = arg;
      };
      eventRelayer.listenToOnce.call(myView, window, 'blur', myView.handler);
      $(window).blur();
      expect(argPassedToHandlerMethod).toEqual(jasmine.any(Object));
      expect(argPassedToHandlerMethod.type).toEqual('blur');
    });
  });

  describe('Proxy version of \'stopListening\' i.e. internal \'_stopListening\' function', function() {
    var model;
    var viewWithModel;
    beforeEach(function() {
      model = new (
                    Backbone.Model.extend({defaults: {title: ''}})
                  )();
      viewWithModel = new Backbone.View({model: model});
      viewWithModel.titleChanged = function(attr) {
        return attr;
      };
    });
    afterEach(function() {
      viewWithModel.remove();
      model = viewWithModel = void 0;
    });
    it('should remove ALL listeners (both proxy DOM events and normal BackboneJS \'listenTo\') events if called with no arguments', function() {
      viewWithModel.titleChanged = function() {
        void 0;
      };
      viewWithModel.focusedOut = function() {
        void 0;
      };
      var stubTitleChanged = sinon.stub(viewWithModel, 'titleChanged');
      var stubFocusedOut = sinon.stub(viewWithModel, 'focusedOut');
      viewWithModel.listenTo(model, 'change', viewWithModel.titleChanged);
      eventRelayer.listenTo.call(viewWithModel, window, 'blur', viewWithModel.focusedOut);
      viewWithModel.stopListening();
      model.set('title', 'goFishing');
      $(window).blur();
      expect(stubTitleChanged.called).toBeFalsy();
      expect(stubFocusedOut.called).toBeFalsy();
    });
    it('should not interfere with other listeners if it is asked to remove a DOM proxy event that does not exist', function () {
      viewWithModel.titleChanged = function() {
        void 0;
      };
      viewWithModel.focusedOut = function() {
        void 0;
      };
      var stubTitleChanged = sinon.stub(viewWithModel, 'titleChanged');
      var stubFocusedOut = sinon.stub(viewWithModel, 'focusedOut');
      viewWithModel.listenTo(model, 'change', viewWithModel.titleChanged);
      eventRelayer.listenTo.call(viewWithModel, window, 'blur', viewWithModel.focusedOut);
      viewWithModel.stopListening(window, 'resize', viewWithModel.focusedOut);
      model.set('title', 'go to DisneyWorld');
      $(window).blur();
      expect(stubTitleChanged.called).toBeTruthy();
      expect(stubFocusedOut.called).toBeTruthy();
    });
    it('should remove all listened to events (both API Events and proxy DOM events) when \'view.remove()\' is called', function () {
      viewWithModel.titleChanged = function() {
        void 0;
      };
      viewWithModel.focusedOut = function() {
        void 0;
      };
      var stubTitleChanged = sinon.stub(viewWithModel, 'titleChanged');
      var stubFocusedOut = sinon.stub(viewWithModel, 'focusedOut');
      viewWithModel.listenTo(model, 'change', viewWithModel.titleChanged);
      eventRelayer.listenTo.call(viewWithModel, window, 'blur', viewWithModel.focusedOut);
      viewWithModel.remove();
      model.set('title', 'go shopping');
      $(window).blur();
      expect(stubTitleChanged.called).toBeFalsy();
      expect(stubFocusedOut.called).toBeFalsy();
    });
  });
});