module.exports = exports = Mocker;

var low = require('./low-patch');
exports.Handler = require('./handler');
var Rule = exports.Rule = require('./rule');

/**
 * Mocker
 *
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.dbPath = dbPath;
  this.db = low(this.dbPath);
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
    //return !item.disabled && namespaces.indexOf(item.namespace)==-1;
    return namespaces.indexOf(item.namespace)==-1;
  }).map(function(item){
    //create middleware
    //var handler = Handler.get(item);
    //var method = item.method || 'ALL';
    //var path = '/' + item.namespace + '/' + item.path;
    //return [method.toLowerCase(), path, handler];
    return new Rule(item);
  });
  return middlewares.value();
};
