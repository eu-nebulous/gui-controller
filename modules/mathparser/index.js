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
                        const uppercaseVariableNames = variableNames.map(name => name.toUpperCase());
                        return {
                            variables: uppercaseVariableNames,
                        };
                    } catch (error) {
                        throw error;
                    }
                },
            },
        };
    },
};
