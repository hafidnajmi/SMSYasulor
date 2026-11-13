import urllib.request
import urllib.error
import re
import sys

try:
    response = urllib.request.urlopen('http://localhost:3000/dashboard/divisions/UP')
except urllib.error.HTTPError as e:
    content = e.read().decode('utf-8')
    if '<title>' in content:
        title = content.split('<title>')[1].split('</title>')[0]
        print('Error Title:', title)
    else:
        print('Raw HTML length:', len(content))
        print(content[:500])
