const fs = require('fs');
const { stringify } = require('csv-stringify');
const coordinapeConfig = require('./coordinape_config.json');

const GRAPHQL_URL = 'https://coordinape-prod.hasura.app/v1/graphql';
console.log('GRAPHQL_URL:', GRAPHQL_URL);

async function fetchContributions() {
    console.log('fetchContributions');

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${coordinapeConfig.circle_api_key}`,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            query: `
                query ContributionsQuery {
                    contributions(where: {circle_id: {_eq: "${coordinapeConfig.circle_id}"}}, order_by: {updated_at: desc}) {
                        id
                        user_id
                        updated_at
                        description
                    }
                }              
            `
        })
    });

    const { data } = await response.json();
    console.log('data:', data);

    exportToCSV(data.contributions);
}

function exportToCSV(contributions) {
    console.log('exportToCSV');

    const filename = 'coordinape-contributions.csv';
    const writeableStream = fs.createWriteStream(filename);
    const columns = [
        'id',
        'user_id',
        'updated_at',
        'description'
    ];
    const stringifier = stringify({ header: true, columns: columns });
    for (const contribution of contributions) {
        console.log('Writing contribution to CSV:', contribution);
        stringifier.write(contribution);
    }
    stringifier.pipe(writeableStream);
    console.log('Finished writing data to CSV:', filename);
}

fetchContributions();
