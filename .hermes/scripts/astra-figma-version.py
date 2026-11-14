import subprocess, json
from pathlib import Path
for line in Path('/Users/aurelioatthayasuwisar/Downloads/astra-space-medical-assistant/frontend/.env.figma').read_text().splitlines():
    if line.startswith('FIGMA_TOKEN='): token=line.split('=',1)[1]
out=subprocess.check_output(['curl','-fsS','--max-time','40','-H','X-Figma-Token: '+token,'https://api.figma.com/v1/files/On7vnkMBuq5kxgXMOwcdpY?depth=1'],text=True)
print('FILE_VERSION='+str(json.loads(out).get('version','unknown')))
