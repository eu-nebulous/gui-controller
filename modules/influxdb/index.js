require('dotenv').config();
const {InfluxDB} = require('@influxdata/influxdb-client');

const connection_options = {
    'url': process.env.INFLUX_URL,
    'token': process.env.INFLUX_TOKEN,
    'organization': process.env.INFLUX_ORGANIZATION,
}

module.exports = {
    methods(self) {
        return {
            getAvailableMeasurements(uuid) {
                const influxDB = new InfluxDB({
                    url: connection_options.url,
                    token: connection_options.token,
                });

                const queryApi = influxDB.getQueryApi(connection_options.organization);

                return new Promise((resolve, reject) => {

                    const measurements = [];

                    // Query to get all unique measurements from the bucket
                    const fluxQuery = `
                                  import "influxdata/influxdb/schema"
                                  
                                  schema.measurements(
                                    bucket: "nebulous_${uuid}_bucket"
                                  )
                                `;

                    queryApi.queryRows(fluxQuery, {
                        next(row, tableMeta) {
                            const o = tableMeta.toObject(row);
                            if (o._value) {
                                measurements.push(o._value);
                            }
                        },
                        error(error) {
                            console.error('Query error:', error);
                            resolve(measurements);
                        },
                        complete() {
                            resolve(measurements);
                        },
                    });
                })
            },
            getTimeSeriesForMeasurements(uuid, measurements = [], time = '-3h') {
                return new Promise((resolve, reject) => {


                    try {
                        const influxDB = new InfluxDB({
                            url: connection_options.url,
                            token: connection_options.token,
                        });

                        const queryApi = influxDB.getQueryApi(connection_options.organization);

                        const timeSeriesData = [];

                        // Build the measurement filter
                        let measurementFilter = '';
                        if (measurements.length > 0) {
                            const measurementList = measurements.map(m => `r._measurement == "${m}"`).join(' or ');
                            measurementFilter = `|> filter(fn: (r) => ${measurementList})`;
                        }

                        // Query to get time series data
                        const fluxQuery = `
                from(bucket: "nebulous_${uuid}_bucket")
                    |> range(start: ${time})
                    ${measurementFilter}
                    |> filter(fn: (r) => r._field == "metricValue")
                    |> sort(columns: ["_time"])
            `;

                        queryApi.queryRows(fluxQuery, {
                            next(row, tableMeta) {
                                const o = tableMeta.toObject(row);
                                timeSeriesData.push({
                                    time: o._time,
                                    measurement: o._measurement,
                                    value: o._value,
                                });
                            },
                            error(error) {
                                console.error('Query error:', error);
                                resolve([]);
                            },
                            complete() {
                                // Group data by measurement
                                const groupedData = timeSeriesData.reduce((acc, item) => {
                                    if (!acc[item.measurement]) {
                                        acc[item.measurement] = [];
                                    }
                                    acc[item.measurement].push(item);
                                    return acc;
                                }, {});

                                // Transform into metrics format
                                const metrics = Object.entries(groupedData).map(([measurement, data]) => {
                                    // Sort by time
                                    const sortedData = data.sort((a, b) =>
                                        new Date(a.time).getTime() - new Date(b.time).getTime()
                                    );

                                    // Extract values and create labels
                                    const values = sortedData.map(d => d.value);
                                    const labels = sortedData.map(d =>
                                        new Date(d.time).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    );

                                    // Calculate statistics
                                    const latestValue = values[values.length - 1] || 0;
                                    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

                                    // Determine chart type based on measurement name
                                    let type = 'line';
                                    if (measurement.includes('constraint') || measurement.includes('slo')) {
                                        type = 'bar';
                                    }

                                    return {
                                        title: measurement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                        summary: `${latestValue.toFixed(2)} (avg: ${avgValue.toFixed(2)})`,
                                        type: type,
                                        config: {
                                            labels: labels,
                                            datasets: [{
                                                label: measurement,
                                                data: values
                                            }]
                                        },
                                        data: {
                                            value: latestValue
                                        }
                                    };
                                });

                                resolve(metrics);
                            },
                        });
                    } catch (e) {
                        console.error('[InfluxDB] Query error:', e);
                        resolve([]);
                    }
                });
            }
        }
    }

}
