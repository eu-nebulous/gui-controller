var mathutils = require('../../lib/math'
)
module.exports = {
    apiRoutes(self) {
        return {
            post: {
                async expression(req) {
                    try {
                        let parsedEquation = mathutils.extractFromEquation(req.body.equation)
                        const variableNames = mathutils.extractVariableNames(parsedEquation);
                        return {
                            variables: variableNames,
                        };
                    } catch (error) {
                        throw error;
                    }
                },
            },
        };
    },
};
