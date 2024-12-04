// This is just a utility that executes a function asynchronously

const asyncHalder = (requestHandler) => {
    (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => {next(err)});
    }
}

export { asyncHalder }

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