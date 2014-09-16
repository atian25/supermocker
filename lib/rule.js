exports = module.exports = Rule;
var Handler = require('./handler');

/**
 * Rule class define
 *
 * @class Rule
 * 
 * @property {String} fullPath The full mapping path for route mapping
 * @property {Function} handler The middleware handler for route mapping
 *
 * @property {String} path The mapping path
 * @property {String} namespace The prefix mapping path
 * @property {String} method The mapping method
 * @property {Boolean} [disabled] Whether mapping this rule
 * @property {Number} [delay] Delay return, ms
 * @property {String} [description] The rule description
 *
 * @property {String} type The rule type:
 *  - static: return static data/header/status
 *  - mockjs: return data build by mockjs
 *  - redirect: proxy to other server
 *  - custom: using your custom logic
 *  - echo: just echo rule & req info
 *
 * @property {Array} [headers] The response headers: [{key: '', value: '', disabled: false }, ...]
 * @property {Number} [statusCode] The response statusCode
 * @property {String} [data] The stringify object string, pure object or mockjs template
 * @property {String} [redirectUrl] The proxy server url
 * @property {Array} [additionalRequestHeaders] The additional headers to request for redirect type: [{key: '', value: '', disabled: false }, ...]
 * @property {String} [fn] The handler function body, must not have function define header.
 */
function Rule(obj){
  var self = this;
  for(var key in obj){
    if(obj.hasOwnProperty(key)){
      self[key] = obj[key];
    }
  }
  this.fullPath = (this.namespace ? ('/' + this.namespace) : '') + '/' + this.path;
  this.handler = Handler.get(this);
  this.method = (this.method || 'ALL').toLowerCase();
}


