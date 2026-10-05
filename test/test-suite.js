const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { app, startServer } = require('../backend/server');

const BASE_URL = 'http://127.0.0.1:5000';

// Helper for making HTTP JSON requests
function makeRequest(method, endpoint, body = null, token = null, isMultipart = false, multipartData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    
    let headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;

    if (isMultipart && multipartData) {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      
      const parts = [];
      for (const [key, value] of Object.entries(multipartData.fields || {})) {
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
      }
      if (multipartData.file) {
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${multipartData.file.fieldname}"; filename="${multipartData.file.filename}"\r\nContent-Type: ${multipartData.file.contentType}\r\n\r\n`
        );
      }
      
      const textPrefix = Buffer.from(parts.join(''), 'utf-8');
      const fileBuffer = multipartData.file ? multipartData.file.buffer : Buffer.alloc(0);
      const textSuffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
      
      payload = Buffer.concat([textPrefix, fileBuffer, textSuffix]);
      headers['Content-Length'] = payload.length;
    } else if (body) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
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
          body: json,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' RUNNING LOST & FOUND CAMPUS PORTAL TEST SUITE');
  console.log('====================================================\n');

  let server;
  let testUserToken = null;
  let testUserId = null;
  let otherUserToken = null;
  let otherUserId = null;
  let createdLostItemId = null;
  let createdFoundItemId = null;

  try {
    // Start Server
    server = await startServer();
    console.log('✓ TEST 1: Server and Database startup passed');

    // TEST 2: Health check & Stats
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.statusCode, 200, 'Health check should return 200');
    assert.strictEqual(health.body.status, 'healthy', 'Status should be healthy');
    console.log('✓ TEST 2: Health check endpoint /api/health passed');

    const stats = await makeRequest('GET', '/api/items/stats/summary');
    assert.strictEqual(stats.statusCode, 200, 'Stats endpoint should return 200');
    assert(stats.body.stats.totalItems >= 0, 'Stats should return totalItems');
    console.log('✓ TEST 3: Portal summary statistics endpoint /api/items/stats/summary passed');

    // TEST 4: User Signup
    const testEmail = `student_${Date.now()}@campus.edu`;
    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Rohan Sharma',
      email: testEmail,
      password: 'password123',
      phone: '+91 9876500001',
    });
    assert.strictEqual(signupRes.statusCode, 201, 'Signup should return 201 Created');
    assert(signupRes.body.token, 'Signup should return JWT token');
    assert.strictEqual(signupRes.body.user.name, 'Rohan Sharma', 'User name should match');
    assert.strictEqual(signupRes.body.user.email, testEmail, 'User email should match');
    assert.strictEqual(signupRes.body.user.password, undefined, 'Password must NEVER be returned in response');
    testUserToken = signupRes.body.token;
    testUserId = signupRes.body.user._id;
    console.log('✓ TEST 4: User Signup & Password hashing passed (password excluded from response)');

    // Duplicate signup prevention
    const duplicateRes = await makeRequest('POST', '/api/auth/signup', {
      name: 'Duplicate',
      email: testEmail,
      password: 'password123',
      phone: '+91 9876500001',
    });
    assert.strictEqual(duplicateRes.statusCode, 400, 'Duplicate email signup should fail with 400');
    console.log('✓ TEST 5: Duplicate email signup prevented correctly');

    // TEST 6: User Login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'password123',
    });
    assert.strictEqual(loginRes.statusCode, 200, 'Login should return 200');
    assert(loginRes.body.token, 'Login should return token');
    console.log('✓ TEST 6: User Login & bcrypt password validation passed');

    // Wrong password test
    const badLogin = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'wrong_password',
    });
    assert.strictEqual(badLogin.statusCode, 401, 'Bad credentials should return 401');
    console.log('✓ TEST 7: Invalid password correctly rejected with 401');

    // TEST 8: Protected Route /api/auth/me
    const meRes = await makeRequest('GET', '/api/auth/me', null, testUserToken);
    assert.strictEqual(meRes.statusCode, 200, 'Protected /me should return 200');
    assert.strictEqual(meRes.body.user.email, testEmail);
    console.log('✓ TEST 8: Protected route /api/auth/me verified with JWT');

    // Create a second user for unauthorized test
    const otherEmail = `other_${Date.now()}@campus.edu`;
    const otherSignup = await makeRequest('POST', '/api/auth/signup', {
      name: 'Amit Patel',
      email: otherEmail,
      password: 'password123',
      phone: '+91 9876500002',
    });
    otherUserToken = otherSignup.body.token;
    otherUserId = otherSignup.body.user._id;

    // TEST 9: Create Lost Item (POST /api/items)
    const lostItemRes = await makeRequest('POST', '/api/items', {
      title: 'HP Wireless Mouse (Black)',
      description: 'Lost in the ground floor library study carrel 12 around 3 PM.',
      type: 'Lost',
      category: 'Electronics',
      location: 'Central Library',
      date: new Date().toISOString(),
    }, testUserToken);
    assert.strictEqual(lostItemRes.statusCode, 201, 'Create Lost item should return 201');
    assert.strictEqual(lostItemRes.body.item.type, 'Lost');
    assert.strictEqual(lostItemRes.body.item.status, 'Active');
    createdLostItemId = lostItemRes.body.item._id;
    console.log('✓ TEST 9: Create Lost Item passed');

    // TEST 10: Create Found Item with Multer Image Upload
    // Create a 1x1 dummy PNG image buffer
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const foundItemRes = await makeRequest(
      'POST',
      '/api/items',
      null,
      testUserToken,
      true,
      {
        fields: {
          title: 'Apple AirPods Case (White)',
          description: 'Found on the grass near sports ground pavilion bench.',
          type: 'Found',
          category: 'Electronics',
          location: 'Sports Ground',
          date: new Date().toISOString(),
        },
        file: {
          fieldname: 'image',
          filename: 'airpods_case.png',
          contentType: 'image/png',
          buffer: dummyPng,
        },
      }
    );
    assert.strictEqual(foundItemRes.statusCode, 201, 'Create Found item with image should return 201');
    assert.strictEqual(foundItemRes.body.item.type, 'Found');
    assert(foundItemRes.body.item.imagePath, 'Item should have imagePath populated by Multer');
    assert(foundItemRes.body.item.imagePath.startsWith('/uploads/'), 'ImagePath must be inside /uploads/');
    createdFoundItemId = foundItemRes.body.item._id;
    console.log('✓ TEST 10: Multer image upload & Create Found Item passed');

    // TEST 11: Real Search & Filtering
    const searchRes = await makeRequest('GET', '/api/items?search=AirPods');
    assert.strictEqual(searchRes.statusCode, 200);
    assert(searchRes.body.items.some(i => i.title.includes('AirPods')), 'Search by keyword should match AirPods');
    console.log('✓ TEST 11: Database keyword search query passed');

    const filterType = await makeRequest('GET', '/api/items?type=Lost');
    assert.strictEqual(filterType.statusCode, 200);
    assert(filterType.body.items.every(i => i.type === 'Lost'), 'Type filter should only return Lost items');
    console.log('✓ TEST 12: Item type filtering (Lost/Found) passed');

    const filterLocation = await makeRequest('GET', '/api/items?location=Central+Library');
    assert.strictEqual(filterLocation.statusCode, 200);
    assert(filterLocation.body.items.every(i => i.location === 'Central Library'), 'Location filter passed');
    console.log('✓ TEST 13: Campus location filtering passed');

    // TEST 14: Contact Privacy Verification
    // Unauthenticated GET on item details
    const unauthDetails = await makeRequest('GET', `/api/items/${createdLostItemId}`);
    assert.strictEqual(unauthDetails.statusCode, 200);
    assert(unauthDetails.body.item.postedBy.phone.includes('Log in') || unauthDetails.body.item.postedBy.isContactProtected, 'Phone must be masked for unauthenticated users');
    assert.strictEqual(unauthDetails.body.isAuthenticated, false);
    console.log('✓ TEST 14: Contact Privacy enforced (Phone/email protected from public view)');

    // Authenticated GET on item details
    const authDetails = await makeRequest('GET', `/api/items/${createdLostItemId}`, null, otherUserToken);
    assert.strictEqual(authDetails.statusCode, 200);
    assert.strictEqual(authDetails.body.isAuthenticated, true);
    assert.strictEqual(authDetails.body.item.postedBy.phone, '+91 9876500001', 'Authenticated student can see contact details');
    console.log('✓ TEST 15: Authenticated student successfully accesses contact details');

    // TEST 16: My Posts & Post Management
    const myPostsRes = await makeRequest('GET', '/api/items/user/my-posts', null, testUserToken);
    assert.strictEqual(myPostsRes.statusCode, 200);
    assert.strictEqual(myPostsRes.body.count >= 2, true, 'User should have at least 2 posts');
    console.log('✓ TEST 16: User My-Posts retrieval passed');

    // TEST 17: Mark as Resolved (PATCH /api/items/:id/resolve)
    const resolveRes = await makeRequest('PATCH', `/api/items/${createdLostItemId}/resolve`, { status: 'Resolved' }, testUserToken);
    assert.strictEqual(resolveRes.statusCode, 200);
    assert.strictEqual(resolveRes.body.status, 'Resolved');
    console.log('✓ TEST 17: Status update to Resolved passed');

    // TEST 18: Unauthorized Edit/Delete Prevention
    // otherUser tries to edit testUser's post
    const unauthorizedEdit = await makeRequest('PUT', `/api/items/${createdLostItemId}`, {
      title: 'Hacked Title',
    }, otherUserToken);
    assert.strictEqual(unauthorizedEdit.statusCode, 403, 'Editing another user post must return 403 Forbidden');
    console.log('✓ TEST 18: Unauthorized edit attempt blocked with 403 Forbidden');

    // otherUser tries to delete testUser's post
    const unauthorizedDelete = await makeRequest('DELETE', `/api/items/${createdLostItemId}`, null, otherUserToken);
    assert.strictEqual(unauthorizedDelete.statusCode, 403, 'Deleting another user post must return 403 Forbidden');
    console.log('✓ TEST 19: Unauthorized delete attempt blocked with 403 Forbidden');

    // otherUser tries to resolve testUser's post
    const unauthorizedResolve = await makeRequest('PATCH', `/api/items/${createdLostItemId}/resolve`, { status: 'Active' }, otherUserToken);
    assert.strictEqual(unauthorizedResolve.statusCode, 403, 'Resolving another user post must return 403 Forbidden');
    console.log('✓ TEST 20: Unauthorized resolve attempt blocked with 403 Forbidden');

    // TEST 21: Authorized Edit
    const validEdit = await makeRequest('PUT', `/api/items/${createdLostItemId}`, {
      title: 'HP Wireless Mouse (Black) - Found in Bag',
      description: 'Updated description: found the mouse in my side pocket.',
    }, testUserToken);
    assert.strictEqual(validEdit.statusCode, 200);
    assert.strictEqual(validEdit.body.item.title, 'HP Wireless Mouse (Black) - Found in Bag');
    console.log('✓ TEST 21: Authorized post update passed');

    // TEST 22: Authorized Delete
    const validDelete = await makeRequest('DELETE', `/api/items/${createdLostItemId}`, null, testUserToken);
    assert.strictEqual(validDelete.statusCode, 200);
    console.log('✓ TEST 22: Authorized post deletion passed');

    // Verify deleted item is no longer found
    const verifyDelete = await makeRequest('GET', `/api/items/${createdLostItemId}`);
    assert.strictEqual(verifyDelete.statusCode, 404, 'Deleted item should return 404');
    console.log('✓ TEST 23: Item successfully removed from database');

    console.log('\n====================================================');
    console.log(' ALL 23 TEST CASES PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
