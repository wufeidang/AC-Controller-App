import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Nemo\.local\share\mimocode\mimocode.db')
cur = conn.cursor()

# Check the exact location and content of OTA_DEFAULT_FIRMWARE_URL in constants.js
cur.execute("""
    SELECT p.id, json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           substr(p.data, 1, 800) as preview
    FROM part p
    JOIN message m ON p.message_id = m.id
    WHERE m.session_id='ses_0d36591caffehBPrC0n26ZGM0B'
      AND json_extract(p.data, '$.type') = 'tool'
      AND p.data LIKE '%constants%'
      AND p.data LIKE '%OTA%'
    ORDER BY p.time_created
    LIMIT 5
""")
rows = cur.fetchall()
print('=== OTA in constants tool calls ===')
for r in rows:
    print(f'  part#{r[0]} type={r[1]} tool={r[2]}')
    print(f'  {r[3][:600]}')

# Check for edit tool calls that modified OTA constants
cur.execute("""
    SELECT p.id, json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           substr(p.data, 1, 1000) as preview
    FROM part p
    JOIN message m ON p.message_id = m.id
    WHERE m.session_id='ses_0d36591caffehBPrC0n26ZGM0B'
      AND json_extract(p.data, '$.tool') = 'edit'
      AND p.data LIKE '%OTA%'
    ORDER BY p.time_created
    LIMIT 5
""")
rows = cur.fetchall()
print('\n=== OTA edit calls ===')
for r in rows:
    print(f'  part#{r[0]}')
    print(f'  {r[3][:600]}')

conn.close()