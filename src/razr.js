(function () {
    'use strict';
    
	var slice = Array.prototype.slice;

	/*!
	 * ES5-shim.js https://github.com/kriskowal/es5-shim
	 */
	if (!Function.prototype.bind) {
		Function.prototype.bind = function bind(that) { 
			var target = this;
			var args = slice.call(arguments, 1);
			var bound = function () {
				if (this instanceof bound) {
					var F = function(){};
					F.prototype = target.prototype;
					var self = new F;

					var result = target.apply(
						self,
						args.concat(slice.call(arguments))
					);
					if (Object(result) === result) {
						return result;
					}
					return self;
				} 
				else {
					return target.apply(
						that,
						args.concat(slice.call(arguments))
					);
				}
			};
			return bound;
		};
	}
    
    function extend(obj) { 
        var args = slice.call(arguments, 1)
        for (var i = 0; i < args.length; i++) {
            for (var prop in args[i]) {
                obj[prop] = args[i][prop];
            }
        }
        return obj;
    }
    
    function cloneFn(fn) {
        var clone = function () { 
            return fn.apply(clone, arguments); 
        };
        for( var key in fn ) {
            clone[key] = fn[key];
        }
        return clone;
    }

    function createNotificationMap() {
        return (function () { 
            
            // name => Handler Function Array.
            var mappings = {};
            
            return {
                on: function (name, handler) { 
                    var handlers = mappings[name] || (mappings[name] = []);
                    if (handlers.indexOf(handler) > -1) {
                        return false;
                    }
                    handlers.push(handler);
                    return true;
                },
                off: function (name, handler) { 
                    var handlers = mappings[name];
                    if (handlers) {
                        var idx = handlers.indexOf(handler);
                        if (idx > -1) {
                            handlers.splice(idx, 1);
                            return true;
                        }
                    }
                    return false;
                },
                trigger: function (name) { 
                    var handlers = mappings[name];
                    if (handlers) {
                        
                        // Defensive copy incase list is modified in-flight.
                        handlers = handlers.slice();
                        
                        for (var i = 0; i < handlers.length; i++) {
                            handlers[i].apply(null, arguments);
                        }
                    }
                },
            }
        })();
            
    }
    
    function createModelMap(noteMap) {
        var modelsById = {};
        
        return {
            // Registers a model object with the framework.
            map: function (id, obj) {
                if (modelsById[id]) {
                    throw new Error("Model `" + id + "` is already mapped");
                }
                return modelsById[id] = extend(obj, { 
                    notify: noteMap.trigger
                });
            },
            
            // Retrieves a previously mapped model object from the framework.
            get: function (id) { 
                return modelsById[id];
            },
            
            // Removes a model object from the framework.
            remove: function (id) { 
                var prev = modelsById[id];
                
                // No mapping.
                if (!prev) {
                    return;
                }
                
                // Remove from map.
                delete modelsById[id];
                
                // Remove framework methods.
                delete prev.notify;
                
                return prev;
            }
        };
    }
    
    function createViewMap(noteMap, modelMap) {
        var viewsById = {};
        
        // Normalises the arguments supplied to $.on.
        function normalizeOnEventArgs(args) {
            if (typeof args[0] === 'object') {
                return args;
            }
            
            var selector = null;
            var eventMap = {};
            var callback = args[args.length - 1];
            var events = args[0].split(" ");
                                    
            for (var i = 0; i < events.length; i++) {
                eventMap[events[i]] = callback;
            }
            
            // Selector is the optional second argument, callback is always last.
            if (args.length === 3) {
                selector = args[1];
            }
            
            return [ eventMap, selector ];
        }
        
    
        return {
            // Registers a view object with the framework.  If your view object
            // exposes a `onAdd` method it will be invoked when all framework
            // apparatus has been injected.
            map: function (id, obj) { 
                var view;
                
                if (viewsById[id]) {
                    throw new Error("View `" + id + "` is already mapped");
                }
                
                view = extend(obj, {
                    _notesMap: {
                        routeNoteBinding: null,
                        entries: {},
                    },
                    _mappedEvents: [],
                    
                    // Broadcasts a notification to the rest of the framework.
                    notify: noteMap.trigger,
                    
                    // Retrieves a model.
                    getModel: modelMap.get.bind(modelMap),
                    
                    // Creates a mapping between a notification and a handler
                    // function.
                    onNote: function (note, handler) {
                        
                        // Lazily initialise the _routeNote binding
                        if (!this._notesMap.routeNoteBinding) {
                            this._notesMap.routeNoteBinding = this._routeNote.bind(this);
                        }
                        
                        // Wire up the routing for the handler.
                        var handlers = this._notesMap.entries[note];
                        if (!handlers) {
                            handlers = this._notesMap.entries[note] = [];
                            noteMap.on(note, this._notesMap.routeNoteBinding);
                        }
                        
                        // Check for dupes.
                        if (handlers.indexOf(handler) !== -1) {
                            throw new Error("Notification `" + note + "` is already mapped to supplied function");
                        }
                        
                        // Store the handler so it can be removed later.
                        handlers.push(handler);
                    },
                    
                    // Removes the a pre-existing mapping between the notification
                    // and handler.  If no handler is supplied all notifications of
                    // the supplied name will be removed and if not arguments are
                    // supplied all notification mappings for this view will be
                    // removed.
                    offNote: function (note, handler) {
                        var handlers = this._notesMap.entries[note];
                    
                        // If no noteName is specified, remove all mappings.
                        if (!note) {
                            for (var key in this._notesMap.entries) {
                                this.offNote(key);
                            }
                            return;
                        }
                    
                        if (!handlers) {
                            return;
                        }
                        
                        if (handler) {
                            // Find and remove a specific handler
                            var mappingIdx = handlers.indexOf(handler);
                            if (mappingIdx !== -1) {
                                handlers.splice(mappingIdx, 1);
                            }
                        }
                        else {
                            // Remove all mappigns for this notification.
                            handlers.length = 0;
                        }
                        
                        
                        // No more mappings for this notification? unsubcribe.
                        if (handlers.length === 0) {
                            noteMap.off(note, this._notesMap.routeNoteBinding);
                        }
                    },
                    
                    // Internal callback for processing incoming notifications.
                    _routeNote: function (name) { 
                        
                        // If the View is not registered against the framework
                        // then it shouldn't process any notifications.
                        if (!this._registered) {
                            return;
                        }
                        
                        var handlers = this._notesMap.entries[name];
                        
                        if (!handlers) {
                            return;
                        }
                        
                        // Route the notification to the handlers in the correct 
                        // scope.
                        for (var i = 0; i < handlers.length; i++) {
                            
                            // defensive copy incase the handlers are modified in-flight.
                            handlers = handlers.slice();
                            handlers[i].apply(this, arguments);
                        }
                    },
                    
                    // Wires up DOM events to handlers in this View by delegating
                    // through to the current DOM Library.
                    onEvent: function (element) {

                        // Normalize arguments into an event map.
                        var args = normalizeOnEventArgs(slice.call(arguments, 1));
                        
                        // Bind the callbacks into the view's scope.
                        for (var key in args[0]) {
                            args[0][key] = args[0][key].bind(this);
                        }
                        
                        // Store the mapping
                        this._mappedEvents.push({
                            element: element,
                            args: args
                        });
                        
                        $(element).on.apply(element, args);
                    },
                    
                    // Removes any events previous mapped via `onEvent`.
                    offEvent: function (element) {
                        var elementIndexMap = {}, i, mapping, len;
                        
                        len = this._mappedEvents.length;
                        
                        // Unmap everything.
                        if (!element) {
                            for (i = 0; i < len; i++) {
                                mapping = this._mappedEvents[i];
                                $(mapping.element).off.apply(mapping.element, mapping.args);
                            }
                            
                            this._mappedEvents.length = 0;
                        }
                        
                        // Filter all mappings for the supplied element.
                        else {
                            for (i = 0; i < len; i++) {
                                mapping = this._mappedEvents[i];
                                if (mapping.element === element) {
                                    $(mapping.element).off.apply(mapping.element, mapping.args);
                                    this._mappedEvents[i] = null;
                                }
                            }
                            
                            // Compact the Array.
                            var compacted = [];
                            for (i = 0; i < len; i++) {
                                if (this._mappedEvents[i] !== null) {
                                    compacted.push(this._mappedEvents[i]);
                                }
                            }
                            this._mappedEvents = compacted;
                        }
                    }
                             
                });
                
                // Register the view in the map.
                viewsById[id] = view;
                
                // Activate this view.
                view._registered = true;
                if (view.onAdd) {
                    view.onAdd.apply(view);
                }
                
                return view;
            },
            
            // Retrieves a previously mapped view by it's id.
            get: function (id) { 
                return viewsById[id];
            },
            
            // Removes a previously mapped view by it's id and returns the
            // view instance.
            remove: function (id) { 
                var prev = viewsById[id];
                
                if (!prev) {
                    return;
                }
                
                prev._registered = false;
                if (prev.onRemove) {
                    prev.onRemove.apply(prev);
                }
                
                delete prev.notify;
                delete viewsById[id];
                return prev;
            }
        }
    }
    
    function createCmdMap(noteMap, modelMap, viewMap) {
        var cmdsByNotes = {};
        function invokeCmd(fn, noteArgs) {
            
            // A fresh copy of the Command's function is created each time it is
            // executed.
            var clone = cloneFn(fn);
            
            // Inject framework hooks in the command.
            clone.notify = noteMap.trigger;
            clone.models = modelMap;
            clone.views = viewMap;
            
            clone.apply(clone, noteArgs);
        }
        return {
            
            // Creates a mapping between a notification and a command function.
            // The supplied function will be cloned and executed when the 
            // notification is broadcast in the application.
            map: function (note, fn) { 
                var cmds = cmdsByNotes[note];
                if (!cmds) {
                    cmds = cmdsByNotes[note] = [];
                    noteMap.on(note, this._onNote);
                }
                cmds.push(fn);
                
            },
            
            // Removes a previously mapped command.  If no command function is
            // supplied, all commands for the supplied notification will be removed.
            remove: function (note, fn) { 
                var cmds = cmdsByNotes[note];
                if (cmds) {
                    if (fn) {
                        var idx = cmds.indexOf(fn);
                        if (idx > -1) {
                            cmds.splice(idx, 1);
                        }
                    }
                    else {
                        cmds.length = 0;
                    }
                    
                    // Remove empty subscriptions.
                    if (cmds.length === 0) {
                        noteMap.off(note, this._onNote);
                        delete cmdsByNotes[note];
                    }
                }
            },
            
            _onNote: function(note) {
                var cmds = cmdsByNotes[note];
                if (cmds) {
                    
                    // Defensive copy incase a Command is unmapped in flight.
                    cmds = cmds.slice();
                    for (var i = 0; i < cmds.length; i++) {
                        invokeCmd(cmds[i], arguments);
                    }
                }
            }
        }
    }
    
    function startApp(app) {
        if (typeof app.startup !== 'function') {
            throw new Error("Razr Apps must supply a `startup` method");
        }
        app.startup();
    }
    
    // razr will automatically wire up to jQuery or Zepto for DOM manipulation
    // (at present, this is only used for events).  You can override this 
    // selection via `razr.setDomLibrary()`.
    var $ = window.jQuery || window.Zepto;
    
    var razr = {
        
        // Factory method for creating a new Razr Application.  The supplied
        // appContext object must provide a `startup` method which will be
        // invoked once the MVC apparatus have been injected.
        create: function (appContext, options) {
            options = options || { autoStartup: false };
            
            var noteMap = createNotificationMap();
            var modelMap = createModelMap(noteMap);
            var viewMap = createViewMap(noteMap, modelMap);
            var commandMap = createCmdMap(noteMap, modelMap, viewMap);
            
            var app = extend({
                _notificationMap: noteMap,
                
                // Acces to the model registry.
                models: modelMap,
                
                // Acces to the view registry.
                views: viewMap,
                
                // Access to the command registry.
                commands: commandMap,
                
                // Broadcasts a notification throughout the application.
                notify: noteMap.trigger
            }, appContext);
            
            if (options.autoStartup) {
                startApp(app);
            }
            
            return app;
        },
        
        // Allows you to specify the DOM manipulation library you want to use;
        // this automatically default to jQuery or Zepto if found on the 
        // window object.
        setDomLibrary: function(lib) {
            $ = lib;
        }
    }


	// Export to popular environments boilerplate.
	if (typeof define === 'function' && define.amd) {
		define(razr);
	} 
	else if (typeof module !== 'undefined' && module.exports) {
		module.exports = razr;
	} 
	else {
		window['razr'] = razr;
	}

})();