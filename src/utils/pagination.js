//los crea los links para la paginacion automatica-----------------------------
const create_links = (
  total_pages,
  complete_url,
  param,
) => {
  const page_number = parseInt(param.split('=')[1] || '1');
  let next = '',
    last = '',
    prev = '',
    first = '';

  if (page_number > 0 && page_number < total_pages) {
    next = complete_url.replace(/page=\d{1,}/g, `page=${page_number + 1}`);
    last = complete_url.replace(/page=\d{1,}/g, `page=${total_pages}`);
  }
  if (page_number > 1) {
    prev = complete_url.replace(/page=\d{1,}/g, `page=${page_number - 1}`);
    first = complete_url.replace(/page=\d{1,}/g, `page=1`);
  }
  //los links
  return {
    next: next,
    last: last,
    prev: prev,
    self: complete_url,
    first: first,
  };
};

//PAGINAR LA DATA RECIBIDA--------------------------------------------------
const paginated_data = (
  pag, siz, data_array,req,
) => {
  //si no me pasan el numero de pagina sera la 1
  const page = pag || 1,
    size = siz || 10,
    start = (page - 1) * size,
    estimated_pages = data_array.length / size;

  let total_pages;
  //hacemos los redondeos necesarios para el calculo de paginas totales
  if (estimated_pages > 0 && estimated_pages < 1)
    total_pages = Math.ceil(estimated_pages);
  else total_pages = Math.floor(estimated_pages);
  
  //obtenemos y modificamos los queryparams
  let querys = '?'+req.rawQueryString,
    complete_url = '',
    params= querys.split('&'),
    links = {};
  console.log(querys)
  //le pone a los query_params 'page' si no lo tenia
  if (!params.some((element) => /page=\d{1,}/g.test(element))) {
    //si hay otros query params agregamos a page de una forma
    if (querys.match(/^\?[a-z]+/)) querys = querys.concat('&page=1');
    //si no de otra
    else querys = querys.concat('page=1');
    params = querys.split('&'); //si aqui volvemos a hacer lo mismo de arriba pero con "page" como atributo nuevo
  }

  //creamos los links automaticamente
  for (let i = 0; i < params.length; i++) {
    if (
      (!params[i].includes('page') && i === params.length) ||
      params[i].includes('page')
    ) {
      complete_url =  req.rawPath + querys
      links = create_links(total_pages, complete_url, params[i]);
    }
  }
  //Tenemos echa la paginacion correctamente como lo manda Dios
  const msg = {
    data: data_array.slice(start, start + size),
    meta: {
      current_page: page,
      page_size: size,
      total_elements: data_array.length,
      total_pages,
      links,
    },
  };

  return msg;
};


module.exports={
  paginated_data
}