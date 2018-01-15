# Project Reboot
### Description
Currently, the Mongo client sits on its own thread `27017`, listening for updates from the different threads, which will each establish their own versions of the Mongo Driver.

We are now working on the static load balancing of the system. Each game server starts its own version of the world, but are not required to communicate, as they are fully responsible for the entities within their own region. They would only need to communicate during the handover.

### To-Do List
#### AI Behavior
- [ ] Create simple AI that wanders around in circles.

- [ ] Improve AI behavior.

- [ ] Issue events that AI can then respond to. 

#### System Monitoring
- [x] Establish a Master server that receives workload information pushed periodically from each server.

- [x] Create web interface that displays this workload information, and plots graphically.

#### Static Load Balancing
- [x] Set up gate server `gate.js` on port `8080`.

- [x] Have the gate server allocate to a server based on the current location of the player, and the defined JSON `servers_alloc.json`.

- [x] Coordinate the socket communications for handover.

- [x] Allow gate to create new players.

#### Dynamic Load Balancing
- [ ] Monitor workload on the master server using a Fibonacci heap. Once you hit a threshold on any of the servers then you allocate __only__ to adjacent servers to reduce the overhead of transferring packets between the servers should the player density fall.

- [ ] Fibonacci Heap to maintain the least-loaded server.

- [ ] Master server monitors workload and may pre-empt transfers if load exceeds threshold.

- [ ] Upon issuance of command from `master`, server must join other Redis channel. Players can then be transferred, after a defined number of ticks, once receiving on Redis has been stabilized.
 
 - [ ] Only activate the transfer to non-adjacent servers once both adjacent servers exceed their threshold.

### Notes for Paper
- [ ] Callbacks and asynchronity; internal scheduling and optimization by JavaScript.

- [ ] Porting single-server applications to multi-server architectures. Difficulties faced due to code dependencies.

- [ ] Lack of documentation for frameworks.

- [ ] Redis; used as an MQ in Publish/Subscribe design pattern.

- [ ] Due to initializing the entire world at startup time, discrepancy between client and server, unless client reloads. Use of portals, separate instances and loading screens in industry, as players get transferred from one server to another.

- [ ] Large packets sent over the network may increase latency, but required when players are switching from one server to another.

- [ ] Overlapping region where two servers share information about the player's behavior, so they both keep a copy of the player.

- [ ] Set interval; the execution of code affects the behavior of the app, due to differences in timing right down to the millisecond. E.g. the switch statement and the plotting of the graph on the master server -- an interval mismatch will cause inaccuracy, i.e. any slower and there will be the wrong number of connections, but any faster and there will be a gap in the data.

- [ ] Large lag during transfer if not loaded in advance

- [ ] Redis is used to cache the data temporarily as it transfers between servers, as a centralized datastore. The system does little to offer anything other than Persistence, according to CAP's Theorem, because it either rolls back or completes the transaction.

- [ ] Fibonacci Analysis: Put first thing that `isActive` into heap. Use individual variables to then store the current workload of each server. If the workload increases then delete the node and re-insert the new workload O(logn). If decreases then decrease-key O(1). [Reference.](http://mathjs.org/docs/reference/classes/fibonacciheap.html)

- [ ] Latency and CPU/thread usage differs, depending on hardware. On worse hardware, latency is higher and CPU usage is higher (tested on Dell Inspiron 14 3000 2.2GHz i5, 4GB RAM, 500GB HDD and MacBook Pro 2.3GHz Kaby Lake i5 dual-core processor, 8GB RAM, 256GB SSD storage).

- [ ] The more  you use the `decreaseKey` operation, the more effective the Fib Heap becomes.