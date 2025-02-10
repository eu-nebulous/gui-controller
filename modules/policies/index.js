module.exports = {
    apiRoutes(self) {
        return {
            post: {
                async publish(req) {
                    try {
                        await self.apos.exn.publish_policies(req.body.policies)
                    } catch (error) {
                        throw error;
                    }
                },
            },
        };
    },
};
