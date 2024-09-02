const {v4: uuidv4} = require('uuid');
const Joi = require('joi');
const exn = require('../../lib/exn');
const _ = require('lodash');

const projection = {
    title: 1,
    uuid: 1,
    organization: 1,
    platform: 1,
    regions: 1,
    subnet: 1,
    endpoint: 1,
    identityVersion: 1,
    credentials: 1,
    defaultNetwork: 1,
    securityGroup: 1,
    sshCredentials: 1,
    _platform: 1
};
const resourcesSchema = Joi.object({
    _platform: Joi.required().messages({
        'any.required': 'Platform is a required field.'
    })
}).unknown().options({abortEarly: false});

const credentialsSchema = Joi.object({
    user: Joi.string().required().messages({
        'string.empty': 'Credentials: Users is required.',
        'any.required': 'Credentials: Users is a required field.'
    }),
    secret: Joi.string().required().messages({
        'string.empty': 'Credentials: Secret is required.',
        'any.required': 'Credentials: Secret is a required field.'
    }),
}).unknown().options({abortEarly: false});

module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Resource'
    },
    fields: {
        add: {
            uuid: {
                type: 'string',
                label: 'UUID'
            },
            _platform: {
                label: 'Platform',
                type: 'relationship',
                withType: "platforms",
                max: 1
            },
            regions: {
                label: 'Regions',
                type: 'string',
                default: ''
            },
            securityGroup: {
                type: 'string',
                label: 'Security Group'
            },
            sshCredentials: {
                type: 'object',
                label: 'SSH Credentials',
                fields: {
                    add: {
                        username: {
                            type: 'string',
                            label: 'Username',
                        },
                        privateKey: {
                            type: 'string',
                            label: 'Private Key',
                            textarea: true,
                        },
                        keyPairName: {
                            type: 'string',
                            label: 'Key Pair Name',
                        },
                    }
                }
            },
            subnet: {
                type: 'string',
                label: 'Subnet'
            },
            endpoint: {
                type: 'string',
                label: 'Endpoint'
            },
            identityVersion: {
                type: 'select',
                label: 'Identity Version',
                choices: [
                    {'label': 'v3', value: '3'}
                ]
            },
            defaultNetwork: {
                type: 'string',
                label: 'Default Network'
            },
            credentials: {
                type: 'object',
                label: 'Credentials',
                fields: {
                    add: {
                        user: {
                            type: 'string',
                            label: 'Username',
                        },
                        secret: {
                            type: 'string',
                            label: 'Secret',
                            textarea: true,
                        },
                        domain: {
                            type: 'string',
                            label: 'Domain',
                        },
                    }
                }

            }
        },
        group: {
            basics: {
                label: 'Details',
                fields: ['title', 'uuid', '_platform', 'regions', 'identityVersion']
            },
            network: {
                label: 'Network',
                fields: ['defaultNetwork', 'endpoint', 'subnet']
            },
            security: {
                label: 'Security',
                fields: ['securityGroup', 'credentials', 'sshCredentials']
            }

        }
    },
    handlers(self) {
        async function generateUuid(doc) {
            if (!doc.uuid) {
                doc.uuid = uuidv4();
            }
        }

        async function assignOrganization(req, doc) {
            if (req.user.role === "admin" && req.user.organization) {
                doc.organization = req.user.organization;
            }
        }

        function convertEmptyStringsToNull(doc) {
            const fieldsToCheck = [
                'regions',
                'securityGroup',
                'subnet',
                'endpoint',
                'defaultNetwork',
                'credentials.user',
                'credentials.secret',
                'credentials.domain',
                'sshCredentials.username',
                'sshCredentials.privateKey',
                'sshCredentials.keyPairName'
            ];

            fieldsToCheck.forEach(field => {
                if (_.has(doc, field) && doc[field] === '') {
                    _.set(doc, field, null);
                }
            });
        }


        return {
            beforeInsert: {

                async handler(req, doc) {
                    if (!(req.user.role === "admin")) {
                        throw self.apos.error('forbidden', 'Editors are not allowed to create resources');
                    }
                    await generateUuid(doc);
                    try {

                        await self.updateWithPlatformInfo(req, doc);
                        await assignOrganization(req, doc);
                        convertEmptyStringsToNull(doc);

                    } catch (e) {
                        throw self.apos.error('invalid', 'Unknown Error ' + e);
                    }
                }
            },
            beforeSave: {
                async handler(req, doc, options) {
                    try {
                        await self.updateWithPlatformInfo(req, doc)
                        self.validateDocument(doc);
                    } catch (error) {
                        if (error.name === 'required' && error.error && error.error.length > 0) {
                            const formattedErrors = error.error.map(err => {
                                return {field: err.path, message: err.message};
                            });
                            throw self.apos.error('invalid', 'Validation failed', {errors: formattedErrors});
                        } else {
                            throw error;
                        }
                    }
                }
            },
        }
    },
    methods(self) {
        return {
            async updateWithPlatformInfo(req, doc) {

                if (req.body.platform && req.body.platform.uuid) {

                    const platform = await self.apos.modules['platforms'].find(req, {'uuid': req.body.platform.uuid}).toObject();
                    if (!platform) {
                        throw self.apos.error('notfound', 'Platform not found or empty');
                    }
                    doc.platformIds = [platform._id]
                    doc._platform = [platform]
                    delete req.body.platform
                }
                return doc

            },
            cleanUp: function (self, req, resources) {

                _.each(resources, (r) => {
                    r = self.removeForbiddenFields(req, r)
                    r['platform'] = null

                    if (r._platform.length > 0) {
                        r['platform'] = {
                            'uuid': r._platform[0].uuid,
                            'title': r._platform[0].title,
                        }
                    }

                    delete r._platform

                })

                return resources
            },
            validateDocument(doc) {
                const validateField = (data, schema) => {
                    const {error} = schema.validate(data);
                    if (error) {
                        const formattedErrors = error.details.map(detail => ({
                            path: detail.path.join('.'),
                            message: detail.message.replace(/\"/g, "")
                        }));
                        throw self.apos.error('required', 'Validation failed', {error: formattedErrors});
                    }
                };
                validateField(doc, resourcesSchema);
                validateField(doc.credentials, credentialsSchema);
            }
        }
    },
    apiRoutes(self) {
        return {
            get: {
                async all(req) {

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;
                    try {
                        const filters = {
                            organization: adminOrganization,
                        };
                        const page = req.query.page || 1
                        const pageSize = req.query.pageSize || 10
                        const count = await self.find(req, filters).toCount()

                        const resources = await self.find(req, filters).project(projection)
                            .withPublished(true)
                            .perPage(pageSize)
                            .page(page)
                            .toArray()


                        return {
                            "total": count,
                            "page": page,
                            "results": self.cleanUp(self, req, resources)
                        };
                    } catch (error) {
                        throw self.apos.error('notfound', 'Resource not found');
                    }
                },
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;

                    if (!(req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const doc = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }

                        return self.cleanUp(self, req, [doc])[0]
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/candidates'(req) {
                    const uuid = req.params.uuid;

                    if (!(req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {

                        const doc = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }


                        await exn.register_cloud(doc)
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        const message = await exn.get_cloud_candidates()
                        return _.map(JSON.parse(message.body), (r) => {
                            return {
                                id: r.nodeId,
                                region: r.location.name,
                                instanceType: r.hardware.name,
                                virtualCores: r.hardware.cores,
                                memory: r.hardware.ram
                            }
                        })


                    } catch (error) {
                        console.error(error)
                        throw self.apos.error(500, error);
                    }
                }
            },
            delete: {
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;

                    if (!uuid) {
                        throw self.apos.error('invalid', 'UUID is required');
                    }
                    if (!(req.user.role === "admin" && req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const filters = {
                            uuid: uuid,
                            organization: adminOrganization
                        };

                        //Νo refactor here because we need both docs.
                        const docs = await self.apos.db.collection('aposDocs').find({
                            uuid: uuid,
                            organization: adminOrganization
                        }).toArray();

                        if (!docs || docs.length === 0) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }

                        for (const doc of docs) {
                            if (doc.organization !== adminOrganization) {
                                throw self.apos.error('forbidden', 'Access denied');
                            }

                            await self.apos.db.collection('aposDocs').deleteOne({uuid: doc.uuid});
                        }

                        return {status: 'success', message: 'Resource deleted successfully'};
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
            patch: {
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;
                    const updateData = req.body;

                    if (!(req.user.role === "admin" && req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }

                    const adminOrganization = req.user.organization;

                    try {
                        const filters = {
                            uuid: uuid,
                            organization: adminOrganization
                        };
                        const doc = await self.find(req, filters).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }
                        await self.updateWithPlatformInfo(req, doc)
                        self.validateDocument(doc)

                        let update = {...doc, ...updateData};
                        await self.update(req, update)

                        return self.cleanUp(self, req, [update])[0]

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            }
        }
    }
};
