# Project Reboot
### Description
Currently, the Mongo client sits on its own thread `27017`, listening for updates from the different threads, which will each establish their own versions of the Mongo Driver.

We are now working on the static load balancing of the system. Each game server starts its own version of the world, but are not required to communicate, as they are fully responsible for the entities within their own region. They would only need to communicate during the handover.

Start up routine: gate, servers, then master.

### To-Do List
#### AI Behavior
- [x] Create simple AI that wanders around in circles.

- [x] Rewrite bot code to have it respond to distributed system.

- [x] Set all monsters to non-aggressive.

- [x] Change starting location to anywhere on the map. Figure out what the checkpoints are, and create your own checkpoints elsewhere on the map.

- [ ] Improve AI behavior.

- [ ] Issue events that AI can then respond to.

###### Low Priority Tasks

- [ ] Refactor code if you have the time.

- [ ] Fix reset on AI.

- [x] Find out why the bots are not showing up on the shards. ***NOTE**: May be better to deal with lag on browser.*

#### System Monitoring
- [x] Establish a Master server that receives workload information pushed periodically from each server.

- [x] Create web interface that displays this workload information, and plots graphically.

#### Static Load Balancing
- [x] Set up gate server `gate.js` on port `8080`.

- [x] Have the gate server allocate to a server based on the current location of the player, and the defined JSON `servers_alloc.json`.

- [x] Coordinate the socket communications for handover.

- [x] Allow gate to create new players.

#### Dynamic Load Balancing
- [x] Fibonacci Heap to maintain the least-loaded server.

- [x] Master server monitors workload and may pre-empt transfers if load exceeds threshold.

- [x] Monitor workload on the master server. Once you hit a threshold on any of the servers then you allocate __only__ to adjacent servers to reduce the overhead of transferring packets between the servers should the player density fall.

- [x] Only activate the transfer to non-adjacent servers once both adjacent servers exceed their threshold. This has been disabled.

- [x] Refactor to get list of host addresses, and the port numbers from a JSON file

- [x] Fix bug in dynamic load balancing algorithm that makes one particular server consistently shed too much weight.

#### Evaluation
- [ ] Fix spread caused by extracting minimum from Fibonacci Heap, regardless of whether they were on adjacent servers or not.

- [x] Stress one specific zone.

- [ ] Stress Redis zones. To activate, go into `GameServer.js` and set the boolean variable to `true`.

- [x] Stress different zones with random allocation of AI bots.

- [ ] Stress servers as AI bots wander the map and frequently switch zones.

- [x] Stress with failure of component(s).

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

- [ ] The nature of JavaScript and the asynchronity of socket communications gives rise to race conditions, which may be architecture dependent.

- [ ] Choosing the right threshold is non-trivial.

- [ ] Redis creates a new connection for every Redis client.

- [ ] CPU usage on TCP is higher than on UDP. TCP has congestion control algorithms in-built, so whenever there is congestion in the network TCP connections will slow transfer rates and bring the network out of the congested state.  Moreover, if a packet gets dropped due to congestion or channel errors, TCP retransmits the packet and reduces its congestion window or rate to half.  This is to provide reliability and to ensure the network does not go into congested state.The results seem to show that TCP has a significantly higher CPU usage than UDP for the same bandwidth. [Reference.](https://www.network-builders.com/threads/cpu-usage-tcp-vs-udp.55917/)

- [ ] There are challenges with transferring players in non-continuous regions, like the edges of the map, where there is only one adjacent server.

- [ ] Shift things onto the master server, to reduce computation on the other servers.

- [ ] Problems with resolving different IP addresses. IPv6 and IPv4 are non-compatible, and sending from one machine to another requires that they be of the same protocol, or steps have to be taken to make them compatible. For example:

| IPv4 | 127.0.0.1 |
|:----:|-----------|
| IPv6 |    ::1    |


- [ ] How do you decide what the right threshold is?

- [ ] ECMAScript 5 vs 6.

- [ ] Production grade tools like Redis and MongoDB are optimized and their internal workings are not accessible.

- [ ] One cannot simply transfer a player, due to its AOI. Expensive to transfer both the player, along with all the objects within its AOI. May defeat the purpose of transferring the player if it places more load on the already overloaded server. Theoretically possible to transfer players to non-adjacent servers, but loss of AOI information. So only possible to transfer players when servers are already sharing information about them. Potentially solvable by increasing the number of systems, and always having a machine to replicate data, with overlapping regions. However, this may lead to resource overprovisioning.

- [ ] Snapshots of the servers are made every 5 seconds. So, how long will you leave the problem to persist before you decide that it isn't just a sudden spike? This, in itself, is a non-trivial problem.

- [ ] Adding more functionality to the game increases the runtime of the code and may slow down the server's responsiveness to the client. The more complex the code, the slower the update rate has to be, and this leads to increased latency. Particularly for interpreted languages like JavaScript. Requires much optimization on the server side, or more powerful hardware.

- [ ] Do not respond to temporary spikes, because otherwise may generate more latency/workload than it saves.

- [ ] If an overloaded server transfers to an adjacent server that becomes overloaded at that exact moment, and the player gets transferred back, then this is detrimental towards the system.

- [ ] It is difficult to implement a Fibonacci Heap efficiently. Most implementations are not optimized, and may, in practice, have a greater runtime than the binary, or binomial heap. Because of large constant.

- [ ] The Fibonacci Heap's runtime analysis is based on amortized running time. May not be worth it on such a small number of nodes.

- [ ] Moving boundaries gives you an aggregate effect where too many players might end up getting sent to adjacent servers.

- [ ] Already with relatively simple logic on the servers, you get high latency as the server tries to respond to a large number of players. Could be due to the fact that some languages are slower than others, which explains why games like WoW depend upon languages like Lua.

- [ ] Upon transferring too many players consecutively, leads to network spikes and servers take a while to stabilize. Easier for servers to shed to adjacent servers.

- [ ] Converges on a stable configuration unless changes are made to the population.

- [ ] No arbitrary thresholds are set, because you want best-effort on all servers, and they should adapt.

- [ ] Because the servers don't communicate with each other, multiple can reach overloaded state at the exact same time and because the Fibonacci heap batch processes requests all of the servers might end up shedding their load to the exact same server so what was previously underloaded now becomes overloaded.

- [ ] Edge servers with no overlapping regions are more likely to be overloaded due to the fact that they can only shed to _one_ neighbouring server.
