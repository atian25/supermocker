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

describe('mocker.router', function(){
  var mocker;
  var app;
  beforeEach(function(){
    mocker = new Mocker();
    app = express();
    app.use('/mock', mocker.router);
    var space1 = mocker.updateSpace({path: 'space1'});
    var space2 = mocker.updateSpace({path: 'space2'});
    var group11 = mocker.updateGroup(space1.id, {name: 'group1'});
    var group12 = mocker.updateGroup(space1.id, {name: 'group2'});
    var group23 = mocker.updateGroup(space2.id, {name: 'group3'});
    var rule111 = mocker.updateRule(space1.id, group11.id, {path: 'rule111', method: 'get', type: 'static', data:'{"msg":"/space1/rule111"}'});
    var rule112 = mocker.updateRule(space1.id, group11.id, {path: 'rule112', type: 'static', data:'{"msg":"/space1/rule112"}'});
    var rule121 = mocker.updateRule(space1.id, group12.id, {path: 'rule121', type: 'static', data:'{"msg":"/space1/rule121"}'});
    var rule231 = mocker.updateRule(space2.id, group23.id, {path: 'rule231', type: 'static', data:'{"msg":"/space2/rule231"}'});
  });

  it('should mount sub router', function(done){
    var space1 = express.Router();
    var space2 = express.Router();
    var group1 = express.Router();
    var group2 = express.Router();

    app.use('/space1', space1);
    app.use('/space2', space2);

    space1.use('/group1', group1);
    space2.use('/group2', group2);

    group1.get('/rule11', function(req, res, next){
      res.end('space1.group1.rule11');
    });

    group1.get('/rule12', function(req, res, next){
      res.end('space1.group1.rule12');
    });

    group2.get('/rule21', function(req, res, next){
      res.end('space2.group2.rule21');
    });

    request(app).get('/space1/group1/rule11')
      .expect('space1.group1.rule11')
      .end(function(err){
        if(err) return done(err);
        request(app).get('/space1/group1/rule12')
          .expect('space1.group1.rule12')
          .end(function(err){
            if(err) return done(err);
            request(app).get('/space2/group2/rule21')
              .expect('space2.group2.rule21')
              .end(function(err){
                if(err) return done(err);
                request(app).get('/space2/group2/rule2222')
                  .expect(404)
                  .end(function(err){
                    done(err);
                  });
              });
          });
      });
  });

  it('should mapping router', function(done){
    setTimeout(function(){
      request(app).get('/mock/space1/rule111').expect('{"msg":"/space1/rule111"}').end(function(err){
        if(err) return done(err);
        request(app).get('/mock/space1/rule112').expect('{"msg":"/space1/rule112"}').end(function(err){
          if(err) return done(err);
          request(app).get('/mock/space1/rule121').expect('{"msg":"/space1/rule121"}').end(function(err) {
            if(err) return done(err);
            request(app).get('/mock/space2/rule231').expect('{"msg":"/space2/rule231"}').end(function(err) {
              done(err);
            });
          });
        });
      });
    }, 150);
  });

  it('should got 404', function(done){
    mocker.removeRule('1', '1', '1');
    setTimeout(function(){
      request(app).get('/mock/space1/rule111').expect(404).end(function(err){
        if(err) return done(err);
        request(app).get('/mock/space1/rule112').expect('{"msg":"/space1/rule112"}').end(function(err){
          done(err);
        });
      });
    }, 150);
  });
});