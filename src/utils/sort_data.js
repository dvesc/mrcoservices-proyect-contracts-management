const sort = (data, order, order_by)=>{
  //ordenamos de forma manual (asc)
  let sort_data = data.sort((a,b)=>{
    return toString(a[`${order_by}`])
      .localeCompare(b[`${order_by}`]) 
  })
  if (!order) //false = desc
    sort_data = sort_data.reverse()

  return sort_data
}


module.exports = {
  sort
}