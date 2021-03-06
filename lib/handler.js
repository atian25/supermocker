var URL = require('url');
var request = require('superagent');
var mockjs = require('mockjs');
var logger = require('log4js').getLogger('supermocker:handler');

/**
 * provide handlers
 */
exports = module.exports = {
  echo: echoHandler,
  static: staticHandler,
  mockjs: staticHandler,
  redirect: redirectHandler,
  custom: customHandler,
  get: get
};

//TODO: change console to DEBUG
//TODO: log to some place for online log view
//TODO: support path pattern && replace data && change url

/**
 * get handler by rule
 *
 * @param {Object} rule The rule item
 * @param {String} rule.type The rule type
 * @param {Boolean} rule.disabled Whether the rule is disabled
 * @param {Number} [rule.delay] Whether delay callback
 * @returns {Function} Returns handler
 */
function get(rule){
  return function(req, res, next) {
    if(rule.disabled){
      next();
    }else{
      req.rule = rule;
      var fn = exports[rule.type] || exports['echo'];
      logger.debug('process rule: %s, %s', rule.type, rule.path);
      if(!rule.delay){
        fn(req, res, next, rule);
      }else{
        setTimeout(function(){
          fn(req, res, next, rule);
        }, rule.delay);
      }
    }
  };
}

/**
 * provide static/mockjs handler
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @param {Object|Rule} rule The rule item
 * @param {Number} [rule.statusCode] Response's statusCode
 * @param {Array} [rule.headers] Response headers, [{key: '', value: '', disable: false}, ...]
 * @param {String} [rule.data]  Stringify object string, should be parse as pure object data or mockjs template defined.
 * @params {Function} next If rule.data is undefined , then call next()
 */
function staticHandler(req, res, next, rule){
  //状态码
  res.status(rule.statusCode || 200);

  //头信息
  if (rule.headers) {
    rule.headers.forEach(function (item) {
      if(!item.disabled) {
        res.header(item.key, item.value);
      }
    });
  }

  //数据
  if (rule.data) {
    var data = JSON.parse(rule.data);
    //TODO: support xml/text/json
    if (rule.type == 'mockjs') {
      data = mockjs.mock(data);
    }
    res.json(data);
  }else{
    next();
  }
}

/**
 * provide redirect handler
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @param {Object|Rule} rule The rule item
 * @param {String} rule.redirectUrl The redirectUrl
 * @param {Array} [rule.additionalRequestHeaders] additional headers to request, [{key: '', value: '', disabled: false}, ...]
 * @param {Number} [rule.statusCode] Response's statusCode
 * @param {Array} [rule.headers] response headers, [{key: '', value: '', disabled: false}, ...]
 */
function redirectHandler(req, res, next, rule){
  if(rule.redirectUrl) {
    var url = rule.redirectUrl;
    var subPath = req.params[0] || '';
    if(subPath){
      url = (url + '/').replace(/\/\/$/, '/') + subPath;
    }
    logger.debug('proxy request to: [%s] %s', req.method, url);

    //附加请求头信息
    var headers = req.headers;
    headers['proxy-agent'] = 'supermocker';
    headers['host'] = URL.parse(rule.redirectUrl).host;
    if (rule.additionalRequestHeaders) {
      rule.additionalRequestHeaders.forEach(function (item) {
        if(!item.disabled) {
          headers[item.key] = item.value;
        }
      });
    }

    request(req.method, url)
      .set(headers)
      .query(req.query)
      .send(req.body)
      .end(function(err, response){
        //fn(err, response, req, res, next, rule, require)
        if(err){
          next(err);
        }else {
          res.status(rule.statusCode || response.statusCode);
          res.set(response.headers);
          if (rule.headers) {
            rule.headers.forEach(function (item) {
              if (!item.disabled) {
                res.header(item.key, item.value);
              }
            });
          }
          if (response.text) {
            res.end(response.text);
          } else {
            req.agentResponse = response;
            next();
          }
        }
      });
  }else{
    console.warn('proxy request missing redirectUrl: %j', rule);
    next();
  }
}

/**
 * provide custom handler
 *
 * @param {Object|Rule} rule The rule item
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @param {String} rule.fn The handler function body, must not have function define header.
 */
function customHandler(req, res, next, rule){
  if(rule.fn){
    var handler;
    try {
      handler = new Function('req', 'res', 'next', 'require', 'handler', rule.fn);
      handler(req, res, next, require, exports);
    }catch(e){
      console.warn('proxy custom handler error: ' +  rule.fn);
      next(e);
    }
  }else{
    console.warn('proxy custom handler missing fn: %j', rule);
    next();
  }
}

/**
 * provide echo handler
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @param {Object|Rule} rule The rule item
 */
function echoHandler(req, res, next, rule){
  var json = {
    rule: rule,
    req: {
      url: req.url,
      method: req.method,
      headers: req.headers,
      qs: req.query,
      json: req.body
    }
  };
  res.json(json);
}