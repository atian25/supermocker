//admin router
var express = require('express');

exports = module.exports = function(mocker){
  var router = express.Router();

  router.get('/', function(req, res, next){
    res.sendFile('./public/index.html');
  });

  /**
   * Space Api
   * GET    /space      -> list space
   * GET    /space/{id} -> get detail (space + groups + rules)
   * POST   /space      -> add/update new space
   * DELETE /space/{id} -> delete space
   */
  router.get('/space', function(req, res) {
    var result = mocker.listSpace();
    //console.log('query space, len=%s', result && result.length);
    res.json(result);
  });

  router.get('/space/:id', function(req, res) {
    var result = mocker.getSpace(req.param('id'));
    //console.log('info space@%s', result && result.space && result.space.id);
    res.status(result ? 200 : 404).json(result);
  });

  router.post('/space/:id?', function(req, res) {
    var result = mocker.updateSpace({
      id: req.param('id'),
      path: req.param('path'),
      description: req.param('description')
    });
    res.json(result);
  });

  router.delete('/space/:id', function(req, res) {
    var result = mocker.removeSpace(req.param('id'));
    res.json(result);
  });

  /**
   * Group Api
   *
   * POST   /group      -> add/update group
   * DELETE /group/{id} -> delete group
   */
  router.post('/group/:id?', function(req, res) {
    var result;
    if(req.param('id')){
      result = mocker.updateGroup(req.body);
    }else{
      result = mocker.addGroup(req.param('spaceId'), req.param('name'), req.param('index'));
    }
    res.json(result);
  });

  router.delete('/group/:id', function(req, res) {
    var result = mocker.removeGroup(req.param('id'), req.param('spaceId'));
    res.json(result);
  });

  /**
   * Rule Api
   *
   * POST   /rule      -> add/update (name/order/disabled)
   * DELETE /rule/{id} -> delete
   */
  router.post('/rule/:id?', function(req, res) {
    var result;
    if(req.param('id')){
      result = mocker.updateRule(req.body.rule);
    }else{
      result = mocker.addRule(req.param('groupId'), req.body.rule, req.param('index'));
    }
    res.json(result);
  });

  router.delete('/rule/:id', function(req, res) {
    var result = mocker.removeRule(req.param('id'), req.param('groupId'));
    res.json(result);
  });

  /**
   * sort group
   */
  router.post('/sort/group', function(req, res){
    var result = mocker.sortGroup(req.param('spaceId'), req.param('groupIds'));
    res.json(result);
  });

  /**
   * sort rule
   */
  router.post('/sort/rule', function(req, res){
    var result = mocker.sortRule(req.param('groupId'), req.param('ruleIds'));
    res.json(result);
  });

  return router;
};

