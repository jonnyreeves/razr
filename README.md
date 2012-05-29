#razr

JavaScript MVC Micro Architecture built ontop of jQuery which promotes seperation of responsibility and modular development.

Yes, it's based on Singletons, but, no, that's not the end of the world :)

Razr exposes a single Facade which allows you to map (and unmap) _Models_ and _Views_. Models and Views communicate with the rest of the framework via _Notifications_.  Commands can be mapped to these Notifications in order to add flow to your application.

### Models
Razr provides a single point of access for Models (similar to the Module pattern).  Models can be created, and mapped via:

    Razr.mapModel('model-id', modelInstance);

Once a Model has been registered it can be retrieved from the Facade:

	var modelInstance = Razr.getModel('model-id');
	
The _modelInstance_ that Razr wraps is a simple JavaScript Object (Module). Models are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from this Model to the rest of the Framework

Here's an example of a simple model which keeps track of the Player's Score:

	Razr.mapModel('score', { 
		_score: 0,
		
		setScore: function (newScore) { 
			var oldScore = this._score;
			this._score = newScore;
			
			// Send a notification to the rest of the framework
			this.notify('scoreChanged', newScore, oldScore);
		},
		
		incrementScore: function (value) {
			this.setScore(this._score + value);
		}
		
		reset: function () { 
			this.setScore(0);
		}
	});

### Views
Views are similar to _Models_ in that they are registered (and retrieved) based on an id:

	Razr.mapView('view-id', viewInstance);
	Razr.getView('view-id');
	
Just as with _Models_, the _viewInstance_ that Razr wraps is another JavaScript object - no magic involved.  Views are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from the View to the rest of the Framework.
 * `mapNote(name, handler)` - Maps a notification to a handler function in this View.  All Notification mapped this way will be automatically removed when the View is removed.
 * `mapEvent()` - Uses `jQuery.on` to map a DOM event to a handler function in this view.  Razr ensures that the handler function is always executed in the context of the View object.  All events mapped this way will be automatically removed when the View is removed.

Views can also, optionally define a `onRegister` and `onRemove` method which will get invoked at the relevant times in the View's lifecycle - this is a good oppertunity to register and remove any notification and event handlers.

Here's an example of a simple View which will update whenever the Player's Score changes:

	Razr.mapView('scoreCounter', { 
		onRegister: function () {
			
			// Map 'scoreChanged' notifications to a handler.
			this.mapNote('scoreChanged', this.onScoreChanged);
			
			// Map 'reset' button clicks to a handler
			this.mapEvent($('reset-score'), 'click', this.onResetScoreClicked);
		},
		
		onScoreChanged: function (newScore, oldScore) { 
			$('#score-display).html('Score: ' + newScore);
		};
		
		onResetScoreClicked: function () {
			
			// Let the rest of the framework know that we want to reset
			this.notify('resetScoreClicked');
		}
	});
	
### Commands
Commands provide the wiring for your application;  Razr provides a mechanism to map a notification to a function which will be called whenever that notification is broadcast by another actor in the framework.

The functions supplied to `mapCommand` get the following values injected into them just before they are invoked:

 * `Razr` - Provides access to the Razr facade.
 * `getModel(model-id)` - Convenience method for `Razr.getModel`.
 * `notify(name, ...args)` - Used to dispatch notification from the Command to the rest of the Framework.

Here's an example of a Command which resets the player's score when the `resetScoreClicked` notification is broadcast:

	Razr.mapCommand('resetScoreClicked', function () { 
		
		// Retrieve the Score Model from the Framework
		var scoreModel = this.Razr.getModel('score');
		
		// Call reset on it.
		scoreModel.reset();		
	});

## RequireJS Support
Razr was built from the ground up to take full advantage of RequireJS; you can define all your Models, Views and Commands in external files and pull them in via `require()`, for example:

	// Register Models.
	Razr.createModel('score', require('./model/scoreModel'));

	// Register Commands.
	Razr.mapCommand('resetScoreClicked', require('./command/resetScoreCommand'));

	// Register Views.
	Razr.createView('scoreCounter', require('./view/scoreCounterView'));