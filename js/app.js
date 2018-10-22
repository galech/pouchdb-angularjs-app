angular.module("pouchapp", ["ui.router"])

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
            "url": "/item/:documentId/:documentRevision",
            "templateUrl": "templates/item.html",
            "controller": "DetailController"
        });
    $urlRouterProvider.otherwise("main/list");
})


.controller("BaseController", function($scope, $rootScope, $state, $stateParams, $pouchDB) {

    $scope.items = {};
	$scope.filteredGroups = []
    $pouchDB.startListening();
	$scope.baseFilters = {};
	$scope.orderByOptions = ["name"];
	

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
		
		$scope.filteredGroups = []
		// has_search_text = search_text? and search_text.length > 0
		// if has_search_text
		// searchVal = search_text.replace(/([()[{*+.$^\\|?])/g, '\\$1')
		// regex = new RegExp('' + searchVal, 'i')

		// has_medicalunit_filters = medicalunit_filter? and medicalunit_filter.length > 0
		// has_sector_filters = sector_active_filters? and sector_active_filters.length > 0
		// has_entity_filters = entity_active_filters? and entity_active_filters.length > 0

		// check_start_date = moment(start_date)
		// check_end_date = moment(end_date)

		
		
		_.forOwn($scope.items, function(doc, doc_id) {
			
			// if has_search_text
			  // if !(regex.test(stay.patient.name) || regex.test(stay.si_id) || regex.test(stay.patient.ipp))
				// continue
			// if has_sector_filters and sector_active_filters.indexOf(stay.patient.sector) == -1
			  // continue
			// if has_entity_filters and entity_active_filters.indexOf(stay.patient.entity) == -1
			  // continue
			// if has_medicalunit_filters and medicalunit_filter.indexOf(stay.medical_unit) == -1
			  // continue

			// if mode == "entries"
			  // if stay.d_from and not (moment(stay.d_from) > check_start_date and moment(stay.d_from) < check_end_date)
				// continue
			// else #mode == "exits"
			  // if not (stay.projected_end_date or stay.d_to)
				// continue
			  // #projected_end_date
			  // else if stay.d_to and not (moment(stay.d_to) > check_start_date and moment(stay.d_to) < check_end_date)
				// continue

			$scope.filteredGroups.push(doc)


			

		} );

		
		
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
        });
    }

    // Save a document with either an update or insert
    $scope.save = function(firstname, lastname, email) {
        var jsonDocument = {
            "firstname": firstname,
            "lastname": lastname,
            "email": email
        };
        // If we're updating, provide the most recent revision and document id
        if($stateParams.documentId) {
            jsonDocument["_id"] = $stateParams.documentId;
            jsonDocument["_rev"] = $stateParams.documentRevision;
        }
        $pouchDB.save(jsonDocument).then(function(response) {
            $state.go("list");
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
