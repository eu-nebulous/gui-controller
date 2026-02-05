require('dotenv').config();
const container = require('rhea');
const jsesc = require('jsesc');
const {v4: uuidv4} = require("uuid");
const _ = require('lodash');

const application_projection = {
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

const connection_options = {
    'port': process.env.ACTIVEMQ_PORT,
    'host': process.env.ACTIVEMQ_HOST,
    'username': process.env.ACTIVEMQ_USERNAME,
    'password': process.env.ACTIVEMQ_PASSWORD,
    'reconnect': true
}

let sender_sal_nodecandidate_get;
let sender_sal_cloud_get;
let sender_sal_cloud_post;
let sender_sal_cloud_delete;
let sender_sal_node_post;

let sender_ui_application_new;
let sender_ui_application_updated;
let sender_ui_application_deploy;
let sender_ui_application_undeploy;
let sender_ui_application_dsl_json;
let sender_ui_application_dsl_metric;

let sender_ui_policies_rule_upsert;
let sender_ui_policies_model_upsert;

let sender_bqa_validate_slos;

let sender_app_influxdb;


let sender_ui_application_user_info;
let sender_ui_application_info;


const correlations = {}
let aposSelf = null;



const reply_application_dsl_request = async (uuid,correlation_id) => {

    const req = aposSelf.apos.task.getReq()
    const dsl = await aposSelf.apos.modules.application.getDSL(req, uuid)
    const message = {
        to: sender_ui_application_info.options.target.address,
        correlation_id: correlation_id,
        message_annotations: {application: uuid},
        application_properties: {application: uuid},
        body: dsl.json
    }
    sender_ui_application_info.send(message)
}

const reply_application_user_request = async (uuid,correlation_id) => {
    const req = aposSelf.apos.task.getReq()
    const user = await aposSelf.apos.modules['@apostrophecms/user']
        .find(req,{uuid:uuid})
        .toObject()

    const message = {
        to: sender_ui_application_user_info.options.target.address,
        correlation_id: correlation_id,
        message_annotations: {},
        application_properties: {},
        body:_.pick(user,['uuid','username','title','firstname','lastnmae','role','organization'])
    }
    sender_ui_application_user_info.send(message)
}

module.exports = {
    handlers(self){
        return {
            'apostrophe:ready':{
                async setupListener(self,options){
                    console.log("ready")
                    container.on('message', async (context) => {

                        if (context.message.to === "topic://eu.nebulouscloud.ui.app.get") {
                            console.log("Received topic://eu.nebulouscloud.ui.app.get ", context.message, "with correlation id ",context.message.correlation_id )
                            await aposSelf.reply_application_dsl_request(context.message.body.appId,context.message.correlation_id);
                            console.log("Received topic://eu.nebulouscloud.ui.app.get ", context.message, "with correlation id ",context.message.correlation_id," ... replied" )
                        }

                        if (context.message.to === "topic://eu.nebulouscloud.ui.user.get") {
                            console.log("Received topic://eu.nebulouscloud.ui.user.get ", context.message, "with correlation id ",context.message.correlation_id )
                            await aposSelf.reply_application_user_request(context.message.body.token,context.message.correlation_id);
                            console.log("Received topic://eu.nebulouscloud.ui.user.get ", context.message, "with correlation id ",context.message.correlation_id," ... replied" )
                        }

                        if (context.message.to === "topic://eu.nebulouscloud.optimiser.controller.app_state") {
                            await aposSelf.update_application_state(context.message.application_properties.application, context.message.body);
                        }

                        if (context.message.to === "topic://eu.nebulouscloud.ontology.bqa.reply") {
                            correlations[context.message.correlation_id]['resolve'](context.message.body)
                            return
                        }
                        if (context.message.to === "topic://eu.nebulouscloud.app_cluster.influxdb.get.reply") {
                            correlations[context.message.correlation_id]['resolve'](context.message.body)
                            return
                        }

                        if (context.message.correlation_id in correlations) {
                            if (context.message.body.metaData['status'] >= 400) {
                                correlations[context.message.correlation_id]['reject'](context.message.body['message'])
                            } else {
                                correlations[context.message.correlation_id]['resolve'](context.message.body)
                            }
                        }
                    })
                    container.on('connection_open', function (context) {

                        console.log("Connected ", context.container.id);
                        context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.get.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.create.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.delete.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.nodecandidate.get.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.node.create.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.optimiser.controller.app_state')
                        context.connection.open_receiver('topic://eu.nebulouscloud.ui.user.get')
                        context.connection.open_receiver('topic://eu.nebulouscloud.ui.app.get')
                        context.connection.open_receiver('topic://eu.nebulouscloud.ontology.bqa.reply')
                        context.connection.open_receiver('topic://eu.nebulouscloud.app_cluster.influxdb.get.reply')

                        sender_sal_nodecandidate_get = context.connection.open_sender('topic://eu.nebulouscloud.exn.sal.nodecandidate.get');
                        sender_sal_cloud_get = context.connection.open_sender('topic://eu.nebulouscloud.exn.sal.cloud.get');
                        sender_sal_cloud_post = context.connection.open_sender('topic://eu.nebulouscloud.exn.sal.cloud.create');
                        sender_sal_cloud_delete = context.connection.open_sender('topic://eu.nebulouscloud.exn.sal.cloud.delete');
                        sender_sal_node_post = context.connection.open_sender('topic://eu.nebulouscloud.exn.sal.node.create');

                        sender_ui_application_new = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.new');
                        sender_ui_application_updated = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.updated');
                        sender_ui_application_deploy = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.deploy');
                        sender_ui_application_undeploy = context.connection.open_sender('topic://eu.nebulouscloud.ui.application.undeploy');
                        sender_ui_application_dsl_json = context.connection.open_sender('topic://eu.nebulouscloud.ui.dsl.generic');
                        sender_ui_application_dsl_metric = context.connection.open_sender('topic://eu.nebulouscloud.ui.dsl.metric_model');

                        sender_ui_policies_rule_upsert = context.connection.open_sender('topic://eu.nebulouscloud.ui.policies.rule.upsert');
                        sender_ui_policies_model_upsert = context.connection.open_sender('topic://eu.nebulouscloud.ui.policies.model.upsert');

                        sender_ui_application_user_info = context.connection.open_sender('topic://eu.nebulouscloud.ui.user.get.reply');
                        sender_ui_application_info = context.connection.open_sender('topic://eu.nebulouscloud.ui.app.get.reply');

                        sender_bqa_validate_slos = context.connection.open_sender('topic://eu.nebulouscloud.ontology.bqa');
                        sender_app_influxdb = context.connection.open_sender('topic://eu.nebulouscloud.app_cluster.influxdb.get');

                    });

                    if (process.env.EXN_DISABLE == "True") {
                        console.error("EXN connection disabled");
                        return
                    }

                    if (!connection_options.port || !connection_options.host) {
                        console.error("No connection option provided for EXN skipping asynchronous messaging");
                        return
                    } else {
                        const connection = container.connect(connection_options);
                        console.log("Connected to ",connection_options.host, ":", connection_options.port );
                    }


                }

            }
        }

    },

    methods(self) {
        aposSelf = self
        return {
            reply_application_dsl_request,
            reply_application_user_request,
            async update_application_state(uuid,body){
                const req = aposSelf.apos.task.getReq()
                aposSelf.apos.modules.application.updateState(req, uuid, body.state.toLowerCase())
            },
            async send_application_dsl(uuid) {
                new Promise(async (resolve, reject) => {
                    const req = aposSelf.apos.task.getReq()
                    const dsl = await aposSelf.apos.modules.application.getDSL(req, uuid)

                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };
                    console.log("Sending ", sender_ui_application_dsl_json.options.target.address, uuid, dsl.json)
                    const message = {
                        to: sender_ui_application_dsl_json.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        application_properties: {application: uuid},
                        body: dsl.json
                    }
                    sender_ui_application_dsl_json.send(message)

                    const metric_model_payload = {
                        'application': uuid, 'yaml': dsl.metricModel
                    }

                    console.log("Sending ", sender_ui_application_dsl_metric.options.target.address, uuid, metric_model_payload)
                    const metric_message = {
                        to: sender_ui_application_dsl_metric.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        application_properties: {application: uuid},
                        body: metric_model_payload
                    }
                    sender_ui_application_dsl_metric.send(metric_message)
                    resolve()
                })

            },
            application_undeploy(uuid) {
                return new Promise((resolve, reject) => {
                    const correlation_id = uuidv4();
                    // correlations[correlation_id] = {
                    //     resolve: async (message) => {
                    //         console.log("Undeploy resolved", message);
                    //         resolve({
                    //             "newUuid": uuidv4(),
                    //             "message": message,
                    //         });
                    //     }, reject: (error) => {
                    //         console.error("Undeploy failed", error);
                    //         reject(error);
                    //     }
                    // };


                    const message = {
                        to: sender_ui_application_undeploy.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        body: {
                            metaData: {
                                userId: "admin"
                            }, applicationId: uuid
                        }
                    };

                    console.log("Sending undeploy message: ", message);
                    sender_ui_application_undeploy.send(message);
                    resolve({
                            "newUuid": uuidv4(),
                            "message": message
                        }
                    )
                });
            },
            sender_ui_application_new(uuid) {
                return new Promise((resolve, reject) => {
                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };
                    const message = {
                        to: sender_ui_application_new.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        body: {
                            uuid: uuid
                        }
                    }
                    console.log("Send ", message)
                    sender_ui_application_new.send(message)

                })
            }, application_updated(uuid) {
                return new Promise((resolve, reject) => {
                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };
                    const message = {
                        to: sender_ui_application_updated.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        application_properties: {application: uuid},
                        body: {
                            uuid: uuid
                        }
                    }
                    console.log("Send ", message)
                    sender_ui_application_updated.send(message)

                })
            }, register_cloud(doc) {
                return new Promise((resolve, reject) => {

                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };

                    /**
                     *
                     *        // Amazon Web Service Elastic Compute Cloud
                     *         AWSEC2("aws-ec2"),
                     *         // Azure VM
                     *         AZUREVM("azure"),
                     *         // Google CLoud Engine
                     *         GCE("gce"),
                     *         // OpenStack NOVA
                     *         OPENSTACKNOVA("openstack"),
                     *         // BYON, to be used for on-premise baremetal
                     *         BYON("byon"),
                     *         // EDGE nodes
                     *         EDGE("edge");
                     *
                     */

                    const message = {
                        to: sender_sal_cloud_post.options.target.address, correlation_id: correlation_id, body: {
                            metaData: {
                                userId: "admin"
                            }, body: jsesc([{
                                "cloudId": doc.uuid,
                                "cloudProviderName": doc._platform[0].provider_name,
                                "cloudType": "PUBLIC",
                                "valid_instance_types": doc.validInstanceTypes,
                                "securityGroup": doc.securityGroup || '',
                                "subnet": doc.subnet || null,
                                "sshCredentials": {
                                    "username": doc.sshCredentials.username,
                                    "keyPairName": doc.sshCredentials.keyPairName,
                                    "privateKey": doc.sshCredentials.privateKey
                                },
                                "endpoint": doc.endpoint,
                                "scope": {
                                    "prefix": doc.scope, "value": doc.project
                                },
                                "identityVersion": doc.identityVersion,
                                "defaultNetwork": doc.defaultNetwork,
                                "credentials": {
                                    "user": doc.credentials.user,
                                    "secret": doc.credentials.secret,
                                    "domain": doc.credentials.domain || null
                                },
                                "blacklist": null
                            }], {json: true, isScriptContext: true}) // This handles special characters

                        }
                    }
                    console.log("Send ", message)
                    sender_sal_cloud_post.send(message)
                })
            }
            ,
            async bqa_application_validate(uuid) {
                return new Promise(async (resolve, reject) => {

                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };
                     const req = aposSelf.apos.task.getReq()
                     const dsl = await aposSelf.apos.modules.application.getDSL(req, uuid)
                     const message = {
                        to: sender_bqa_validate_slos.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        application_properties: {application: uuid},
                        body: dsl.json
                    }
                   const timer = setTimeout(() => {
                        console.warn("SLO Validator timeout")
                        resolve({
                            'valid':true
                        })
                    }, 7000);

                    console.log("[bqa_application_validate] Send ", JSON.stringify( message))
                    sender_bqa_validate_slos.send(message)
                })
            },
            async getApplicationInfluxDBCredentials(uuid) {
                return new Promise((resolve, reject) => {

                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };
                     const req = aposSelf.apos.task.getReq()
                     const message = {
                        to: sender_app_influxdb.options.target.address,
                        correlation_id: correlation_id,
                        message_annotations: {application: uuid},
                        application_properties: {application: uuid},
                         body:""
                    }
                   const timer = setTimeout(() => {
                        console.warn("InfluxDB Crendetials not retrieved for application = ",uuid)
                        resolve(false)
                    }, 7000);

                    console.log("[getApplicationInfluxDBCrendetials] Send ", JSON.stringify( message))
                    sender_app_influxdb.send(message)
                })
            },
            get_cloud_candidates() {
                return new Promise((resolve, reject) => {

                    const correlation_id = uuidv4()
                    correlations[correlation_id] = {
                        'resolve': resolve, 'reject': reject,
                    };

                    const message = {
                        to: sender_sal_nodecandidate_get.options.target.address,
                        correlation_id: correlation_id,
                        body: {
                            body: []
                        }
                    }
                    sender_sal_nodecandidate_get.send(message)
                })

            }
            ,
            publish_policies(policies) {
                return new Promise((resolve, reject) => {

                    const body = JSON.parse(policies)
                    body.forEach((b) => {

                        const correlation_id = uuidv4()
                        const rule = {
                            to: sender_ui_policies_rule_upsert.options.target.address,
                            correlation_id: correlation_id,
                            body: [{
                                "name": b['name'], "policyItem": b['policyItem']
                            }]
                        }

                        const model = {
                            to: sender_ui_policies_model_upsert.options.target.address,
                            correlation_id: correlation_id,
                            body: [{
                                "name": b['name'], "enabled": true, "modelText": b['model']
                            }]
                        }

                        sender_ui_policies_model_upsert.send(model)
                        sender_ui_policies_rule_upsert.send(rule)

                    })

                    resolve()


                })

            }

        }
    }

}
