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
                    contributions(where: {circle_id: {_eq: "${coordinapeConfig.circle_id}"}}, order_by: {id: desc}) {
                        id
                        profile_id
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
        'profile_id',
        'passport_id',
        'updated_at',
        'hours_spent',
        'description'
    ];
    const stringifier = stringify({ header: true, columns: columns });
    const citizenDetailsJson = require('../../citizen_details_per_coordinape_profile_id.json');
    for (const contribution of contributions) {
        console.log('contribution:', contribution);
        const citizenDetails = citizenDetailsJson[contribution.profile_id];
        contribution['passport_id'] = citizenDetails.citizen_passport_id;
        contribution['hours_spent'] = extractHoursSpent(contribution.description);
        console.log('Writing contribution to CSV:', contribution);
        stringifier.write(contribution);
    }
    stringifier.pipe(writeableStream);
    console.log('Finished writing data to CSV:', filename);
}

function extractHoursSpent(contributionDescription) {
    console.log('extractHoursSpent');
    
    // Look for number inside brackets ("[3.5h]" or "[2h]")
    if ((String(contributionDescription).trim().startsWith('['))) {
        contributionDescription = String(contributionDescription).trim();
        contributionDescription = String(contributionDescription).substring(1, String(contributionDescription).length);
        hoursSpent = String(contributionDescription).split(']')[0];
        hoursSpent = String(hoursSpent).replace('h', '');
        hoursSpent = String(hoursSpent).trim();
        return Number(hoursSpent);
    }

    // If hours were not reported, assume 20 minutes by default
    return 0.33;
}

fetchContributions();
