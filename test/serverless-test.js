const http = require('http');
const apiHandler = require('../api/index');
const catchAllHandler = require('../api/[...path]');

function makeRequest(server, options, bodyData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function run() {
  console.log('Testing Serverless Function with real HTTP server on port 0...');

  // 1. Test api/index.js
  const server1 = http.createServer(apiHandler);
  await new Promise((res) => server1.listen(0, '127.0.0.1', res));

  try {
    // Health check
    const healthRes = await makeRequest(server1, { path: '/api/health', method: 'GET' });
    console.log('Test 1 - GET /api/health:', healthRes.statusCode, healthRes.data.status);
    if (healthRes.statusCode !== 200) throw new Error('Health check failed');

    // Rohan Demo Login
    const rohanRes = await makeRequest(server1, { path: '/api/auth/login', method: 'POST' }, {
      email: 'rohan@campus.edu',
      password: 'password123',
    });
    console.log('Test 2 - Rohan Demo Login:', rohanRes.statusCode, rohanRes.data.user?.name, 'Token:', !!rohanRes.data.token);
    if (rohanRes.statusCode !== 200 || !rohanRes.data.token || rohanRes.data.user?.name !== 'Rohan Sharma') {
      throw new Error('Rohan login failed');
    }

    // Priya Demo Login
    const priyaRes = await makeRequest(server1, { path: '/api/auth/login', method: 'POST' }, {
      email: 'priya.sharma@campus.edu',
      password: 'password123',
    });
    console.log('Test 3 - Priya Demo Login:', priyaRes.statusCode, priyaRes.data.user?.name, 'Token:', !!priyaRes.data.token);
    if (priyaRes.statusCode !== 200 || !priyaRes.data.token || priyaRes.data.user?.name !== 'Priya Sharma') {
      throw new Error('Priya login failed');
    }

    // Authenticated Profile via JWT
    const profileRes = await makeRequest(server1, {
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${rohanRes.data.token}`,
      },
    });
    console.log('Test 4 - Authenticated /api/auth/me:', profileRes.statusCode, profileRes.data.user?.email);
    if (profileRes.statusCode !== 200 || profileRes.data.user?.email !== 'rohan@campus.edu') {
      throw new Error('Authenticated profile failed');
    }

    // Vercel Rewrite with x-matched-path header
    const rewriteRes = await makeRequest(server1, {
      path: '/api',
      method: 'POST',
      headers: {
        'x-matched-path': '/api/auth/login',
      },
    }, {
      email: 'rohan@campus.edu',
      password: 'password123',
    });
    console.log('Test 5 - Vercel x-matched-path rewrite:', rewriteRes.statusCode, rewriteRes.data.user?.name);
    if (rewriteRes.statusCode !== 200 || !rewriteRes.data.token) {
      throw new Error('Rewrite test failed');
    }
  } finally {
    server1.close();
  }

  // 2. Test api/[...path].js
  const server2 = http.createServer(catchAllHandler);
  await new Promise((res) => server2.listen(0, '127.0.0.1', res));

  try {
    const catchAllRes = await makeRequest(server2, { path: '/api/auth/login', method: 'POST' }, {
      email: 'priya.sharma@campus.edu',
      password: 'password123',
    });
    console.log('Test 6 - Catch-all handler Priya Login:', catchAllRes.statusCode, catchAllRes.data.user?.name);
    if (catchAllRes.statusCode !== 200 || !catchAllRes.data.token) {
      throw new Error('Catch-all handler login failed');
    }
  } finally {
    server2.close();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL SERVERLESS & DEMO LOGIN TESTS PASSED 100%!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
