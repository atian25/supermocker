module.exports = Mocker;

var low = require('./low-patch');
var Handler = require('./handler');

/**
 * Mocker
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.filePath = dbPath;
  this.db = low(this.filePath);
  this.namespaces = this.db('namespace');
  this.rules = this.db('rule');
}

/**
 * return valid middlewares (rule is enable && ruls's namespace is enable)
 * @returns {Array} Return [method, path, handler]
 */
Mocker.prototype.getMiddlewares = function(){
  var self = this;
  //find disabled namespaces name, namespace defined: {name: '', disable: false}
  var namespaces = this.namespaces.filter('disabled').pluck('name').value();
  var middlewares = this.rules.filter(function(item){
    //filter disabled rule/namespace
    return !item.disabled && namespaces.indexOf(item.namespace)==-1;
  }).map(function(item){
    //create middleware
    var handler = self.getHandler(item);
    var method = item.method || 'ALL';
    var path = '/' + item.namespace + '/' + item.path;
    return [method.toLowerCase(), path, handler];
  });
  return middlewares.value();
};

/**
 * create middleware by item.type
 * @param {Object} rule The rule item
 *
 * @param {String} rule.path The mapping path
 * @param {String} rule.namespace The prefix mapping path
 * @params {String} rule.method The mapping method
 * @param {Boolean} [rule.disabled] Whether mapping this rule
 * @param {Number} [rule.delay] Delay return, ms
 * @param {String} [rule.description] The rule description
 *
 * @param {String} rule.type The rule type:
 *  - static: return static data/header/status
 *  - mockjs: return data build by mockjs
 *  - redirect: proxy to other server
 *  - custom: using your custom logic
 *  - echo: just echo rule & req info
 *
 * @param {Array} [rule.headers] The response headers: [{key: '', value: '', disabled: false }, ...]
 * @param {Number} [rule.statusCode] The response statusCode
 * @param {String} [rule.data] The stringify object string, pure object or mockjs template
 * @param {String} [rule.redirectUrl] The proxy server url
 * @param {Array} [rule.additionalRequestHeaders] The additional headers to request for redirect type: [{key: '', value: '', disabled: false }, ...]
 * @param {String} [rule.fn] The handler function body, must not have function define header.
 *
 * @returns {Function} Return function(req, res, next)
 */
Mocker.prototype.getHandler = function(rule){
  return function(req, res, next) {
    //additional headers
    var headers = req.headers;
    headers['proxy-agent'] = 'supermock';

    //create handler
    var handler = Handler[rule.type] || Handler['echo'];

    //exec
    if (rule.delay) {
      setTimeout(function () {
        handler(rule, req, res, next);
      }, rule.delay);
    } else {
      handler(rule, req, res, next);
    }
  }
};