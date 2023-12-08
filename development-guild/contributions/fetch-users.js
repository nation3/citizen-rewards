const fs = require('fs');
const { stringify } = require('csv-stringify');

const GRAPHQL_URL = 'https://coordinape-prod.hasura.app/v1/graphql';
console.log('GRAPHQL_URL:', GRAPHQL_URL);

async function fetchUsers() {
    console.log('fetchUsers');

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer api|E0WXWOBQRpU4S1DTXSiCSkKEcZJ09m0sM7QKwETu',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            query: `
                query UsersQuery {
                    users(order_by: {id: asc}) {
                        id
                        created_at
                    }
                }
            `
        })
    });

    const { data } = await response.json();
    console.log('data:', data);

    exportToCSV(data.users);
}

function exportToCSV(users) {
    console.log('exportToCSV');

    const filename = 'coordinape-users.csv';
    const writeableStream = fs.createWriteStream(filename);
    const columns = [
        'id',
        'created_at'
    ];
    const stringifier = stringify({ header: true, columns: columns });
    for (const user of users) {
        console.log('Writing user to CSV:', user);
        stringifier.write(user);
    }
    stringifier.pipe(writeableStream);
    console.log('Finished writing data to CSV:', filename);
}

fetchUsers();
