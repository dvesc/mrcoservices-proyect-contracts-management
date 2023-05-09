const aws = require('aws-sdk'),
  dynamodb = new aws.DynamoDB.DocumentClient(),
  {sort} = require('../utils/sort_data')





//CREATE-----------------------------------------------------------------------
const create = async (data) =>{
  console.log(data.id)
  await dynamodb.put({
    TableName:'commodities-in-contracts',
    Item: data
  }).promise() //para que funcione el await
}





//-----------------------------------------------------------------------------
const coincidences_by_unit = async (filter_value) => {
  const params = {
    TableName:'commodities-in-contracts',
    ExpressionAttributeNames: {
      '#unit': 'unit',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#unit,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}





//-----------------------------------------------------------------------------
const coincidences_by_all = async (filter_value,order,order_by) => {
  const params = {
    TableName:'commodities-in-contracts',
    //alias al atributo de la tabla
    ExpressionAttributeNames: {
      '#id': 'id',
      '#contract': 'contract',
      '#commodity':'commodity',
      '#unit': 'unit',
      '#amount': 'amount',
      '#deleted_at':'deleted_at'
    },
    //alias del valor
    ExpressionAttributeValues: {
      ':fvalue': filter_value,
    },
    FilterExpression: '('+
        'contains(#id,:fvalue) or '+
        'contains(#contract,:fvalue) or '+
        'contains(#commodity,:fvalue) or '+
        'contains(#unit,:fvalue) or '+
        'contains(#amount,:fvalue)'+
      ') and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()
  return sort(coincidences.Items,order,order_by)
}






//-----------------------------------------------------------------------------
const coincidences_by_contract = async (filter_value,order,order_by) => {
  const params = {
    TableName:'commodities-in-contracts',
    ExpressionAttributeNames: {
      '#contract': 'contract',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#contract,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const coincidences_by_commodity = async (filter_value,order,order_by) => {
  const params = {
    TableName:'commodities-in-contracts',
    ExpressionAttributeNames: {
      '#commodity': 'commodity',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#commodity,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const coincidences_by_amount = async (filter_value,order,order_by) => {
  const params = {
    TableName:'commodities-in-contracts',
    ExpressionAttributeNames: {
      '#amount': 'amount',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#amount,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}








//-----------------------------------------------------------------------------
const get_by_id = async (id) =>{
  const params =  {
    TableName:'commodities-in-contracts',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':value': id
    },
    FilterExpression: '#id = :value and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  }
  const coincidence = await dynamodb.scan(params).promise()
  return coincidence.Items[0]
}






//-----------------------------------------------------------------------------
const update = async (id, new_data) =>{
  //explico esto bien a detalle en contracts services
  let updateExpression='set';
  let ExpressionAttributeNames={};
  let ExpressionAttributeValues = {};

  //por cada propiedad dentro de new data
  for (const property in new_data) {
    //asignamos los valores de los atributos del update
    updateExpression += ` #${property} = :${property} ,`;
    ExpressionAttributeNames['#'+property] = property ;
    ExpressionAttributeValues[':'+property]= new_data[property];
  }
  //por el for al final queda con una ',' entonces se la quitamos
  updateExpression= updateExpression.slice(0, -1); 
  
  const params = {
    TableName: 'commodities-in-contracts',
    Key: {
      id: id
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  };
  return await dynamodb.update(params).promise()
}





//-----------------------------------------------------------------------------
const delete_commodity = async(id)=>{
  const params = {
    TableName: 'commodities-in-contracts',
    Key: {
     id: id,
    },
    UpdateExpression:'set #deleted_at = :deleted_at',
    ExpressionAttributeNames: {
      '#deleted_at': 'deleted_at',
    },
    ExpressionAttributeValues: {
      ':deleted_at': new Date().toISOString()
    }
  }
  await dynamodb.update(params).promise()
}

//-----------------------------------------------------------------------------
const delete_by_deleted_contract = async(contract_id)=>{
  const commodities_in_deleted_contract = 
    await coincidences_by_contract(contract_id, true,'created_at' )
  
  //eliminamos todas las commodities que estaban en el contrato
  for (const commodity of commodities_in_deleted_contract) {
    await delete_commodity(commodity.id)
  }  
}








module.exports = {
  create,
  coincidences_by_unit,
  coincidences_by_all,
  coincidences_by_contract,
  coincidences_by_commodity,
  coincidences_by_amount,
  get_by_id,
  update,
  delete_commodity,
  delete_by_deleted_contract
}