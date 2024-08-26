const slugify = require("slugify");
const mathutils = require("./math");
const _ = require("lodash");

module.exports = {
  json: (doc) =>{
    let object = _.clone(doc)
    object['variables'] = _.map(doc['variables'], (v)=>{

      return {
        'key': slugify(v['name'].replaceAll('/','_'),'_'),
        'path': '/'+v['name'],
        'type': 'float',
        'meaning': v['name'].split('/').pop(),
        'value' :{
          "lower_bound": v['lowerValue'],
          "higher_bound": v['higherValue'],
        }
      }
    })
    object['sloViolations'] = JSON.parse(doc['sloViolations'])
    object['metrics'] = _.map(doc['metrics'], (v)=>{

      if(v['type'] === 'composite'){
        v['arguments'] = mathutils.extractVariableNames(
            mathutils.extractFromEquation(v['formula']))
      }

      return v
    })

    object["utilityFunctions"] = _.map(doc['utilityFunctions'], (v)=>{
      return {
        "name": v['functionName'],
        "type": v['functionType'],
        "expression":{
          "formula":v["functionExpression"],
          "variables": _.map(v["functionExpressionVariables"], (k)=>{
            return {
              "name":k['nameVariable'],
              "value": slugify(k['valueVariable'].replaceAll('/','_'),'_')
            }
          })
        }
      }
    })

    object["resources"] = _.map(doc['resources'], (v)=>{
      return {
        "title": v['title'],
        "uuid": v['uuid'],
        "platform": v['platform'],
        "enabled": v['enabled'],
        "regions": v['_regions']
      }
    })

    var protected_variables = ["_id","type",,"metaType","organization","_edit","_publish"]
    _.each(protected_variables, (p)=>{
      delete object[p]
    })

    return object
  }
}