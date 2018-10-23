angular.module("pouchapp", ["ui.router", "ui.bootstrap"])

.run(function($pouchDB) {
    $pouchDB.setDatabase("groups");
    // $pouchDB.sync("http://localhost:4984/test-database");
	$pouchDB.sync("http://localhost:5984/groupsss");
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state("main", {
            "url": "/main",
			"abstract": true,
            "controller": 'BaseController'
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


.controller("BaseController", function($scope, $rootScope, $filter, $state, $stateParams, $pouchDB) {

    $scope.items = {};
	$scope.filteredGroups = []
    $pouchDB.startListening();
	$scope.baseFilters = {'search_text': "",};
	$scope.orderByOptions = ["position", "name"];
	

    // Listen for changes which include create or update events
    $rootScope.$on("$pouchDB:changes", function(event, datas) {
		_.map(datas, function(data) {$scope.items[data.doc._id] = data.doc;})
		$scope.filterItems();
        $scope.$apply();
    });	
	
    // Listen for changes which include only delete events
    $rootScope.$on("$pouchDB:deletes", function(event, datas) {
		_.map(datas, function(data) {delete $scope.items[data.doc._id];})
		$scope.filterItems();
        $scope.$apply();
    });
	
	$scope.filterItems = function() {
		
		var groupList = []

		
		_.forOwn($scope.items, function(doc, doc_id) {
			groupList.push(doc)
	
		});
		
		groupList = $filter('orderBy')(groupList, ["-score", "time"])
		
		var score = false
		var position_relative = 0
		var position_global = 0
		var index = 0
		_.map(groupList, function(group) {
			
			if (group.score){
				index += 1
				if (score != group.score){
					position_relative = index;	
					score = group.score;
				}
				
				position_global +=1 
				
				
				
				group.position = position_relative
				group.position_global = position_global
				if (group.position_global < 4){
					
					
				}
				
				
			}
			
		});
		
		groupList = $filter('orderBy')(groupList, $scope.orderByOptions)
		
		if ($scope.baseFilters.search_text.length > 0){
			searchVal = $scope.baseFilters.search_text.replace(/([()[{*+.$^\\|?])/g, '\\$1')
			regex = new RegExp('' + searchVal, 'i')
			groupList = _.filter(groupList, function(group) {
				return regex.test(group.name) || (group.date && regex.test($filter('date')(group.date, "dd/MM/yyyy")))
			});
		
		}

		$scope.filteredGroups = groupList
		
	}
	
	
	
	
})


.controller("ListController", function($scope, $rootScope, $state, $stateParams, $pouchDB) {


    $scope.delete = function(id, rev) {
        $pouchDB.delete(id, rev);
    }

})

.controller("DetailController", function($scope, $rootScope, $state, $stateParams, $pouchDB) {

    // Look up a document if we landed in the info screen for editing a document
    if($stateParams.documentId) {
        $pouchDB.get($stateParams.documentId).then(function(result) {
            $scope.inputForm = result;
			$scope.inputForm.date = new Date(result.date)
			$scope.$apply();
        });
    }
	else{
		var d = new Date();
		d.setHours( 0 );
		d.setMinutes( 0 );
		$scope.inputForm = {
			"date":new Date(),
			"time": d
			
			
		};
		
	}
	
	
	$scope.genScore = function(inputForm) {
		
		
		base_score = 30 + ((inputForm.diamonds || 0)*5) - ((inputForm.tracks || 0)*5)
		if (inputForm.scaped){
			base_score += 20
			if (inputForm.scaped_alived){
				base_score += 20
			}
		}
		
		if (inputForm.time){
			var d = new Date(inputForm.time)
			minutes = d.getHours()*60 + d.getMinutes()
			penalties = Math.max(0, minutes-60)
			
			base_score -= penalties
			
			extra = Math.floor(Math.max(0, 60-minutes) / 10.0)
			
			base_score += extra
			

			
		}
		
		inputForm.score = base_score
		
	}

    // Save a document with either an update or insert
    $scope.save = function(inputForm) {
        var jsonDocument = inputForm
        // If we're updating, provide the most recent revision and document id
        if($stateParams.documentId) {
            jsonDocument["_id"] = $stateParams.documentId;
            jsonDocument["_rev"] = $stateParams.documentRevision;
        }
        $pouchDB.save(jsonDocument).then(function(response) {
            $state.go("main.list");
        }, function(error) {
            console.log("ERROR -> " + error);
        });
    }

})

.service("$pouchDB", ["$rootScope", "$q", function($rootScope, $q) {

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
                $rootScope.$broadcast("$pouchDB:changes", [change]);
            } else {
                $rootScope.$broadcast("$pouchDB:deletes", [change]);
            }
        });
		
		database.allDocs({include_docs: true}).then(function (result) {
			$rootScope.$broadcast("$pouchDB:changes", result.rows);

		})		

    }

    this.stopListening = function() {
        changeListener.cancel();
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

    this.get = function(documentId) {
        return database.get(documentId);
    }

    this.destroy = function() {
        database.destroy();
    }

}]);
