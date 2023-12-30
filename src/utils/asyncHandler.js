const asyncHandler = (requestHandler) =>{
    (err,req,res,next) =>{
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err) => next(err))
    }
}
export {asyncHandler}

//Both the codes of asyncHandler takes a function and wraps it in try/catch or promises and 
//uses it to handle errors.  

// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }