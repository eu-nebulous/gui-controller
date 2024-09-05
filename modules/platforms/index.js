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
                fields: ['uuid','provider_name','public','sortOrder']
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
            },

            'apostrophe:ready': {
                async insertDefaultPlatforms() {
                    try {
                        const req = self.apos.task.getReq();
                        self.apos.util.log('Apostrophe is ready');

                        const existingPlatforms = await self.find(req, {}).toCount();

                        if (existingPlatforms === 0) {
                            self.apos.util.log('Inserting default platforms...');
                            await self.insertDefaultPlatforms();
                        } else {
                            self.apos.util.log('Platforms already exist. Skipping insertion.');
                        }
                    } catch (error) {
                        self.apos.util.error('Error during platform insertion:', error);
                    }
                }
            }
        };
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
    },
    methods(self) {
        return {
            async insertDefaultPlatforms() {
                const req = self.apos.task.getReq();
                
                    const defaultPlatforms = [
                        {
                            title: 'AWS',
                            uuid: '8fb2bb14-0adf-4d91-a7bd-cb6980dbc738',
                            provider_name: 'aws-ec2',
                            public: true,
                            sortOrder: 1
                        },
                        {
                            title: 'GCP',
                            uuid: '0283769e-f3a5-40a0-8cb4-59aafc8a903c',
                            provider_name: 'Google Cloud Platform',
                            public: true,
                            sortOrder: 2
                        },
                        {
                            title: 'OPENSTACK',
                            uuid: '9f59fa75-7945-4c41-b7f8-8e04b846365e',
                            provider_name: 'Openstack',
                            public: true,
                            sortOrder: 3
                        },
                        {
                            title: 'BYON',
                            uuid: '1954c7c2-4cf5-41f0-8e3c-fa9b6b54a0fa',
                            provider_name: 'Byon',
                            public: true,
                            sortOrder: 4
                        }
                    ];

                    for (const platform of defaultPlatforms) {
                        await self.insert(req, platform);
                    }

                    self.apos.util.log('Default platforms inserted.');
            }
        }
    }
};