'use strict';

//npm install --save querystring
const querystring = request("querystring")

module.exports.hello = async (event) => {
  //obtener un parametro de la url

  let param = event.pathParameters.x_param

  //de esta forma capturamos el body de la peticion
  const body = querystring.pase(event["body"])

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `el param es: ${param}`,
        input: event,
      },
      null,
      2
    ),
  };
};