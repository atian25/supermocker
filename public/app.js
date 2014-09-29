"use strict";
var app = angular.module('SuperMocker', ['ui.ace', 'ui.bootstrap']);

app.controller('mainCtrl', ['$http', function($http){
  var vm = this;
  vm.spaceList = [];
  //查询命名空间列表
  vm.listSpace = function() {
    $http.get('/space').success(function(data){
      vm.spaceList = data;
      vm.switchSpace(vm.currentSpace);
    });
  };
  vm.listSpace();

  //切换命名空间
  vm.switchSpace = function(item){
    vm.currentSpace = item || vm.spaceList[0];
    if(vm.currentSpace) {
      $http.get('/space/' + vm.currentSpace.id).success(function (data){
        vm.currentGroups = data.groups;
        vm.currentRules = data.rules;
      });
    }
  };

  vm.editSpace = function(item){
    vm.isEditingSpace = true;
    if(item) {
      vm.editingSpace = JSON.parse(JSON.stringify(item));
    }else{
      vm.editingSpace = {};
    }
  };

  vm.cancelEditSpace = function(){
    vm.isEditingSpace = false;
    vm.editingSpace = null;
  };

  vm.removeSpace = function(item){
    $http.delete('/space/' + item.id).success(function(){
      _.remove(vm.spaceList, function(obj){
        return obj.id == item.id;
      });
      vm.switchSpace();
    });
  };

  vm.saveSpace = function(){
    $http.post('/space/' + (vm.editingSpace.id || ''), vm.editingSpace).success(function(data){
      if(!vm.editingSpace.id){
        vm.spaceList.push(data);
      }else{
        var index = _.findIndex(vm.spaceList, function(obj){
          return obj.id == data.id;
        });
        if(index!=-1){
          vm.spaceList[index] = data;
        }
      }
      vm.switchSpace(data);
      vm.editingSpace = null;
      vm.isEditingSpace = false;
    });
  };
}]);