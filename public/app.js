"use strict";
var app = angular.module('SuperMocker', ['ui.ace', 'ui.bootstrap', 'ngDragDrop']);

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
        var group = vm.currentSpace.groups[0];
        var rule = group && group.rules && group.rules[0]
        vm.editRule(rule, group, 0);
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

  vm.ruleTypeEnum = [
    {name: '静态数据', value: 'static', fields:['headers', 'statusCode', 'data']},
    {name: '动态模拟数据', value: 'mockjs',fields:['headers', 'statusCode', 'data']},
    {name: '重定向', value: 'redirect', fields:['headers', 'statusCode', 'redirectUrl', 'additionalRequestHeaders']},
    {name: '自定义函数', value: 'custom', fields:['fn']}
  ];
  vm.allRuleFields = ['headers', 'statusCode', 'data', 'redirectUrl', 'additionalRequestHeaders', 'fn'];
  vm.ruleFields = {};

  vm.changeRuleType = function(type){
    vm.currentRuleType = _.find(vm.ruleTypeEnum, {value: type});
    //只显示指定的数据
    vm.ruleFields = _.reduce(vm.currentRuleType.fields, function(sum, item){
      sum[item] = true;
      return sum;
    }, {});
  };

  vm.editRule = function(item, group, groupIndex){
    vm.currentGroup = group;
    vm.groupIndex = groupIndex;
    if(item) {
      vm.currentRule = JSON.parse(JSON.stringify(item));
    }else{
      vm.currentRule = {
        method: 'ALL',
        type: 'static',
        data: '{\n\t\n}',
        fn: '//just like express middleware, but not need to write `function(req, res, next){}`\n'
      };
    }
    vm.resetRule = JSON.parse(JSON.stringify(vm.currentRule));
    vm.changeRuleType(vm.currentRule.type);
  };

  vm.cancelEditRule = function(){
    vm.currentRule = JSON.parse(JSON.stringify(vm.resetRule));
  };

  vm.saveRule = function(){
    if(vm.currentRule.path.indexOf('/')==0){
      vm.currentRule.path = vm.currentRule.path.substring(1);
    }
    var skipKey = _.difference(vm.allRuleFields, vm.currentRuleType.fields);
    var obj = _.omit(vm.currentRule, skipKey);
    $http.post('/space/' + vm.currentSpace.id + '/group/' + vm.currentGroup.id + '/rule/' + (obj.id || ''), {rule: obj}).success(function(response){
      var ruleList = vm.currentGroup.rules;
      if(!vm.currentRule.id){
        ruleList.push(response);
      }else{
        var index = _.findIndex(ruleList, function(obj){
          return obj.id == response.id;
        });
        if(index!=-1){
          ruleList[index] = response;
        }
      };
      vm.editRule(response, vm.currentGroup, vm.groupIndex);
    });
  };

  vm.toggleRule = function(item, ruleIndex, group, groupIndex){
    item.disabled = !item.disabled;
    $http.post('/space/' + vm.currentSpace.id + '/group/' + group.id + '/rule/' + (item.id || ''), {rule: item}).success(function(response){
      if(vm.currentRule && vm.currentRule.id == item.id){
        vm.editRule(response, vm.currentGroup, vm.groupIndex);
      }
    });
  };

  vm.removeRule = function(item, index, group,  groupIndex){
    $http.delete('/space/' + vm.currentSpace.id + '/group/' + group.id + '/rule/' + vm.currentRule.id).success(function(data){
      var ruleList =group.rules;
      ruleList.splice(index, 1);
      if(vm.currentRule && vm.currentRule.id == item.id) {
        vm.editRule();
      }
    });
  };

  vm.sortRule = function(groupId, ruleIds){
    $http.post('/sort/rule', {
      groupId: groupId,
      ruleIds: ruleIds
    }).success(function(data){
    });
  };

  vm.getDropData = function(data){
    return data
  };

  vm.onDropRuleSuccess = function(data, ruleIndex, groupIndex, $event){
    var ruleList = vm.currentRules[groupIndex];
    ruleList.splice(ruleIndex, 1);

    var group = vm.currentGroups[groupIndex];
    group.ruleIds.splice(ruleIndex, 1);
    vm.sortRule(group.id, group.ruleIds);
  };

  vm.onDropRule = function(data, ruleIndex, groupIndex, $event){
    var ruleList = vm.currentRules[groupIndex];
    ruleList.splice(ruleIndex + 1, 0, data);

    var group = vm.currentGroups[groupIndex];
    group.ruleIds.splice(ruleIndex + 1, 0, data.id);
    vm.sortRule(group.id, group.ruleIds);
  };

  vm.onDropValidate = function(data, channel){
    console.log(data, channel)
    return true
  }

  vm.visitRule = function(item){
    var url = '/mocker/' + vm.currentSpace.path + '/' + item.path;
    window.open(url, '_blank');
    console.log(url);
  };

  //The ui-ace option
  vm.aceOption = {
    //theme:'twilight',
    useWrapMode : true,
    //showInvisibles: true,
    mode: 'javascript', //json
    onLoad: function (_ace) {
      _ace.getSession().setTabSize(2);
      _ace.getSession().setUseSoftTabs(true);
    }
  };

}]);