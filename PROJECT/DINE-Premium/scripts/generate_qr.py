"""Generate the 12 DINE QR codes from PUBLIC_FRONTEND_URL and stable table tokens."""
import os
from pathlib import Path
import qrcode
TOKENS=['TBL-A9F31K','TBL-K2M84Q','TBL-P7X52R','TBL-C4V19N','TBL-H8D63W','TBL-R5J27B','TBL-G3L91T','TBL-N6Q48Y','TBL-S2E75M','TBL-V9K34P','TBL-B7R62C','TBL-M4T88H']
ROOT=Path(__file__).resolve().parents[1]
base=os.getenv('PUBLIC_FRONTEND_URL','http://localhost:5173').rstrip('/')
for n,token in enumerate(TOKENS,1):
    url=f'{base}/order/{token}'
    img=qrcode.make(url)
    for out in (ROOT/'qr-codes',ROOT/'frontend'/'public'/'qr-codes'):
        out.mkdir(parents=True,exist_ok=True);img.save(out/f'table-{n:02d}.png')
    print(f'Table {n:02d}: {url}')
