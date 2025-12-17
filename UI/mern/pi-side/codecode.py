import sys
import json

# Read JSON sent from Node.js
data = json.load(sys.stdin)

# Print to Python console (stdout)
print("Received from Node.js:")
print(json.dumps(data, indent=2))

# Return nothing back to Node.js (empty output)
# DO NOT print anything else
