const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const yaml = require('yaml');
const slugify = require('slugify');
const mathutils = require('../../lib/math');
const metric_model = require('../../lib/metric_model');
const kubevela = require('../../lib/kubevela')
const exn = require('../../lib/exn')
const _=require('lodash')

const container = require('rhea');
let connection;
let application_new_sender;
let application_update_sender;
let application_dsl_generic;
let application_dsl_metric;
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
                                { label: 'Integer', value: 'int' },
                                { label: 'Double', value: 'double' }
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
                                { label: 'Global', value: 'global' },
                                { label: 'Components', value: 'components' }
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
                                {label: 'Constant', value: 'constant'}
                            ]
                        },
                        functionExpression: {
                            type: 'string',
                            label: 'Function Expression',
                            textarea: true
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
                fields: ['title', 'uuid','status', 'content', 'variables','environmentVariables']
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
            // 'apostrophe:ready': {
            //     async setUpActiveMq() {
            //         console.log("Set up rhea",
            //             self.options.amqp_host, self.options.amqp_port);
            //
            //         container.on('connection_open', function (context) {
            //             application_new_sender = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.new');
            //             application_update_sender = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.update');
            //             application_dsl_generic = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.dsl.generic');
            //             application_dsl_metric = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.dsl.metric_model');
            //         });
            //
            //         connection = container.connect({
            //             'host': self.options.amqp_host,
            //             'port': self.options.amqp_port,
            //             'reconnect':true,
            //             'username':'admin',
            //             'password':'admin'
            //         });
            //
            //     }
            // },
            beforeInsert: {
                async generateUuid(req, doc, options) {
                    if (!doc.uuid) {
                        doc.uuid = uuidv4();
                    }
                    if (req.user && req.user.organization) {
                        doc.organization = req.user.organization;
                    }
                }
            },
            // afterInsert:{
            //     async postMessages(req,doc,option){
            //         console.log("Application created " + doc.uuid)
            //
            //         //produce application.json
            //
            //
            //         //product metric model
            //
            //         //post to activemq
            //         application_new_sender.send({
            //             "body":{"uuid":doc.uuid},
            //         });
            //         application_dsl_generic.send({body:{}});
            //
            //     }
            // },
            // afterSave: {
            //         async processAppAfterSave(req, doc, options) {
            //             try {
            //                 console.log("UUID:", doc.uuid);
            //                 const applicationData = await self.getApplicationData(doc.uuid);
            //                 return applicationData;
            //             } catch (error) {
            //                 console.error('Error', error);
            //             }
            //     }
            // }
            afterDeploy:{
              async deployApplication(req,doc,options){
                  console.log("After deployment",doc.uuid)
                  if(connection){
                      application_update_sender.send({
                          "body":{"uuid":doc.uuid},
                          "message_annotations":{
                              "application":doc.uuid
                          }
                      });
                      application_dsl_generic.send({body:{}, "message_annotations":{
                              "application":doc.uuid
                          }});
                  }
              }
            },
            afterUpdate:{
                async postMessages(req,doc,option){
                    console.log("After update", doc.uuid);

                    //produce application.json


                    //product metric model

                    //post to activemq

                    // eu.nebulouscloud.ui.application.new

                    // eu.nebulouscloud.ui.application.updated
                    if(connection){
                        application_update_sender.send({
                            "body":{"uuid":doc.uuid},
                            "message_annotations":{
                                "application":doc.uuid
                            }
                        });
                        application_dsl_generic.send({body:{}, "message_annotations":{
                                "application":doc.uuid
                            }});
                    }
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

        // const metricSchema = Joi.object({
        //     type: Joi.string().valid('composite', 'raw').required().messages({
        //         'any.required': 'Metric type is required.',
        //         'string.valid': 'Metric type must be either "composite" or "raw".'
        //     }),
        //     level: Joi.string().required().messages({
        //         'string.base': 'Level must be a string.',
        //         'any.required': 'Level is required.',
        //         'any.only': 'Level must be either "Global" or "Components".'
        //     }),
        //     components: Joi.when('level', {
        //         is: 'components',
        //         then: Joi.array().items(Joi.object({
        //             componentName: Joi.string().trim().required().messages({
        //                 'string.base': 'Component Name must be a string.',
        //                 'any.required': 'Component Name is required in components.'
        //             })
        //         }).unknown()).required()
        //     }).required(),
        //     name: Joi.when('type', {
        //         is: 'composite,raw',
        //         then: Joi.string().trim().required().messages({
        //             'any.required': 'Name is required for composite metrics.',
        //             'string.empty': 'Name cannot be empty.'
        //         })
        //     }),
        //     formula: Joi.when('type', {
        //         is: 'composite',
        //         then: Joi.string().trim().required().messages({
        //             'any.required': 'Formula is required for composite metrics.',
        //             'string.empty': 'Formula cannot be empty.'
        //         })
        //     }),
        //     isWindowInput: Joi.when('type', {
        //         is: 'composite',
        //         then: Joi.boolean().required()
        //     }),
        //     input: Joi.when('isWindowInput', {
        //         is: true,
        //         then: Joi.object({
        //             type: Joi.string().valid('all', 'sliding').required(),
        //             interval: Joi.number().integer().required(),
        //             unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
        //         }).required()
        //     }),
        //     isWindowOutput: Joi.when('type', {
        //         is: 'composite',
        //         then: Joi.boolean().required()
        //     }),
        //     output: Joi.when('isWindowOutput', {
        //         is: true,
        //         then: Joi.object({
        //             type: Joi.string().valid('all', 'sliding').required(),
        //             interval: Joi.number().integer().required(),
        //             unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
        //         }).required()
        //     }),
        //     sensor: Joi.when('type', {
        //         is: 'raw',
        //         then: Joi.string().trim().required()
        //     }),
        //     config: Joi.when('type', {
        //         is: 'raw',
        //         then: Joi.array().items(
        //             Joi.object({
        //                 name: Joi.string().trim().required().messages({
        //                     'string.base': 'Name must be a string.',
        //                     'any.required': 'Name is required in config for raw type.'
        //                 }),
        //                 value: Joi.string().trim().required().messages({
        //                     'string.base': 'Value must be a string.',
        //                     'any.required': 'Value is required in config for raw type.'
        //                 }),
        //             }).unknown(),
        //         ).required()
        //     }).messages({
        //         'any.required': 'Config is required for raw type.'
        //     }),
        //     isWindowInputRaw: Joi.when('type', {
        //         is: 'raw',
        //         then: Joi.boolean().required()
        //     }),
        //     inputRaw: Joi.when('isWindowInputRaw', {
        //         is: true,
        //         then: Joi.object({
        //             type: Joi.string().valid('all', 'sliding').required(),
        //             interval: Joi.number().integer().required(),
        //             unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
        //         }).required()
        //     }),
        //     isWindowOutputRaw: Joi.when('type', {
        //         is: 'raw',
        //         then: Joi.boolean().required()
        //     }),
        //     outputRaw: Joi.when('isWindowOutputRaw', {
        //         is: true,
        //         then: Joi.object({
        //             type: Joi.string().valid('all', 'sliding').required(),
        //             interval: Joi.number().integer().required(),
        //             unit: Joi.string().valid('ms', 'sec', 'min', 'hour', 'day').required()
        //         }).required()
        //     })
        // }).unknown();

        const utilityFunctionSchema = Joi.object({
            functionName: Joi.string().trim().required().messages({
                'string.base': 'Function Name must be a string.',
                'any.required': 'Function Name is required.'
            }),
            functionType: Joi.string().valid('maximize', 'constant','minimize').insensitive().required().messages({
                'string.base': 'Function Type must be a string.',
                'any.required': 'Function Type is required.',
                'any.only': 'Function Type must be either "Maximize" , "Constant" or "Minimize.'
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
            isValidStateTransition(currentState, newState) {
                const validTransitions = {
                    'draft': ['valid'],
                    'valid': ['deploying'],
                    'deploying': ['running'],
                    'running': ['draft']
                };

                if (validTransitions[currentState].indexOf(newState) === -1) {
                    return false;
                }

                return true;
            },
            validateDocument(doc) {
                let errorResponses = [];

                const validateArray = (dataArray, schema, arrayName) => {
                    if (Array.isArray(dataArray)) {
                        dataArray.forEach((item, index) => {
                            const { error } = schema.validate(item);
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
                    const { error } = schema.validate(data);
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
                //validateArray(doc.metrics, metricSchema, 'metrics');
                validateArray(doc.utilityFunctions, utilityFunctionSchema, 'utilityFunctions');

                if (errorResponses.length > 0) {
                    throw self.apos.error('required', 'Validation failed', {error: errorResponses});
                }
            },
            async getApplicationData(uuid) {
                try {

                    const application = await self.apos.doc.db.findOne({ uuid: uuid });
                    if (!application) {
                        throw self.apos.error('notfound', 'Application not found', { uuid });
                    }


                    const data = {
                        application: {
                            name: application.title,
                            uuid: application.uuid
                        },
                        kubvela: {
                            original: application.content,
                            variables: application.variables.map(variable => ({
                                key: variable.name,
                                value: variable.isConstant ? {
                                    lower: variable.value,
                                    upper: false
                                } : {
                                    lower: variable.lowerValue,
                                    upper: variable.higherValue
                                },
                                meaining: '...',
                                type: 'float',
                                is_constant: variable.isConstant
                            }))
                        },
                        cloud_providers: application.resources.map(resource => ({
                            type: resource.platform,
                            sal_key: resource.uuid
                        })),
                        metrics: application.metrics.map(metric => ({
                            type: metric.type,
                            key: metric.nameResult,
                            name: metric.name,
                            formula: metric.type === 'composite' ? metric.formula : undefined,
                            window: metric.type === 'composite' && metric.isWindow ? {
                                input: metric.input ? {
                                    type: metric.input.type,
                                    interval: metric.input.interval,
                                    unit: metric.input.unit
                                } : {},
                                output: metric.output ? {
                                    type: metric.output.type,
                                    interval: metric.output.interval,
                                    unit: metric.output.unit
                                } : {}
                            } : undefined,
                            sensor: metric.type === 'raw' ? metric.sensor : undefined,
                            config: metric.type === 'raw' ? metric.config.map(c => ({
                                name: c.name,
                                value: c.value
                            })) : undefined
                        })),
                        slo: JSON.parse(application.sloViolations),
                        utility_functions: application.utilityFunctions.map(func => ({
                            key: func.functionName,
                            name: func.functionName,
                            type: func.functionType,
                            formula: func.functionExpression,
                            mapping: func.functionExpressionVariables.reduce((map, variable) => {
                                map[variable.nameVariable] = variable.valueVariable;
                                return map;
                            }, {})
                        }))
                    };

                    return data;
                } catch (error) {
                    throw self.apos.error('notfound', 'Application not found', {uuid});
                }
            }
        };
    },
    apiRoutes(self) {
        return {
            post: {
                async validate (req) {
                    if (!self.apos.permission.can(req, 'edit')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                        const doc = req.body;
                        let errorResponses = self.validateDocument(doc) || [];
                        if (errorResponses.length > 0) {
                            throw self.apos.error('required', 'Validation failed', { error: errorResponses });
                        }
                },
                 async ':uuid/uuid/deploy' (req) {

                     const uuid = req.params.uuid;

                     // let errorResponses = self.validateDocument(updateData, true) || [];
                     // if (errorResponses.length > 0) {
                     //     throw self.apos.error('required', 'Validation failed', { error: errorResponses });
                     // }
                     const currentUser = req.user;
                     const adminOrganization = currentUser.organization;

                     const existingApp = await self.apos.doc.db.findOne({ uuid: uuid , organization:adminOrganization });
                     if (!existingApp) {
                         throw self.apos.error('notfound', 'Application not found');
                     }

                     try {

                         const updatedApp = await self.find(req,{ uuid: uuid , organization:adminOrganization }).project(projection).toArray();
                         const updatedAppItem = updatedApp.pop();

                         await exn.application_dsl(uuid,
                             kubevela.json(updatedAppItem), metric_model.yaml(updatedAppItem)
                         );

                         //TODO refactor to use apostrophe CMS ORM
                         await self.apos.doc.db.updateOne(
                             { uuid: uuid },
                             { $set: {'status':'deploying'} }
                         );
                         if(updatedApp.length > 0 ){
                             await self.emit('afterDeploy', req, updatedApp[0]);
                         }
                         return { status: 'deployed', message: 'Application deployed successfully', updatedResource: updatedApp };

                     } catch (error) {
                         throw self.apos.error(error.name, error.message);
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


                        const docs = await self.find(req, filters).project(projection).toArray();
                        return docs;
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
                        const doc = await self.find(req, { uuid: uuid , organization:adminOrganization}).project(projection).toObject();
                        if (!doc) {
                            throw self.apos.error('notfound', 'Application not found');
                        }

                        if (doc.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        return doc;
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
                        const doc = await self.find(req, { uuid: uuid , organization:adminOrganization}).project(projection).toObject();
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
                        const doc = await self.find(req, { uuid: uuid, organization: adminOrganization }).project(projection).toObject();
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

                    const doc = await self.find(req, { uuid: uuid , organization:adminOrganization }).toObject();
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
                        const docs = await self.apos.db.collection('aposDocs').find({ uuid: uuid, organization:adminOrganization }).toArray();

                        if (!docs || docs.length === 0) {
                            throw self.apos.error('notfound', 'Document not found');
                        }

                        if (docs[0].organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        for (const doc of docs) {
                            await self.apos.db.collection('aposDocs').deleteOne({ _id: doc._id });
                        }

                        return { status: 'success', message: 'Application deleted successfully' };
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

                    const existingApp = await self.apos.doc.db.findOne({ uuid: uuid , organization:adminOrganization });
                    if (!existingApp) {
                        throw self.apos.error('notfound', 'Application not found');
                    }
                    const currentState = existingApp.status;
                    const newState = updateData.status;

                    //Validation of the state of Application
                    // if (!self.isValidStateTransition(currentState, newState)) {
                    //     throw self.apos.error('invalid', 'Invalid state transition');
                    // }


                    try {
                        await self.apos.doc.db.updateOne(
                            { uuid: uuid },
                            { $set: updateData }
                        );

                        //TODO refactor to use apostrophe CMS ORM
                        const updatedApp = await self.find(req,{ uuid: uuid , organization:adminOrganization }).project(projection).toArray();
                        if(updatedApp.length > 0 ){
                            await self.emit('afterUpdate', req, updatedApp[0]);
                        }
                        return { status: 'success', message: 'Application partially updated successfully', updatedResource: updatedApp };
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
        };
    }
};

