const https = require('https');
const http = require('http');

async function testConnection() {
    const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    
    console.log('🔍 Testing connection to:', temporalAddress);
    
    if (temporalAddress.startsWith('https://')) {
        // Test HTTPS connection
        const url = new URL(temporalAddress);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: '/',
            method: 'HEAD',
            timeout: 5000
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                console.log('✅ HTTPS connection successful');
                console.log('   Status:', res.statusCode);
                console.log('   Headers:', JSON.stringify(res.headers, null, 2));
                resolve(true);
            });
            
            req.on('error', (error) => {
                console.error('❌ HTTPS connection failed:', error.message);
                reject(error);
            });
            
            req.on('timeout', () => {
                console.error('❌ Connection timeout');
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    } else {
        // Test TCP connection
        const [hostname, port] = temporalAddress.split(':');
        
        return new Promise((resolve, reject) => {
            const socket = new require('net').Socket();
            
            socket.setTimeout(5000);
            
            socket.on('connect', () => {
                console.log('✅ TCP connection successful');
                socket.destroy();
                resolve(true);
            });
            
            socket.on('error', (error) => {
                console.error('❌ TCP connection failed:', error.message);
                reject(error);
            });
            
            socket.on('timeout', () => {
                console.error('❌ Connection timeout');
                socket.destroy();
                reject(new Error('Timeout'));
            });
            
            socket.connect(parseInt(port) || 7233, hostname);
        });
    }
}

// Run test
testConnection()
    .then(() => {
        console.log('🎯 Connection test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('🚨 Connection test failed');
        console.error('');
        console.error('Troubleshooting:');
        console.error('1. Check if remote server is running');
        console.error('2. Verify port is publicly accessible');
        console.error('3. Check firewall settings');
        console.error('4. Verify TEMPORAL_ADDRESS in .env.local');
        process.exit(1);
    }); 