# A Helper To Hook Any Kind Of DOM Event Into BackboneJS Views
Brings global Window Events (i.e. like 'scroll', 'blur') into the realm of BackboneJS Views using the standard BackboneJS vocabulary. eg. `listenTo()`, `listenToOnce()` and `stopListening()`


![alt text](http://www.currahee.co.uk/media/i/stickyheader-demo.gif "jsFiddle Demo")

The use case for this code is to overcome the restrictions BackboneJS places on the programmer when it comes to listening for a DOM Event that falls outside the narrow remit of being on an element at the top level of a view (i.e. it's `this.el`) or a child thereof. Say for instance your view presents data in a table and you want a 'sticky heaer' for the table's header row (relies on the window.onScroll event). This presents a few problems if you want to do so and still play by the BackboneJS rulebook:

1\ As with the usual view DOM Events defined in the `events` hash, you want BackboneJS to automatically detach those events when the view is removed.
2\ To do the above, you also don't want to complicate things by having to override BackboneJS's native `remove()` method which would be the case if you just hooked up the event listener in your view's `initialize` method using a plain old jQuery `on()` call.
3\ Although it's possible to do, circumventing the mechanisms BackboneJS provides you with when it comes to attaching and de-coupling events feels hacky and you want to stick with the BackboneJS paradigms.
4\ You tried to integrate the DOM object you want to listen to into BackboneJS world by mixing it in with `Backbone.Events`. Believe me, this one of the first things I tried `myview.listenTo(_(window).extend(Backbone.Events), 'scroll', myView.handler);` ... if it had worked I would not have had to write this code ; )

## Usage
For a quick try out see [jsFiddle Example](https://fiddle.jshell.net/jaranF/dqwcxtkm/show/light/). You will need to shorten your viewport so its not tall enough to display the page and thereby make the sticky headers do their thing. If you have your console open you will also see how the view receives the window.onscroll event notifications.
```
**Injection**
```javascript
    var MyViewClass = Backbone.View.extend(
     {
      ...  standard View stuff ...
     }, makeEventPipe());



And within your view when you want to hook up the DOM event to relay (say for instance in the `initialize()` method:


```
**Invocation**
```javascript
    initialize: function() {
       this.constructor.eventPipe.listenTo.call(this, window, 'scroll', this.handleScroll);
     },);

## Using The Code & Getting The Unit Tests Up And Running
The code is in 'main.js' and makes no assumptions other than the usual (that BackboneJS, Underscore and jQuery are present). NodeJS and Yarn are also required to run the unit tests. On that subject, the commands below are good for Mac Terminal or Git Shell Command Line.
```Shell
git clone git@github.com:jaranF/BB-DOM-Event-Relay.git
cd BB-DOM-Event-Relay
yarn install
karma start karma.conf.js &
karma run
```

Note the last two commands assume that you have the 'karma-cli' NPM package installed globally already. If the karma commands above do not work it is probably because you haven't, so just put this in front of the karma command `./node_modules/karma/bin/`. Once you finished with the unit tests and you want to kill the karma process run these commands:
```Shell
ps -Aa | grep '.*karma start.*' # The number that appears in the left hand column is used for next command
kill -s HUP <number>
```

## Explanation

This code creates special versions of `listenTo()`, `listenToOnce()` and `stopListening()`: it doesn't make sense to offer this functionality for BackboneJS's `on()` / `once()` etc because they are only for hooking up what Backbone calls 'API Events'. And it doesn't do this by altering BackboneJS's internals up the prototype chain; rather it instead only changes things on a local view instance. The call to 'this.constructor.eventPipe.listenTo()' is calling a version of 'listenTo()' which is completely different to the native BackboneJS version. It doesn't even override the native version. That is why it's possible to put the native BackboneJS 'listenTo()' to use in the normal way (i.e. 'meView.listenTo(model, 'change', meView.fnHandler) alongside DOM Relayed 'listenTo' Event hooks with no repurcussions. What the DOM Event relaying version of `listenTo()` in my code does do, however, is override the native BackboneJS `stopListening()` method so it can work out if the thing to stop listening to is a DOM Relayed Event or an API Event on an object that mixes in 'Backbone.Events' in the usual way (i.e. listening to changes on a model attribute).



## Todos

If you look at the code you see the words 'pipe' (as in 'eventPipe') and the words 'proxy' / 'proxied' used a lot. Turns out that neither of these words are appropriate. The code gives you something which is not a pipe and in its fullest sense neither is it a proxy. I'll change this at some point.

Also, the API to deliver the event relaying versions of 'listenTo()', 'stopListening()' etc. is clumsy. I don't know what I was thinking of having the API in the form of a return object which in turn has another object on it called 'eventPipe' which defines the aforementioned special versions 'listenTo()' / 'listenToOnce()' / 'stopListening()'. The intermediary 'eventPipe' object isn't required. So instead of using the code with `this.constructor.eventPipe.listenTo.call( blah - de - blah )` it should be just `this.constructor.listenTo.call()`. The mention of `call` brings me to my final point. It is vital that the special DOM event relaying version 'stopListening()' is set on the instance of the view thereby overriding it's native BackboneJS corollary. So it seems inimical to have the code that relies on not loosing the 'this' reference of the view being defined statically on the View's Class constructor. I guess it was done this way because when I was feeling my way around the problem I wanted to go out of my way to bring in the relay provider in a manner where it obviously doesn't mess with the native BackboneJS 'listen' functions up the prototype chain. I must say that I kind of like having the 'DOM Event Relayer' brought into the class in such an explicit manner though. If I was having to worry about this aspect in Angular then I probably would inject my code in as a factory. Failing that maybe the way forward is to defined 'Event-Relayer' as an AMD module.

### Todo Summary

| Issue #       | Description                                                   |
| :-----------: |:--------------------------------------------------------------|
|      1        | Rename S & R (i.e. word 'pipe' is misleading)                 |
|      2        | Streamline API so access through 'eventPipe' unnecessary      |
|      3        | Don't inject it statically on View class constructor          |
|      4        | 'stopListening()' removes corollary memozied event definition |




