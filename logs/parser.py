import parse

# format_string = '\{\"machine\":{},\"isActive\":{},\"conn\":{},\"cpu\":{},\"lat\":{}\}'
format_string = '{{"machine":{},"isActive":{},"conn":{},"cpu":{},"lat":{}}}'

connections = [[], [], [], [], []]
cpu_usg = [[], [], [], [], []]
lat_list = [[], [], [], [], []]

with open('wander/static.txt', 'r') as file_to_read:
    for line in file_to_read.readlines():
        parsed = parse.parse(format_string, line)
        if not parsed:
            continue
        machine, isActive, conn, cpu, lat = parsed
        index = int(machine) - 6050
        cpu_usg[index].append(cpu)
        connections[index].append(conn)
        lat_list[index].append(lat)

with open('conns.csv', 'w') as connection_file:
    for machine in connections:
        for connection in machine:
            connection_file.write("%s," % connection)
        connection_file.write("\n")

with open('cpu.csv', 'w') as cpu_file:
    for machine in cpu_usg:
        for cpu in machine:
            cpu_file.write("%s," % cpu)
        cpu_file.write("\n")

with open('lat.csv', 'w') as lat_file:
    for machine in lat_list:
        for lat in machine:
            lat_file.write("%s," % lat)
        lat_file.write("\n")