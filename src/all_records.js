const axios = require('axios');

const WIX_API_URL = 'https://www.wixapis.com/wix-data/v2/items/query';
const DATASET_ID = 'your-dataset-id';
const API_KEY = 'your-api-key';  // Use OAuth or API key as per Wix docs

async function fetchAllRecords() {
    let allRecords = [];
    let cursor = null;

    do {
        const response = await axios.post(WIX_API_URL, {
            dataCollectionId: DATASET_ID,
            query: {},
            paging: {
                limit: 50,
                cursor: cursor
            }
        }, {
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const { items, pageSize, nextCursor } = response.data;

        allRecords = allRecords.concat(items);

        cursor = nextCursor;  // Set cursor for next request

    } while (cursor);  // Continue until cursor is null

    return allRecords;
}

// Usage
fetchAllRecords()
    .then(records => {
        console.log(`Fetched ${records.length} records.`);
    })
    .catch(error => {
        console.error('Error fetching records:', error);
    });