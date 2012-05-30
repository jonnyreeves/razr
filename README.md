#razr

JavaScript MVC Micro Architecture built ontop of jQuery which promotes seperation of responsibility and modular development.

Razr provides a lightweight structure which allows you to map (and unmap) [Models](#Models) and [Views](#Views). Models and Views communicate with the rest of the framework via Notifications.  [Commands](#Commands) can be mapped to these Notifications in order to add flow to your application.

## Apps
Every Razr application must be created using the `Razr.create` factory method:

    var razrApp= Razr.create();
	
The resulting object (`razrApp`) will have all the Razr actors (modelMap, commandMap and viewMap) injected ready for use; all you need to do is start wiring them up.

Each Razr App has it's own, unique context, that is notifications from one RazrApp will not be heard by another; this allows you to integrate multiple Razr Apps in the same environment.

### Models
Razr provides a single point of access for Models (similar to the Module pattern).  Models can be created, and mapped via:

    razrApp.models.map('model-id', modelInstance);

Once a Model has been registered it can be retrieved from the model map:

	var modelInstance = razrApp.models.get('model-id');
	
The _modelInstance_ that Razr wraps is a simple JavaScript Object (Module). Models are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from this Model to the rest of the Framework

Here's an example of a simple model which keeps track of the Player's Score:

	razrApp.models.map('score', { 
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

###Views
Views are similar to _Models_ in that they are registered (and retrieved) based on an id:

	razrApp.views.map('view-id', viewInstance);
	razrApp.views.get('view-id');
	
Just as with _Models_, the _viewInstance_ that Razr wraps is another JavaScript object - no magic involved.  Views are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from the View to the rest of the Framework.
 * `onNote(name, handler)` - Maps a notification to a handler function in this View.  All Notification mapped this way will be automatically turned off when when View is removed.
 * `offNote(name, handler)` - Removes a notification mapping.

Views can also, optionally define an `onAdd` and `onRemove` method which will get invoked at the relevant times in the View's lifecycle - this is a good oppertunity to register and remove any notification mappings.

Here's an example of a simple View which will update whenever the Player's Score changes:

	razrApp.views.map('scoreCounter', { 
		onAdd: function () {
			
			// Map 'scoreChanged' notifications to a handler.
			this.onNote('scoreChanged', this.onScoreChanged);
			
			// Use jQuery to map a click handler
			$('reset-score').on('click', this.onResetScoreClicked);
		},
		
		onRemove: function () { 
			this.offNote();
			$('reset-score').off('click');
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

The functions executed by the Command Map get the following properties injected into them just before they are invoked:

 * `models` - Provides access to the model map
 * `views` - Provides access to the view map
 * `notify(name, ...args)` - Used to dispatch notification from the Command to the rest of the Framework.

Here's an example of a Command which resets the player's score when the `resetScoreClicked` notification is broadcast:

	razrApp.commands.map('resetScoreClicked', function () { 
		
		// Retrieve the Score Model from the Framework
		var scoreModel = this.models.get('score');
		
		// Call reset on it.
		scoreModel.reset();		
	});

## RequireJS Support
Razr was built from the ground up to take full advantage of RequireJS; you can define all your Models, Views and Commands in external files and pull them in via `require()`, for example:

	// Register Models.
	this.models.map('score', require('./model/scoreModel'));

	// Register Commands.
	this.commands.map('resetScoreClicked', require('./command/resetScoreCommand'));

	// Register Views.
	this.views.map('scoreCounter', require('./view/scoreCounterView'));