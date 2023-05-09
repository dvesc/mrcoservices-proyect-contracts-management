const error_handler = async (err, error_generator = null) => {
  const msg = err.message,
    error_name = err.name,
    status = !err.status ? 500 : err.status,
    cause = err.cause || error_generator,
    response = {
      error: {
        status,
        error_name,
        timestamp: Date.now(),
        msg,
        cause,
      },
    };
  console.error(response);
};

module.exports = error_handler;
