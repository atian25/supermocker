exports = module.exports = Mocker;
exports.Rule = require('./rule');
exports.Handler = require('./handler');

var low = require('./low-patch');
var _ = require('lodash');
var Rule = exports.Rule;
var logger = require('log4js').getLogger('supermocker');

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

  //this.router = express.Router();
  //this.spaceRouters = {
  //  key: express.Router()
  //}
}

/**
 * list all spaces
 * @returns {Array} Returns all spaces
 */
Mocker.prototype.listSpace = function(){
  return this.spaces.value();
};

Mocker.prototype.addSpace = function(path, description){
  if(!path) {
    logger.warn('addSpace, path is null');
    return null;
  }else {
    var space = this.spaces.find({path: path}).value();
    if (space) {
      logger.warn('space path is exist: %s at space: %j', path, space);
      return null;
    } else {
      var doc = this.spaces.insert({
        path: path,
        description: description,
        groupIds: []
      }).value();
      //TODO: mapping to router
      //self.refreshSpace(doc);
      return doc;
    }
  }
};

/**
 * update or insert space
 * @param {Object} attr The space, groupIds is not allow to change
 * @returns {Object} Returns new space item, if path exist, will return null
 */
Mocker.prototype.updateSpace = function(attr){
  if(!attr || !attr.id || !attr.path){
    logger.warn('updateSpace, invaid input: %j', attr);
    return null;
  }else{
    //space's path is not allow to duplicate
    var space = this.spaces.find({path: attr.path}).value();
    if(space && space.id != attr.id){
      logger.warn('space path is exist: %s at space: %j', attr.path, space);
      return null;
    }else{
      space = this.spaces.get(attr.id).value();
      //not allow to change groupIds
      if(attr.groupIds && _.xor(space.groupIds, attr.groupIds).length > 0){
        logger.warn('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, space.groupIds, attr.groupIds);
      }
      delete attr.groupIds;
      return this.spaces.update(attr.id, attr).value();
    }
  }
};

/**
 * remove space item && own groups && own rules
 * @param {String} id The space's id
 * @returns {Object} Returns removed space
 */
Mocker.prototype.removeSpace = function(id){
  var self = this;
  var doc = this.spaces.remove(id).value();
  if(doc && doc.groupIds){
    doc.groupIds.forEach(function(groupId){
      var group = self.groups.remove(groupId);
      if(group && group.ruleIds){
        group.ruleIds.forEach(function(ruleId){
          self.rules.remove(ruleId);
        });
      }
    });
  }
  logger.debug('removeSpace : %j and its groups/rules', doc);
  return doc;
};

/**
 * get space detail, {space: {}, groups: [], rules:[]}
 * @param {String} id The space id
 * @returns {Object} Return space detail
 */
Mocker.prototype.getSpace = function(id){
  var self = this;
  var result = {};
  var space = this.spaces.get(id).value();
  if(space){
    result.space = space;
    result.groups = space.groupIds.map(function(groupId){
      return self.groups.get(groupId).value();
    });
    space.rules = result.groups.map(function(group){
      var ruleIds = group.ruleIds;
      return self.rules.filter(function(item){
        return ruleIds.indexOf(item.id) !== -1;
      }).value();
    });
  }
  return result;
};

Mocker.prototype.addGroup = function(spaceId, name, index){
  var space = this.spaces.get(spaceId).value();
  if (!space) {
    logger.warn('space#%d not exist', spaceId);
    return null;
  } else if(!name) {
    logger.warn('addGroup, name is not allow to be null');
    return null;
  }else {
    var group = this.groups.insert({
      name: name,
      ruleIds: []
    }).value();
    //update space's groupId
    if(index === undefined){
      index = space.groupIds.length;
    }
    space.groupIds.splice(index, 0, group.id);

    logger.debug('addGroup : %j to space#%s', group, space.path);
    //TODO: mapping to router
    //self.refreshSpace(doc);
    return group;
  }
};

Mocker.prototype.updateGroup = function(attr){
  if(!attr || !attr.id || !attr.name){
    logger.warn('updateGroup, invaid input: %j', attr);
    return null;
  }else{
    var group = this.groups.get(attr.id);
    if(!group){
      logger.warn('group not found: %j', attr);
      return null;
    }else{
      //not allow to change ruleIds
      if (_.xor(group.ruleIds, attr.ruleIds).length > 0) {
        logger.warn('group#%d\'s ruleIds is not allow to change: %j -> %j', group.id, group.ruleIds, attr.ruleIds);
      }
      delete attr.ruleIds;
      //update
      var doc = this.groups.update(attr.id, attr).value();
      logger.debug('updateGroup : %j', doc);
      return doc;
    }
  }
};

Mocker.prototype.removeGroup = function(id, spaceId){
  var self = this;
  var group = this.groups.remove(id).value();
  if(group){
    //remove mapping from space
    var space = this.spaces.get(spaceId).value();
    if(space){
      _.remove(space.groupIds, group.id);
      this.spaces.update(space.id, space);
    }
    //remove own rules
    if(group.ruleIds) {
      group.ruleIds.forEach(function (ruleId) {
        self.rules.remove(ruleId);
      });
    }
  }
  logger.debug('removeGroup : %j and its rules', group);
  return group;
};

Mocker.prototype.sortGroup = function(spaceId, groupIds){
  var space = this.spaces.get(spaceId);
  if(!space){
    logger.warn('space#%d not exist: %s ', spaceId);
  }else if( _.xor(space.groupIds, groupIds).length > 0){
    //not allow to change groupIds
    logger.warn('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, space.groupIds, groupIds);
  }else{
    logger.debug('sort space#%d\'s groupIds: %j ', space.id, groupIds);
    return this.spaces.updateWhere({id: spaceId}, {groupIds: groupIds}).value();
  }
};

Mocker.prototype.addRule = function(groupId, attr, index){
  var group = this.groups.get(groupId).value();
  if (!group) {
    logger.warn('group#%d not exist', groupId);
    return null;
  } else if(!attr.path){
    logger.warn('addRule, attr is not valid: %j', attr);
    return null;
  }else {
    attr.type = attr.type || 'static';
    attr.method = (attr.method || 'ALL').toLowerCase();
    var rule = this.rules.insert(attr).value();

    //update group's ruleIds
    if(index === undefined){
      index = group.ruleIds.length;
    }
    group.ruleIds.splice(index, 0, rule.id);

    logger.debug('addRule : %j to group#%s', rule, group.id);
    //TODO: mapping to router
    //self.refreshSpace(doc);
    return rule;
  }
};

/**
 * update or insert rule
 * @param {Object} attr The rule
 * @returns {Object} Returns new rule item
 */
Mocker.prototype.updateRule = function(attr){
  if(!attr || !attr.id){
    logger.warn('updateRule, invaid input: %j', attr);
    return null;
  }else {
    attr.method = (attr.method || 'ALL').toLowerCase();
    logger.debug('updateRule : %j', attr);
    return this.rules.update(attr.id, attr).value();
  }
};

/**
 * remove rule item
 * @param {String} id The rule's id
 * @param {String} groupId The group's id
 * @returns {Object} Returns removed rule
 */
Mocker.prototype.removeRule = function(id, groupId){
  var rule = this.rules.remove(id).value();
  if(rule) {
    var group = this.groups.get(groupId);
    if (group) {
      _.remove(group.ruleIds, rule.id);
      this.groups.update(group.id, group);
    }
  }
  logger.debug('removeRule : %j', rule);
  return rule;
};

Mocker.prototype.sortRule = function(groupId, ruleIds){
  var group = this.groups.get(groupId).value();
  if (!group) {
    logger.warn('group#%d not exist', groupId);
    return null;
  }else if( _.xor(group.ruleIds, ruleIds).length > 0){
    //not allow to change groupIds
    logger.warn('group#%d\'s ruleIds is not allow to change: %j -> %j', group.id, group.ruleIds, ruleIds);
  }else{
    logger.debug('sort group#%d\'s ruleIds: %j ', group.id, ruleIds);
    return this.groups.updateWhere({id: groupId}, {ruleIds: ruleIds}).value();
  }
};

/**
 * return available middlewares (rule's namespace is enable)
 * @returns {Array<Rule>} Returns rules, can use method, fullPath, handler for route mapping
 */
Mocker.prototype.getMiddlewares = function(){
  //find disabled namespaces name, namespace defined: {name: '', disable: false}
  var namespaces = this.namespaces.filter('disabled').pluck('name').value();
  var middlewares = this.rules.filter(function(item){
    //filter disabled rule/namespace
    //return !item.disabled && namespaces.indexOf(item.namespace)==-1;
    return namespaces.indexOf(item.namespace) == -1;
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
