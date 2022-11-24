const http = require('http');
const fs = require('fs');

const { Client } = require('@elastic/elasticsearch');

const port = process.env.PORT || 8080;

const node = process.env.ELASTIC_HOST || 'http://localhost:9200';
const username = process.env.ELASTIC_USER || 'elastic';
const password = process.env.ELASTIC_PASSWORD || 'changeme';

const index = process.env.ELASTIC_INDEX || '311';
const geomField = process.env.ELASTIC_GEOM_FIELD || 'location';

const client = new Client({ node, auth: { username, password } });

const server = http.createServer(async function (request, response) {
    // Set CORS headers
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    response.setHeader('Access-Control-Allow-Headers', '*');

    if (request.url.startsWith('/tile')) {

        // Template for /tile/{z}/{x}/{y}
        const match = request.url.match(/tile\/(?<zoom>\d+)\/(?<x>\d+)\/(?<y>\d+)/);

        if (!match) {
            console.error(`[500] wrong tile request: ${request.url}`);
            response.writeHead(500);
            response.write('This does not seems a tile request\r\n');
            response.end();
            return;
        }

        try {
            const { x, y, zoom } = match.groups;

            const dataFields =  [
                "Complaint Type",
                "Agency Name",
                "Created Date",
                "Closed Date",
                "Resolution Description"
            ];

            const body = {
                exact_bounds: true,
                extent: 4096,
                grid_agg: 'geotile',
                grid_precision: 8,
                grid_type: 'grid',
                size: 10000,
                track_total_hits: false,
                query: {
                    bool: {
                        filter: [
                            {
                                range: {
                                    "Created Date": {
                                        format: "strict_date_optional_time",
                                        gte: "2020-11-01T00:00:00Z",
                                        lte: "2020-12-01T00:00:00Z"
                                    }
                                }
                            }
                        ]
                    }
                },
                fields: dataFields
            };

            const tile = await client.searchMvt({
                index,
                field: geomField,
                zoom,
                x,
                y,
                ...body,
            }, { meta: true });

            // set response header
            response.writeHead(tile.statusCode, {
                'content-disposition': 'inline',
                'content-length': 'content-length' in tile.headers ? tile.headers['content-length'] : `0`,
                'Content-Type': 'content-type' in tile.headers ? tile.headers['content-type'] : 'application/x-protobuf',
                'Cache-Control': `public, max-age=0`,
                'Last-Modified': `${new Date().toUTCString()}`,
            });

            // set response content
            response.write(tile.body);
            console.log(`[200] Sending tile ${zoom}/${x}/${y}`);
        } catch (e) {
            console.error(`[500] ${JSON.stringify(e)}`);
            response.writeHead('statusCode' in e ? e.statusCode : 500);
            response.write(e?.meta?.body ? JSON.stringify(e?.meta?.body) : '');
            response.end();
        }

        response.end();
    } else if (request.url === '/') {
        console.error(`[200] Serving the frontpage`);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(fs.readFileSync('./src/index.html'));
        response.end('');
    } else {
        console.error(`[400] page does not exist: ${request.url}`);
        response.writeHead(404);
        response.write('Page does not exist')
        response.end();
    }
});

server.listen(port);
console.log(`Tile server running on port ${port}`);
