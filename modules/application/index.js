const {v4: uuidv4} = require('uuid');
const Joi = require('joi');
const yaml = require('yaml');
const slugify = require('slugify');
const mathutils = require('../../lib/math');
const metric_model = require('../../lib/metric_model');
const kubevela = require('../../lib/kubevela')
const _ = require('lodash')
const OpenAI = require("openai");

const projection = {
    title: 1,
    uuid: 1,
    status: 1,
    organization: 1,
    content: 1,
    variables: 1,
    environmentVariables: 1,
    resources: 1,
    parameters: 1,
    templates: 1,
    metrics: 1,
    sloViolations: 1,
    utilityFunctions: 1
};


module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Application',
    },
    fields: {
        add: {
            uuid: {
                type: 'string',
                label: 'UUID'
            },
            status: {
                type: 'string',
                label: 'Status',
                def: 'draft'
            },
            content: {
                type: 'string',
                textarea: true,
                label: 'Content (YAML format)'
            },
            variables: {
                type: 'array',
                label: 'Variables',
                fields: {
                    add: {
                        name: {
                            type: 'string',
                            label: 'Name'
                        },
                        fullPath: {
                            type: 'string',
                            label: 'Full Path'
                        },
                        lowerValue: {
                            type: 'float',
                            label: 'Lower Value',
                        },
                        higherValue: {
                            type: 'float',
                            label: 'Higher Value',
                        }
                    }
                }
            },
            environmentVariables: {
                type: 'array',
                label: 'Environmental Variables',
                fields: {
                    add: {
                        name: {
                            type: 'string',
                            label: 'Name'
                        },
                        value: {
                            type: 'string',
                            label: 'Value',
                        },
                        secret: {
                            type: 'boolean',
                            label: 'Secret',
                            def: false
                        }
                    }
                }
            },
            resources: {
                type: 'array',
                label: 'Application Resources',
                fields: {
                    add: {
                        uuid: {
                            type: 'string',
                            label: 'Resource UUID',
                        },
                        title: {
                            type: 'string',
                            label: 'Resource Title'
                        },
                        platform: {
                            type: 'string',
                            label: 'Platform Name',
                        },
                        enabled: {
                            type: 'boolean',
                            label: 'Enabled',
                            def: false
                        }
                    }
                }
            },
            parameters: {
                type: 'array',
                label: 'Parameters',
                fields: {
                    add: {
                        name: {
                            type: 'string',
                            label: 'Name'
                        },
                        template: {
                            type: 'string',
                            label: 'Template'
                        },
                        initialValue: {
                            type: 'float',
                            label: 'Initial Value'
                        },
                    }
                }
            },
            templates: {
                type: 'array',
                label: 'Templates',
                fields: {
                    add: {
                        id: {
                            type: 'string',
                            label: 'ID',
                        },
                        type: {
                            type: 'select',
                            label: 'Type',
                            choices: [
                                {label: 'Integer', value: 'int'},
                                {label: 'Double', value: 'double'}
                            ]
                        },
                        minValue: {
                            type: 'integer',
                            label: 'Minimum Value',
                        },
                        maxValue: {
                            type: 'integer',
                            label: 'Maximum Value',
                        },
                        unit: {
                            type: 'string',
                            label: 'Unit',
                        }
                    }
                }
            },
            metrics: {
                type: 'array',
                label: 'Metrics',
                fields: {
                    add: {

                        type: {
                            type: 'select',
                            label: 'Type',
                            choices: [
                                {label: 'Composite', value: 'composite'},
                                {label: 'Raw', value: 'raw'}
                            ]
                        },
                        level: {
                            type: 'select',
                            label: 'Level',
                            choices: [
                                {label: 'Global', value: 'global'},
                                {label: 'Components', value: 'components'}
                            ],
                            def: 'global'
                        },
                        components: {
                            type: 'array',
                            label: 'Components',
                            if: {
                                level: 'components'
                            },
                            fields: {
                                add: {
                                    componentName: {
                                        type: 'string',
                                        label: 'Component Name'
                                    }
                                }
                            }
                        },
                        name: {
                            type: 'string',
                            label: 'Name'
                        },
                        template: {
                            type: 'string',
                            label: 'Template',
                            textarea: true,
                            if: {
                                type: 'composite'
                            }
                        },
                        formula: {
                            type: 'string',
                            label: 'Formula',
                            textarea: true,
                            if: {
                                type: 'composite'
                            }
                        },
                        isWindowInput: {
                            type: 'boolean',
                            label: 'Window Input',
                            if: {
                                type: 'composite'
                            }
                        },
                        input: {
                            type: 'object',
                            label: 'Input',
                            fields: {
                                add: {
                                    type: {
                                        type: 'select',
                                        label: 'Type Input',
                                        choices: [
                                            {label: 'Batch', value: 'batch'},
                                            {label: 'Sliding', value: 'sliding'}
                                        ],
                                    },
                                    interval: {
                                        type: 'integer',
                                        label: 'Interval',
                                    },
                                    unit: {
                                        type: 'select',
                                        label: 'Unit',
                                        choices: [
                                            {label: 'Ms', value: 'ms'},
                                            {label: 'Sec', value: 'sec'},
                                            {label: 'Min', value: 'min'},
                                            {label: 'Hour', value: 'hour'},
                                            {label: 'Day', value: 'day'},
                                            {label: 'Events', value: 'events'}
                                        ],
                                    },
                                },
                            },
                            if: {
                                isWindowInput: true
                            }
                        },
                        isWindowOutput: {
                            type: 'boolean',
                            label: 'Window Output',
                            if: {
                                type: 'composite'
                            }
                        },
                        output: {
                            type: 'object',
                            label: 'Output',
                            fields: {
                                add: {
                                    type: {
                                        type: 'select',
                                        choices: [
                                            {label: 'All', value: 'all'},
                                            {label: 'First', value: 'first'},
                                            {label: 'Last', value: 'last'}
                                        ],
                                    },
                                    interval: {
                                        type: 'integer',
                                        label: 'Interval'
                                    },
                                    unit: {
                                        type: 'select',
                                        label: 'Unit',
                                        choices: [
                                            {label: 'Ms', value: 'ms'},
                                            {label: 'Sec', value: 'sec'},
                                            {label: 'Min', value: 'min'},
                                            {label: 'Hour', value: 'hour'},
                                            {label: 'Day', value: 'day'}
                                        ],
                                    }
                                }
                            },
                            if: {
                                isWindowOutput: true
                            }
                        },
                        sensor: {
                            type: 'string',
                            label: 'Sensor',
                            if: {
                                type: 'raw'
                            }
                        },
                        config: {
                            type: 'array',
                            label: 'Config',
                            if: {
                                type: 'raw'
                            },
                            fields: {
                                add: {
                                    name: {
                                        type: 'string',
                                        label: 'Name'
                                    },
                                    value: {
                                        type: 'string',
                                        label: 'Value'
                                    }
                                }
                            }
                        },
                        isWindowOutputRaw: {
                            type: 'boolean',
                            label: 'Window Output',
                            if: {
                                type: 'raw'
                            }
                        },
                        outputRaw: {
                            type: 'object',
                            label: 'Output',
                            fields: {
                                add: {
                                    type: {
                                        type: 'select',
                                        choices: [
                                            {label: 'All', value: 'all'},
                                            {label: 'First', value: 'first'},
                                            {label: 'Last', value: 'last'}
                                        ],
                                    },
                                    interval: {
                                        type: 'integer',
                                        label: 'Interval'
                                    },
                                    unit: {
                                        type: 'select',
                                        label: 'Unit',
                                        choices: [
                                            {label: 'Ms', value: 'ms'},
                                            {label: 'Sec', value: 'sec'},
                                            {label: 'Min', value: 'min'},
                                            {label: 'Hour', value: 'hour'},
                                            {label: 'Day', value: 'day'}
                                        ],
                                    }
                                }
                            },
                            if: {
                                isWindowOutputRaw: true
                            }
                        },
                    }
                }
            },
            sloViolations: {
                type: 'string',
                label: 'SLO',
                textarea: true,
            },
            utilityFunctions: {
                type: 'array',
                label: 'Utility Functions',
                fields: {
                    add: {
                        selected: {
                            type: 'boolean',
                            label: 'Function Selected'
                        },
                        functionName: {
                            type: 'string',
                            label: 'Function Name'
                        },
                        functionType: {
                            type: 'select',
                            label: 'Function Type',
                            choices: [
                                {label: 'Maximize', value: 'maximize'},
                                {label: 'Minimize', value: 'minimize'},
                                {label: 'Constant', value: 'constant'},
                                {label: 'Constraint', value: 'constraint'}
                            ]
                        },
                        functionExpression: {
                            type: 'string',
                            label: 'Function Expression',
                            textarea: true
                        },
                        functionConstraintOperator: {
                            type: 'string',
                            label: 'Constraints Operator',
                        },
                        functionExpressionVariables: {
                            type: 'array',
                            label: 'Expression Variables',
                            fields: {
                                add: {
                                    nameVariable: {
                                        type: 'string',
                                        label: 'Name Variable Value'
                                    },
                                    valueVariable: {
                                        type: 'string',
                                        label: 'Expression Variable Value'
                                    }
                                }
                            }
                        },
                    }
                }
            }
        },
        group: {
            basics: {
                label: 'Details',
                fields: ['title', 'uuid', 'status', 'content', 'variables', 'environmentVariables']
            },
            resources: {
                label: 'Resources',
                fields: ['resources']
            },
            templates: {
                label: 'Templates',
                fields: ['templates']
            },
            parameters: {
                label: 'Parameters',
                fields: ['parameters']
            },
            metricsGroup: {
                label: 'Metrics',
                fields: ['metrics', 'sloViolations']
            },
            expressionEditor: {
                label: 'Expression Editor',
                fields: ['utilityFunctions']
            }
        }
    },

    handlers(self) {
        return {
            'apostrophe:ready': {
                async displayVersion() {
                    console.log("Current version", process.env.NEBULOUS_VERSION);
                }
            },
            beforeInsert: {
                async convertComponents(req, doc, options) {
                    self.convertComponentsToBackendFormat(req.body, doc);
                },
                async generateUuid(req, doc, options) {
                    if (!doc.uuid) {
                        doc.uuid = uuidv4();
                    }
                    if (req.user && req.user.organization) {
                        doc.organization = req.user.organization;
                    }
                },
            },

            afterDeploy: {
                async deployApplication(req, doc, options) {
                    await self.apos.exn.application_updated(doc.uuid)
                    await self.apos.exn.send_application_dsl(doc.uuid)
                }
            }
        };
    },
    methods(self) {
        const contentSchema = Joi.string().custom((value, helpers) => {
            try {
                yaml.parse(value);
                return value;
            } catch (err) {
                return helpers.error('string.yaml');
            }
        }).messages({
            'string.yaml': "Content must be in valid YAML format.",
        });

        const environmenSchema = Joi.object({
            name: Joi.string()
                .required()
                .pattern(new RegExp('^[a-zA-Z0-9_]{3,40}$'))
                .messages({
                    'string.empty': "Please enter a name.",
                    'any.required': "Name is a required field."
                }),
            value: Joi.string()
                .required()
                .messages({
                    'string.empty': "Please enter a value.",
                    'any.required': "Name is a required field."
                }),
            secret: Joi.allow()

        });

        const variableSchema = Joi.object({
            name: Joi.string().trim().required().messages({
                'string.empty': "Please enter a name.",
                'any.required': "Name is a required field."
            }),
            lowerValue: Joi.number().required().messages({
                'number.base': "Lower value must be a valid number.",
                'any.required': "Lower value is a required field."
            }),
            higherValue: Joi.number().min(Joi.ref('lowerValue')).required().messages({
                'number.base': "Higher value must be a valid number.",
                'number.min': "Higher value must be greater than or equal to the lower value.",
                'any.required': "Higher value is a required field."
            })
        }).unknown();

        const resourcesSchema = Joi.object({
            title: Joi.string().trim().required().messages({
                'string.empty': 'Resource Title cannot be empty.',
                'any.required': 'Resource Title is a required field.'
            }),
            uuid: Joi.string().trim().required().messages({
                'string.empty': 'Resource UUID cannot be empty.',
                'any.required': 'Resource UUID is a required field.'
            }),
            platform: Joi.string().required().messages({
                'any.only': 'Resource Platform must be one of AWS, AZURE, GCP, BYON.',
                'string.empty': 'Resource Platform cannot be empty.',
                'any.required': 'Resource Platform is a required field.'
            }),
            enabled: Joi.boolean().messages({
                'boolean.base': 'Enabled must be a boolean value.'
            })
        }).unknown();

        const parameterSchema = Joi.object({
            name: Joi.string().trim().required().messages({
                'string.empty': "Name cannot be empty.",
                'any.required': "Name is a required field."
            }),
            template: Joi.string().trim().required().messages({
                'string.empty': "Template cannot be empty.",
                'any.required': "Template is a required field."
            })
        }).unknown();

        const templateSchema = Joi.object({
            id: Joi.string().trim().required().messages({
                'string.empty': "ID cannot be empty.",
                'any.required': "ID is a required field."
            }),
            type: Joi.string().valid('int', 'double').required().messages({
                'string.base': 'Type must be a string.',
                'any.required': 'Type is required.',
                'any.only': 'Type must be either "Integer" or "Double".'
            }),
            minValue: Joi.number().integer().messages({
                'number.base': 'Minimum Value must be a number.',
                'number.integer': 'Minimum Value must be an integer.'
            }),
            maxValue: Joi.number().integer().messages({
                'number.base': 'Maximum Value must be a number.',
                'number.integer': 'Maximum Value must be an integer.'
            }),
            unit: Joi.string().trim().messages({
                'string.base': 'Unit must be a string.'
            })
        }).unknown();


        const metricSchema = Joi.object({
            name: Joi.string()
                .required()
                .pattern(new RegExp('^[a-zA-Z0-9_]*$'))
                .messages({
                    'string.empty': "Please enter a name.",
                    'any.required': "Name is a required field."
                }),
            // type: Joi.string().valid('composite', 'raw').required().messages({
            //     'any.required': 'Metric type is required.',
            //     'string.valid': 'Metric type must be either "composite" or "raw".'
            // }),

            // level: Joi.string().required().messages({
            //     'string.base': 'Level must be a string.',
            //     'any.required': 'Level is required.',
            //     'any.only': 'Level must be either "Global" or "Components".'
            // }),
            // components: Joi.when('level', {
            //     is: 'components',
            //     then: Joi.array().items(Joi.object({
            //         componentName: Joi.string().trim().required().messages({
            //             'string.base': 'Component Name must be a string.',
            //             'any.required': 'Component Name is required in components.'
            //         })
            //     }).unknown()).required()
            // }).required(),
            // name: Joi.when('type', {
            //     is: 'composite,raw',
            //     then: Joi.string().trim().required().messages({
            //         'any.required': 'Name is required for composite metrics.',
            //         'string.empty': 'Name cannot be empty.'
            //     })
            // }),
            // formula: Joi.when('type', {
            //     is: 'composite',
            //     then: Joi.string().trim().required().messages({
            //         'any.required': 'Formula is required for composite metrics.',
            //         'string.empty': 'Formula cannot be empty.'
            //     })
            // }),
            // isWindowInput: Joi.when('type', {
            //     is: 'composite',
            //     then: Joi.boolean().required()
            // }),
            // input: Joi.when('isWindowInput', {
            //     is: true,
            //     then: Joi.object({
            //         type: Joi.string().valid('all', 'sliding').required(),
            //         interval: Joi.number().integer().required(),
            //         unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
            //     }).required()
            // }),
            // isWindowOutput: Joi.when('type', {
            //     is: 'composite',
            //     then: Joi.boolean().required()
            // }),
            // output: Joi.when('isWindowOutput', {
            //     is: true,
            //     then: Joi.object({
            //         type: Joi.string().valid('all', 'sliding').required(),
            //         interval: Joi.number().integer().required(),
            //         unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
            //     }).required()
            // }),
            // sensor: Joi.when('type', {
            //     is: 'raw',
            //     then: Joi.string().trim().required()
            // }),
            // config: Joi.when('type', {
            //     is: 'raw',
            //     then: Joi.array().items(
            //         Joi.object({
            //             name: Joi.string().trim().required().messages({
            //                 'string.base': 'Name must be a string.',
            //                 'any.required': 'Name is required in config for raw type.'
            //             }),
            //             value: Joi.string().trim().required().messages({
            //                 'string.base': 'Value must be a string.',
            //                 'any.required': 'Value is required in config for raw type.'
            //             }),
            //         }).unknown(),
            //     ).required()
            // }).messages({
            //     'any.required': 'Config is required for raw type.'
            // }),
            // isWindowInputRaw: Joi.when('type', {
            //     is: 'raw',
            //     then: Joi.boolean().required()
            // }),
            // inputRaw: Joi.when('isWindowInputRaw', {
            //     is: true,
            //     then: Joi.object({
            //         type: Joi.string().valid('all', 'sliding').required(),
            //         interval: Joi.number().integer().required(),
            //         unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
            //     }).required()
            // }),
            // isWindowOutputRaw: Joi.when('type', {
            //     is: 'raw',
            //     then: Joi.boolean().required()
            // }),
            // outputRaw: Joi.when('isWindowOutputRaw', {
            //     is: true,
            //     then: Joi.object({
            //         type: Joi.string().valid('all', 'sliding').required(),
            //         interval: Joi.number().integer().required(),
            //         unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
            //     }).required()
            // })
        }).unknown();

        const utilityFunctionSchema = Joi.object({
            functionName: Joi.string().trim().required().messages({
                'string.base': 'Function Name must be a string.',
                'any.required': 'Function Name is required.'
            }),
            functionType: Joi.string().valid('maximize', 'constant', 'minimize', 'constraint').insensitive().required().messages({
                'string.base': 'Function Type must be a string.',
                'any.required': 'Function Type is required.',
                'any.only': 'Function Type must be either "Maximize" , "Constant", "Constant" or "Minimize.'
            }),
            functionExpression: Joi.string().trim().required().messages({
                'string.base': 'Function Expression must be a string.',
                'any.required': 'Function Expression is required.'
            }),
            functionExpressionVariables: Joi.array().items(
                Joi.object({
                    nameVariable: Joi.string().trim().required().messages({
                        'string.base': 'Name Variable Value must be a string.',
                        'any.required': 'Name Variable Value is required.'
                    }),
                    valueVariable: Joi.string().trim().required().messages({
                        'string.base': 'Expression Variable Value must be a string.',
                        'any.required': 'Expression Variable Value is required.'
                    })
                }).unknown().required()
            ).messages({
                'array.base': 'Expression Variables must be an array.'
            })
        }).unknown();

        return {
            convertComponentsToBackendFormat(body, doc) {
                if (body.metrics && Array.isArray(body.metrics)) {
                    body.metrics.forEach((metric, index) => {
                        if (metric.level === 'components' && Array.isArray(metric.components)) {
                            body.metrics[index].components = metric.components.map(component => {
                                if (typeof component === 'string') {
                                    return {componentName: component};
                                }
                                return component;
                            });
                        }
                    });
                }
                Object.assign(doc, body);
            },
            convertComponentsToFrontendFormat(doc) {
                const docCopy = {...doc};

                if (docCopy.metrics && Array.isArray(docCopy.metrics)) {
                    docCopy.metrics = docCopy.metrics.map(metric => {
                        if (metric.level === 'components' && Array.isArray(metric.components)) {
                            metric.components = metric.components.map(componentObj => componentObj.componentName);
                        }
                        return metric;
                    });
                }

                return docCopy;
            },
            validateDocument(doc) {
                let errorResponses = [];

                const validateArray = (dataArray, schema, arrayName) => {
                    if (Array.isArray(dataArray)) {
                        dataArray.forEach((item, index) => {
                            const {error} = schema.validate(item);
                            if (error) {
                                error.details.forEach(detail => {
                                    let message = detail.message.replace(/\"/g, "");
                                    errorResponses.push({
                                        path: `${arrayName}[${index}].${detail.path.join('.')}`,
                                        index: index.toString(),
                                        key: detail.path[detail.path.length - 1],
                                        message: message
                                    });
                                });
                            }
                        });
                    }
                };
                const validateField = (data, schema, fieldName) => {
                    const {error} = schema.validate(data);
                    if (error) {
                        error.details.forEach(detail => {
                            let message = detail.message.replace(/\"/g, "");
                            errorResponses.push({
                                path: `${fieldName}.${detail.path.join('.')}`,
                                message: message
                            });
                        });
                    }
                };

                validateField(doc.content, contentSchema, 'content');
                validateArray(doc.variables, variableSchema, 'variables');
                validateArray(doc.resources, resourcesSchema, 'resources');
                validateArray(doc.parameters, parameterSchema, 'parameters');
                validateArray(doc.templates, templateSchema, 'templates');
                validateArray(doc.metrics, metricSchema, 'metrics');
                validateArray(doc.utilityFunctions, utilityFunctionSchema, 'utilityFunctions');
                validateArray(doc.environmentVariables, environmenSchema, 'environmentVariables');

                if (errorResponses.length > 0) {
                    throw self.apos.error('required', 'Validation failed', {error: errorResponses});
                }
            },
            async updateWithRegions(req, doc) {

                return new Promise(async (resolve) => {

                    const resource_uuids = doc.resources.map(r => {
                        return r.uuid
                    })
                    const resources = await self.apos.modules.resources
                        .find(req, {'uuid': {$in: resource_uuids}})
                        .project({
                            title: 1,
                            uuid: 1,
                            organization: 1,
                            platform: 1,
                            regions: 1,
                            validInstanceTypes: 1,
                            subnet: 1,
                            endpoint: 1,
                            scope: 1,
                            project: 1,
                            identityVersion: 1,
                            credentials: 1,
                            defaultNetwork: 1,
                            securityGroup: 1,
                            sshCredentials: 1,
                            _platform: 1
                        })
                        .toArray();

                    resources.forEach((resource) => {
                        resource.regions = Array.isArray(resource.regions) ? resource.regions.join(",") : resource.regions;
                        resource._regions = Array.isArray(resource.regions) ? resource.regions.join(",") : resource.regions;
                        resource.validInstanceTypes = resource.validInstanceTypes || [];
                        resource._valid_instance_types = Array.isArray(resource.regions) ? resource.regions.join(",") : resource.regions;
                        ['_edit', '_publish', '_delete', '_create', 'metaType', 'type', '_id'].forEach(key => {
                            delete resource[key]
                        })
                    })

                    doc.resources.forEach(r => {
                        const found = resources.find((tr) => tr.uuid === r.uuid)
                        if (found) {
                            _.extend(r, found)
                        }
                    })

                    return resolve();
                })
            },
            async getDSL(req, uuid) {
                const updatedApp = await self.find(req, {uuid: uuid}).project(projection).toArray();
                const doc = updatedApp.pop();
                if (!doc) {
                    return {
                        'json': {},
                        'metricModel': {},
                    }
                }

                await self.updateWithRegions(req, doc)
                const docJson = kubevela.json(doc)
                const metricModel = metric_model.yaml(doc)


                return {
                    'json': docJson,
                    'metricModel': metricModel,
                }
            },

            async updateState(req, uuid, state) {
                try {
                    const existingApp = await self.apos.doc.db.findOne({uuid});
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }
                    existingApp.status = state;
                    await self.apos.doc.db.updateOne(
                        {uuid},
                        {$set: {status: state}}
                    );
                    console.log(`Status changed to ${state} for application with uuid: ${uuid}`);
                } catch (error) {
                    console.error(`Error changing status: ${error.message}`);
                }
            },
        };
    },
    apiRoutes(self) {
        return {
            post: {
                async validate(req) {
                    if (!self.apos.permission.can(req, 'edit')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const doc = req.body;
                    let errorResponses = self.validateDocument(doc) || [];
                    if (errorResponses.length > 0) {
                        throw self.apos.error('required', 'Validation failed', {error: errorResponses});
                    }
                },
                async 'generate'(req) {
                    if (!self.apos.permission.can(req, 'edit')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }
                    const contents = req.body

                    if (!contents || !contents.prompt) {
                        return {
                            'success': false,
                            'answer': ''
                        }
                    }

                    const aiPrompt = await self.apos.modules.prompt.find(req, {'title': 'default'})
                        .limit(1).toObject()

                    if (!aiPrompt) {
                        console.error('No default prompt found');
                        return {
                            'success': false,
                            'answer': ''
                        }
                    }

                    const client = new OpenAI({
                        'apiKey': process.env.OPENAI_KEY
                    });

                    const response = await client.responses.create({
                        model: aiPrompt.model,
                        input: aiPrompt.content
                                +"The contents of the application description can be found between the ``` ``` in the following section"
                                +"```"+contents.prompt+"```",
                    });

                    return {
                        'success': true,
                        'answer': response.output_text
                    }

                },
                async ':uuid/uuid/deploy'(req) {

                    const uuid = req.params.uuid;

                    // let errorResponses = self.validateDocument(updateData, true) || [];
                    // if (errorResponses.length > 0) {
                    //     throw self.apos.error('required', 'Validation failed', { error: errorResponses });
                    // }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    const existingApp = await self.apos.doc.db.findOne({uuid: uuid, organization: adminOrganization});
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }

                    try {

                        const updatedApp = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toArray();
                        await self.apos.modules.exn.send_application_dsl(uuid)
                        await self.apos.doc.db.updateOne(
                            {uuid: uuid},
                            {$set: {'status': 'deploying'}}
                        );
                        return {
                            status: 'deploying',
                            message: 'Application is being deployed',
                            updatedResource: updatedApp
                        };

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/uuid/undeploy'(req) {
                    const uuid = req.params.uuid;
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    // Fetch the existing application document
                    const existingApp = await self.apos.doc.find(req, {
                        uuid: uuid,
                        organization: adminOrganization
                    }).toObject();
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }

                    try {
                        existingApp.status = 'undeploying';
                        await self.apos.doc.update(req, existingApp);

                        const response = {
                            status: 'undeploying',
                            message: 'Application undeployment started',
                            updatedResource: existingApp
                        };

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/uuid/duplicate'(req) {
                    const {uuid} = req.params;
                    const {title} = req.body;

                    if (!self.apos.permission.can(req, 'edit')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const existingApp = await self.apos.doc.db.findOne({uuid: uuid});
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }

                    const newDocData = {
                        title: title || `${existingApp.title} Copy`,
                        type: existingApp.type,
                        status: 'draft',
                        visibility: existingApp.visibility,
                        content: existingApp.content,
                        variables: _.cloneDeep(existingApp.variables),
                        environmentVariables: _.cloneDeep(existingApp.environmentVariables),
                        resources: _.cloneDeep(existingApp.resources),
                        templates: _.cloneDeep(existingApp.templates),
                        parameters: _.cloneDeep(existingApp.parameters),
                        metrics: _.cloneDeep(existingApp.metrics),
                        sloViolations: _.cloneDeep(existingApp.sloViolations),
                        utilityFunctions: _.cloneDeep(existingApp.utilityFunctions),

                        slug: `${existingApp.slug}-copy-${Date.now()}`,
                        uuid: uuidv4(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        _id: undefined,
                    };

                    const newDoc = await self.insert(req, newDocData);

                    return newDoc;
                },
                async 'status'(req) {
                    const {uuids} = req.body;

                    if (!self.apos.permission.can(req, 'view')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    try {
                        const currentUser = req.user;
                        const adminOrganization = currentUser.organization;

                        const apps = await self
                            .find(req, {uuid: {$in: uuids}, organization: adminOrganization})
                            .project({uuid: 1, status: 1})
                            .toArray();

                        return apps;
                    } catch (error) {
                        throw self.apos.error('error', error.message);
                    }
                }

            },
            get: {
                async all(req) {
                    if (!self.apos.permission.can(req, 'view')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const filters = {};
                        filters.organization = adminOrganization;
                        return await self.find(req, filters).project(projection).toArray();
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;

                    if (!self.apos.permission.can(req, 'view')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const doc = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Application not found');
                        }

                        if (doc.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        const responseDoc = self.convertComponentsToFrontendFormat(doc);


                        return responseDoc;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/json'(req) {
                    const uuid = req.params.uuid;

                    if (!self.apos.permission.can(req, 'view')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const doc = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Application not found');
                        }

                        if (doc.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        let json_output = kubevela.json(doc)
                        req.res.type('application/json');
                        req.res.setHeader('Content-Disposition', `attachment; filename="${uuid}.json"`);
                        return json_output;

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/yaml'(req) {
                    const uuid = req.params.uuid;

                    if (!self.apos.permission.can(req, 'view')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const doc = await self.find(req, {
                            uuid: uuid,
                            organization: adminOrganization
                        }).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Application not found');
                        }

                        if (doc.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        req.res.type('application/yaml');
                        req.res.setHeader('Content-Disposition', `attachment; filename="${uuid}.yaml"`);

                        //const yamlContent = yaml.stringify(doc);
                        const yamlContent = metric_model.yaml(doc);
                        const test = yaml.stringify(yamlContent);


                        return test;

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
            delete: {
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    if (!uuid) {
                        throw self.apos.error('invalid', 'UUID is required');
                    }

                    const doc = await self.find(req, {uuid: uuid, organization: adminOrganization}).toObject();
                    if (!doc) {
                        throw self.apos.error('notfound', 'Application not found');
                    }

                    if (!self.apos.permission.can(req, 'delete')) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action');
                    }

                    //Validation of the state of Application
                    // if (doc.status === 'deploying' || doc.status === 'running') {
                    //     throw self.apos.error('forbidden', 'Application cannot be deleted while deploying or running');
                    // }

                    try {
                        const docs = await self.apos.db.collection('aposDocs').find({
                            uuid: uuid,
                            organization: adminOrganization
                        }).toArray();

                        if (!docs || docs.length === 0) {
                            throw self.apos.error('notfound', 'Document not found');
                        }

                        if (docs[0].organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        for (const doc of docs) {
                            await self.apos.db.collection('aposDocs').deleteOne({_id: doc._id});
                        }

                        return {status: 'success', message: 'Application deleted successfully'};
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
            patch: {
                async ':uuid/uuid'(req) {
                    const uuid = req.params.uuid;
                    const updateData = req.body;

                    // let errorResponses = self.validateDocument(updateData, true) || [];
                    // if (errorResponses.length > 0) {
                    //     throw self.apos.error('required', 'Validation failed', { error: errorResponses });
                    // }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;
                    const existingApp = await self.apos.doc.db.findOne({uuid: uuid, organization: adminOrganization});
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }

                    try {

                        const app = await self.find(req, {uuid: uuid}).toObject();
                        self.convertComponentsToBackendFormat(req.body, app);
                        const updatedApp = await self.update(req, app);
                        await self.publish(req, app);
                        return {
                            status: 'success',
                            message: 'Application partially updated successfully',
                            updatedResource: updatedApp
                        };
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
        };
    }
};

