const logger = (req,res,next)=>{
    const method = req.method
    const url = req.url
    const date = new Date()
    const outputdate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log(method,url,outputdate)
    next()
}

module.exports = logger