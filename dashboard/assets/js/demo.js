type = ['', 'info', 'success', 'warning', 'danger'];

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
        if(jQuery.isEmptyObject(infoStack[5])) {
            return;
        }

        if(server0pid.series[0].length > 8) {
            server0pid.labels.shift();
            server0pid.series[0].shift();
            server0pid.series[1].shift();
        }
        if (infoStack[0].isActive) {
            server0pid.labels.push(infoStack[0].conn);
            server0pid.series[0].push(infoStack[0].cpu);
            server0pid.series[1].push(infoStack[0].lat);
        }

        if(server1pid.series[0].length > 8) {
            server1pid.labels.shift();
            server1pid.series[0].shift();
            server1pid.series[1].shift();
        }
        if (infoStack[1].isActive) {
            server1pid.labels.push(infoStack[1].conn);
            server1pid.series[0].push(infoStack[1].cpu);
            server1pid.series[1].push(infoStack[1].lat);
        }

        if(server2pid.series[0].length > 8) {
            server2pid.labels.shift();
            server2pid.series[0].shift();
            server2pid.series[1].shift();
        }
        if (infoStack[2].isActive) {
            server2pid.labels.push(infoStack[2].conn);
            server2pid.series[0].push(infoStack[2].cpu);
            server2pid.series[1].push(infoStack[2].lat);
        }

        if(server3pid.series[0].length > 8) {
            server3pid.labels.shift();
            server3pid.series[0].shift();
            server3pid.series[1].shift();
        }
        if (infoStack[3].isActive) {
            server3pid.labels.push(infoStack[3].conn);
            server3pid.series[0].push(infoStack[3].cpu);
            server3pid.series[1].push(infoStack[3].lat);
        }

        if(server4pid.series[0].length > 8) {
            server4pid.labels.shift();
            server4pid.series[0].shift();
            server4pid.series[1].shift();
        }
        if (infoStack[4].isActive) {
            server4pid.labels.push(infoStack[4].conn);
            server4pid.series[0].push(infoStack[4].cpu);
            server4pid.series[1].push(infoStack[4].lat);
        }

        if(masterPid.series[0].length > 8) {
            masterPid.labels.shift();
            masterPid.series[0].shift();
        }
        var slicedTime = infoStack[5].time.toString().slice(-6,-2);
        masterPid.labels.push(slicedTime);
        masterPid.series[0].push(infoStack[5].cpu);

        var activeServerCount = 0;
        for (var count = 0; count < infoStack.length; count++) {
            if(infoStack[count].isActive) {
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