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
    delete result.groups;
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
    if(!req.param('id')) {
      mocker.updateGroup(result.id, {name: 'Prefix Group'});
      mocker.updateGroup(result.id, {name: 'Default Group'});
      mocker.updateGroup(result.id, {name: 'Post Group'});
    }
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
  router.post('/space/:spaceId/group/:id?', function(req, res) {
    var result = mocker.updateGroup(req.param('spaceId'), {
      id: req.param('id'),
      name: req.param('name')
    });
    res.json(result);
  });

  router.delete('/space/:spaceId/group/:id', function(req, res) {
    var result = mocker.removeGroup(req.param('spaceId'), req.param('id'));
    res.json(result);
  });

  /**
   * Rule Api
   *
   * POST   /rule      -> add/update (name/order/disabled)
   * DELETE /rule/{id} -> delete
   */
  router.post('/space/:spaceId/group/:groupId/rule/:id?', function(req, res) {
    var result = mocker.updateRule(req.param('spaceId'), req.param('groupId'),req.body.rule);
    res.json(result);
  });

  router.delete('/space/:spaceId/group/:groupId/rule/:id', function(req, res) {
    var result = mocker.removeRule(req.param('spaceId'), req.param('groupId'), req.param('id'));
    res.json(result);
  });

  /**
   * sort group
   */
  router.post('/space/:spaceId/sortGroup', function(req, res){
    var result = mocker.sortGroup(req.param('spaceId'), req.param('groupIds'));
    res.json(result);
  });

  /**
   * sort rule
   */
  router.post('/space/:spaceId/sortRule', function(req, res){
    var result = mocker.sortRule(req.param('groupId'), req.param('ruleIds'));
    res.json(result);
  });

  return router;
};

