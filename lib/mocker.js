exports = module.exports = Mocker;

var util = require('util');
var low = require('./low-patch');
var express = require('express');
var _ = require('lodash');
var logger = require('log4js').getLogger('supermocker');
var admin = require('./router');

var Handler = exports.Handler = require('./handler');

/**
 * Mocker
 *
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.dbPath = dbPath;
  this.db = low(this.dbPath);
  this.spaces = this.db('spaces');
  this.groups = this.db('groups');
  this.rules = this.db('rules');
  this.router = express.Router();
  this.admin = admin(this);
  this.refreshRouter();
}

/**
 * Rule class define
 *
 * @class Rule
 *
 * @property {String} path The mapping path
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

/**
 * remount router
 *
 * @param {String} [id] The space id, if provide will only refresh special space's router
 */
Mocker.prototype.refreshRouter = function(){} || _.debounce(function(id){
  var self = this;
  var targetSpaces;

  //check if only update special space
  var space = self.spaces.get(id).value();
  if(space){
    targetSpaces = [space];
  }else{
    self.router.stack = [];
    targetSpaces = self.spaces.value();
  }

  //refresh router
  targetSpaces.forEach(function(space){
    var spaceRouter = express.Router();
    self.router.use('/' + space.path, spaceRouter);
    //mapping rules
    var detail = self.getSpaceDetail(space.id);
    if(detail && detail.rules) {
      detail.rules.forEach(function(group){
        var groupRouter = express.Router();
        spaceRouter.use(groupRouter);
        group.forEach(function(rule){
          var handler = Handler.get(rule);
          handler.name = rule.id;
          groupRouter[rule.method.toLowerCase()]('/' + rule.path, handler);
          //console.log('/' + space.path + '/' + rule.path, rule.method)
        });
      });
    }
  });
  logger.debug('refreshRouter');
}, 100);

/**
 * list all spaces
 * @returns {Array} Returns all spaces
 */
Mocker.prototype.listSpace = function(){
  return this.spaces.value();
};

/**
 * get space
 * @param {String} id The space id
 * @returns {Object} Return space detail
 */
Mocker.prototype.getSpace = function(id){
  var doc = this.spaces.get(id).value();
  return doc;
};

/**
 * insert or update space
 *
 * @param {Object} attr The space, `path` is not allow to duplicate, `groups` is not allow to modify
 * @returns {Object} Returns new space item, if path exist, will return `Error`
 */
Mocker.prototype.updateSpace = function(attr){
  if(!attr || !attr.path){
    return new Error(util.format('updateSpace, illegal param: %j', attr));
  }else{
    //space's path is not allow to duplicate
    attr.path = attr.path.replace(/^\/+/, '');
    var space = this.spaces.find({path: attr.path}).value();
    if(space && (!attr.id || space.id != attr.id)){
      return new Error(util.format('space path is exist: %s at space: %j', attr.path, space));
    }else{
      space = this.getSpace(attr.id);
      // groups is not allow to update, just use `updateGroup`
      if(space){
        attr.groups = space.groups;
      }else{
        attr.groups = [];
      }
      var doc = this.spaces.insertOrUpdate(attr, true).value();
      logger.debug('updateSpace: %j', doc);
      this.refreshRouter(doc.id);
      return doc;
    }
  }
};

/**
 * remove space item && own groups && own rules
 *
 * @param {String} id The space's id
 * @returns {Object} Returns removed space
 */
Mocker.prototype.removeSpace = function(id){
  var self = this;
  var doc = this.spaces.remove(id).value();
  logger.debug('removeSpace: %j', doc);
  //mapping to router
  self.refreshRouter(doc.id);
  return doc;
};

/**
 * sort space's groups
 *
 * @param {String} spaceId The space id
 * @param {Array} groupIds The new groupIds, if not equal will fail
 * @returns {Object} Returns the modified space
 */
