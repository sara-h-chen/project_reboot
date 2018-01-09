type = ['', 'info', 'success', 'warning', 'danger'];

/*
 * Track if servers are active
 */
var serversActive = [false, false, false, false, false];

server0pid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server1pid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server2pid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server3pid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server4pid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

masterPid = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

var serverStatus0 = new Chartist.Line('#serverStatusZero', server0pid);
var serverStatus1 = new Chartist.Line('#serverStatusOne', server1pid);
var serverStatus2 = new Chartist.Line('#serverStatusTwo', server2pid);
var serverStatus3 = new Chartist.Line('#serverStatusThree', server3pid);
var serverStatus4 = new Chartist.Line('#serverStatusFour', server4pid);
var masterStatus = new Chartist.Line('#masterStatus', masterPid);

demo = {
    /*
     * series 0: cpu
     * series 1: average latency
     * new series: memory
     */
    updateCharts: function(res) {
        var infoStack = JSON.parse(res);

        /*
         * For calculating the averages
         */
        var server0ttcpu = 0.0,
            server1ttcpu = 0.0,
            server2ttcpu = 0.0,
            server3ttcpu = 0.0,
            server4ttcpu = 0.0;

        var server0ttlat = 0.0,
            server1ttlat = 0.0,
            server2ttlat = 0.0,
            server3ttlat = 0.0,
            server4ttlat = 0.0;

        var conn0 = 0,
            conn1 = 0,
            conn2 = 0,
            conn3 = 0,
            conn4 = 0;

        var mastertime = "";
        var mastercpu = 0.0;

        for (var i = 0; i < infoStack.length; i++) {
            if (!infoStack[i].machine) {
                continue;
            }
            switch (infoStack[i].machine) {
                case 6050:
                    serversActive[0] = true;
                    server0ttcpu += infoStack[i].cpu;
                    server0ttlat += infoStack[i].latency;
                    conn0 += 1;
                    break;
                case 6051:
                    serversActive[1] = true;
                    server1ttcpu += infoStack[i].cpu;
                    server1ttlat += infoStack[i].latency;
                    conn1 += 1;
                    break;
                case 6052:
                    serversActive[2] = true;
                    server2ttcpu += infoStack[i].cpu;
                    server2ttlat += infoStack[i].latency;
                    conn2 += 1;
                    break;
                case 6053:
                    serversActive[3] = true;
                    server3ttcpu += infoStack[i].cpu;
                    server3ttlat += infoStack[i].latency;
                    conn3 += 1;
                    break;
                case 6054:
                    serversActive[4] = true;
                    server4ttcpu += infoStack[i].cpu;
                    server4ttlat += infoStack[i].latency;
                    conn4 += 1;
                    break;
                case 8000:
                    mastercpu = infoStack[i].cpu;
                    mastertime = infoStack[i].time.toString();
                    break;
            }
        }

        if(server0pid.series[0].length > 8) {
            server0pid.labels.shift();
            server0pid.series[0].shift();
            server0pid.series[1].shift();
        } else if (serversActive[0]) {
            server0pid.labels.push(conn0);
            server0pid.series[0].push((conn0 > 0) ? (server0ttcpu / conn0) : 0);
            server0pid.series[1].push((conn0 > 0) ? (server0ttlat / conn0) : 0);
        }

        if(server1pid.series[0].length > 8) {
            server1pid.labels.shift();
            server1pid.series[0].shift();
            server1pid.series[1].shift();
        } else if (serversActive[1]) {
            server1pid.labels.push(conn1);
            server1pid.series[0].push((conn1 > 0) ? (server1ttcpu / conn1) : 0);
            server1pid.series[1].push((conn1 > 0) ? (server1ttlat / conn1) : 0);
        }

        if(server2pid.series[0].length > 8) {
            server2pid.labels.shift();
            server2pid.series[0].shift();
            server2pid.series[1].shift();
        } else if (serversActive[2]) {
            server2pid.labels.push(conn2);
            server2pid.series[0].push((conn2 > 0) ? (server2ttcpu / conn2) : 0);
            server2pid.series[1].push((conn2 > 0) ? (server2ttlat / conn2) : 0);

        }

        if(server3pid.series[0].length > 8) {
            server3pid.labels.shift();
            server3pid.series[0].shift();
            server3pid.series[1].shift();

        } else if (serversActive[3]) {
            server3pid.labels.push(conn3);
            server3pid.series[0].push((conn3 > 0) ? (server3ttcpu / conn3) : 0);
            server3pid.series[1].push((conn3 > 0) ? (server3ttlat / conn3) : 0);
        }

        if(server4pid.series[0].length > 8) {
            server4pid.labels.shift();
            server4pid.series[0].shift();
            server4pid.series[1].shift();
        } else if (serversActive[4]) {
            server4pid.labels.push(conn4);
            server4pid.series[0].push((conn4 > 0) ? (server4ttcpu / conn4) : 0);
            server4pid.series[1].push((conn4 > 0) ? (server4ttlat / conn4) : 0);
        }

        if(masterPid.series[0].length > 8) {
            masterPid.labels.shift();
            masterPid.series[0].shift();
        }
        var slicedTime = mastertime.slice(-6,-2);
        masterPid.labels.push(slicedTime);
        masterPid.series[0].push(mastercpu);

        var activeServerCount = 0;
        for (var count = 0; count < serversActive.length; count++) {
            if(serversActive[count]) {
                activeServerCount += 1;
            }
        }
        var serverCount = '<h3 class="title" id="numberOfActives">' + activeServerCount + '/5</h3>';
        $('#numberOfActives').replaceWith(serverCount);

        serverStatus0.update();
        serverStatus1.update();
        serverStatus2.update();
        serverStatus3.update();
        serverStatus4.update();
        masterStatus.update();
    },

    // TODO: Notify when server approaches limit
    showNotification: function(from, align) {
        color = Math.floor((Math.random() * 4) + 1);
        $.notify({
            icon: "notifications",
            message: "Welcome to <b>Material Dashboard</b> - a beautiful freebie for every web developer."
        }, {
            type: type[color],
            timer: 4000,
            placement: {
                from: from,
                align: align
            }
        });
    }
};