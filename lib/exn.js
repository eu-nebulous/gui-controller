require('dotenv').config();
const container= require('rhea');

const connection_options={
    'port': process.env.ACTIVEMQ_PORT,
    'host': process.env.ACTIVEMQ_HOST,
    'username': process.env.ACTIVEMQ_USERNAME,
    'password': process.env.ACTIVEMQ_PASSWORD,
    'reconnect': true
}

console.log(process.env.EXN_DISABLE)

if(process.env.EXN_DISABLE == "True"){
    console.error("Disable connection");
    return
}

if (!connection_options.port || !connection_options.host) {
    console.error("No connection option provided for EXN skipping asynchronous messaging");
    return
} else {
    const connection = container.connect(connection_options);
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


const correlations = {}

container.on('message', (context)=>{
    if(context.message.correlation_id in correlations){
        if(context.message.body.metaData['status'] >= 400){
            correlations[context.message.correlation_id]['reject'](context.message.body['message'])
        }else{
            correlations[context.message.correlation_id]['resolve'](context.message.body)
        }
    }
})


container.on('connection_open', function (context) {

    console.log("Connected ",context.container.id);
    context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.get.reply')
    context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.create.reply')
    context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.cloud.delete.reply')
    context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.nodecandidate.get.reply')
    context.connection.open_receiver('topic://eu.nebulouscloud.exn.sal.node.create.reply')

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

});




const {v4: uuidv4} = require("uuid");


module.exports = {
    sender_ui_application_new:(uuid) => {
        return new Promise((resolve,reject) =>{
            const correlation_id = uuidv4()
            correlations[correlation_id] = {
                'resolve':resolve,
                'reject':reject,
            };
            const message = {
                to: sender_ui_application_new.options.target.address,
                correlation_id: correlation_id,
                message_annotations: {application: uuid},
                body:{
                    uuid: uuid
                }
            }
            console.log("Send ", message)
            sender_ui_application_new.send(message)

        })
    },
    application_dsl:(uuid,json,yaml) => {
        return new Promise((resolve,reject) =>{
            const correlation_id = uuidv4()
            correlations[correlation_id] = {
                'resolve':resolve,
                'reject':reject,
            };
            console.log("Sending ", sender_ui_application_dsl_json.options.target.address, uuid,json)
            const message = {
                to: sender_ui_application_dsl_json.options.target.address,
                correlation_id: correlation_id,
                message_annotations: {application: uuid},
                application_properties: {application: uuid},
                body:json
            }
            sender_ui_application_dsl_json.send(message)

            const metric_model_payload ={
                'application': uuid,
                'yaml': yaml
            }

            console.log("Sending ", sender_ui_application_dsl_metric.options.target.address, uuid, metric_model_payload)
            const metric_message = {
                to: sender_ui_application_dsl_metric.options.target.address,
                correlation_id: correlation_id,
                message_annotations: {application: uuid},
                application_properties: {application: uuid},
                body:metric_model_payload
            }
            sender_ui_application_dsl_metric.send(metric_message)

            return resolve()

        })
    },
    application_updated:(uuid) => {
        return new Promise((resolve,reject) =>{
            const correlation_id = uuidv4()
            correlations[correlation_id] = {
                'resolve':resolve,
                'reject':reject,
            };
            const message = {
                to: sender_ui_application_updated.options.target.address,
                correlation_id: correlation_id,
                message_annotations: {application: uuid},
                application_properties: {application: uuid},
                body:{
                    uuid: uuid
                }
            }
            console.log("Send ", message)
            sender_ui_application_updated.send(message)

        })
    },
    register_cloud:(doc) =>{
        return new Promise((resolve,reject)=>{

            const correlation_id = uuidv4()
            correlations[correlation_id] = {
                'resolve':resolve,
                'reject':reject,
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
                to: sender_sal_cloud_post.options.target.address,
                correlation_id: correlation_id,
                body:{
                    metaData: {
                        userId: "admin"
                    },
                    body: JSON.stringify([{
                        "cloudId": doc.uuid,
                        "cloudProviderName": doc._platform[0].provider_name,
                        "cloudType": "PUBLIC",
                        "excluded_instance_types": doc.excludedInstanceTypes,
                        "securityGroup": doc.securityGroup || '',
                        "subnet": doc.subnet || null,
                        "sshCredentials": {
                            "username": doc.sshCredentials.username,
                            "keyPairName": doc.sshCredentials.keyPairName,
                            "privateKey": formatPrivateKey(doc.sshCredentials.privateKey)
                        },
                        "endpoint": doc.endpoint,
                        "scope": {
                            "prefix": null,
                            "value": null
                        },
                        "identityVersion": doc.identityVersion,
                        "defaultNetwork": doc.defaultNetwork,
                        "credentials": {
                            "user": doc.credentials.user,
                            "secret": doc.credentials.secret,
                            "domain": doc.credentials.domain || null
                        },
                        "blacklist": null
                    }])
                }
            }
            console.log("Send ", message)
            sender_sal_cloud_post.send(message)
        })
    },
    get_cloud_candidates: () => {
        return new Promise((resolve,reject)=> {

            const correlation_id = uuidv4()
            correlations[correlation_id] = {
                'resolve': resolve,
                'reject': reject,
            };

            const message = {
                to: sender_sal_nodecandidate_get.options.target.address,
                correlation_id: correlation_id,
                body: {
                    body:[]
                }
            }
            sender_sal_nodecandidate_get.send(message)
        })

    },
    publish_policies:(policies) =>{
        return new Promise((resolve,reject)=> {

            const body = JSON.parse(policies)
            body.forEach((b)=>{

                const correlation_id = uuidv4()
                const rule = {
                    to: sender_ui_policies_rule_upsert.options.target.address,
                    correlation_id: correlation_id,
                    body: [{
                        "name": b['name'],
                        "policyItem": b['policyItem']
                    }]
                }

                const model = {
                    to: sender_ui_policies_model_upsert.options.target.address,
                    correlation_id: correlation_id,
                    body: [{
                        "name": b['name'],
                        "enabled": true,
                        "modelText": b['model']
                    }]
                }

                sender_ui_policies_model_upsert.send(model)
                sender_ui_policies_rule_upsert.send(rule)

            })

            resolve()


        })

    },
    application_undeploy: (uuid) => {
        return new Promise((resolve, reject) => {
            const correlation_id = uuidv4();
            correlations[correlation_id] = {
                resolve: async (message) => {
                    console.log("Undeploy resolved", message);
                    const newUuid = uuidv4();
                    await updateApplicationStatusAndUuid(uuid, 'draft', newUuid);
                    resolve(message);
                },
                reject: (error) => {
                    console.error("Undeploy failed", error);
                    reject(error);
                }
            };


            const message = {
                to: sender_sal_cloud_delete.options.target.address,
                correlation_id: correlation_id,
                message_annotations: { application: uuid },
                body: {
                    metaData: {
                        userId: "admin"
                    },
                    applicationId: uuid
                }
            };

            console.log("Sending undeploy message to cloud: ", message);
            sender_sal_cloud_delete.send(message);
        });
    }

}


function formatPrivateKey(key) {
                                
    // Replace Windows and Mac line endings with Unix line endings
    if (key.includes("\r\n") || key.includes("\r") || key.includes("\\r\\n") || key.includes("\\n")) {
        key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    }
    // Replace escaped newlines with real newlines

    if (key.includes("\\n")) {
        return key.replace(/\\n/g, '\n');
    }
    return key;
}
