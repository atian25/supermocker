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
    app.use(bodyParser.json());
  });

  describe('get', function(){
    var spy;
    afterEach(function(){
      if(spy){
        spy.restore();
      }
    });

    it('should get correct handler', function(){
      ['echo', 'static', 'mockjs', 'redirect', 'custom'].forEach(function(type){
        spy = sinon.stub(Handler, type);
        var rule = {type: type};
        var middleware = Handler.get(rule);
        middleware();
        sinon.assert.calledOnce(spy);
        spy.reset();
        spy.restore();
      });
    });

    it('should return echo as default', function(){
      spy = sinon.stub(Handler, 'echo');
      var rule = {type: 'default'};
      var middleware = Handler.get(rule);
      middleware();
      sinon.assert.calledOnce(spy);
    });

    it('should disabled', function(){
      spy = sinon.stub(Handler, 'echo');
      var next = sinon.spy();
      var rule = {
        type: 'echo',
        disabled: true
      };
      var middleware = Handler.get(rule);
      middleware({}, {json: function(){}}, next);
      sinon.assert.calledOnce(next);
      sinon.assert.notCalled(spy);
    });

    it('should enable', function(){
      spy = sinon.stub(Handler, 'echo');
      var next = sinon.spy();
      var rule = {
        type: 'echo',
        disabled: false
      };
      var middleware = Handler.get(rule);
      middleware({}, {}, next);
      sinon.assert.notCalled(next);
      sinon.assert.calledOnce(spy);
    });

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
        Handler.static(req, res, next, rule);
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
        Handler.static(req, res, next, rule);
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
        Handler.mockjs(req, res, next, rule);
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
        Handler.custom(req, res, next, rule);
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
      app.all('/', function(req, res, next){
        Handler.redirect(req, res, next, rule);
      });

      app.all('/test', function(req, res, next){
        res.json({
          data: req.body,
          headers: req.headers,
          method: req.method
        });
      });

      testServer = app.listen(6789);

      request(app).post('/')
        .send({"test": "value"})
        .end(function(err, res){
          expect(err).to.not.be.ok;
          expect(res.body.data).to.deep.equal({"test": "value"});
          expect(res.body.headers.ah1).to.equal('av1');
          expect(res.body.headers.ah2).to.be.undefined;
          expect(res.body.headers.ah3).to.equal('av3');
          expect(res.get("h1")).to.equal('v1');
          expect(res.get("h2")).to.be.undefined;
          expect(res.get("h3")).to.equal('v3');
          testServer.close();
          done(err);
        });
    });

    it('should redirect *', function(done){
      rule.redirectUrl = 'http://localhost:6789/target';

      app.all('/interface/*', function(req, res, next){
        Handler.redirect(req, res, next, rule);
      });

      app.all('/target/test', function(req, res, next){
        res.json({
          data: req.body,
          headers: req.headers,
          method: req.method
        });
      });

      testServer = app.listen(6789);

      request(app).post('/interface/test')
        .send({"test": "value"})
        .end(function(err, res){
          expect(err).to.not.be.ok;
          expect(res.body.data).to.deep.equal({"test": "value"});
          expect(res.body.headers.ah1).to.equal('av1');
          expect(res.body.headers.ah2).to.be.undefined;
          expect(res.body.headers.ah3).to.equal('av3');
          expect(res.get("h1")).to.equal('v1');
          expect(res.get("h2")).to.be.undefined;
          expect(res.get("h3")).to.equal('v3');
          testServer.close();
          done(err);
        });
    });
  });
});