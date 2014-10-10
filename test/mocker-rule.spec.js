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

ddescribe('mocker.rule', function(){
  var mocker;
  var spy;
  var space;
  var group;
  beforeEach(function(){
    mocker = new Mocker();
    spy = sinon.stub(mocker, 'refreshRouter');
    space = mocker.updateSpace({path: 'test'});
    group = mocker.updateGroup(space.id, {name: 'group1'});
    spy.reset();
  });

  it('should get', function(){
    var rule1 = mocker.updateRule(space.id, group.id, {path: 'rule1'});
    var rule2 = mocker.updateRule(space.id, group.id, {path: 'rule2'});
    var rule = mocker.getRule(space.id, group.id, rule1.id);
    expect(rule).to.deep.equal(rule1);
  });

  it('should add', function () {
    var rule1 = mocker.updateRule(space.id, group.id, {path: 'rule1'});
    var rule2 = mocker.updateRule(space.id, group.id, {path: '/rule2', method: 'post'});
    expect(rule1).to.deep.equal({id: '1', path: 'rule1', method: 'ALL'});
    expect(rule2).to.deep.equal({id: '2', path: 'rule2', method: 'POST'});
    expect(_.pluck(group.rules, 'id')).to.deep.equal([rule1.id, rule2.id]);
    expect(spy.callCount).to.equal(2);
  });

  it('should update', function(){
    var rule1 = mocker.updateRule(space.id, group.id, {path: 'rule1'});
    spy.reset();
    var rule2 = mocker.updateRule(space.id, group.id, {id: rule1.id, path: 'rule2', method: 'post'});
    expect(rule2).to.deep.equals({id: '1', path: 'rule2', method: 'POST'});
    expect(spy.callCount).to.equal(1);
  });

  it('should remove', function(){
    var rule1 = mocker.updateRule(space.id, group.id, {path: 'rule1'});
    var rule2 = mocker.updateRule(space.id, group.id, {path: '/rule2', method: 'post'});
    spy.reset();

    var rule3 = mocker.removeRule(space.id, group.id, rule1.id);
    expect(rule3.path).to.equals(rule1.path);
    expect(_.pluck(group.rules, 'id')).to.deep.equal([rule2.id]);
    expect(spy.callCount).to.equal(1);
  });
});