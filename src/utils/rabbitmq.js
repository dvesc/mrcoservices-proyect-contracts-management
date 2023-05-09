const  amqp  = require("amqplib/callback_api"); //nos permitira reconectar
const { contract_created_msg } = require("./messages/contract_created_msg");
const offline_msg = []; //guarda los sms no enviados
let amqp_conn, 
  publisher_channel;

//CONECTARSE A RABBITMQ--------------------------------------------------------
const init_rabbitmq = async () => {
  //establecemos conexion con el contenedor de rabbit
  amqp.connect("amqp://localhost", (err, conn) => {
    //si existe un error intentaremos la reconecion con recursividad
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(init_rabbitmq, 1000);
    }
    //on establece listener cuando ocurren errores
    conn.on("error", (err) => {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] connection error:", err.message);
      }
    });
    //cuando se pierde la coneccion intenta conectar nuevamente
    conn.on("close", () => {
      console.error("[AMQP] reconnecting...");
      return setTimeout(init_rabbitmq, 1000);
    });

    console.log("[AMQP] connected");
    amqp_conn = conn;
    //Luego de establecer coneccion creamos el channel 
    create_publisher_channel();
  });
};
//-----------------------------------------------------------------------------
const close_for_err = (err) => {
  if (!err) return false;
  console.error("[AMQP] error: ", err);
  amqp_conn.close();
  return true;
};


//ESTABLECER UN CANAL----------------------------------------------------------
const create_publisher_channel = async () => {
  amqp_conn.createConfirmChannel((err, ch) => {
    if (close_for_err(err)) return;
    ch.on("error", (err) => {
      console.error("[AMQP] channel error:", err.message);
    });
    ch.on("close", () => {
      console.log("[AMQP] publisher channel closed");
    });
    publisher_channel = ch;

    //si tenemos mensajes en cola los enviamos
    if (offline_msg.length > 0) {
      offline_msg.forEach((msg) => {
        send_delay_msg(msg.exchange, 
          msg.exchange_type, 
          msg.queue, 
          msg.routingKey, 
          msg.content
        );
      });
      //y los eliminamos 
      offline_msg.pop();
    }

    //Ejecutamos los "consumidores"
    //consume_contracts_mgmt_queue(publisher_channel);
  });
};



//ENVIAR MSG-------------------------------------------------------------------
//el msg sera recibido por el mcroservico de users
const get_user_by_auth0_id = async (content) => {
  const queue = 'query_by_auth0_id',
    exchange = 'users_query',
    exchange_type = 'direct',
    routingKey = 'by.auth0_id';
  try {
    //compruaba existencia del exchange
    publisher_channel.assertExchange(
      exchange, exchange_type,{ durable: true });
    //compruba existencia de la cola 
    publisher_channel.assertQueue(queue, { durable: true });
    //vincula la cola al exchange
    publisher_channel.bindQueue(queue, exchange, routingKey);

    console.log("sending a msg to users_query exchange");
    await publisher_channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(content)),
      { persistent: true }
    ); 
  } catch (err) {
    console.error("[AMQP] send error:", err);
    //si ocurrio un error y no se envia el msg, guardamos el mensaje en nuestra cola de msg no enviados 
    offline_msg.push({ 
      exchange, 
      exchange_type, 
      queue, 
      routingKey, 
      content
    });
  }
};



const send_message_to_notification_mgmt = async (content) => {
  const queue = 'email_msg' ,
    exchange = 'user_notifications',
    exchange_type = 'topic',
    routingKey = 'email.*'
  try {
    //compruaba existencia del exchange
    publisher_channel.assertExchange(exchange, exchange_type, 
      { durable: true });
    //compruba existencia de la cola 
    publisher_channel.assertQueue(queue, { durable: true });
    //vincula la cola al exchange
    publisher_channel.bindQueue(queue, exchange, routingKey);

    console.log("sending a msg to user_notifications exchange ");
    await publisher_channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(content)),
      { persistent: true }
    ); 
  } catch (err) {
    console.error("[AMQP] send error:", err);
    //si ocurrio un error y no se envia el msg, guardamos el mensaje en nuestra cola de msg no enviados 
    offline_msg.push({ 
      exchange, 
      exchange_type, 
      queue, 
      routingKey,
      content });
  }
};



const send_delay_msg = async (
  exchange, exchange_type, 
  queue, routingKey, content) => {
  try {
    //compruaba existencia del exchange
    publisher_channel.assertExchange(exchange, exchange_type, { durable: true });
    //compruba existencia de la cola 
    publisher_channel.assertQueue(queue, { durable: true });
    //vincula la cola al exchange
    publisher_channel.bindQueue(queue, exchange, routingKey);

    console.log("sending a msg to exchange on rabbitmq");
    await publisher_channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(content)),
      { persistent: true }
    ); 
  } catch (err) {
    console.error("[AMQP] send error:", err);
    //si ocurrio un error y no se envia el msg, guardamos el mensaje en nuestra cola de msg no enviados 
    offline_msg.push({ 
      exchange, 
      exchange_type, 
      queue,
      routingKey, 
      content 
    });
  }
};










/*
//CONSUMIR COLAS---------------------------------------------------------------
const consume_contracts_mgmt_queue = (channel)=>{
  const exchange = "users_query_response"; //compruaba existencia del exchange
  channel.assertExchange(exchange, "direct", { durable: true });
 
  //Una cola.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
  const email_msg = "contracts_mgmt"; 
  channel.assertQueue(email_msg, { durable: true }); //comprueba que exista
  channel.bindQueue(email_msg, exchange,"to.contracts_mgmt"); //vincula la cola al exchange

  //consumimos la cola que nos da users_mgmt
  channel.consume(
    email_msg, 
    function (msg) {
      console.log('Consuming msg from queue');
      setTimeout(function(){

        //Aqui obtenemos ya el mensaje
        const string_msg = msg.content.toString(),
          obj_msg = JSON.parse(string_msg);
        
        //una vez que nos llego la info enviamos mensaje a notifications_mgmt
        let msg = contract_created_msg(obj_msg)
        console.log(msg)
        send_message_to_notification_mgmt(msg)    

      },1000);
      },{ noAck: true }
  );
}
*/



module.exports = {
  init_rabbitmq,
  get_user_by_auth0_id,
  send_message_to_notification_mgmt
}