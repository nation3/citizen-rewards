const fs = require('fs');
const { stringify } = require('csv-stringify');
const coordinapeConfig = require('./coordinape_config.json');

const GRAPHQL_URL = 'https://coordinape-prod.hasura.app/v1/graphql';
console.log('GRAPHQL_URL:', GRAPHQL_URL);

async function fetchProfiles() {
    console.log('fetchProfiles');

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${coordinapeConfig.circle_api_key}`,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            query: `
                query ProfilesQuery {
                    profiles(order_by: {id: asc}) {
                        id
                        created_at
                    }
                }
            `
        })
    });

    const { data } = await response.json();
    console.log('data:', data);

    exportToCSV(data.profiles);
}

function exportToCSV(profiles) {
    console.log('exportToCSV');

    const filename = 'coordinape-profiles.csv';
    const writeableStream = fs.createWriteStream(filename);
    const columns = [
        'id',
        'created_at'
    ];
    const stringifier = stringify({ header: true, columns: columns });
    for (const profile of profiles) {
        console.log('Writing profile to CSV:', profile);
        stringifier.write(profile);
    }
    stringifier.pipe(writeableStream);
    console.log('Finished writing data to CSV:', filename);
}

fetchProfiles();
