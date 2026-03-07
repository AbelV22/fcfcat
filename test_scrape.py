import requests, json

team = 'FUNDACIÓ ACADEMIA F. L\'HOSPITALET A'

payload = {
    'team': team,
    'season': '2526',
    'competition': 'segona-catalana',
    'group': 'grup-3'
}

print('Starting scrape API call...')
r = requests.post('http://127.0.0.1:8000/api/scrape', json=payload)
job = r.json()
print('Job Response:', job)
job_id = job.get('job_id')

if job_id:
    import time
    while True:
        status_req = requests.get(f'http://127.0.0.1:8000/api/job/{job_id}')
        status_data = status_req.json()
        print(f"{status_data['status']} - {status_data['progress']}% - {status_data['step']}")
        if status_data['status'] in ['completed', 'failed', 'error', 'done']:
            break
        time.sleep(1)
        
    data_req = requests.get(f'http://127.0.0.1:8000/api/job/{job_id}/data')
    data = data_req.json()
    print('\n--- NEXT MATCH DATA ---')
    print(json.dumps(data.get('next_match', {}), indent=2))
