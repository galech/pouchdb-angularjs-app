angular.module("pouchapp", ["ui.router", "ui.bootstrap", "infinite-scroll", "ui.select", "ngSanitize", "ngNumberPicker"])

.run(function($groupDB, $configDB) {
    $groupDB.setDatabase("grupos");
	$groupDB.sync("https://couchdb-c65237.smileupps.com/groups");
	
	
	$configDB.setDatabase("config");
	$configDB.sync("https://couchdb-c65237.smileupps.com/config");

	
	
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state("main", {
            "url": "/main",
			"abstract": true,
            "controller": 'BaseController',
			"resolve": {
				"configDocument": function($configDB){
					return $configDB.get("configuration");
				}
			}
        })
        .state("main.list", {
            "url": "/list",
            "templateUrl": "templates/list.html",
            "controller": "ListController"
        })
        .state("main.item", {
            "url": "/item/:documentId?/:documentRevision?",
            "templateUrl": "templates/item.html",
            "controller": "DetailController",
			"params": { documentId: null, documentRevision: null },
        });
    $urlRouterProvider.otherwise("main/list");
})


.controller("BaseController", function($scope, $rootScope, $filter, $state, $stateParams, $groupDB, $configDB, configDocument) {

    $scope.groupsById = {};
	$scope.filteredGroups = []
	$scope.limitInterval = 40;
    $groupDB.startListening();
	$scope.baseFilters = {'search_text': "",};
	$scope.orderByOptions = ["selected", "position", "time", "name"];


	$scope.configFields = configDocument.config
	$scope.groupFields = []
	_.map($scope.configFields, function(row){_.map(row, function(field){$scope.groupFields.push(field)})})

	
    // Listen for changes which include create or update events
    $rootScope.$on("$groupDB:changes", function(event, datas) {
		_.map(datas, function(data) {$scope.groupsById[data.doc._id] = data.doc;})
		$scope.filterItems();
        $scope.$apply();
    });	
	
    // Listen for changes which include only delete events
    $rootScope.$on("$groupDB:deletes", function(event, datas) {
		_.map(datas, function(data) {delete $scope.groupsById[data.doc._id];})
		$scope.filterItems();
        $scope.$apply();
    });
	
	$scope.filterItems = function() {

		var groupList = []

		
		_.forOwn($scope.groupsById, function(doc, doc_id) {groupList.push(doc)});
		
		groupList = $filter('orderBy')(groupList, ["-score", "time"])
		_.map(groupList, function(group, index) { group.position = index + 1});
		
		groupList = $filter('orderBy')(groupList, $scope.orderByOptions)
		
		if ($scope.baseFilters.search_text.length > 0){
			searchVal = $scope.baseFilters.search_text.replace(/([()[{*+.$^\\|?])/g, '\\$1')
			regex = new RegExp('' + searchVal, 'i')
			groupList = _.filter(groupList, function(group) {
				return regex.test(group.name) || (group.date && regex.test($filter('date')(group.date, "dd/MM/yyyy")))
			});
		
		}

		$scope.filteredGroups = groupList
		$scope.limitedGroups = $filter('limitTo')($scope.filteredGroups, $scope.limitInterval) 
		
	}
	
	$scope.randomKey = function (obj) {
		var keys = Object.keys(obj)
		return keys[ keys.length * Math.random() << 0]
		
	};
	
	
	$scope.getRandomGroupImage = function(group) {
        if ( !group.src && group._attachments){
				$groupDB.getAttachment(group._id, $scope.randomKey(group._attachments)).then(function (blob) {
					  var url = URL.createObjectURL(blob);
					  group.src = url;
					  $scope.$apply();
				})
		}
    }
	
	$scope.guid = function() {
	  function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
		  .toString(16)
		  .substring(1);
	  }
	  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	};
	
	
	
	
})


.controller("ListController", function($scope, $rootScope, $state, $filter, $stateParams, $groupDB, $timeout, $location, $anchorScroll) {

		
    $scope.delete = function(id, rev) {
        $groupDB.delete(id, rev);
    }
	
	$scope.addMoreItems = function(filteredGroups, limitedGroups, limitInterval) {
		_.map($filter('limitTo')(filteredGroups, limitInterval, limitedGroups.length), function(group) {
			limitedGroups.push(group)
			
		});
    }

})

.controller("DetailController", function($scope, $rootScope, $state, $stateParams, $uibModal, $groupDB) {


	var d = new Date();
	d.setHours( 0 );
	d.setMinutes( 0 );
	$scope.minTime = d;
	
	var d2 = new Date();
	d2.setHours( 22 );
	d2.setMinutes( 00 );
	$scope.maxTime = d2;
	
	$scope.attachements = []
	
	$scope.example13model = []; 
	$scope.options = [ "coco", "kiko", "amigo", "hermano"] 
	$scope.example13data = [ {id: 1, label: "David"}, {id: 2, label: "Jhon"}, {id: 3, label: "Lisa"}, {id: 4, label: "Nicole"}, {id: 5, label: "Danny"} ]; 
	$scope.example13settings = { smartButtonMaxItems: 10 , enableSearch:true, showCheckAll:false, showUncheckAll:false};
    // Look up a document if we landed in the info screen for editing a document
    if($stateParams.documentId) {
        $groupDB.get($stateParams.documentId).then(function(result) {
            $scope.inputForm = result;
			_.map($scope.groupFields, function(groupField){
				if (groupField.type == "date" && $scope.inputForm[groupField.key]){
					$scope.inputForm[groupField.key] = new Date($scope.inputForm[groupField.key])	
				}
			})
			if ($scope.inputForm._attachments){
				_.forOwn($scope.inputForm._attachments, function(value, key) { 
					$groupDB.getAttachment($scope.inputForm._id, key).then(function (blob) {
						  var url = URL.createObjectURL(blob);
						  $scope.attachements.push({uid:key, src:url})
						  $scope.$apply();
					})
				} );

			}
			else{
				$scope.$apply();
			}
        });
    }
	else{
		$scope.inputForm = {};
		_.map($scope.groupFields, function(groupField){
			if (groupField.today){
				$scope.inputForm[groupField.key] = new Date()	
			}
			if (groupField.minuts){
				var d = new Date();
				d.setHours( 0 );
				d.setMinutes(groupField.minuts);
				$scope.inputForm[groupField.key] = d;
			}
		})
		
	}
	
    // Save a document with either an update or insert
    $scope.save = function(inputForm) {
        var jsonDocument = inputForm
        // If we're updating, provide the most recent revision and document id
        if($stateParams.documentId) {
            jsonDocument["_id"] = $stateParams.documentId;
            jsonDocument["_rev"] = $stateParams.documentRevision;
        }
        $groupDB.save(jsonDocument).then(function(response) {
            $state.go("main.list");
        }, function(error) {
            console.log("ERROR -> " + error);
        });
    }
	
	$scope.autoFunction = function(data, toEvaluate) {
		return eval(toEvaluate);
	}
		
	$scope.removePhoto = function(photo){
		_.remove($scope.attachements, photo)
		delete $scope.inputForm._attachments[photo.uid]
	}
	
	$scope.takePhoto = function(inputForm) {
		

		var dialogOpts = {
			backdrop: true,
			keyboard: true,
			templateUrl: 'templates/take-photo.html',
			controller: 'TakePhotoCtrl',
			size: 'lg',
		};

		
		$uibModal.open(dialogOpts).result.then(function (photo) {
			if (!inputForm._attachments){
				inputForm._attachments = {}
				
			}
	
			uid = $scope.guid()
			picture = photo.replace("data:image/jpeg;base64,","");
			inputForm._attachments[uid] = {
				content_type:'image/jpeg',
				data:picture
			}
			
			$scope.attachements.unshift({uid:uid, src:photo})
			
			
		});
		

    }



})

.controller("TakePhotoCtrl", function($scope, $uibModalInstance) {
	
	$scope.acceptPhoto = function(photo) {
		$uibModalInstance.close(photo);
	}; 
	$scope.cancel = function() {
		$uibModalInstance.dismiss();
	};
})

.directive('ngCamera', function($q, $timeout) {
	
	
	return {
		'restrict': 'E',
		'scope': {
			'flashFallbackUrl': '@',
			'overlayUrl': '@',
			'shutterUrl': '@',
			'photoCallBack': '='
		},
		'template': '<div class="photo-dialog-body" ng-click="libraryLoaded && cameraLive && getSnapshot()" id="ng-camera-feed"></div>',
		'link': link
	};

        function link(scope, element, attrs) {

            scope.libraryLoaded = false;
            scope.cameraLive = false;

            Webcam.set({
                image_format: "jpeg",
                jpeg_quality: 100,
                force_flash: false
            });
            if(scope.flashFallbackUrl !== 'undefined') {
                Webcam.setSWFLocation(scope.flashFallbackUrl);
            }
			
			$timeout(function() {
				Webcam.attach('#ng-camera-feed');
			}, 300);


            Webcam.on('load', function() {
                scope.$apply(function() {
                    scope.libraryLoaded = true;
                });
            });
            Webcam.on('live', function() {
                scope.$apply(function() {
                    scope.cameraLive = true;
                });
            });
            Webcam.on('error', function(error) {
                console.error('WebcameJS directive ERROR: ', error);
            });

            scope.getSnapshot = function() {
				Webcam.snap(function(data_uri) {
					scope.photoCallBack(data_uri);
				});

            };

            scope.$on('$destroy', function() {
                Webcam.reset();
            });
        }
})

.service("$groupDB", ["$rootScope", "$q", function($rootScope, $q) {

    var database;
    var changeListener;

    this.setDatabase = function(databaseName) {
        database = new PouchDB(databaseName);
    }

    this.startListening = function() {
		
        changeListener = database.changes({
            live: true,
			include_docs: true,
			since: 'now'
		}).on("change", function(change) {
            if(!change.deleted) {
                $rootScope.$broadcast("$groupDB:changes", [change]);
            } else {
                $rootScope.$broadcast("$groupDB:deletes", [change]);
            }
        });
		
		database.allDocs({include_docs: true}).then(function (result) {
			$rootScope.$broadcast("$groupDB:changes", result.rows);

		})		

    }

    this.stopListening = function() {
        changeListener.cancel();
    }

    this.sync = function(remoteDatabase) {
        database.sync(remoteDatabase, {live: false, retry: false});
    }

    this.save = function(jsonDocument) {
        var deferred = $q.defer();
        if(!jsonDocument._id) {
            database.post(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        } else {
            database.put(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }

    this.delete = function(documentId, documentRevision) {
        return database.remove(documentId, documentRevision);
    }
	
	
	this.put = function(put_dict) {
        return database.put(put_dict);
    }

    this.get = function(documentId) {
        return database.get(documentId);
    }

	this.getAttachment = function(documentId, attachement) {
        return database.getAttachment(documentId, attachement);
    }
	
    this.destroy = function() {
        database.destroy();
    }

}])


.service("$configDB", ["$rootScope", "$q", function($rootScope, $q) {

    var database;
    var changeListener;

    this.setDatabase = function(databaseName) {
        database = new PouchDB(databaseName);
    }

    this.sync = function(remoteDatabase) {
        database.sync(remoteDatabase, {live: true, retry: true});
    }

    this.save = function(jsonDocument) {
        var deferred = $q.defer();
        if(!jsonDocument._id) {
            database.post(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        } else {
            database.put(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }

    this.delete = function(documentId, documentRevision) {
        return database.remove(documentId, documentRevision);
    }
	
	
	this.put = function(put_dict) {
        return database.put(put_dict);
    }

    this.get = function(documentId) {
        return database.get(documentId);
    }

	this.getAttachment = function(documentId, attachement) {
        return database.getAttachment(documentId, attachement);
    }
	
    this.destroy = function() {
        database.destroy();
    }

}])

;
