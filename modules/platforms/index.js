const {v4: uuidv4} = require("uuid");
const _ = require('lodash');

module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Platform',
        sort:{
            sortOrder:1,
        }
    },

    fields: {
        add: {
            uuid: {
                type: 'string',
                label: 'UUID',
                required: false
            },
            provider_name: {
                type: 'string',
                label: 'Provider Name',
                required: false
            },
            public: {
                type: 'boolean',
                label: 'Public',
                required: true,
                def: true
            },
            sortOrder: {
                type: 'integer',
                label: 'Sort Order',
                required: true,
                def: 0,
            }
        },
        group: {
            basics: {
                label: 'Basics',
                fields: ['uuid','public','sortOrder']
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
                        sortOrder: 1,
                    };
                    try {
                        const platforms = await self.find(req).project(projection).toArray();

                        return _.map(platforms, (p)=> { return {'title': p.title, 'uuid': p.uuid} })
                    } catch (error) {
                        throw self.apos.error('notfound', 'Platforms not found');
                    }
                }
            }
        }
    }
};