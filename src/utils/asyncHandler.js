// This is just a utility that executes a given function asynchronously ensuring possiblility of failure of the execution

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => {next(err)});
    }
}

export { asyncHandler }

// Try Catch method

// const asyncHalder = (requestHandler) => async (req, res, next) => {
//     try {
//         await requestHandler(req, res, next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: true,
//             message: err.message
//         })
//     }
// }