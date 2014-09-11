var expect = require('chai').expect;
var low = require('../lib/low-patch');

describe('low-patch', function(){
  var db;
  beforeEach(function(){
    db = low()('db');
    var data = [{id:'1', name:'name1', type: 'static'}, {id:'3', name:'name3', type: 'static'}, {id:'2', name:'name2'}];
    db.push.apply(db, data);
  });

  it('should createId with increase number', function(){
    expect(db.createId().value()).to.equal('4');
  });

  it('should insert data', function(){
    var obj = {name: 'name4'};
    var nextId = db.createId().value();
    var doc = db.insertOrUpdate(obj).value();
    expect(doc.id).to.equal(nextId);
    expect(doc.name).to.equal(obj.name);
    expect(doc).to.deep.equal(db.get(nextId).value());
  });

  it('should update data', function(){
    var obj = {id: '3', name: 'name4', description: 'xx'};
    var doc = db.insertOrUpdate(obj).value();
    expect(doc.id).to.equal('3');
    expect(doc.name).to.equal(obj.name);
    expect(doc.description).to.equal(obj.description);
    expect(doc).to.deep.equal(db.get('3').value());
  });

  it('should replace data', function(){
    var obj = {id: '3', description: 'xx'};
    var doc = db.insertOrUpdate(obj, true).value();
    expect(doc.id).to.equal('3');
    expect(doc.name).to.be.undefined;
    expect(doc.description).to.equal(obj.description);
    expect(doc).to.deep.equal(db.get('3').value());
  });

  it('should query data', function(){
    expect(db.query({id: undefined, type: 'static'}).value().length).to.equal(2);
    expect(db.query({}).value().length).to.equal(3);
    expect(db.query().value().length).to.equal(3);
  });

  it('should reorder', function(){
    var list = db.reorder(['1', '2', '3']).value();
    var nameList = list.map(function(item){
      return item.name;
    });
    expect(list).to.deep.equal(db.value());
    expect(nameList).to.deep.equal(['name1', 'name2', 'name3']);
  });
});