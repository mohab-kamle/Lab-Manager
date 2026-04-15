
async function simulateDbUpdate(id) {
  return new Promise(resolve => setTimeout(() => resolve(id), 50));
}

async function sequentialUpdates(count) {
  console.time('Sequential');
  const results = [];
  for (let i = 0; i < count; i++) {
    const result = await simulateDbUpdate(i);
    results.push(result);
  }
  console.timeEnd('Sequential');
}

async function parallelUpdates(count) {
  console.time('Parallel');
  const updates = [];
  for (let i = 0; i < count; i++) {
    updates.push(simulateDbUpdate(i));
  }
  await Promise.all(updates);
  console.timeEnd('Parallel');
}

async function run() {
  const COUNT = 20;
  console.log(`Simulating ${COUNT} updates (50ms latency each)...`);

  await sequentialUpdates(COUNT);
  await parallelUpdates(COUNT);
}

run();
