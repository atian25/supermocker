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

describe('mocker.rule', function(){
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

  describe('move', function(){
    var rule1, rule2, space2, group2;
    beforeEach(function(){
      space2 = mocker.updateSpace({path: 'test2'});
      group2 = mocker.updateGroup(space2.id, {name: 'group2'});
      rule1 = mocker.updateRule(space.id, group.id, {path: 'rule1'});
      rule2 = mocker.updateRule(space.id, group.id, {path: 'rule2', method: 'post'});
      rule3 = mocker.updateRule(space.id, group.id, {path: 'rule3', method: 'post'});
      spy.reset();
    });

    it('should move in same group', function(){
      var rule = rule1;
      var result = mocker.moveRule(space.id, group.id, rule.id, space.id, group.id, 0, false);
      expect(result.fromGroup).to.deep.equals(group);
      expect(result.toGroup).to.deep.equals(group);
      expect(result.rule.path).to.deep.equals(rule.path);
      expect(result.rule.id).to.equals(rule.id);
      expect(_.pluck(group.rules, 'id')).to.deep.equal([rule2.id, rule3.id, rule.id]);
      expect(spy.callCount).to.gte(1);
    });

    it('should move to other group', function(){
      var rule = rule1;
      var result = mocker.moveRule(space.id, group.id, rule.id, space2.id, group2.id, 0, false);
      expect(result.fromGroup).to.deep.equals(group);
      expect(result.toGroup).to.deep.equals(group2);
      expect(result.rule.path).to.deep.equals(rule.path);
      expect(result.rule.id).to.equals(rule.id);
      expect(_.pluck(group.rules, 'id')).to.deep.equal([rule2.id, rule3.id]);
      expect(_.pluck(group2.rules, 'id')).to.deep.equal([rule.id]);
      expect(spy.callCount).to.gte(1);
    });

    it('should copy in other group', function(){
      var rule = rule1;
      var result = mocker.moveRule(space.id, group.id, rule.id, space2.id, group2.id, 0, true);
      expect(result.fromGroup).to.deep.equals(group);
      expect(result.toGroup).to.deep.equals(group2);
      expect(result.rule.path).to.deep.equals(rule.path);
      expect(result.rule.id).to.equals(rule.id);
      expect(_.pluck(group.rules, 'id')).to.deep.equal([rule1.id, rule2.id, rule3.id]);
      expect(_.pluck(group2.rules, 'id')).to.deep.equal([rule.id]);
      expect(spy.callCount).to.gte(1);
    });
  });

});