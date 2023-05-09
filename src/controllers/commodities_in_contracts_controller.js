'use strict';
const {v4} = require('uuid')
const aws = require('aws-sdk')
const { paginated_data } = require('../utils/pagination')
const { create,
  coincidences_by_all,
  coincidences_by_amount,
  coincidences_by_commodity,
  coincidences_by_contract,
  coincidences_by_unit, 
  get_by_id,
  update} = require('../services/commodities_in_contracts_sevices')


//-----------------------------------------------------------------------------
const add_commodity = async (event) => {
  //generemos el id (dynamodb no lo hace)
  const id = v4()
  let {contract_id,
    commodity_id,
    amount,
    unit,
  }= JSON.parse(event["body"])

  const added_commodity = {
    id,
    contract: contract_id,
    commodity: commodity_id,
    amount: parseInt(amount),
    unit: unit.toLowerCase(), 
    create_at: new Date().toISOString(),
    update_at: new Date().toISOString(),
    delete_at: null
  }

  await create(added_commodity)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `commodity has been adding succsesfuly`,
      data: added_commodity
    },null,2),
  };

}


//-----------------------------------------------------------------------------
const get_commodites_in_contracts = async (event) =>{
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
      /id|created_at|commodity|contract|amount/
    )) 
      ? query_params.orderby : 'created_at'
  else 
    order_by = 'created_at'
  

  let data = []
  switch (filter_by) {
    case 'all':
      data = await coincidences_by_all (filter_value, order,order_by)
      break;
    case 'commodity':
      data = await coincidences_by_commodity(filter_value,order,order_by)
    break;
    case 'contract':
      data = await coincidences_by_contract(filter_value,order,order_by)
    break;
    case 'amount':
      data = await coincidences_by_amount(filter_value,order,order_by)
    break;
    case 'unit':
      data = await coincidences_by_unit(filter_value,order,order_by)
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
const update_commodity= async (event) => { 
  const { id } = event.pathParameters,
    { contract, commodity, amount, unit } = JSON.parse(event["body"])
  
  //comprobar que la commoditie en contratos existe
  const old_commodity = await get_by_id(id)
  if(!old_commodity)
    console.log('GENERAR ERROR SI NO EXISTE')

  const new_data = {
    contract: contract || old_commodity.contract,
    commodity: commodity || old_commodity.commodity,
    amount: amount || old_commodity.amount,
    unit: unit || old_commodity.unit
  }

  const updated_commodity = await update(id,new_data)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `commodity updated succsesfuly`,
    },null,2),
  };

}

//-----------------------------------------------------------------------------
const delete_commodities = async (event) =>{
  const { id } = event.pathParameters

  //comprobar que la commoditie en contratos existe
  const old_commodity = await get_by_id(id)
  if(!old_commodity)
    console.log('GENERAR ERROR SI NO EXISTE')

  await delete_commodities(id)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `commodity deleted succsesfuly`,
    },null,2),
  };
}


module.exports = {
  add_commodity,
  update_commodity,
  get_commodites_in_contracts
}