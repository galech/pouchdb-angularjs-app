angular.module("pouchapp", ["ui.router", "ui.bootstrap", "infinite-scroll", ])

.run(function($pouchDB) {
    $pouchDB.setDatabase("grupos");
    // $pouchDB.sync("http://localhost:4984/test-database");
	$pouchDB.sync("https://cccouchdb-c65237.smileupps.com/groups");
	// $pouchDB.sync("http://localhost:5984/groups");
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
	$scope.limitInterval = 40;
    $pouchDB.startListening();
	$scope.baseFilters = {'search_text': "",};
	$scope.orderByOptions = ["selected", "position", "time", "name"];
	$rootScope.currentGroupId = null

	$scope.villaAmparo = [
		[
			{
				type:"text",
				required:true,
				label:"Nombre",
				key: "name"
			},
			{
				type:"date",
				label:"Fecha",
				key: "date",
				default:"today"
			}
		],
		[	{
				type:"number",
				min: 0,
				label:"Personas",
				key: "people"
			},
			{
				 type:"number",
				 label:"Monitores",
				 key: "received_by"
			}
		],
		[
			{
				type:"number",
				min:0,
				label:"Diamantes",
				key: "diamonds"
			},
			{
				 type:"number",
				 min:0,
				 label:"Pistas",
				 key: "tracks"
			},
			{
				type:"boolean",
				label:"Escapan",
				key: "scaped"
			},
			{
				 type:"boolean",
				 label:"Vivos",
				 key: "scaped_alived"
			}
		],
		[
			{
				type:"duration",
				label:"Tiempo",
				key: "time"
			}
		],
		[
			{
				type:"number",
				label:"Puntuacion",
				key: "score"
			}
		],
	]
	
	
	
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
		// $scope.limitedGroups = $scope.filteredGroups
		$scope.limitedGroups = $filter('limitTo')($scope.filteredGroups, $scope.limitInterval) 
		
	}
	
	$scope.getGroupImage = function(group) {
        if ( !group.src && group._attachments){
			if (group._attachments["photo.jpeg"]){
				$pouchDB.getAttachment(group._id, 'photo.jpeg').then(function (blob) {
					  var url = URL.createObjectURL(blob);
					  group.src = url;
					  $scope.$apply();
				})
			}	
		}
    }
	
	
	
	
})


.controller("ListController", function($scope, $rootScope, $state, $filter, $stateParams, $pouchDB, $timeout, $location, $anchorScroll) {

		
	$scope.createItems = function(){
		n = 0
		while (n < 1000) {
			
			
			jsonDocument = {
				"name": "caca"
				
				
			}
			
			$pouchDB.save(jsonDocument).then(function(response) {
				$rootScope.currentGroupId = response.id
				$state.go("main.list");
			}, function(error) {
				console.log("ERROR -> " + error);
			});
		  
		  n ++;
		}	
		
	}

    $scope.delete = function(id, rev) {
        $pouchDB.delete(id, rev);
    }
	
	$timeout(function() {
		if ($rootScope.currentGroupId && $scope.items[$rootScope.currentGroupId]){
			$anchorScroll.yOffset = 100;
			$location.hash($rootScope.currentGroupId);
			$anchorScroll();
			
		}
	});

	$scope.addMoreItems = function(filteredGroups, limitedGroups, limitInterval) {
		_.map($filter('limitTo')(filteredGroups, limitInterval, limitedGroups.length), function(group) {
			limitedGroups.push(group)
			
		});
    }

})

.controller("DetailController", function($scope, $rootScope, $state, $stateParams, $uibModal, $pouchDB) {


	var d = new Date();
	d.setHours( 0 );
	d.setMinutes( 0 );
	$scope.minTime = d;
	
	var d2 = new Date();
	d2.setHours( 3 );
	d2.setMinutes( 0 );
	$scope.maxTime = d2;
	
	$scope.currentPhoto = null
	
    // Look up a document if we landed in the info screen for editing a document
    if($stateParams.documentId) {
        $pouchDB.get($stateParams.documentId).then(function(result) {
            $scope.inputForm = result;
			$rootScope.currentGroupId = $scope.inputForm._id
			$scope.inputForm.date = new Date(result.date)
			if (!$scope.inputForm.time){
				var d = new Date();
				d.setHours( 4 );
				d.setMinutes( 0 );
				$scope.inputForm.time = d;
				
			}
			if ($scope.inputForm._attachments && $scope.inputForm._attachments["photo.jpeg"]){
				$pouchDB.getAttachment($scope.inputForm._id, 'photo.jpeg').then(function (blob) {
					  var url = URL.createObjectURL(blob);
					  $scope.currentPhoto = url
					  $scope.$apply();
				})
			}
			else{
				$scope.$apply();
			}
        });
    }
	else{
		var d = new Date();
		d.setHours( 1 );
		d.setMinutes( 0 );
		$scope.inputForm = {
			"date":new Date(),
			"time": d

		};
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
			$rootScope.currentGroupId = response.id
            $state.go("main.list");
        }, function(error) {
            console.log("ERROR -> " + error);
        });
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
	
	$scope.removePhoto = function(){
		$scope.currentPhoto = null
		delete $scope.inputForm._attachments["photo.jpeg"]
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
			// picture = picture.replace(/^(data:image\/jpeg;base64,\.)/,"");
			picture = photo.replace("data:image/jpeg;base64,","");
			inputForm._attachments["photo.jpeg"] = {
				content_type:'image/jpeg',
				data:picture
			}
			
			$scope.currentPhoto = photo
			
			
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


// .directive('scrollOnClick', function() {
  // return {
    // restrict: 'A',
    // link: function(scope, $elm, attrs) {
      // var idToScroll = attrs.href;
      // $elm.on('click', function() {
        // var $target;
        // if (idToScroll) {
          // $target = $(idToScroll);
        // } else {
          // $target = $elm;
        // }
        // $("body").animate({scrollTop: $target.offset().top}, "slow");
      // });
    // }
  // }
// });

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

}]);


