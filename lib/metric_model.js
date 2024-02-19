const slugify = require("slugify");
const _ = require("lodash");
const yaml = require('yaml');

module.exports = {
    yaml: (doc) => {
        let object = _.clone(doc)

        const protectedVariables = ["_id", "type", "metaType", "organization", "_edit", "_publish", "variables", "utilityFunctions", "resources", "parameters",];
        protectedVariables.forEach(p => {
            delete object[p];
        });

        if (object.templates) {
            object.templates = object.templates.map(v => {

                return {

                    id: v.id,
                    type: v.type,
                    range: [v.minValue, v.maxValue],
                    unit: v.unit
                }
            });
        }

        object.metrics_comp = [];
        object.metrics_global = [];

        if (object.metrics) {
            object.metrics.forEach(v => {
                let metricsDetail = {};

                if (v.type === 'composite') {
                    const componentNames = v.components.map(component => component.componentName).join(', ');

                    let windowDetail = {};

                    if (v.isWindowInput && v.input.type && v.input.interval && v.input.unit) {
                        windowDetail.type = v.input.type;
                        windowDetail.size = `${v.input.interval} ${v.input.unit}`;
                    }
                    if (v.isWindowOutput && v.output.type && v.output.interval && v.output.unit) {
                        windowDetail.output = `${v.output.type} ${v.output.interval} ${v.output.unit}`;
                    }

                    metricsDetail = {
                        name: v.name,
                        type: v.type,
                        template: componentNames,
                        window: windowDetail
                    };

                } else if (v.type === 'raw') {

                    let windowDetailRaw = {};

                    if (v.isWindowInputRaw && v.inputRaw.type && v.inputRaw.interval && v.inputRaw.unit) {
                        windowDetailRaw.type = v.inputRaw.type;
                        windowDetailRaw.size = `${v.inputRaw.interval} ${v.inputRaw.unit}`;
                    }
                    if (v.isWindowOutputRaw && v.outputRaw.type && v.outputRaw.interval && v.outputRaw.unit) {
                        windowDetailRaw.output = `${v.outputRaw.type} ${v.outputRaw.interval} ${v.outputRaw.unit}`;
                    }
                    metricsDetail = {
                        name: v.name,
                        type: v.type,
                        sensor: {
                            type: v.sensor
                        },
                        window: windowDetailRaw
                    };
                }

                const metric = {
                    metrics: metricsDetail
                };

                if (v.type === 'composite' && v.components.length < 2) {
                    object.metrics_global.push(metric);
                } else if (v.type === 'composite' && v.components.length >= 2) {
                    object.metrics_comp.push(metric);
                } else if (v.type === 'raw') {
                    object.metrics_global.push(metric);
                }
            });
        }





        if (object.sloViolations) {
            const processSloViolations = (violations) => {
                const buildConstraint = (v, parentCondition = '') => {
                    let constraint = '';
                    if (!v.isComposite) {
                        constraint = `${v.metricName} ${v.operator} ${v.value}`;
                    } else {
                        const childConstraints = v.children.map(child => buildConstraint(child, v.condition)).join(` ${v.condition} `);

                        if (v.not) {
                            constraint = `NOT (${childConstraints})`;
                        } else {
                            constraint = `(${childConstraints})`;
                        }
                    }
                    return constraint;
                };

                const combinedConstraint = buildConstraint(violations);

                const requirement = {
                    name: 'Combined SLO',
                    type: 'slo',
                    constraint: combinedConstraint
                };

                return [requirement];
            };

            object.sloViolations = processSloViolations(JSON.parse(doc['sloViolations']));
        }

        const yamlDoc = {
            apiVersion: "nebulous/v1",
            kind: "MetricModel",
            metadata: {
                name: object.uuid,
                labels: {
                    app: object.title,
                }
            },
            common: object.templates,
            spec: {
            components: object.metrics_comp
            },
            scopes: [
                {
                    name: "app-wide-scope",
                    requirements: object.sloViolations,
                    components: object.metrics_global,
                }
            ]
        };

        return yamlDoc;
    }
};
