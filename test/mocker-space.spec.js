var expect = require('chai').expect;
var request = require('supertest');
var sinon = require('sinon');
var express = require('express');
var _ = require('lodash');
var Mocker = require('../lib/mocker');

//mocha patch, suger method
var ddescribe = describe.only;
var xdescribe = describe.skip;
var iit = it.only;
var xit = it.skip;

describe('mocker.space', function(){
  var mocker;
  var spy;
  beforeEach(function(){
    mocker = new Mocker();
    spy = sinon.stub(mocker, 'refreshRouter');
  });

  it('should list', function(){
    var space1 = mocker.updateSpace({path: 'test', description: 'des'});
    var space2 = mocker.updateSpace({path: 'test2', description: 'des2'});
    spy.reset();
    var spaces = mocker.listSpace();
    expect(spaces).to.deep.equal([
      {id: '1', path: 'test', "description": "des", groups: []},
      {id: '2', path: 'test2', "description": "des2", groups: []}
    ]);
    expect(spy.callCount).to.equal(0);
  });

  it('should add', function(){
    var space1 = mocker.updateSpace({path: 'test', description: 'des'});
    var space2 = mocker.updateSpace({path: 'test', description: 'des2'});
    expect(space1).to.deep.equal({id: '1', path: 'test', "description": "des", groups: []});
    expect(space2).to.be.falsy;
    expect(spy.callCount).to.equal(1);
  });

  it('should update', function(){
    var space1 = mocker.updateSpace({path: 'test', description: 'des'});
    var space2 = mocker.updateSpace({path: 'test2', description: 'des2'});

    //space's path is not allow to duplicate
    var space11 = mocker.updateSpace({id: '1', path: 'test2', description: 'des'});
    expect(space11).to.be.falsy;
    expect(spy.callCount).to.equal(2);

    //change path
    var space12 = mocker.updateSpace({id: '1', path: 'test3', description: 'des2'});
    expect(space12).to.deep.equal({id: '1', path: 'test3', "description": "des2", groups: []});
    expect(spy.callCount).to.equal(3);

    //space's groups is not allow to modify
    mocker.updateGroup('1', {name: 'group1'});
    mocker.updateGroup('1', {name: 'group2'});
    var space13 = mocker.updateSpace({id: '1', path: 'test4', groups: ['1', '2', '3']});
    expect(space13).to.deep.equal({id: '1', path: 'test4', groups: [{id: '1', name:'group1', 'rules': []},{id: '2', name:'group2', 'rules': []}]});
  });

  it('should remove', function(){
    var space1 = mocker.updateSpace({path: 'test', description: 'des'});
    var space2 = mocker.updateSpace({path: 'test2', description: 'des2'});
    spy.reset();
    mocker.removeSpace(space1.id);
    expect(mocker.spaces.value().length).to.equal(1);
    expect(spy.callCount).to.equal(1);
  });

  it('should get detail', function(){
    var space = mocker.updateSpace({path: 'test'});
    mocker.updateGroup(space.id, {name:'group1'});
    mocker.updateGroup(space.id, {name:'group2'});
    mocker.updateRule(space.id, '2', {path:'rule1'});
    mocker.updateRule(space.id, '2', {path:'rule2', method: 'post'});
    spy.reset();
    var detail = mocker.getSpace(space.id);
    expect(detail).to.deep.equal({id: '1', path: 'test', groups: [{id: '1', name: 'group1', rules:[]}, {id: '2', name: 'group2', rules:[{id: '1', path:'rule1', method:'ALL'}, {id: '2', path:'rule2', method:'POST'}]}]});
    expect(spy.callCount).to.equal(0);
  });

  it('should sort', function () {
    var space = mocker.updateSpace({path: 'test'});
    mocker.updateGroup(space.id, {name:'group1'});
    mocker.updateGroup(space.id, {name:'group2'});
    mocker.updateGroup(space.id, {name:'group3'});
    spy.reset();
    //no allow to change
    var space2 = mocker.sortGroup(space.id, ['3', '2']);
    expect(_.pluck(space.groups, 'id')).to.eql(['1', '2', '3']);
    expect(space2).to.be.falsy;
    expect(spy.callCount).to.equal(0);
    //sort
    space = mocker.sortGroup(space.id, ['3', '2', '1']);
    expect(_.pluck(space.groups, 'id')).to.eql(['3', '2', '1']);
    expect(spy.callCount).to.equal(1);
  });
});