const { get_by_id } = require("../../services/contract_services")

const contract_created_msg = async (data)=>{
  const contract = await get_by_id(data.contract_id)
  const roll = (contract.producer == data.auth_id)
      ? 'producer' 
      : 'consumer',
    msg =  {
      email: data.user_email,
      html: '<b>DETAILS</b>'+
            '<br>'+
            '<b>My roll: </b><t>'+roll+'</t>'+
            '<br>'+
            '<b>Status: </b><t>'+contract.status+'</t>'+
            '<b>Commodity estimated for: </b><t>'+contract.estimated_for+'</t>'+
            '<b>This contract was created on: </b><t>'+contract.create_at+'</t>',
            
      subject: 'New contract creacted'
    }
  return msg
}

module.exports = {
  contract_created_msg
}