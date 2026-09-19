# Dine — Project Overview

## Problem
Traditional table ordering creates waiting time between customer, waiter and kitchen. Dine lets a guest scan the QR for the exact table, order from a phone, and receive kitchen progress in real time.

## Main actors

**Customer** — scans a unique table QR, browses menu, orders, tracks status and pays using Cash or the UPI QR payment flow.

**Kitchen** — receives all new orders live, separated by table, and updates the order state.

**Manager** — views operational metrics, paid revenue, recent orders and inventory.

## Main flow

Table QR → Table validation → Menu → Cart → Transactional order creation → Kitchen real-time event → Kitchen status update → Customer real-time event → Exact bill → Payment → Served → Table available.

## Real-time design

Server-Sent Events (SSE) channels are used for live server push. A phone opens a validated stream for its table token, while the kitchen opens the shared kitchen stream. Customer actions still use normal HTTP APIs; the server immediately pushes the resulting order/status changes to the correct listeners.

## Scope control

The project intentionally avoids unnecessary restaurant features such as employee payroll, supplier procurement workflows, real payment gateways, delivery logistics or external AI services. The focus is a polished dine-in ordering experience plus a strong DBSE backend.
