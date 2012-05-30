#razr

JavaScript MVC micro architecture which promotes seperation of responsibility and modular development.  It aims to provide a well defined skeleton for your apps without forcing you down any particular implementation route.

## Apps
Razr applications comprise of [models](#models), [views](#views) and [commands](#commands).  These three actors can all communicate with each other via notifications.

Every Razr application starts life by being created with the `Razr.create` factory method:

    var razrApp = razr.create();
	
The resulting object (`razrApp`) will have all the Razr actors (modelMap, commandMap and viewMap) injected ready for use; all you need to do is start wiring them up.  The `Razr.create` method allows you to provide an initial context for your application where you can perform your wiring:

    razr.create({ 
        startup: function () { 
        
            // Nb: instead of defining models, views and commands inline, you
            // could use RequireJS to define them in external files.
            this.models.map('progress', { ... });
            this.commands.map('save-progress', function () { ... });
        };
    }).startup();

Each Razr App has it's own, unique context, that is notifications from one RazrApp will not be heard by another; this allows you to integrate multiple Razr Apps in the same environment.

### Models
Razr provides a single point of access for Models (similar to the Module pattern).  Models can be created, and mapped via:

    razrApp.models.map('model-id', modelInstance);

Once a Model has been registered it can be retrieved from the model map:

	var modelInstance = razrApp.models.get('model-id');
	
The _modelInstance_ that razr wraps is a simple JavaScript Object (Module). Models are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from this Model to the rest of the Framework

Models are not able to listen for notifications, you should instead consdier mapping a command to the notification and then using that command to retrieve models and call their functions.

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

Models don't just have to be data, they can also represent third-party libraries, APIs and services which your application wants to use.  Typically you will want to treat your razr model as a proxy to the object; providing an application-specific API and broadcasting notifications when it's state changes.

### Views
Views are similar to _Models_ in that they are registered (and retrieved) based on an id:

	razrApp.views.map('view-id', viewInstance);
	razrApp.views.get('view-id');
	
Just as with _Models_, the _viewInstance_ that Razr wraps is another JavaScript object - no magic involved.  Views are injected with the following convenience methods:

 * `notify(name, ...args)` - Used to dispatch notifications from the View to the rest of the Framework.
 * `onNote(name, handler)` - Maps a notification to a handler function in the scope of this View.
 * `offNote(name, handler)` - Removes a notification mapping.
 * `onEvent(element, ...args)` - Maps a DOM Event to a handler function in the scope of this View.  This method uses the same syntax as `jQuery.on`.
 * `offEvent(element)` - Removes a DOM Event mapping.
 * `getModel(modelId)` - Retrieves a model instance.

Note that both `onEvent` and `offEvent` require the presense of a DOM Library, by default razr will detect [jQuery](http://jquery.com) or [Zepto](http://zeptojs.com), but you can specify a custom one via `razr.setDomLibrary()`.

Views can also, optionally define an `onAdd` and `onRemove` method which will get invoked at the relevant times in the View's lifecycle - this is a good oppertunity to register and remove any notification mappings.

Here's an example of a simple View which will update whenever the Player's Score changes:

	razrApp.views.map('scoreCounter', { 
		onAdd: function () {
			
			// Map 'scoreChanged' notifications to a handler.
			this.onNote('scoreChanged', this.onScoreChanged);
			
			// Map a DOM event to a handler (note the syntax is identical to jQuery.on).
			this.onEvent($('reset-score'), 'click', this.onResetScoreClicked);
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

Views are able to retrieve models directly via `getModel`, however it is reccomended that you try and enfore loose copupling by having your views to listening to notifications instead.


### Commands
Commands provide the wiring for your application;  Razr provides a mechanism to map a notification to a function which will be called whenever that notification is broadcast by another actor in the framework.

The functions executed by the Command Map get the following properties injected into them just before they are invoked:

 * `models` - Provides access to the model map
 * `views` - Provides access to the view map
 * `notify(name, ...args)` - Used to dispatch notification from the Command to the rest of the framework.

Here's an example of a Command which resets the player's score when the `resetScoreClicked` notification is broadcast:

	razrApp.commands.map('resetScoreClicked', function () { 
		
		// Retrieve the Score Model from the Framework
		var scoreModel = this.models.get('score');
		
		// Call reset on it.
		scoreModel.reset();		
	});

## RequireJS Support
Razr was built from the ground up to take full advantage of RequireJS; you can define all your models, views and commands in external files and pull them in via `require()`, for example:

    razr.create({
        startup: function () { 
        	// Register Models.
        	this.models.map('score', require('./model/scoreModel'));
        
        	// Register Commands.
        	this.commands.map('resetScoreClicked', require('./command/resetScoreCommand'));
        
        	// Register Views.
        	this.views.map('scoreCounter', require('./view/scoreCounterView'));
        }
    ).startup();