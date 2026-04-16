module.exports = {
    async rewrites() {
        return [
            {
                source: '/geoserver/:path*',
                destination: 'http://janazapro.com:8080/geoserver/:path*',
            },
            {
                // Match both `/ign-wms?...` and `/ign-wms/<path>...`
                source: '/ign-wms',
                destination: 'https://data.geopf.fr/wms-r',
            },
            {
                source: '/ign-wms/:path*',
                destination: 'https://data.geopf.fr/wms-r/:path*',
            },
            {
                // WFS (vector polygons / attributes)
                source: '/ign-wfs/:path*',
                destination: 'https://data.geopf.fr/wfs/:path*',
            },
        ]
    },
}