const autocannon = require('autocannon');

async function runTest() {
  const result = await autocannon({
    url: 'http://localhost:4000/api/v1/symptoms/analyze',
    connections: 50,
    duration: 20,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'load-test-user-id'
    },
    body: JSON.stringify({
      symptoms: ["Fever", "Headache"],
      duration: "2",
      durationUnit: "days",
      severity: 4,
      hasFever: true,
      location: "Lagos",
      knownConditions: []
    })
  });

  console.log('Load Test Result:');
  console.log(`P95 Latency: ${result.p95} ms`);
  console.log(`Requests per second: ${result.requests.average}`);
}

runTest();
