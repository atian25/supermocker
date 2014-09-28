var expect = require('chai').expect;
var Mocker = require('../lib/mocker');

describe.only('mocker', function(){
  describe('space op', function(){
    var mocker;
    beforeEach(function(){
      mocker = new Mocker();
    });

    it('should list', function(){
      var space1 = mocker.addSpace('test', 'des');
      var space2 = mocker.addSpace('test2', 'des2');
      var spaces = mocker.listSpace();
      expect(spaces).to.deep.equal([
        {id: '1', path: 'test', "description": "des", groupIds: []},
        {id: '2', path: 'test2', "description": "des2", groupIds: []}
      ]);
    });

    it('should add', function(){
      var space1 = mocker.addSpace('test', 'des');
      var space2 = mocker.addSpace('test', 'des2');
      expect(space1).to.deep.equal({id: '1', path: 'test', "description": "des", groupIds: []});
      expect(space2).to.be.falsy;
    });

    it('should update', function(){
      var space1 = mocker.addSpace('test', 'des');
      var space2 = mocker.addSpace('test2', 'des2');
      //space's path is not allow to duplicate
      var space11 = mocker.updateSpace({id: '1', path: 'test2', description: 'des'});
      expect(space11).to.be.falsy;
      //space's groupIds is not allow to change
      var space12 = mocker.updateSpace({id: '1', path: 'test3', description: 'des', groupIds: ['1', '2']});
      expect(space12).to.deep.equal({id: '1', path: 'test3', "description": "des", groupIds: []});
      //change path
      var space13 = mocker.updateSpace({id: '1', path: 'test4', description: 'des2'});
      expect(space13).to.deep.equal({id: '1', path: 'test4', "description": "des2", groupIds: []});
    });

    it('should remove', function(){
      var space = mocker.addSpace('test', 'des');
      var group = mocker.addGroup(space.id, 'group name');
      mocker.addRule(group.id, {path: 'rule1'});
      mocker.addRule(group.id, {path: 'rule2'});
      mocker.removeSpace(space.id);
      expect(mocker.spaces.value().length).to.equal(0);
      expect(mocker.groups.value().length).to.equal(0);
      expect(mocker.rules.value().length).to.equal(0);
    });

    it('should get detail', function(){
      var space = mocker.addSpace('test');
      var group1 = mocker.addGroup(space.id, 'group1');
      var group2 = mocker.addGroup(space.id, 'group2');
      var rule1 = mocker.addRule(group1.id, {path: 'rule11'});
      var rule2 = mocker.addRule(group1.id, {path: 'rule12'});
      var rule3 = mocker.addRule(group2.id, {path: 'rule21'});
      var detail = mocker.getSpaceDetail(space.id);
      expect(detail).to.eql({
        space: space,
        groups: [group1, group2],
        rules: [rule1, rule2, rule3]
      });
    });

    it('should sort', function () {
      var space = mocker.addSpace('test');
      var group1 = mocker.addGroup(space.id, 'group1');
      var group2 = mocker.addGroup(space.id, 'group2');
      var group3 = mocker.addGroup(space.id, 'group3');
      //no allow to change
      var space2 = mocker.sortGroup(space.id, [group2.id]);
      expect(space.groupIds).to.eql([group1.id, group2.id, group3.id]);
      expect(space2).to.be.undefined;
      //sort
      space = mocker.sortGroup(space.id, [group2.id, group1.id, group3.id])[0];
      expect(space.groupIds).to.eql([group2.id, group1.id, group3.id]);
    });
  });

  describe('group op', function() {
    var mocker;
    var space;
    beforeEach(function () {
      mocker = new Mocker();
      space = mocker.addSpace('test');
    });

    it('should add', function () {
      var group1 = mocker.addGroup(space.id, 'group1');
      var group2 = mocker.addGroup(space.id, 'group2');
      expect(group1).to.deep.equal({id: '1', name: 'group1', ruleIds: []});
      expect(space.groupIds).to.deep.equal([group1.id, group2.id]);
      //with index
      var group3 = mocker.addGroup(space.id, 'group3', 0);
      expect(space.groupIds).to.deep.equal([group3.id, group1.id, group2.id]);
      //check space
      var group4 = mocker.addGroup(5, 'group4', 0);
      expect(group4).to.be.falsy;
    });

    it('should update', function () {
      var group1 = mocker.addGroup(space.id, 'group1');
      var group2 = mocker.addGroup(space.id, 'group2');
      //group's ruleIds is not allow to change
      var group11 = mocker.updateGroup({id: group1.id, name: 'group11', ruleIds: ['1', '2']});
      expect(group11).to.deep.equal({id: group1.id, name: 'group11', ruleIds: []});
    });

    it('should remove', function () {
      var group1 = mocker.addGroup(space.id, 'group1');
      var group2 = mocker.addGroup(space.id, 'group2');
      mocker.addRule(group1.id, {path: 'rule1'});
      mocker.addRule(group1.id, {path: 'rule2'});
      mocker.removeGroup(group1.id, space.id);
      expect(mocker.groups.value().length).to.equal(1);
      expect(mocker.rules.value().length).to.equal(0);
      expect(space.groupIds).to.deep.equal([group2.id]);
    });

    it('should sort', function () {
      var group = mocker.addGroup(space.id, 'test');
      var rule1 = mocker.addRule(group.id, {path: 'rule1'});
      var rule2 = mocker.addRule(group.id, {path: 'rule2'});
      var rule3 = mocker.addRule(group.id, {path: 'rule3'});
      //no allow to change
      var group2 = mocker.sortRule(group.id, [rule1.id]);
      expect(group.ruleIds).to.eql([rule1.id, rule2.id, rule3.id]);
      expect(group2).to.be.undefined;
      //sort
      group = mocker.sortRule(group.id, [rule2.id, rule1.id, rule3.id])[0];
      expect(group.ruleIds).to.eql([rule2.id, rule1.id, rule3.id]);
    });
  });

  describe('rule op', function() {
    var mocker;
    var space;
    var group;
    beforeEach(function () {
      mocker = new Mocker();
      space = mocker.addSpace('test');
      group = mocker.addGroup(space.id, 'test');
    });

    it('should add', function () {
      var rule1 = mocker.addRule(group.id, {path: 'rule1'});
      var rule2 = mocker.addRule(group.id, {path: 'rule2', method: 'POST'});
      expect(rule1).to.deep.equal({id: '1', path: 'rule1', type:'static', method: 'all'});
      expect(rule2).to.deep.equal({id: '2', path: 'rule2', type:'static', method: 'post'});
      expect(group.ruleIds).to.deep.equal([rule1.id, rule2.id]);
      //with index
      var rule3 = mocker.addRule(group.id, {path: 'rule3', method: 'put'}, 1);
      expect(group.ruleIds).to.deep.equal([rule1.id, rule3.id, rule2.id]);
      //check group
      var rule4 = mocker.addRule(10, {path: 'rule4', method: 'POST'});
      expect(rule4).to.be.falsy;
    });

    it('should update', function(){
      var rule1 = mocker.addRule(group.id, {path: 'rule1'});
      var rule2 = mocker.updateRule({id: rule1.id, path: 'rule2', method: 'POST'});
      expect(rule2).to.deep.equals({id: '1', path: 'rule2', type:'static', method: 'post'});
    });

    it('should remove', function(){
      var rule1 = mocker.addRule(group.id, {path: 'rule1'});
      var rule2 = mocker.addRule(group.id, {path: 'rule2'});
      var rule3 = mocker.removeRule(rule1.id, group.id);
      expect(rule3.path).to.equals(rule1.path);
      expect(mocker.rules.value()).to.have.length(1);
      expect(group.ruleIds).to.deep.equal([rule2.id]);
    });
  });
});