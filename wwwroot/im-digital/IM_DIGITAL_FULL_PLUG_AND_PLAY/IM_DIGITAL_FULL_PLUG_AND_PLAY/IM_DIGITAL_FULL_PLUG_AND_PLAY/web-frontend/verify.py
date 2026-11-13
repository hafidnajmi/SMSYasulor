import sys
path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

failed = False
if '#4a2311' in content:
    print('Failed to replace #4a2311 completely.')
    failed = True
if '200", "30%' in content:
    print('Failed to replace hardcoded values.')
    failed = True
if '#EAEFE3' in content[content.find('renderLipEyeBeratBlock'):content.find('renderLipEyeVolumeBlock')]:
    print('Failed to replace #EAEFE3 inside renderLipEyeBeratBlock')
    failed = True

if not failed:
    print('All replacements successful!')
