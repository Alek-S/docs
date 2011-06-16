// TODO:
// - Update comments.
// - Update *eventNameError*
// - Update *removeListener* to support namespaced events - low prio
// - Update *listener* to support namespaced events - low prio


;!function(root) {


  var EventEmitter2 = root.EventEmitter2 = function EventEmitter2() {};


  EventEmitter2.prototype.addListener = function(event, listener) {
    var me = this;

    // If the listener is not a function throw an error. A listener that is not
    // a function can not be called when an event is emitted and therefor is
    // not allowed to be added.
    if ('function' !== typeof listener) {
      throw new Error('addListener only accepts instances of Function');
    }

    // Set variables, if they are undefined set default values.
    var delimiter = me._eventDelimiter || (me._eventDelimiter = '.'),
        caseSensative = me._eventCaseSensitive || (me._eventCaseSensitive = false),
        events = me._events || (me._events = {}),
        maxListeners = me._maxListeners || (me._maxListeners = 10),
        event = caseSensative ? event.toLowerCase() : event,
        ns, exploreNs = events,
        listenToEvent, eventListeners;

    // If an event starts or ends with a delimiter character throw an error.
    // Starting or ending an event with a delimiter character creates empty
    // namespaces which don't work and therefor are not allowed.
    if (event[event.length-1] === delimiter || event[0] === delimiter) {
      me.eventNameError('addListener');
    }

    // Signal that a new listener is being added.
    me.emit('newListener', event, listener);

    // If the event is namespaced loop through the namespaces, set seperate
    // events for each namespace and set *listenToEvent* to the last namespace
    // to attach the listener to this event after the loop.
    if (~event.indexOf(delimiter)) {

      // Split the event into a namespace array for looping.
      ns = event.split(delimiter);

      // Loop through the namespaces.
      for (var i = 0, l = ns.length; i < l; i++) {

        // If the event is undefined in *exploreNs* it means it doesn't exist in
        // *events* so a new event should be created.
        if (!exploreNs[ns[i]]) {
          exploreNs[ns[i]] = {
              _name: ns[i],
              _listeners: [],
              _ns: {}
            };
        }

        // If the loop is not at the end rebase *exploreNs* to loop the current
        // event's namespaces. If the loop is at the end set *listenToEvent*
        // to the current namespace - which is the last one - to attach the
        // listener to this event.
        if (!(i == ns.length - 1)) {
          exploreNs = exploreNs[ns[i]]._ns;
        } else {
          listenToEvent = exploreNs[ns[i]];
        }
      }
    }

    // If the event is not namespaced set the single event and set
    // *listenToEvent* to this event to attach the listener to.
    else {

      // If the event is undefined in *events* it means it doesn't exist so a
      // new event should be created.
      if (!events[event]) {
        events[event] = {
          _name: event,
          _listeners: [],
          _ns: {}
        };
      }

      // Set *listenToEvent* to the current event to attach the listener to.
      listenToEvent = events[event];
    }

    eventListeners = listenToEvent._listeners;

    // If the max amount of listeners has been reached signal and return to
    // cancel the addition of this new event.
    if (eventListeners.length >= maxListeners) {
      me.emit('maxListeners', event);
      return this;
    }

    // Add the listener to the event.
    eventListeners.push(listener);
    return this;
  };


  EventEmitter2.prototype.on = EventEmitter2.prototype.addListener;


  EventEmitter2.prototype.once = function(event, listener) {
    this.many(event, 1, listener);
    return this;
  };


  EventEmitter2.prototype.many = function(event, ttl, listener) {
    var me = this;

    me.addListener(event, function() {
      if(ttl-- == 0) {
        me.removeListener(event, listener);
      } else {
        listener.apply(null, arguments);
      }
    });

    return this;
  };


  EventEmitter2.prototype.emit = function(event) {
    var me = this,
        args = arguments,
        i = 0, j = 0, k = 0,
        delimiter = me._eventDelimiter,
        caseSensitive = me._eventCaseSensitive,
        events = me._events,
        ns, exploreNs = [events], collectedListeners = [],
        invoked = false;

    // If an event starts or ends with a delimiter character throw an error.
    // Starting or ending an event with a delimiter character creates empty
    // namespaces which don't work and therefor are not allowed.
    if (event[event.length-1] === delimiter || event[0] === delimiter) {
      me.eventNameError('emit');
    }

    // If the event is namespaced loop through the namespaces, ...
    if (~event.indexOf(delimiter) || event === '*') {

      // Split the event into a namespace array for looping.
      ns = event.split(delimiter);

      // Loop through the event namespaces based on the namespace array
      for (i = 0; i < ns.length; i++) {

        // While looping through the namespace array we loop through the exploreNs as well.
        // This is looping through the different levels of *_events*.
        // We use *collectedNs to collect all the namespaces that are being explored on the next
        // level of itterations.
        var currentNs = ns[i],
            currentExploreNs = exploreNs[i],
            collectedNs = [];

        // Loop through the current level of *_events*.
        for (var key1 in currentExploreNs) {

          // Set the current namespace that is being explored.
          var exploredNs = currentExploreNs[key1],
              name = exploredNs._name;

          // Check if there is a match or that the event namespace is wildcard.
          if (currentNs === '*' || (name === currentNs || name === '*')) {
            if (i !== ns.length - 1) {

              // If there is a match and we are not at the end of the user emitted event,
              // we want to collect the namespaces for the next explore itteration.
              for (var key2 in exploredNs._ns) {
                collectedNs.push(exploredNs._ns[key2]);
              }

            } else {

              // If we are at the end of the itteration of the user emitted event,
              // instead of collecting the next namespace level we now collect the
              // events we need to fire.
              var listeners = exploredNs._listeners;
              if (listeners.length > 0) {
                collectedListeners = collectedListeners.concat(listeners);
              }
            }
          }
        }

        exploreNs.push(collectedNs);
      }
    }

    // If the event is not namespaced ...
    else if (event !== '*' && event !== 'all' && events[event] && events[event]._listeners.length > 0) {
      if (events['*'] && events['*']._listeners.length > 0) {
        collectedListeners = collectedListeners.concat(events['*']._listeners);
      }
      collectedListeners = collectedListeners.concat(events[event]._listeners);
    }

    // If we want to fire "all" events...
    if (event === 'all') {
      console.log('fire all!!!');
    }

    // If we want to listen to "all" events...
    if (events['all'] && events['all']._listeners.length > 0){
      collectedListeners = collectedListeners.concat(events['all']._listeners);
    }

    for (var i = 0, l = collectedListeners.length; i < l; i++) {
      collectedListeners[i].apply(this, args);
      invoked = true;
    }

    return invoked;
  };


  EventEmitter2.prototype.removeListener = function(event, listener) {
    if(listener && this._events[event] && this._events[event]._listeners) {
      // Make a reference to all the listeners for the event.
      var listeners = this._events[event]._listeners;
      // Loop through and check the signatures to find the exact listener to remove.
      for(var i = 0, l = listeners.length; i < l; i++) {
        if(listener === listeners[i]) {
          // Break out and return the removed listener.
          return listeners.splice(i, 1);
        }
      }
    }
    else {
      this._events[event] = {};
    }
    return this;
  };


  EventEmitter2.prototype.removeAllListeners = function() {
    this._events = {};
    return this;
  };


  EventEmitter2.prototype.setEventDelimiter = function(delimiter) {
    if (delimiter === '*' && delimiter.length === 1) {
      throw new Error('setEventDelimiter doesn\'t accept a "*" (wild-card) character');
    } else {
      this._eventDelimiter = delimiter;
    }
    return this;
  };


  EventEmitter2.prototype.setEventCaseSensitive = function(caseSensative) {
    this._eventCaseSensitive = caseSensative;
    return this;
  };


  EventEmitter2.prototype.setMaxListeners = function(n) {
    this._maxListeners = n;
    return this;
  };


  EventEmitter2.prototype.listeners = function(event) {
    if(this._events[event]) {
      return this._events[event]._listeners;
    } else {
      return false;
    }
  };


  EventEmitter2.prototype.eventNameError = function(fn) {
    throw new Error(fn + ' doesn\'t accept events starting or ending with a "' + this._eventDelimiter + '" (delimiter) character');
  };


}(typeof exports === 'undefined' ? window : exports);