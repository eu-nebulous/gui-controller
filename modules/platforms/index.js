const {v4: uuidv4} = require("uuid");
module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Platform',
    },

    fields: {
        add: {
            uuid: {
                type: 'string',
                label: 'UUID',
                required: false
            }
        },
        group: {
            basics: {
                label: 'Basics',
                fields: ['uuid']
            }
        }
    },
    handlers(self) {
        return {
            beforeSave: {
                async generateUuid(req, doc) {
                    if (!doc.uuid) {
                        doc.uuid = uuidv4();
                    }
                }
            }
        }
    },
    apiRoutes(self) {
        return {
            get: {
                async all(req) {
                    const projection = {
                        title: 1,
                        uuid: 1,
                    };
                    try {
                        const platforms = await self.find(req).project(projection).toArray();
                        return platforms;
                    } catch (error) {
                        throw self.apos.error('notfound', 'Platforms not found');
                    }
                }
            }
        }
    }
};