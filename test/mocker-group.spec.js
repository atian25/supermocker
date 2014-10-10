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

describe('mocker.group', function(){
  var mocker;
  var spy;
  var space;
  beforeEach(function(){
    mocker = new Mocker();
    spy = sinon.stub(mocker, 'refreshRouter');
    space = mocker.updateSpace({path: 'test'});
    spy.reset();
  });

  it('should get', function(){
    var group1 = mocker.updateGroup(space.id, {name: 'group1'});
    var group2 = mocker.updateGroup(space.id, {name: 'group2'});
    var group = mocker.getGroup(space.id, group2.id);
    expect(group).to.deep.equal(group2);
  });

  it('should add', function () {
    var group1 = mocker.updateGroup(space.id, {name: 'group1'});
    var group2 = mocker.updateGroup(space.id, {});
    expect(group1).to.deep.equal({id: '1', name: 'group1', rules: []});
    expect(group2).to.be.falsy;
    expect(spy.callCount).to.equal(1);
  });

  it('should update', function () {
    var group1 = mocker.updateGroup(space.id, {name: 'group1'});
    mocker.updateRule(space.id, group1.id, {path:'rule1'});
    mocker.updateRule(space.id, group1.id, {path:'rule2', method: 'post'});
    spy.reset();
    //group's rules is not allow to change
    var group2 = mocker.updateGroup(space.id, {id: group1.id, name: 'group2', rules: [{id:'3', path:'rule1'}]});
    expect(group2.rules.length).to.equal(2);
    expect(spy.callCount).to.equal(1);
  });

  it('should remove', function () {
    var group1 = mocker.updateGroup(space.id, {name: 'group1'});
    var group2 = mocker.updateGroup(space.id, {name: 'group2'});
    spy.reset();

    mocker.removeGroup(space.id, group1.id);
    expect(space.groups.length).to.equal(1);
    expect(spy.callCount).to.equal(1);
  });

  it('should sort', function () {
    var group = mocker.updateGroup(space.id, {name: 'group1'});
    mocker.updateRule(space.id, group.id, {path:'rule1'});
    mocker.updateRule(space.id, group.id, {path:'rule2', method: 'post'});
    mocker.updateRule(space.id, group.id, {path:'rule3', method: 'post'});
    spy.reset();

    //sort
    group = mocker.sortRule(space.id, group.id, ['3', '2', '1']);
    expect(_.pluck(group.rules, 'id')).to.eql(['3', '2', '1']);
    expect(spy.callCount).to.equal(1);
  });
});