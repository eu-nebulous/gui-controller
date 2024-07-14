const slugify = require("slugify");
const _ = require("lodash");
const yaml = require('yaml');

module.exports = {
    yaml: (doc) => {
        let object = _.cloneDeep(doc);
        let componentsForAppSpecComp = [];
        let componentsForAppWideScope = [];

        const protectedVariables = ["_id", "type", "metaType", "organization", "_edit", "_publish", "variables", "utilityFunctions", "resources"];
        protectedVariables.forEach(p => {
            delete object[p];
        });
        
        //Templates
        if (object.templates) {
            object.templates = object.templates.map(v => ({
                id: v.id,
                type: v.type,
                range: [v.minValue, v.maxValue],
                unit: v.unit
            }));
        }

        object.metrics_comp = [];
        object.metrics_global = [];
        //Metrics
        if (object.metrics) {
            object.metrics.forEach(v => {
                let metricsDetail = {};

                if (v.type === 'composite') {
                    let windowDetail = {};

                    if (v.isWindowInput && v.input.type && v.input.interval && v.input.unit) {
                        windowDetail = {
                            type: v.input.type,
                            size: `${v.input.interval} ${v.input.unit}`,
                        };
                    }
                    
                    // Only add windowDetail to metricsDetail if it's not empty
                    if (Object.keys(windowDetail).length > 0) {
                        metricsDetail.window = windowDetail;
                    }

                    let componentNames = v.components ? v.components.map(component => component.componentName) : [];

                    if (componentNames.length === 1) {
                        componentsForAppSpecComp.push(componentNames[0]);
                    } else if (componentNames.length > 1) {
                        componentsForAppWideScope = componentsForAppWideScope.concat(componentNames);
                    }

                    metricsDetail = {
                        name: v.name,
                        type: v.type,
                        template: v.template,
                        formula: v.formula,
                        ...metricsDetail,
                    };

                    if (v.isWindowOutput && v.output.type && v.output.interval && v.output.unit) {
                        metricsDetail.output = `${v.output.type} ${v.output.interval} ${v.output.unit}`;
                    }
                } else if (v.type === 'raw') {
                    let configs = v.config.map(configItem => ({
                        [configItem.name]: configItem.value
                    }));

                    let configObject = configs.reduce((acc, current) => ({ ...acc, ...current }), {});

                    metricsDetail = {
                        name: v.name,
                        type: v.type,
                        sensor: {
                            type: v.sensor,
                            config: configObject,
                        }
                    };
                    
                    if (v.outputRaw && v.outputRaw.type && v.outputRaw.interval && v.outputRaw.unit) {
                        metricsDetail.output = `${v.outputRaw.type} ${v.outputRaw.interval} ${v.outputRaw.unit}`;
                    }
                    if (v.template) {
                        metricsDetail.template = v.template;
                    }

                    let componentNames = v.components ? v.components.map(component => component.componentName) : [];

                    if (componentNames.length === 1) {
                        componentsForAppSpecComp.push(componentNames[0]);
                    } else if (componentNames.length > 1) {
                        componentsForAppWideScope = componentsForAppWideScope.concat(componentNames);
                    }
                }

                if (v.components && v.components.length === 1) {
                    object.metrics_comp.push({...metricsDetail});
                } else {
                    object.metrics_global.push({...metricsDetail});
                }
            });
        }
        
        //SLO Violations 
        if (object.sloViolations) {
            const processSloViolations = (violations) => {
                const buildConstraint = (v, parentCondition = '') => {
                    let constraint = '';
                    if (!v.isComposite) {
                        constraint = `${v.metricName} ${v.operator} ${v.value}`;
                    } else {
                        const childConstraints = v.children.map(child => buildConstraint(child, v.condition)).join(` ${v.condition} `);

                        constraint = v.not ? `NOT (${childConstraints})` : `(${childConstraints})`;
                    }
                    return constraint;
                };

                const combinedConstraint = buildConstraint(JSON.parse(doc['sloViolations']));

                return [{
                    name: 'combined-slo',
                    type: 'slo',
                    constraint: combinedConstraint
                }];
            };

            object.sloViolations = processSloViolations(object.sloViolations);
        }
        
            let specContent = {
                components: [
                    ...componentsForAppSpecComp,
                    { 
                        name: "spec-comp",
                        metrics: object.metrics_comp 
                    } 
                ], scopes: [{
                name: "app-wide-scope",
                components: componentsForAppWideScope,
                metrics: object.metrics_global,
                requirements: object.sloViolations ? object.sloViolations : [],
            }]
        };

        //Parameters + push to app wide scope
        if (object.parameters) {
            const parametersMetrics = object.parameters.map(v => ({
                name: v.name,
                type: "constant",
                initialValue: v.initialValue,
                template: v.template
            }));

            if (parametersMetrics.length > 0) {
                specContent.scopes.push({
                    name: "parameters-scope",
                    components: [], 
                    metrics: parametersMetrics, 
                });

            }
        }
        
        //Construct and return the final version
        const yamlDoc = {
            apiVersion: "nebulous/v1",
            kind: "MetricModel",
            metadata: {
                name: object.uuid,
                labels: {
                    app: object.title,
                }
            },
            templates: object.templates,
            spec: specContent
        };
        return yamlDoc;
    }
};

