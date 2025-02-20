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

    const applicationDeploymentPriceUsed = _.find(doc["utilityFunctions"],(f)=>{
      return _.find(f['functionExpressionVariables'],(v) => {
        return v['valueVariable'] === 'application_deployment_price'
      })
    })

    if(applicationDeploymentPriceUsed){

      object['variables'].push({
        'key': 'application_deployment_price',
        'path': '',
        'type': 'float',
        'meaning': 'price',
        'value' :{
          "lower_bound": 0,
          "higher_bound": 0,
        }
      })
    }

    object['sloViolations'] = JSON.parse(doc['sloViolations'])
    object['metrics'] = _.map(doc['metrics'], (v)=>{

      if(v['type'] === 'composite'){
        v['arguments'] = mathutils.extractVariableNames(
            mathutils.extractFromEquation(v['formula']))
      }

      return v
    })

    object["utilityFunctions"] = _.map(doc['utilityFunctions'], (v)=>{
      const f = {
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

      if(v['functionType'] === 'constraint'){
        f['operator'] = v['functionConstraintOperator']
      }

      if(v['functionType'] === 'maximize' || v['functionType'] === 'minimize'){
        f['selected'] = v['selected'];
      }

      return f

    })

    object["resources"] = _.map(doc['resources'], (v)=>{
      return {
        "title": v['title'],
        "uuid": v['uuid'],
        "platform": v['platform'],
        "enabled": v['enabled'],
        "regions": v['_regions'],
        "valid_instance_types": v['_valid_instance_types'] || [],
      }
    })

    var protected_variables = ["_id","type",,"metaType","organization","_edit","_publish"]
    _.each(protected_variables, (p)=>{
      delete object[p]
    })

    return object
  }
}