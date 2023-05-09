const aws = require('aws-sdk'),
  dynamodb = new aws.DynamoDB.DocumentClient(),
  {sort} = require('../utils/sort_data'),
  { delete_by_deleted_contract } = require('./commodities_in_contracts_sevices')


//CREATE-----------------------------------------------------------------------
const create = async (data) =>{ 
  await dynamodb.put({
    //el nombre de la tabla a la que metera la data
    TableName:'contracts',
    Item: data
  }).promise() //para que funcione el await
}

//-----------------------------------------------------------------------------
const coincidences_by_all = async (filter_value,order,order_by) => {
  //si el valor puede ser una fecha entonces lo pasamos a fecha, si no no
  const data_value = (filter_value
    .match(/^([0-2][0-9]|3[0-1])(\/|-)(0[1-9]|1[0-2])\2(\d{4})$/)
  )  
    //convertimos a un date y luego a strig como en dynamodb
    ? new Date(
        filter_value.split('/').reverse().join('/')
      ).toISOString()
    //si no pues le dejamos el valor normal de una cadena
    : filter_value 

  const params = {
    TableName:'contracts',
    //alias al atributo de la tabla
    ExpressionAttributeNames: {
      '#id': 'id',
      '#producer': 'producer',
      '#consumer':'consumer',
      '#arrival_address': 'arrival_address',
      '#estimated_for': 'estimated_for',
      '#deleted_at':'deleted_at'
    },
    //alias del valor
    ExpressionAttributeValues: {
      ':fvalue': filter_value,
      ':dvalue': data_value
    },
    FilterExpression: '('+
        'contains(#id,:fvalue) or '+
        'contains(#producer,:fvalue) or '+
        'contains(#consumer,:fvalue) or '+
        'contains(#arrival_address,:fvalue) or '+
        'contains(#estimated_for,:dvalue)'+
      ') and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()
  return sort(coincidences.Items,order,order_by)
}


//-----------------------------------------------------------------------------
const coincidences_by_producer = async (filter_value) => {
  const params = {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#producer': 'producer',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#producer,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const coincidences_by_status = async (filter_value) => {
  const params = {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#status,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const coincidences_by_consumer = async (filter_value) => {
  const params = {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#consumer': 'consumer',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#consumer,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const coincidences_by_arrival_address = async (filter_value) => {
  const params = {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#arrival_address': 'arrival_address',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': filter_value
    },
    FilterExpression: 'contains(#arrival_address,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()  
  return sort(coincidences.Items,order,order_by)
}


//-----------------------------------------------------------------------------
const coincidences_by_estimated_for = async (filter_value) => {
  //si el valor puede ser una fecha entonces lo pasamos a fecha, si no no
  const data_value = (filter_value
    .match(/^([0-2][0-9]|3[0-1])(\/|-)(0[1-9]|1[0-2])\2(\d{4})$/)
  )  
    //convertimos a un date y luego a strig como en dynamodb
    ? new Date(
        filter_value.split('/').reverse().join('/')
      ).toISOString()
    //si no pues le dejamos el valor normal de una cadena
    : filter_value 


  const params = {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#estimated_for': 'estimated_for',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':fvalue': data_value
    },
    FilterExpression: 'contains(#estimated_for,:fvalue) and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  },
    coincidences = await dynamodb.scan(params).promise()
  return sort(coincidences.Items,order,order_by)
}

//-----------------------------------------------------------------------------
const get_by_id = async (contract_id) =>{
  const params =  {
    TableName:'contracts',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#deleted_at':'deleted_at'
    },
    ExpressionAttributeValues: {
      ':value': contract_id
    },
    FilterExpression: '#id = :value and '+
      'attribute_not_exists(#deleted_at)' //que sea null
  }
  const coincidence = await dynamodb.scan(params).promise()
  return coincidence.Items[0]
}

//-----------------------------------------------------------------------------
const update = async (contract_id, new_data) =>{
  //OJO queda asi params 
  /*
    const params = {
      TableName: 'contracts',
      Key: {
        id: contract_id,
      },
      UpdateExpression: 'set #producer = :producer ,'+
        ' #consumer = :consumer ,'+
        ' #status = :status ,'+
        ' #arrival_address = :arrival_address ,'+
        ' #estimated_for = :estimated_for',
      ExpressionAttributeNames: {
        '#producer': 'producer',
        '#consumer': 'consumer',
        '#status': 'status',
        '#arrival_address': 'arrival_address',
        '#estimated_for': 'estimated_for'
      },
      ExpressionAttributeValues: {
        ':producer': new_data.producer,
        ':consumer': new_data.consumer,
        ':status': new_data.status,
        ':arrival_address': new_data.arrival_address,
        ':estimated_for': new_data.estimated_for
      }
    };
  */
  
  //pero aqui lo hacemos dinamicamente
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
    TableName: 'contracts',
    Key: {
      id: contract_id
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  };
  return await dynamodb.update(params).promise()
}


//-----------------------------------------------------------------------------
const delete_contract = async(contract_id)=>{
  const params = {
    TableName: 'contracts',
    Key: {
     id: contract_id,
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

  //eliminamos commodities que estaban en este contrato
  await delete_by_deleted_contract(contract_id)
}







module.exports = {
  create,
  get_by_id,
  coincidences_by_all, 
  coincidences_by_producer,
  coincidences_by_consumer,
  coincidences_by_arrival_address,
  coincidences_by_estimated_for,
  coincidences_by_status,
  update,
  delete_contract
}

