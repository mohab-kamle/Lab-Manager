const options = {
  method: 'GET',
  headers: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwibGFiX2lkIjoxLCJpYXQiOjE3NTQ5NzQxMDcsImV4cCI6MTc1NDk5NTcwN30.tr8RYdPqDsDhSa9pvu2E_Z7lorWw_ugaYZbSpq0mn-8',
    'User-Agent': 'insomnia/11.4.0'
  }
};

fetch('http://localhost:3001/medical-reports/15/results-data', options)
  .then(response => response.json())
  .then(response => console.log(JSON.stringify(response)))
  .catch(err => console.error(err));