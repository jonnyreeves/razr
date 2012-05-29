(function ($) {
    'use strict';
	
	var slice = Array.prototype.slice;

	/*!
	 * jQuery Tiny Pub/Sub for jQuery 1.7 - v0.1 - 27/10/2011
	 * Based on @cowboy Ben Alman's REALLY tiny pub/sub. 
	 * 1.7 specific updates by @addyosmani.
	 * Copyright maintained by @cowboy. 
	 * Dual licensed under the MIT and GPL licenses.
	 */
	var PubSub = (function () {
		var topics = [];
		
		return function(name) {
			if (!name) {
				throw new Error();
			}

			// Create a new Subscription topic if one does not exist.
			if (topics[name] === void 0) {
				var callbacks = jQuery.Callbacks();
				topics[name] = {
					publish: callbacks.fire,
					subscribe: callbacks.add,
					unsubscribe: callbacks.remove
				};
			}

			return topics[name];
		};
	})();

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


	// Tiny JavaScript MVC micro-architecture which promotes seperation of responsibility and modular development.
	// Yes, it's based on Singletons, but, no, that's not the end of the world :)
	var Razr = { };

	// Broadcasts a notifiaction which can be handled by all Actors within the framework.
	Razr.notify = function(name) {
		PubSub(name).publish.apply(null, arguments);
	};
	
	// Model registiry.
	Razr.Model = {			
		
		// id => Model.
		_modelMap: { },

		// Prototype for all Models created via Model.create()
		_modelProto: {
			// Dispatches a framework notification which can be handled by Views or Controllers.
			notify: Razr.notify
		},

		// Creates a new Model instance with the specified id.
		map: function (id, obj) {
			this._modelMap[id] = $.extend({ }, this._modelProto, obj);
			this._modelMap[id]._id = id;
		},
		
		// Removes a Model.
		remove: function (id) {
			var value = this._modelMap[id];
			delete this._modelMap[id];
			return value;
		},

		// Retrieve a model.
		get: function (id) {
			return this._modelMap[id];
		}
	};
		
	// View registry
	Razr.View = {
		
		// id => View
		_viewMap: { },
		
		// Prototype for all Views.
		_viewProto: {
			
			// Maps a Framework notification to a handler.
			mapNote: function (name, handler) {
				
				// We need to keep reference to both the handler function and the bound version of _onNote so we
				// can unsubscribe from this notification in the future.
				var registration = { callback: this._onNote.bind(this), handler: handler };

				if (this._noteMap[name] === void 0) {
					this._noteMap[name] = [ registration ];

					// Register the mapping.
					PubSub(name).subscribe(registration.callback);
				}
				else {
					this._noteMap[name].push(registration);
				}
			},
			
			// Maps a jQuery event (such as 'click') to a handler function; any events mapped in this fashion will
			// automatically be unmapped when this View is removed.
			mapEvent: function (element) {
				var args = slice.call(arguments);
				
				// Replace it with a handler bound in the scope of the view.
				args[args.length - 1] = args[args.length - 1].bind(this)

				// Store this registration so we can remove it later.
				this._mappedEvents.push({
					el: element,
					event: args[1],
					selector: args[2],
					handler: args[args.length - 1]
				});

				$(element).on.apply(element, args.slice(1));
			},
			
			// Internal callback which invokes previously mapped commands when a notifiaction comes in.
			_onNote: function (name) {
				var noteArgs = slice.call(arguments, 1);
				var self = this;

				$.each(this._noteMap[name], function() {

					// Invoke the handler from the registraionToken in the correct context.
					this.handler.apply(self, noteArgs);
				});
			},

			// Dispatches a framework notification which can be handled by other Views or Controllers.
			notify: Razr.notify,
			
			// Convenience method for retrieving a Model
			getModel: Razr.Model.get.bind(Razr.Model),
			
			_preRegister: function () {
				if ($.isFunction(this.onRegister)) {
					this.onRegister();
					this._active = true;
				}
			},

			_preRemove: function () {
				
				// Clear all mapped notifications
				$.each(this._noteMap, function(key) {
					$.each(this, function() {
						PubSub(key).unsubscribe(this.callback);
					});
				});
				this._noteMap = { };

				// Clear all mapped jQuery events.
				$.each(this._mappedEvents, function() {
					$(this.el).off(this.event, this.selector, this.handler);
				});

				if ($.isFunction(this.onRemove)) {
					this.onRemove();
				}

				this._active = false;
			}
		},
		
		// Creates a new View instance with the supplied id.
		map: function (id, obj, options) {
			options = options || { callOnRegister: true };

			// Create the new View object
			var view = $.extend({
				// Flag used to determine if this View needs to be deactivated when removed.
				_active: false,

				// Hold a map of all subscriptions created using this.mapNote.
				_noteMap: {},
			
				// Collection of jQuery event registrations mapped by this View.
				_mappedEvents: []
			}, this._viewProto, obj);
			this._viewMap[id] = view;
			view._id = id;
			
			if (options.callOnRegister) {
				view._preRegister();
			}
		},
		
		// Removes this View from the Registry.
		remove: function (id) {
			var value = this._viewMap[id];
			
			if (!value) {
				return null;
			}

			// Decativate to remove all notifiaction listeners.
			if (value._active) {
				value._preRemove();
			}
			
			delete this._viewMap[id];
			return value;
		},
		
		// Retrieve a View.
		get: function (id) {
			return this._viewMap[id];
		}
	};


	// Command Registry.
	Razr.Controller = {
		
		// Maps NotificationName => Function[]
		_cmdMap: {},
		
		// Maps a notificationName to a callback function.
		map: function (noteName, fn) {
			if (this._cmdMap[noteName] === void 0) {
				this._cmdMap[noteName] = [fn];
				
				// Register the Command subscription.
				PubSub(noteName).subscribe(controllerOnNote);
			}
			else {
				this._cmdMap[noteName].push(fn);
			}

			return fn;
		},
		
		// Remove a Command mapping.
		unmap: function (noteName, fn) {

			// No commands mapped to this notification.
			if (this._cmdMap[noteName] === void 0) {
				return;
			}

			// If no function is supplied, remove all Commands mapped to the supplied notification.
			if (typeof fn !== 'function') {
				PubSub(noteName).unsubscribe(controllerOnNote);
				delete this._cmdMap[noteName];
			}
			
			// Otherwise, remove a specific mapping.
			else {
				var idx = $.inArray(fn, this._cmdMap[noteName]);
				if (idx > 0) {
					this._cmdMap[noteName].splice(idx, 1);
				}
				
				// If there are no more mappings we can unsubscribe all.
				if (this._cmdMap[noteName].length === 0) {
					this.unmap(noteName);
				}
			}
		},
		
		// Internal callback which invokes previously mapped commands when a notifiaction comes in.
		_onNote: function (name) {
			var noteArgs = slice.call(arguments, 1);

			$.each(this._cmdMap[name], function() {

				// Inject Razr and some convenience methosd into the Command.
				this.Razr = Razr;
				this.getModel = this.Razr.getModel;
				this.notify = this.Razr.notify;
				
				this.Note = { name: name, args: noteArgs };
					
				// Invoke the Command handler function supplying the notification which caused it to be triggered.
				this.apply(this, noteArgs);
					
				// Remove all injections.
				delete this.Razr;
				delete this.getModel;
				delete this.notify;
			});
		}
	};
	
	// As there's only a Single Controller registry we can bind Razr.Controller._onNote once to save memory.
	var controllerOnNote = Razr.Controller._onNote.bind(Razr.Controller);


	// Facade - these convenience methods should be preferred over delving into the MVC Actors.
	Razr.mapModel = Razr.Model.map.bind(Razr.Model);
	Razr.removeModel = Razr.Model.remove.bind(Razr.Model);
	Razr.getModel = Razr.Model.get.bind(Razr.Model);
	
	Razr.mapView = Razr.View.map.bind(Razr.View);
	Razr.removeView = Razr.View.remove.bind(Razr.View);
	Razr.getView = Razr.View.get.bind(Razr.View);
	
	Razr.mapCommand = Razr.Controller.map.bind(Razr.Controller);


	// Export to popular environments boilerplate.
	if (typeof define === 'function' && define.amd) {
		define(Razr);
	} 
	else if (typeof module !== 'undefined' && module.exports) {
		module.exports = Razr;
	} 
	else {
		window['Razr'] = Razr;
	}

})(jQuery);