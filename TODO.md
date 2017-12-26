# Project Reboot
### Description
Currently, the Mongo client sits on its own thread `27017`, listening for updates from the different threads, which will each establish their own versions of the Mongo Driver.

We are now working on the static load balancing of the system. Each game server starts its own version of the world, but are not required to communicate, as they are fully responsible for the entities within their own region. They would only need to communicate during the handover.

### To-Do List
#### AI Behavior
1. Create simple AI that wanders around in circles.
2. Improve AI behavior.
#### System Monitoring
1. Establish a Master server that pulls workload information periodically from each server.
2. Create web interface that displays this workload information, and plots graphically.

#### Static Load Balancing
1. Set up gate server `gate.js` on port `8080`.
2. Have the gate server allocate to a server based on the current location of the player, and the defined JSON `servers_alloc.json`.
3. Coordinate the socket communications for handover.
