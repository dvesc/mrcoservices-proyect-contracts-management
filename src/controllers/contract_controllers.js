'use strict';
const {v4} = require('uuid')
const aws = require('aws-sdk')
const { create, coincidences_by_all,
   coincidences_by_producer, 
   coincidences_by_consumer, 
   coincidences_by_arrival_address, 
   coincidences_by_estimated_for, 
   coincidences_by_status,
   update, get_by_id, delete_contract} = require('../services/contract_services')
const { paginated_data } = require('../utils/pagination');
const { send_msg_to_query_by_auth0_id, send_msg_to_notification_mgmt } = require('../utils/AWS/sqs/sqs_publishers');

//-----------------------------------------------------------------------------
const create_contract = async (event) => { 
  //generemos el id (dynamodb no lo hace)
  const id = v4()
  let {producer, 
    consumer, 
    commodities, 
    arrival_address, 
    estimated_for }= JSON.parse(event["body"])
  
  //convertimos la fecha estimada a un date real
  const estimated_date = new Date(
    estimated_for.split('/').reverse().join('/')
  )

  const new_contract = {
    id,
    status: 'created',
    producer,
    consumer,
    commodities,
    arrival_address,
    estimated_for: estimated_date.toISOString(), //en dynamo tenemos que guardar como string
    create_at: new Date().toISOString(),
    update_at: new Date().toISOString(),
    delete_at: null
  }

  await create(new_contract)

  //enviamos un email para el producer y el consumer que se creo un contrato
  //Usamos rabbitmq para comunicarnos con el otro mcroservicio de users
  send_msg_to_query_by_auth0_id ({
    auth0_id: consumer,
    contract_id: id,
  })
  send_msg_to_query_by_auth0_id ({
    auth0_id: producer,
    contract_id: id,
  })
  //esto generara una serie de procesos que terminara en el envio del correo

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `contract created succsesfuly`,
      data: new_contract
    },null,2),
  };
};


//-----------------------------------------------------------------------------
const get_contract = async (event) =>{
  //Asignamos valores por defecto
  const query_params = event.queryStringParameters || {},
    filter_by = (query_params.hasOwnProperty('filterby')) 
      ? query_params.filterby : 'all',

    filter_value = (query_params.hasOwnProperty('filtervalue')) 
      ? query_params.filtervalue : '',

    order = (!query_params.hasOwnProperty('order') ||
      query_params.order == 'desc')
        ? false : true  //true = ascending, false = descending
  let page, 
    size,
    order_by

  if (query_params.hasOwnProperty('page'))
    page = (!isNaN(query_params.page)) 
      ? parseInt(query_params.page) : 1
  else page = 1

  if (query_params.hasOwnProperty('size'))
    size = (!isNaN(query_params.size)) 
    ? parseInt(query_params.size) : 10
  else size = 10
  
  if (query_params.hasOwnProperty('orderby'))
    order_by = ((query_params.orderby).match(
      /id|producer|consumer|arrival_address|estimated_for/
    )) 
      ? query_params.orderby : 'created_at'
  else 
    order_by = 'created_at'
  

  let data = []
  switch (filter_by) {
    case 'all':
      data = await coincidences_by_all(filter_value, order,order_by)
      break;
    case 'producer':
      data = await coincidences_by_producer(filter_value,order)
    break;
    case 'consumer':
      data = await coincidences_by_consumer(filter_value,order)
    break;
    case 'arrival_address':
      data = await coincidences_by_arrival_address(filter_value,order)
    break;
    case 'estimated_for':
      data = await coincidences_by_estimated_for(filter_value,order)
    break;
    case 'status':
      data = await coincidences_by_status(filter_value,order)
    break;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      paginated_data(page,size,data,event)
    ,null,2),
  };
};


//-----------------------------------------------------------------------------
const update_contract = async (event) => { 
  const { contract_id } = event.pathParameters,
    {producer, consumer, status, 
    arrival_address, estimated_for} = JSON.parse(event["body"])
    
  //comprovamos que el contrato existe 
  const old_contract = await get_by_id(contract_id)
  if(!old_contract)
    console.log('GENERAR ERROR SI NO EXISTE')
  

  const new_data = {
      producer: producer || old_contract.producer,
      consumer: consumer || old_contract.consumer,
      status: status || old_contract.status,
      arrival_address: arrival_address || old_contract.arrival_address,
  }
  //le agregamos por separado estimared_for por la logica
  new_data['estimated_for'] = 
    estimated_for //si existe lo llevamos a date y luego a string
      ? new Date(estimated_for.split('/').reverse().join('/')).toISOString()
      : old_contract.estimated_for //si no toma el valor de que ya tenia
    
  const updated_contract = await update(contract_id, new_data)
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `contract updated succsesfuly`,
      data: updated_contract
    },null,2),
  };

}

//-----------------------------------------------------------------------------
const delete_contracts = async (event) => {
  //obtenmos de los parametros el id del contrato
  const { contract_id } = event.pathParameters
    
  //comprovamos que el contrato existe  
  const old_contract = await get_by_id(contract_id)
  if(!old_contract){
    console.log('GENERAR ERROR SI NO EXISTE')
  }

  await delete_contract(contract_id)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `contract deleted succsesfuly`,
    },null,2),
  };
}


module.exports = {
  create_contract,
  get_contract,
  update_contract,
  delete_contracts
}