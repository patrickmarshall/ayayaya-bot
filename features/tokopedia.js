const fetch = require('node-fetch')
const Database = require("easy-json-database")
const { exec } = require('child_process');


const db = new Database("./tokopedia.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

// Define your curl command
const curlCommand = `curl 'https://gql.tokopedia.com/graphql/ComponentInfoQuery' \
-H 'sec-ch-ua: "Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"' \
-H 'X-Version: 7a667a2' \
-H 'sec-ch-ua-mobile: ?0' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' \
-H 'content-type: application/json' \
-H 'accept: */*' \
-H 'Referer: https://www.tokopedia.com/discovery/kejar-diskon?source=homepage.left_carousel.0.300634&activeTab=2' \
-H 'X-Source: tokopedia-lite' \
-H 'X-Tkpd-Lite-Service: zeus' \
-H 'sec-ch-ua-platform: "macOS"' \
--data-raw $'[{"operationName":"ComponentInfoQuery","variables":{"identifier":"kejar-diskon","componentId":"7","device":"desktop","filters":"{\\"rpc_UserID\\":\\"15856394\\",\\"count_only\\":\\"true\\",\\"rpc_UserAddressId\\":\\"48199182\\",\\"rpc_UserCityId\\":\\"174\\",\\"rpc_UserDistrictId\\":\\"2256\\",\\"rpc_UserLat\\":\\"-6.192652\\",\\"rpc_UserLong\\":\\"106.774851\\",\\"rpc_UserPostCode\\":\\"11530\\",\\"rpc_UserWarehouseId\\":\\"12210375\\",\\"source\\":\\"homepage.left_carousel.0.300634\\"}"},"query":"query ComponentInfoQuery($identifier: String\u0021, $componentId: String\u0021, $device: String\u0021, $filters: String) {\\n  componentInfo(identifier: $identifier, component_id: $componentId, device: $device, filters: $filters) {\\n    data\\n    __typename\\n  }\\n}\\n"}]'`;

function fetchFlashDealData(ctx, componentId) {
    // new Promise(() => fetch("https://gql.tokopedia.com/graphql/ComponentInfoQuery", {
    //     "headers": {
    //         "accept": "*/*",
    //         "content-type": "application/json",
    //         "sec-ch-ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
    //         "sec-ch-ua-mobile": "?0",
    //         "sec-ch-ua-platform": "\"macOS\"",
    //         "x-source": "tokopedia-lite",
    //         "x-tkpd-lite-service": "zeus",
    //         "x-version": "7a667a2",
    //         "Referer": "https://www.tokopedia.com/discovery/kejar-diskon?source=homepage.left_carousel.0.300634&activeTab=2",
    //         "Referrer-Policy": "no-referrer-when-downgrade"
    //     },
    //     "body": "[{\"operationName\":\"ComponentInfoQuery\",\"variables\":{\"identifier\":\"kejar-diskon\",\"componentId\":\"7\",\"device\":\"desktop\",\"filters\":\"{\\\"rpc_UserID\\\":\\\"15856394\\\",\\\"count_only\\\":\\\"true\\\",\\\"rpc_UserAddressId\\\":\\\"48199182\\\",\\\"rpc_UserCityId\\\":\\\"174\\\",\\\"rpc_UserDistrictId\\\":\\\"2256\\\",\\\"rpc_UserLat\\\":\\\"-6.192652\\\",\\\"rpc_UserLong\\\":\\\"106.774851\\\",\\\"rpc_UserPostCode\\\":\\\"11530\\\",\\\"rpc_UserWarehouseId\\\":\\\"12210375\\\",\\\"source\\\":\\\"homepage.left_carousel.0.300634\\\"}\"},\"query\":\"query ComponentInfoQuery($identifier: String!, $componentId: String!, $device: String!, $filters: String) {\\n  componentInfo(identifier: $identifier, component_id: $componentId, device: $device, filters: $filters) {\\n    data\\n    __typename\\n  }\\n}\\n\"}]",
    //     "method": "POST"
    // })
    //     .then((r) => {
    //         console.log(r)
    //         r.json()
    //     })
    //     .then((r) => {
    //         ctx.reply(r)
    //     })
    //     .catch(error => {
    //         console.log(error)
    //     })
    // )
    // Execute the curl command
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        try {
            const responseData = JSON.parse(stdout);
            console.log('Response data:', responseData);
          } catch (parseError) {
            console.error('Error parsing response data:', parseError);
          }
    });
}

function currentFlashdeal(ctx) {
    fetchFlashDealData(ctx, 7);
}

function nextFlashdeal(ctx) {

}

function getLastValue() {
    const component = db.get('component');
    const now = new Date();
    const currentHour = now.getHours();

    let lastValidHour = component[0].hour;
    for (let i = 1; i < component.length; i++) {
        if (component[i].hour > currentHour) {
            break;
        }
        lastValidHour = component[i].hour;
    }

    return component.find(entry => entry.hour === lastValidHour)?.value;
}

function insertComponent(ctx) {
    let messages = ctx.message.text.split(" ")

    if (!messages[1]) {
        ctx.reply(`Please provide hour!`)
    } else if (!messages[2]) {
        ctx.reply(`Please provide value!`)
    }

    const hour = messages[1];
    const value = messages[2];

    const component = db.get('component');
    const newData = { "hour": parseInt(hour), "value": String(value) }; // Convert hour to number and value to string

    // Check if hour already exists
    const existingIndex = component.findIndex(entry => entry.hour === newData.hour);

    if (existingIndex !== -1) {
        // Hour exists, update the value
        component[existingIndex].value = newData.value;
    } else {
        // Hour doesn't exist, insert the new entry
        let index = 0;
        // Compare hours as numerical values
        while (index < component.length && component[index].hour < newData.hour) {
            index++;
        }
        component.splice(index, 0, newData);
    }

    db.set('component', component);
    ctx.reply(`Component inserted at hour ${hour} with value ${value}`);
}

module.exports = {
    currentFlashdeal,
    nextFlashdeal,
    insertComponent
}