Mocker.prototype.sortGroup = function(spaceId, groupIds){
  var space = this.spaces.get(spaceId).value();
  if(!space){
    return new Error(util.format('space#%d not exist: %s ', spaceId));
  }else{
    var currentGroupIds = _.pluck(space.groups, 'id');
    if( _.xor(currentGroupIds, groupIds).length > 0){
      //not allow to change groupIds
      return new Error(util.format('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, currentGroupIds, groupIds));
    }else{
      logger.debug('sort space#%d\'s groups: %j -> %j ', space.id, currentGroupIds, groupIds);
      var groups = groupIds.map(function(groupId){
        return _.find(space.groups, function(group){return group.id === groupId});
      });
      space.groups = groups;
      var doc = this.spaces.update(spaceId, space).value();
      //mapping to router
      this.refreshRouter(spaceId);
      return doc;
    }
  }
};

Mocker.prototype.getGroup = function(spaceId, groupId){
  var space = this.getSpace(spaceId);
  if(space){
    return _.chain(space.groups).get(groupId).value();
  }
};

/**
 * insert or update group
 *
 * @param {String} spaceId The space's id
 * @param {Object} attr The group item, name is not allow to undefined
 * @returns {Rule/Error} Returns modified group or Error when not found
 */
Mocker.prototype.updateGroup = function(spaceId, attr){
  if(!attr || !attr.name){
    return new Error(util.format('updateGroup, illegal param: %j', attr));
  }else{
    var space = this.getSpace(spaceId);
    if(!space){
      return new Error(util.format('space#%d not exist: %s ', spaceId));
    }else{
      var group = this.getGroup(spaceId, attr.id);
      // groups is not allow to update, just use `updateGroup`
      if(group){
        attr.rules = group.rules;
      }else{
        attr.rules = [];
      }
      var doc = _.chain(space.groups).insertOrUpdate(attr, true).value();
      logger.debug('[updateGroup] %j', doc);
      this.refreshRouter();
      return doc;
    }
  }
};

/**
 * remove group itemthis.getGroup('1', '1')
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @returns {Object/Error} Returns removed group or Error when not found
 */
Mocker.prototype.removeGroup = function(spaceId, groupId){
  var space = this.getSpace(spaceId);
  if(!space){
    return this.errorHandler('[removeGroup] space#%s not exist.', spaceId);
  }else{
    var doc = _.chain(space.groups).remove(groupId).value();
    logger.debug('[removeGroup] %j', doc);
    //mapping to router
    this.refreshRouter(spaceId);
    return doc;
  }
};

/**
 * sort group's rules
 *
 * @param {String} groupId The group id
 * @param {Array} ruleIds The new ruleIds, if not equal will fail
 * @returns {Object} Returns the modified group
 */
Mocker.prototype.sortRule = function(spaceId, groupId, ruleIds){
  var group = this.getGroup(spaceId, groupId);
  if(!group){
    return this.errorHandler('[sortRule] space#%s.group#%s not exist.', spaceId, groupId);
  }else{
    var currentRuleIds = _.pluck(group.rules, 'id');
    if( _.xor(currentRuleIds, ruleIds).length > 0){
      //not allow to change ruleIds
      return this.errorHandler('[sortRule] space#%s.group#%s\'s ruleIds is not allow to change: %j -> %j.', spaceId, groupId, currentRuleIds, ruleIds);
    }else{
      logger.debug('[sortRule] space#%s.group#%s: %j -> %j ', spaceId, groupId, currentRuleIds, ruleIds);
      var rulesChain = _.chain(group.rules);
      var rules = ruleIds.map(function(ruleId){
        return rulesChain.get(ruleId).value();
      });
      group.rules = rules;
      this.spaces.save();
      //mapping to router
      this.refreshRouter(spaceId);
      return group;
    }
  }
};

Mocker.prototype.getRule = function(spaceId, groupId, ruleId){
  var group = this.getGroup(spaceId, groupId);
  if(group){
    return _.chain(group.rules).get(ruleId).value();
  }
};

/**
 * insert or update rule
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @param {Object} attr The rule item, path is not allow to undefined
 * @returns {Rule/Error} Returns modified rule or Error when not found
 */
Mocker.prototype.updateRule = function(spaceId, groupId, attr){
  if(!attr || !attr.path){
    return this.errorHandler('[updateRule] illegal param: %j.', attr);
  }else{
    var group = this.getGroup(spaceId, groupId);
    if(!group){
      return this.errorHandler('[removeRule] space#%s.group#%s not exist.', spaceId, groupId);
    }else {
      attr.path = attr.path.replace(/^\/+/, '');
      attr.method = (attr.method || 'ALL').toUpperCase();
      group.rules = group.rules || [];
      var doc = _.chain(group.rules).insertOrUpdate(attr, true).value();
      logger.debug('[updateRule] %j', doc);
      this.refreshRouter();
      return doc;
    }
  }
};

/**
 * remove rule item
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @param {String} ruleId The rule's id
 * @returns {Rule/Error} Returns removed rule or Error when not found
 */
Mocker.prototype.removeRule = function(spaceId, groupId, ruleId){
  var group = this.getGroup(spaceId, groupId);
  if(!group){
    return this.errorHandler('[removeRule] space#%s.group#%s not exist.', spaceId, groupId);
  }else{
    var doc = _.chain(group.rules).remove(ruleId).value();
    logger.debug('[removeRule] %j', doc);
    //mapping to router
    this.refreshRouter(spaceId);
    return doc;
  }
};


Mocker.prototype.errorHandler = function(msg, args){
  var output = util.format(msg, arguments.slice(1));
  return new Error(output);
};
