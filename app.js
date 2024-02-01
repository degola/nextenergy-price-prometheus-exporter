const HTTP_PORT = parseInt(process.env.HTTP_PORT || 8080)

const http = require('http')
const url = require('url')
const client = require('prom-client')
const register = new client.Registry()

async function collectElectricityPrice() {
    // next energy is a dutch electricity provider, let's use Amsterdam timezone
    return new Promise(async (resolve, reject) => {
        const ams_date_string = new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
        const date_amsterdam = new Date(ams_date_string)
        const currentHour = date_amsterdam.getHours()
        const priceDate = [
            date_amsterdam.getFullYear(),
            ("" + (parseInt(date_amsterdam.getMonth()) + 1)).padStart(2, '0'),
            ("" + date_amsterdam.getDate()).padStart(2, '0')
        ].join('-')

        const nextEnergyBody = {
            versionInfo: {
                // it seems to be just an internal hash of deploy versions, so we can just hardcode it and see what happens...
                moduleVersion: "GArkw9ah6WKj1Qy4h5mAsQ",
                apiVersion: "Bc8_XAfp3W7kn4dKB4nXdg"
            },
            viewName: "MainFlow.MarketPrices",
            "screenData":{
                variables: {
                    Graphsize:348,
                    Filter_CurrentHour: currentHour,
                    Filter_PriceDate: priceDate,
                    Filter_CostsLevelId: 3,
                    IsOpenPopup: false,
                    HighchartsJSON: JSON.stringify({
                        chart: {
                            zoomType: 'x',
                            panning: true,
                            panKey: 'shift',
                            style: {
                                fontFamily: 'Roobert, sans-serif'
                            }
                        },

                        xAxis: {categories:  ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'],
                            tickInterval: 2,
                            lineColor: 'none',
                            gridLineColor: '#CECECE',
                            gridLineWidth: 0.5,
                            tickWidth: 0.5,
                            tickLength: 30,
                            tickColor: '#CECECE',
                            opposite: true,
                            title: {
                                margin: 5,
                                style: {
                                    color: '#888888',
                                    fontSize: '1em'
                                }
                            },
                            labels: {
                                align: 'left',
                                rotation: 0,
                                x: 3,
                                y: -18,
                                style: {
                                    color: '#888888',
                                    fontSize: '1em'
                                }
                            }, plotLines: [{
                                color: '#00BA85',
                                width: 1,
                                value:4},{
                                color: '#00BA85',
                                width: 1,
                                value:6},{
                                color: '#00BA85',
                                width: 1,
                                value:13},{
                                color: '#00BA85',
                                width: 1,
                                value:16},],
                            plotBands: [{
                                color: {
                                    linearGradient: { x1: 1, y1: 0, x2: 1, y2: 1 },
                                    stops: [
                                        [0, 'rgba(153, 227, 206, 0)'],
                                        [1, 'rgba(153, 227, 206, 0.6)']
                                    ]
                                },
                                from: 4,
                                to: 6,
                            },{
                                color: {
                                    linearGradient: { x1: 1, y1: 0, x2: 1, y2: 1 },
                                    stops: [
                                        [0, 'rgba(153, 227, 206, 0)'],
                                        [1, 'rgba(153, 227, 206, 0.6)']
                                    ]
                                },
                                from: 13,
                                to: 16,
                            },]
                        },

                        yAxis: {
                            plotLines: [{
                                color: '#CECECE',
                                width: 0.5,
                                value: 0
                            }],
                            tickLength: 0,tickInterval:  0.1,
                            lineColor: 'none',
                            gridLineColor: 'none',
                            gridLineWidth: 0,
                            title: {
                                margin: 5,
                                style: {
                                    color: '#888888',
                                    fontSize: '1em'
                                }
                            },
                            labels: {
                                style: {
                                    color: '#888888',
                                    fontSize: '1em'
                                }
                            }
                        },

                        plotOptions: {
                            series: {borderRadius:  15
                            },
                            column: {pointPlacement:  'between',
                                maxPointWidth: 30, groupPadding: 0
                            }
                        }
                    }).replace(/^{|}$/g, ''),
                    IsDesktop: false,
                    IsLoading: true,
                    IsOpenPopup: false,
                    IsTablet: false
                }
            }
        }
        fetch("https://mijn.nextenergy.nl/Website_CW/screenservices/Website_CW/MainFlow/WB_EnergyPrices/DataActionGetDataPoints", {
            "headers": {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.9,de;q=0.8,fr;q=0.7",
                "cache-control": "no-cache",
                "content-type": "application/json; charset=UTF-8",
                "outsystems-locale": "nl-NL",
                "pragma": "no-cache",
                "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrftoken": "T6C+9iB49TLra4jEsMeSckDMNhQ=",
                "Referer": "https://mijn.nextenergy.nl/Website_CW/MarketPrices",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            "body": JSON.stringify(nextEnergyBody),
            method: "POST"
        })
            .then(response => response.json())
            .then(data => {
                if(data && data.data && data.data.CurrentElectricityPlusPrice) {
                    const matchPrice = data.data.CurrentElectricityPlusPrice.match(/([0-9]{1,})\.([0-9]{1,})$/)
                    if(matchPrice) {
                        return resolve({
                            price: parseFloat(matchPrice[0]),
                            price_hour: currentHour
                        })
                    }
                }
                return resolve(false)
            })
            .catch(error => reject(error))
    })
}

// Define the HTTP server
new client.Gauge({
    name: 'electricity_price',
    help: 'Electricity price from NextEnergy.nl website in euro cents',
    async collect() {
        const currentPrice = await collectElectricityPrice()
        if(currentPrice) {
            this.set(currentPrice.price)
        }
    },
    registers: [register]
})
new client.Gauge({
    name: 'electricity_price_hour',
    help: 'Electricity price hour collected from NextEnergy.nl website',
    async collect() {
        const currentPrice = await collectElectricityPrice()
        if(currentPrice) {
            this.set(currentPrice.price_hour)
        }
    },
    registers: [register]
})

const server = http.createServer(async (req, res) => {
// Retrieve route from request object
    const route = url.parse(req.url).pathname
    if (route === '/metrics') {
        let content
        try {
            content = await register.metrics()
            res.statusCode = 200
        } catch (ex) {
            console.error(new Date(), '500', route, ex)
            res.writeHead(500)
            return res.end(ex)
        }
        res.setHeader('Content-Type', register.contentType);
        res.end(content)
        console.debug(new Date(), '200', route, content.length, 'bytes sent')
    } else {
        console.error(new Date(), '404', route, 'not found')
        res.writeHead(404)
        return res.end('not found')
    }
})
// Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
server.listen(HTTP_PORT)

console.log(new Date(), `server listening to ${HTTP_PORT}, metrics exposed on http://0.0.0.0:${HTTP_PORT}/metrics`)
