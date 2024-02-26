const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const exn = require('../../lib/exn');
const _ = require('lodash');

const projection = {
    title: 1,
    uuid: 1,
    organization: 1,
    platform: 1,
    appId: 1,
    appSecret: 1
};
const resourcesSchema = Joi.object({
    appId: Joi.string().required().messages({
        'string.empty': 'App ID is required.',
        'any.required': 'App ID is a required field.'
    }),
    appSecret: Joi.string().required().messages({
        'string.empty': 'App Secret is required.',
        'any.required': 'App Secret is a required field.'
    }),
    platform: Joi.string().required().messages({
        'string.empty': 'Platform is required.',
        'any.required': 'Platform is a required field.'
    }),
}).unknown().options({ abortEarly: false });

module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Resource',
    },
    fields: {
        add: {
            uuid: {
                type: 'string',
                label: 'UUID',
                readOnly: true
            },
            platform: {
                type: 'string',
                label: 'Platform'
            },
            appId: {
                type: 'string',
                label: 'App ID',
            },
            appSecret: {
                type: 'string',
                label: 'App Secret',
            }
        },
        group: {
            basics: {
                label: 'Details',
                fields: ['title', 'uuid', 'platform', 'appId', 'appSecret']
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
        return {
            beforeInsert: {

                async handler(req, doc) {
                    if (!(req.user.role === "admin")){
                        throw self.apos.error('forbidden', 'Editors are not allowed to create resources');
                    }
                    await generateUuid(doc);
                    try{

                        if(doc.aposMode === 'published'){
                             const message = await exn.register_cloud(
                                 doc.uuid,
                                 doc.appId,
                                 doc.appSecret,
                             )
                            console.log("Registered ",message);

                        }
                        await self.updateWithPlatformInfo(doc);
                        await assignOrganization(req, doc);

                    }catch(e){
                        throw self.apos.error('invalid', 'Unknown Error '+e);
                    }
                }
            },


            beforeSave: {
                async handler(req, doc, options) {
                    try {
                        self.validateDocument(doc);
                    } catch (error) {
                        if (error.name === 'required' && error.error && error.error.length > 0) {
                            const formattedErrors = error.error.map(err => {
                                return { field: err.path, message: err.message };
                            });
                            throw self.apos.error('invalid', 'Validation failed', { errors: formattedErrors });
                        } else {
                            throw error;
                        }
                    }
                }
            }
        }
    },

    methods(self) {
        return {
            async  updateWithPlatformInfo(doc) {
                if (doc.platform && !doc.platformUpdated) {
                    const platformPiece = await self.apos.doc.db.findOne({
                        type: 'platforms',
                        uuid: doc.platform
                    });

                    if (platformPiece) {
                        doc.platform = platformPiece.title;
                        doc.platformUpdated = true;
                    } else {
                        throw self.apos.error('notfound', 'Platform not found');
                    }
                }
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
                            organization: adminOrganization
                        };
                        const resources = await self.find(req, filters).project(projection).toArray();
                        return resources;
                    } catch (error) {
                        throw self.apos.error('notfound', 'Resource not found');
                    }
                },
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;

                    if (!( req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const doc = await self.find(req, { uuid: uuid  , organization:adminOrganization}).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }

                        return doc;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async 'candidates'(req) {

                    if (!( req.user.organization)) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }

                    try {

                        const message = await exn.get_cloud_candidates()
                        return _.map(JSON.parse(message.body), (r)=>{
                            return {
                                id: r.nodeId,
                                region: r.location.name,
                                instanceType: r.hardware.name,
                                virtualCores:  r.hardware.cores,
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
                        const docs = await self.apos.db.collection('aposDocs').find({ uuid: uuid, organization:adminOrganization }).toArray();

                        if (!docs || docs.length === 0) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }

                        for (const doc of docs) {
                            if (doc.organization !== adminOrganization) {
                                throw self.apos.error('forbidden', 'Access denied');
                            }

                            await self.apos.db.collection('aposDocs').deleteOne({ uuid: doc.uuid });
                        }

                        return { status: 'success', message: 'Resource deleted successfully' };
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
                    self.validateDocument(updateData);

                    const adminOrganization = req.user.organization;

                    try {
                        const filters = {
                            uuid: uuid,
                            organization: adminOrganization
                        };
                        const resourcesToUpdate = await self.find(req, filters).project(projection).toArray();

                        if (!resourcesToUpdate || resourcesToUpdate.length === 0) {
                            throw self.apos.error('notfound', 'Resource not found');
                        }

                        const doc = resourcesToUpdate[0];


                        if ('platform' in updateData) {
                            let docToUpdate = { ...doc, ...updateData };
                            await self.updateWithPlatformInfo(docToUpdate);

                            await self.apos.doc.db.updateOne(
                                { uuid: uuid },
                                { $set: docToUpdate }
                            );
                        } else {
                            await self.apos.doc.db.updateOne(
                                { uuid: uuid },
                                { $set: updateData }
                            );
                        }

                        const resourceUpdated = await self.find(req, filters).project(projection).toArray();

                        return resourceUpdated;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            }
        }
    }
};
