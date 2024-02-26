const exn = require('../../lib/exn')


module.exports = {
    apiRoutes(self) {
        return {
            post: {
                async publish(req) {
                    try {
                        await exn.publish_policies(req.body.policies)
                    } catch (error) {
                        throw error;
                    }
                },
            },
        };
    },
};
