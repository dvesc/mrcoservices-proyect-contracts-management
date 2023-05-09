'use strict';
const aws = require('aws-sdk');
const { send_msg_to_notification_mgmt } = require('../utils/AWS/sqs/sqs_publishers');
const { contract_created_msg } = require('../utils/messages/contract_created_msg');

const consume_from_contracts_mgmt = async (event) =>{
  //creamos el html de la data que nos dan
  let msg = await contract_created_msg(
    JSON.parse(event["Records"][0]["body"])
  )
  //enviamos el mensaje al mcroservicio de emails
  await send_msg_to_notification_mgmt(msg)
}

module.exports = {
  consume_from_contracts_mgmt
}

//OJO event ya es un objeto por si solo
  /* event es asi
   Records: [
     {
       x:x,
       x:x, 
       body: {x:x,x:x etc},
       x:x,   etc etc
      },
      {}, un msg
      {}, un msg
    ]
  */