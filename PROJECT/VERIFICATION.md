# Verification Checklist

The final ZIP was checked with `npm run verify` before packaging.

Automated verification covers:

1. Server, store and browser JavaScript syntax.
2. Exactly 12 restaurant tables.
3. Unique QR token for every table.
4. QR endpoint returns 12 different QR codes.
5. 32 menu items are present.
6. Every menu item points to a local artwork file whose filename matches the dish name.
7. Twelve tables can submit isolated orders concurrently.
8. A new phone order is pushed to the Kitchen room using Server-Sent Events.
9. A kitchen status change is pushed back to the correct table room.
10. Bill total is calculated from the locked order item prices plus 5% GST.
11. UPI/Cash completion preserves the exact same payable total.
12. A table is released only after the order is both served and paid.

For actual phone scanning, the only environment-dependent requirement is network access: the laptop and phone must be on the same local network and the laptop firewall must allow Node.js on that private network.

Additional build-time QR validation:

- all 12 generated table QR images were rasterized and decoded back to the correct `table` number and unique token
- the UPI QR was decoded and its `am` value matched the exact stored order total
