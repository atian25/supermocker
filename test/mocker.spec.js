var expect = require('chai').expect;
var Mocker = require('../lib/mocker');

describe.only('space op', function(){
  var mocker;
  beforeEach(function(){
    mocker = new Mocker();
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

  //it('should list/insert/update', function(){
  //  var groups = [{ "name": "Prefix Group", "ruleIds": []}, { "name": "Default Group", "ruleIds": []}, { "name": "Post Group", "ruleIds": []}];
  //  var space1 = mocker.updateSpace({path: 'test'});
  //  var space2 = mocker.updateSpace({path: 'test2', groups: []});
  //  expect(space1).to.deep.equal({id: '1', path: 'test', groups: groups});
  //  expect(space2).to.deep.equal({id: '2', path: 'test2', groups: []});
  //
  //  var space3 = mocker.updateSpace({id: '1', path: 'test3'});
  //  expect(space3).to.deep.equal({id: '1', path: 'test3', groups: groups});
  //  expect(mocker.listSpace()).to.have.length(2);
  //  expect(mocker.listSpace()).to.include({id: '1', path: 'test3', groups: groups});
  //  expect(mocker.listSpace()).to.include({id: '2', path: 'test2', groups: []});
  //
  //  var space4 = mocker.updateSpace({id: '1', path: 'test2'});
  //  expect(space4).to.be.a('string');
  //});
  //
  //it('should remove', function(){
  //  var space1 = mocker.updateSpace({path: 'test'});
  //  var space2 = mocker.updateSpace({path: 'test2'});
  //  var space3 = mocker.removeSpace(space2.id);
  //  expect(space3.path).to.equals(space2.path);
  //  expect(mocker.listSpace()).to.have.length(1);
  //});
  //
  //it('should get detail', function(){
  //  var groups = [{ "name": "Prefix Group", "ruleIds": ['1', '2']}, { "name": "Default Group", "ruleIds": ['3', '4']}, { "name": "Post Group", "ruleIds": ['5', '6']}];
  //  var space1 = mocker.updateSpace({path: 'test', groups: groups});
  //  var rule1 = mocker.updateRule({path: 'rule1'});
  //  var rule2 = mocker.updateRule({path: 'rule2'});
  //  var rule3 = mocker.updateRule({path: 'rule3'});
  //  var space2 = mocker.getSpace(space1.id, true);
  //  expect(space2.rules).to.deep.equals([[rule1, rule2], [rule3], []]);
  //});
});

describe('rule op', function() {
  var mocker;
  var space;
  beforeEach(function () {
    mocker = new Mocker();
    space = mocker.updateSpace({path: 'test'})
  });

  it('should list/insert/update', function () {
    var rule1 = mocker.updateRule({path: 'rule1'});
    var rule2 = mocker.updateRule({path: 'rule2', method: 'post'});
    expect(rule1).to.deep.equal({id: '1', path: 'rule1', method: 'all'});
    expect(rule2).to.deep.equal({id: '2', path: 'rule2', method: 'post'});

    var rule3 = mocker.updateRule({id: '2', path: 'rule3', method: 'post'});
    expect(rule3).to.deep.equal({id: '2', path: 'rule3', method: 'post'});
    expect(mocker.rules.value()).to.have.length(2);
  });

  it('should remove', function(){
    var rule1 = mocker.updateRule({path: 'rule1'});
    var rule2 = mocker.updateRule({path: 'rule2', method: 'post'});
    var rule3 = mocker.removeRule(rule2.id);
    expect(rule3.path).to.equals(rule2.path);
    expect(mocker.rules.value()).to.have.length(1);
  });
});