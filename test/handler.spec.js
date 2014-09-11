var request = require('supertest');
var express = require('express');
var expect = require('chai').expect;

var handler = require('../lib/handler');

describe('handler', function(){
  var app;
  var rule;
  beforeEach(function(){
    app = express();
  });

  describe('static', function(){
    beforeEach(function(){
      rule = {
        type: 'static',
        statusCode: 201,
        headers: [
          {key: 'h1', value: 'v1', disabled: false},
          {key: 'h2', value: 'v2', disabled: true},
          {key: 'h3', value: 'v3'}
        ],
        data: JSON.stringify({a: 'b'})
      }
    });

    it('should return static', function(done){
      app.get('/', function(req, res, next){
        handler.static(rule, req, res, next);
      });
      request(app).get('/')
        .expect(201)
        .expect('Content-Type', /json/)
        .expect('h1', 'v1')
        .expect('h3', 'v3')
        .expect(JSON.stringify({a: 'b'}))
        .end(function(err, res){
          expect(res.get('h2')).to.be.undefined;
          done(err);
        });
    });

    it('should pass to next', function(done){
      rule.data = undefined;
      app.get('/', function(req, res, next){
        handler.static(rule, req, res, next);
      });
      app.get('/', function(req, res){
        res.json({'test': 'ok'});
      });
      request(app).get('/').expect('h1', 'v1').expect({test: 'ok'}, done);
    });
  });

  describe('mockjs', function(){
    beforeEach(function(){
      rule = {
        type: 'mockjs',
        statusCode: 201,
        headers: [
          {key: 'h1', value: 'v1', disabled: false},
          {key: 'h2', value: 'v2', disabled: true},
          {key: 'h3', value: 'v3'}
        ],
        data: JSON.stringify({
          'key1|3': 'v',
          'key2|50-100': 1
        })
      }
    });

    it('should return mockjs', function(done){
      app.get('/', function(req, res, next){
        handler.mockjs(rule, req, res, next);
      });
      request(app).get('/')
        .expect(201)
        .expect('Content-Type', /json/)
        .expect('h1', 'v1')
        .expect('h3', 'v3')
        .end(function(err, res){
          expect(res.get('h2')).to.be.undefined;
          expect(res.body.key1).to.equal('vvv');
          expect(res.body.key2).to.be.within(50,100);
          done(err);
        });
    });
  });

  describe('custom', function(){
    beforeEach(function(){
      rule = {
        type: 'custom',
        fn: [
          'var obj = {};',
          'obj.header = req.headers["test"];',
          'obj.url = req.url;',
          'res.header("h1", "v1");',
          'res.status(201);',
          'res.json(obj);'
        ].join('\n')
      }
    });

    it.only('should return custom', function(done){
      app.get('/', function(req, res, next){
        handler.custom(rule, req, res, next);
      });
      request(app).get('/')
        .set('test', 'testvalue')
        .expect(201)
        .expect('Content-Type', /json/)
        .expect('h1', 'v1')
        .end(function(err, res){
          expect(err).to.not.be.ok;
          expect(res.body.header).to.equal('testvalue');
          expect(res.body.url).to.equal('/');
          done(err);
        });
    });
  });
});