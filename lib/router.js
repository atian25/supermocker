//optional router

var express = require('express');
var Mocker = require('supermocker');

module.exports = exports = function(dbPath){
  var router = express.Router();
  var proxy = router.proxy = express.Router();
  var mocker = router.mocker = new Mocker(dbPath || './files/db.json');

  //Namespace Api
  /**
   * Namespace Api
   * GET    /admin/proxy/namespace      -> list namespace
   * GET    /admin/proxy/namespace/{id} -> get detail (namespace + rules)
   * PUT    /admin/proxy/namespace/{id} -> update namespace (name/order/disabled)
   * POST   /admin/proxy/namespace      -> add new namespace
   * DELETE /admin/proxy/namespace/{id} -> delete namespace
   */
  router.get('/namespace', function(req, res) {
    var result = mocker.namespaces.value();
    console.log('query namespace, len=%s', result && result.length);
    res.json(result ? 200 : 404, result);
  });

  router.get('/namespace/:id?', function(req, res) {
    var result = mocker.namespaces.get(req.param('id')).value();
    console.log('info namespace@%s', result && result.id);
    res.json(result ? 200 : 404, result);
  });

  router.post('/namespace/:id?', function(req, res) {
    var id = req.param('id');
    if(id){
      var doc = mocker.namespaces.get(req.param('id')).value();
      var name = doc.name;
      var newName = req.param('name');
      if(name !== newName){
        mocker.rules.updateWhere({namespace: name}, {namespace: newName});
      }
    }
    var result = mocker.namespaces.insertOrUpdate(req.body).value();
    refreshMiddleware();
    console.log('%s namespace@%s', req.param('id') ? 'update': 'insert', result.id);
    res.json(result);
  });

  router.delete('/namespace/:id', function(req, res) {
    var result = mocker.namespaces.remove(req.param('id')).value();
    mocker.rules.removeWhere({namespace: result.name});
    refreshMiddleware();
    res.json(result);
  });

  //Rule Api
  /**
   * Rule Api
   * GET    /admin/proxy/rule      -> list
   * GET    /admin/proxy/rule/{id} -> get detail
   * POST   /admin/proxy/rule      -> create/update (name/order/disabled)
   * DELETE /admin/proxy/rule/{id} -> delete
   */
  router.get('/rule', function(req, res) {
    var conditions = {
      namespace: req.param('namespace')
    };
    var result = mocker.rules.query(conditions).value();
    console.log('query rule: %j , len=%s', conditions, result && result.length);
    res.json(result ? 200 : 404, result);
  });

  router.get('/rule/:id', function(req, res) {
    var result = mocker.rules.get(req.param('id')).value();
    console.log('info rule@%s', result && result.id);
    res.json(result ? 200 : 404, result);
  });

  router.post('/rule/:id?', function(req, res) {
    var result = mocker.rules.insertOrUpdate(req.body).value();
    refreshMiddleware();
    console.log('%s rule@%s', req.param('id') ? 'update': 'insert', result.id);
    res.json(result);
  });

  router.delete('/rule/:id?', function(req, res) {
    var result = mocker.rules.remove(req.param('id')).value();
    refreshMiddleware();
    res.json(result);
  });

  /**
   * sort rule
   */
  router.get('/sort', function(req, res){
    var idList = req.param('orderList');
    var result = mocker.rules.sortById(idList).value();
    refreshMiddleware();
    res.json(result);
  });

  /**
   * remount proxy route
   */
  function refreshMiddleware(){
    proxy.stack = [];
    var middlewares = mocker.getMiddlewares();
    middlewares.forEach(function(rule){
      var method = rule.method;
      var path = rule.fullPath;
      var handler = rule.handler;
      proxy[method](path, handler);
      //console.log('Mapping route: [%s] %s', method, path);
    });
    console.log('reinit route stack, len=%d', middlewares.length);
  }

  refreshMiddleware();

  return router;
};

