module.exports = exports = Mocker;

var low = require('./low-patch');
var Handler = exports.Handler = require('./handler');

/**
 * Mocker
 *
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.filePath = dbPath;
  this.db = low(this.filePath);
  this.namespaces = this.db('namespaces');
  this.rules = this.db('rules');
}

/**
 * return available middlewares (rule is enable && ruls's namespace is enable)
 * @returns {Array} Returns [method, path, handler]
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
    var handler = Handler.get(item);
    var method = item.method || 'ALL';
    var path = '/' + item.namespace + '/' + item.path;
    return [method.toLowerCase(), path, handler];
  });
  return middlewares.value();
};

/**
 * Rule class define
 *
 * @class Rule
 *
 * @param {String} path The mapping path
 * @param {String} namespace The prefix mapping path
 * @param {String} method The mapping method
 * @param {Boolean} [disabled] Whether mapping this rule
 * @param {Number} [delay] Delay return, ms
 * @param {String} [description] The rule description
 *
 * @param {String} type The rule type:
 *  - static: return static data/header/status
 *  - mockjs: return data build by mockjs
 *  - redirect: proxy to other server
 *  - custom: using your custom logic
 *  - echo: just echo rule & req info
 *
 * @param {Array} [headers] The response headers: [{key: '', value: '', disabled: false }, ...]
 * @param {Number} [statusCode] The response statusCode
 * @param {String} [data] The stringify object string, pure object or mockjs template
 * @param {String} [redirectUrl] The proxy server url
 * @param {Array} [additionalRequestHeaders] The additional headers to request for redirect type: [{key: '', value: '', disabled: false }, ...]
 * @param {String} [fn] The handler function body, must not have function define header.
 */


/**
 * Namespace class define
 *
 * @class Namespace
 *
 * @param {String} name The name of namespace
 * @param {Boolean} [disabled]
 */
