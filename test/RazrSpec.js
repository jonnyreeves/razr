describe("razr.create", function () {     
    var obj;
    
    beforeEach(function () { 
        obj = { 
            startup: jasmine.createSpy('startup')
        }
    });
    
    it("should check that the supplied Application Object has a `startup()` method", function () { 
        expect(function () { 
            razr.create({ }, { autoStartup: true }) 
        }).toThrow();
    });
    
    it("should execute the startup method if autoStartup is true", function () { 
        var app = razr.create(obj, { autoStartup: true });
        
        expect(app.startup).toHaveBeenCalled();
    });
    
    it("should not execute the startup method if autoStartup is false", function () { 
        var app = razr.create(obj, { autoStartup: false });
        
        expect(app.startup).not.toHaveBeenCalled();
    });
    
    
    describe("RazrApp", function () { 
        var app;
        
        beforeEach(function () { 
            app = razr.create(obj, { autoStartup: false });
        });
        
        it("should have been supplied a notify method", function () { 
            expect(app.notify).toBeDefined();
        });
        
        describe("RazrApp.notificationMap", function () {         
            var notificationMap;
            
            beforeEach(function () { 
                notificationMap = app._notificationMap;
            });
            
            it("should not allow duplicate mappings", function () { 
                var handler = function () { };
                
                expect(notificationMap.on('note', handler)).toBe(true);
                expect(notificationMap.on('note', handler)).toBe(false);
            });
            
            it("routes events to their handlers", function () { 
                var handlerA = jasmine.createSpy('handlerA');
                var handlerB = jasmine.createSpy('handlerB');
                var handlerC = jasmine.createSpy('handlerC');
                
                notificationMap.on('note1', handlerA);
                notificationMap.on('note1', handlerB);
                notificationMap.on('note2', handlerC);
                
                notificationMap.trigger('note1');
                
                expect(handlerA).toHaveBeenCalled();
                expect(handlerB).toHaveBeenCalled();
            });
            
            it("supplies notification arguments to handlers", function () { 
                var handler = jasmine.createSpy('handler');
                
                notificationMap.on('note', handler);
                notificationMap.trigger('note', 'some', 'arguments');
                
                expect(handler).toHaveBeenCalledWith('note', 'some', 'arguments');
            });
            
            it("unmaps notifications", function () { 
                var handler = jasmine.createSpy('handler');
                
                notificationMap.on('note', handler);
                notificationMap.off('note', handler);
                notificationMap.trigger('note');
                
                expect(handler).not.toHaveBeenCalled();
            });
        });        
        
        
        describe("RazrApp.models", function () { 
            var modelMap;
            var id;
            var modelObj;
            
            beforeEach(function () {
                modelMap = app.models; 
                id = "model-id";
                modelObj = { key: "value" };
            });
            
            it("should allow a model to be mapped and retrieved by an id.", function () { 
                modelMap.map(id, modelObj);
                
                expect(modelMap.get(id)).toBeDefined();
                expect(modelMap.get(id).key).toBe("value");
            });
            
            it("should not allow models to be overwritten", function () { 
                modelMap.map(id, modelObj);
                
                expect(function () { 
                    modelMap.map(id, modelObj);
                }).toThrow("Model `model-id` is already mapped");
            });
            
            it("should return the mapped model instance", function () { 
                expect(modelMap.map(id, modelObj)).toBeDefined();
            });
            
            it("should return undefined if a model is not mapped", function () { 
                expect(modelMap.get('non-existant')).not.toBeDefined();
            });
            
            it("should allow models to be removed", function () { 
                modelMap.map(id, modelObj);
                modelMap.remove(id);
                
                expect(modelMap.get(id)).not.toBeDefined();
            });
            
            it("should return the previously mapped model when removing", function () { 
                modelMap.map(id, modelObj);
                var removed = modelMap.remove(id);
                
                expect(removed).toBeDefined();
                expect(removed.key).toBe("value");
            });
            
            it("should ignore calls to remove unmapped models", function () { 
                expect(modelMap.remove('unmapped')).not.toBeDefined();
            });
            

            
            describe("RazrModel", function () { 
                var model;
                
                beforeEach(function () { 
                    model = modelMap.map(id, modelObj);
                });
                
                it("should be supplied with a notify method", function () { 
                    expect(model.notify).toBeDefined();
                });
                
                it("should be able to broadcast notification", function () { 
                    var noteName = 'note-name';
                    var handlerSpy = jasmine.createSpy('handler');
                    
                    app.commands.map(noteName, handlerSpy);
                    model.notify(noteName, 'args');
                    
                    expect(handlerSpy).toHaveBeenCalledWith(noteName, 'args');
                });
                
                it("should no longer be albe to notify when removed", function () { 
                    modelMap.remove(id);
                    expect(function () { 
                        model.notify("can't call notify when unmapped");
                    }).toThrow();
                });
            });
        });        
        
        
        describe("RazrApp.commands", function () { 
            var cmdMap, noteName, handler;
            
            beforeEach(function () {
                cmdMap = app.commands;
                noteName = 'note-name';
                handler = jasmine.createSpy('handler');
            });
            
            it("should allow multiple handlers to be mapped to a single notification", function () { 
                cmdMap.map(noteName, jasmine.createSpy('handlerA'));
                cmdMap.map(noteName, jasmine.createSpy('handlerB'));
            });
            
            it("should route notifications through to registered handlers", function () { 
                cmdMap.map(noteName, handler);
                app.notify(noteName);
                
                expect(handler).toHaveBeenCalled();
            });
            
            it("should allow specific note => handler mappings to be unmapped", function () { 
                var handlerA = jasmine.createSpy('handlerA');
                var handlerB = jasmine.createSpy('handlerB');
                
                cmdMap.map(noteName, handlerA);
                cmdMap.map(noteName, handlerB);
                
                cmdMap.remove(noteName, handlerA);
                app.notify(noteName);
                
                expect(handlerA).not.toHaveBeenCalled();
                expect(handlerB).toHaveBeenCalled();
            });
            
            it("should allow all note handlers to be unmapped if not specified", function () { 
                var handlerA = jasmine.createSpy('handlerA');
                var handlerB = jasmine.createSpy('handlerB');
                
                cmdMap.map(noteName, handlerA);
                cmdMap.map(noteName, handlerB);
                
                cmdMap.remove(noteName);
                app.notify(noteName);
                
                expect(handlerA).not.toHaveBeenCalled();
                expect(handlerB).not.toHaveBeenCalled();
            });
            
            it("should ignore calls to remove unmapped commands", function () { 
                cmdMap.remove('unmapped');
            });
            
            it("should ignore notifications about unmapped commands", function () { 
                app.notify('unmapped');
            });
            
            it("should pass the notification arguments to the command", function () { 
                cmdMap.map(noteName, handler);
                app.notify(noteName, 'note', 'args');
                
                expect(handler).toHaveBeenCalledWith(noteName, 'note', 'args');
            });
            
            it("should supply a notify method to commands when they are executed", function () { 
                var suppliedNotify;
            
                cmdMap.map(noteName, function () { suppliedNotify = this.notify; });
                app.notify(noteName);
                
                expect(suppliedNotify).toBeDefined();
            });
            
            it("should supply the modelMap to commands when they are executed", function () { 
                var suppliedModelMap;
                
                cmdMap.map(noteName, function () { suppliedModelMap = this.models; });
                app.notify(noteName);
                
                expect(suppliedModelMap).toBe(app.models);
            });
            
            it("should supply the viewMap to commands when they are executed", function () { 
                var suppliedViewMap;
                
                cmdMap.map(noteName, function () { suppliedViewMap = this.views; });
                app.notify(noteName);
                
                expect(suppliedViewMap).toBe(app.views);
            });            
            
            it("should create a clone of the command function when executed", function () {
                var fn = function () { 
                    this.counter++;
                };
                fn.counter = 0;
                
                cmdMap.map(noteName, fn);
                app.notify(noteName);
                
                expect(fn.counter).toBe(0);
            });
        });
        
        describe("RazrApp.views", function () { 
            var viewMap, id, viewObj;
            
            beforeEach(function () { 
                viewMap = app.views;
                id = 'view-id';
                viewObj = { key: "value" };
            });
            
            it("should allow views to be mapped and retrieved", function () { 
                viewMap.map(id, viewObj);
                
                expect(viewMap.get(id)).toBeDefined();
                expect(viewMap.get(id).key).toBe("value");
            });
            
            it("should not allow overwrites", function () { 
                viewMap.map(id, viewObj);
                
                expect(function () { 
                    viewMap.map(id, {});
                }).toThrow("View `view-id` is already mapped");
            });
            
            it("should return the view instance when mapping", function () { 
                var result = viewMap.map(id, viewObj);
                expect(result).toBe(viewMap.get(id));
            });
            
            it("should return undefined when getting an unmapped view", function () { 
                expect(viewMap.get('unmapped')).not.toBeDefined();
            });
            
            it("should allow views to be removed", function () { 
                viewMap.map(id, viewObj);
                viewMap.remove(id);
                
                expect(viewMap.get(id)).not.toBeDefined();
            });
            
            it("should ignore requests to remove unmapped views", function () { 
                viewMap.remove('unmapped');
            });
            
            it("should return the unmapped view instance", function () { 
                viewMap.map(id, viewObj);
                var unmapped = viewMap.remove(id);
                
                expect(unmapped).toBeDefined();
                expect(unmapped.key).toBe("value");
            });
            
            it("should invoke the view's onAdd method when mapping", function () { 
                viewObj.onAdd = jasmine.createSpy('onAdd');
                viewMap.map(id, viewObj);
                
                expect(viewObj.onAdd).toHaveBeenCalled();
            });
            
            it("should invoke the view's onRemove method when unmapping", function () { 
                viewObj.onRemove = jasmine.createSpy('onRemove');
                viewMap.map(id, viewObj);
                viewMap.remove(id);
                
                expect(viewObj.onRemove).toHaveBeenCalled();
            });
            
            describe("RazrView", function () { 
                var view;
                
                beforeEach(function () { 
                    view = viewMap.map(id, viewObj);
                });
                
                it("should be supplied with a notify method", function () { 
                    expect(view.notify).toBeDefined();
                });
                
                it("should be able to notify the framework", function () {
                    var cmdSpy = jasmine.createSpy('cmdSpy');
                    var noteName = 'note-name';
                    
                    app.commands.map(noteName, cmdSpy);
                    view.notify(noteName);
                    
                    expect(cmdSpy).toHaveBeenCalledWith(noteName);
                });
                
                it("should be supplied with a getModel method", function () { 
                    expect(view.getModel).toBeDefined();
                });
                
                it("should be able to retrieve a mapped model", function () { 
                    app.models.map('model-id', { });
                    expect(view.getModel('model-id')).toBeDefined();
                });
                
                it("should be supplied with an onNote method", function () { 
                    expect(view.onNote).toBeDefined();
                });
                
                it("should be supplied with an offNote method", function () { 
                    expect(view.offNote).toBeDefined();
                });    
                
                it("should route notifications to mapped handlers", function () { 
                    var handler = jasmine.createSpy('onNote');
                    
                    view.onNote('note-name', handler);
                    app.notify('note-name', 'some', 'args');
                    
                    expect(handler).toHaveBeenCalledWith('note-name', 'some', 'args');
                });
                
                it("should allow notifcation mappings to be removed", function () { 
                    var handlerA = jasmine.createSpy('noteHandlerA');
                    var handlerB = jasmine.createSpy('noteHandlerB');
                    
                    view.onNote('note-name', handlerA);
                    view.onNote('note-name', handlerB);
                    view.offNote('note-name', handlerA);
                    app.notify('note-name');
                    
                    expect(handlerA).not.toHaveBeenCalled();
                    expect(handlerB).toHaveBeenCalled();
                });
                
                it("should remove all handlers for a given notification if no handler is specified", function () { 
                    var handlerA = jasmine.createSpy('noteHandlerA');
                    var handlerB = jasmine.createSpy('noteHandlerB');
                    
                    view.onNote('note-a', handlerA);
                    view.onNote('note-b', handlerB);
                    view.offNote('note-a');
                    app.notify('note-a');
                    app.notify('note-b');
                    
                    expect(handlerA).not.toHaveBeenCalled();
                    expect(handlerB).toHaveBeenCalled();
                });
                
                it("should remove all notification handlers if no args are supplied", function () { 
                    var handlerA = jasmine.createSpy('noteHandlerA');
                    var handlerB = jasmine.createSpy('noteHandlerB');
                    var handlerC = jasmine.createSpy('noteHandlerC');
                    
                    view.onNote('note-a', handlerA);
                    view.onNote('note-a', handlerB);
                    view.onNote('note-b', handlerC);
                    
                    view.offNote();
                    
                    app.notify('note-a');
                    app.notify('note-b');
                    
                    expect(handlerA).not.toHaveBeenCalled();
                    expect(handlerB).not.toHaveBeenCalled();
                    expect(handlerC).not.toHaveBeenCalled();
                });
                
                it("should not recieve notifications when removed", function () { 
                    var handler = jasmine.createSpy('onNote');
                    
                    view.onNote('note-name', handler);
                    viewMap.remove(id);
                    app.notify('note-name');
                    
                    expect(handler).not.toHaveBeenCalled();
                });
                
                it("should not be able to send notifications when removed", function () { 
                    viewMap.remove(id);
                    expect(function () { 
                        view.notify("can't notifiy when unmapped")
                    }).toThrow();
                });
                
                it("should not allow handler overwrites", function () { 
                    var handler = jasmine.createSpy('onNote');
                    var noteName = 'note-name';
                    
                    view.onNote(noteName, handler);
                    
                    expect(function () { 
                        view.onNote(noteName, handler) 
                    }).toThrow('Notification `note-name` is already mapped to supplied function');
                    
                });
            });
        });
        
            
    });
    
    
    describe("Multiple Apps", function () { 
        var appA, appB;
        
        beforeEach(function () { 
            appA = razr.create({ startup: function () { } });
            appB = razr.create({ startup: function () { } });
        });
        
        it("should not have access to each other's models", function () { 
            var id = "model-id";
            
            appA.models.map(id, { owner: "appA" });
            appB.models.map(id, { owner: "appB" });
            
            expect(appA.models.get(id).owner).toBe("appA");
            expect(appB.models.get(id).owner).toBe("appB");
        });
        
        it("should not have access to each other's views", function () { 
            var id = "view-id";
            
            appA.views.map(id, { owner: "appA" });
            appB.views.map(id, { owner: "appB" });
            
            expect(appA.views.get(id).owner).toBe("appA");
            expect(appB.views.get(id).owner).toBe("appB");
        });        
        
        it("commands should not listen for each other's notifications", function () { 
            var noteName = 'note-name';
            
            var appASpy = jasmine.createSpy('appA');
            var appBSpy = jasmine.createSpy('appB');
            
            appA.commands.map(noteName, appASpy);
            appB.commands.map(noteName, appBSpy);
            
            appA.notify(noteName);
            
            expect(appBSpy).not.toHaveBeenCalled();
        });
        
        it("views should not listen for each other's notifications", function () { 
            var noteName = 'note-name';
            
            var appASpy = jasmine.createSpy('appA');
            var appBSpy = jasmine.createSpy('appB');
            
            appA.views.map(noteName, { onAdd: function () { this.onNote(noteName, appASpy) } });
            appB.views.map(noteName, { onAdd: function () { this.onNote(noteName, appBSpy) } });
            
            appA.notify(noteName);
            
            expect(appBSpy).not.toHaveBeenCalled();
        });
    });
});


