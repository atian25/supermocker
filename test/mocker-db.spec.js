var expect = require('chai').expect;
var request = require('supertest');
var sinon = require('sinon');
var express = require('express');
var _ = require('lodash');
var fs = require('fs');
var rimraf = require('rimraf');

var Mocker = require('../lib/mocker');

//mocha patch, suger method
var ddescribe = describe.only;
var xdescribe = describe.skip;
var iit = it.only;
var xit = it.skip;

describe('mocker.db', function(){
  var mocker;
  var dbPath = './test/test.db';
  beforeEach(function(){
    rimraf.sync(dbPath);
    mocker = new Mocker(dbPath);
  });

  it('should save to disk', function(done){
    var space = mocker.updateSpace({path: 'test'});
    var group = mocker.updateGroup(space.id, {name: 'group'});
    var rule = mocker.updateRule(space.id, group.id, {path: 'rule1'});
    setTimeout(function(){
      var data = JSON.parse(fs.readFileSync(dbPath));
      expect(data.spaces.length).to.equal(1);
      expect(data.spaces[0]).to.deep.equal({
        id: '1',
        path: 'test',
        groups: [
          {
            id: '1',
            name: 'group',
            rules: [
              {
                id: '1',
                path: 'rule1',
                method: 'ALL'
              }
            ]
          }
        ]
      });
      done();
    }, 100);
  });
  afterEach(function(){
    rimraf.sync(dbPath);
  });
});