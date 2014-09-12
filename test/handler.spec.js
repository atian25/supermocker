var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');
var expect = require('chai').expect;
var sinon = require('sinon');

var Handler = require('../lib/handler');

describe('handler', function(){
  var app;
  var rule;
  beforeEach(function(){
    app = express();
  });

  describe('get', function(){
    //it.only('should get correct handler', function(){
    //  expect(Handler.get({type: 'default'})()).to.equal(Handler.echo);
    //  expect(Handler.get({type: 'echo'})()).to.equal(Handler.echo);
    //  expect(Handler.get({type: 'static'})()).to.equal(Handler.static);
    //  expect(Handler.get({type: 'mockjs'})()).to.equal(Handler.mockjs);
    //  expect(Handler.get({type: 'redirect'})()).to.equal(Handler.redirect);
    //  expect(Handler.get({type: 'custom'})()).to.equal(Handler.custom);
    //});

    it('should delay', function(){
      var rule = {
        type: 'custom',
        delay: 3000,
        fn: [
          'req.result="ok";'
        ].join('\n')
      };
      var req = {};
      var middleware = Handler.get(rule);
      var clock = sinon.useFakeTimers();
      middleware(req);
      expect(req.result).to.be.undefined;
      clock.tick(5000);
      expect(req.result).to.equal('ok');
      clock.restore();
    });
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
        Handler.static(rule, req, res, next);
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
        Handler.static(rule, req, res, next);
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
        Handler.mockjs(rule, req, res, next);
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
          'var URL = require("url");',
          'var obj = {};',
          'obj.header = req.headers["test"];',
          'obj.url = URL.resolve(req.url, "app");',
          'res.header("h1", "v1");',
          'res.status(201);',
          'res.json(obj);'
        ].join('\n')
      }
    });

    it('should return custom', function(done){
      app.get('/', function(req, res, next){
        Handler.custom(rule, req, res, next);
      });
      request(app).get('/')
        .set('test', 'testvalue')
        .expect(201)
        .expect('Content-Type', /json/)
        .expect('h1', 'v1')
        .end(function(err, res){
          expect(err).to.not.be.ok;
          expect(res.body.header).to.equal('testvalue');
          expect(res.body.url).to.equal('/app');
          done(err);
        });
    });
  });

  describe('redirect', function(){
    var testServer;
    beforeEach(function(){
      rule = {
        type: 'redirect',
        redirectUrl: 'http://localhost:6789/test',
        statusCode: 201,
        additionalRequestHeaders: [
          {key: 'ah1', value: 'av1', disabled: false},
          {key: 'ah2', value: 'av2', disabled: true},
          {key: 'ah3', value: 'av3'}
        ],
        headers: [
          {key: 'h1', value: 'v1', disabled: false},
          {key: 'h2', value: 'v2', disabled: true},
          {key: 'h3', value: 'v3'}
        ]
      }
    });

    it('should return redirect', function(done){
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded());
      app.all('/', function(req, res, next){
        Handler.redirect(rule, req, res, next);
      });

      app.all('/test', function(req, res, next){
        Handler.echo(rule, req, res, next);
      });

      testServer = app.listen(6789);

      request(app).post('/')
        .send({"test": "value"})
        .end(function(err, res){
          expect(err).to.not.be.ok;
          expect(res.body.req.json).to.deep.equal({"test": "value"});
          expect(res.body.req.headers.ah1).to.equal('av1');
          expect(res.body.req.headers.ah2).to.be.undefined;
          expect(res.body.req.headers.ah3).to.equal('av3');
          expect(res.get("h1")).to.equal('v1');
          expect(res.get("h2")).to.be.undefined;
          expect(res.get("h3")).to.equal('v3');
          testServer.close();
          done(err);
        });
    });
  });
});